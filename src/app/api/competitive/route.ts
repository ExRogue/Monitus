import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, fireAndForget } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

function getTimeRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await checkTierAccess(user.id, 'competitor_monitoring');
  if (!gate.allowed) return NextResponse.json(tierDeniedResponse(gate), { status: 403 });

  const rl = rateLimit(`competitive:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await getDb();

    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const range = request.nextUrl.searchParams.get('range') || '30d';
    const since = getTimeRange(range);

    // Get competitor list from messaging bible
    const bibleResult = await sql`
      SELECT competitors FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
    `;
    const competitors: string[] = (() => {
      try {
        const raw = bibleResult.rows[0]?.competitors;
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((c: any) => typeof c === 'string' ? c : c.name || c.company || '').filter(Boolean) : [];
      } catch {
        return [];
      }
    })();

    // Scan articles for mentions
    const articlesResult = await sql`
      SELECT id, title, summary, content, source, category, published_at
      FROM news_articles
      WHERE published_at >= ${since.toISOString()}
      ORDER BY published_at DESC
      LIMIT 500
    `;
    const articles = articlesResult.rows;

    // Get existing mentions from DB
    const existingMentions = await sql`
      SELECT * FROM competitive_mentions
      WHERE company_id = ${company.id} AND created_at >= ${since.toISOString()}
      ORDER BY created_at DESC
    `;

    // If we have cached mentions AND they cover all current competitors, use those
    if (existingMentions.rows.length > 0) {
      const cachedCompetitors = new Set(existingMentions.rows.map((m: any) => m.competitor_name));
      const allExpected = [company.name, ...competitors];
      const allCovered = allExpected.every((c) => cachedCompetitors.has(c));

      if (allCovered) {
        const mentionsByCompetitor = buildMentionData(existingMentions.rows, competitors, company.name);
        const timeline = buildTimeline(existingMentions.rows, since);
        const recentMentions = existingMentions.rows.slice(0, 20);

        return NextResponse.json({
          competitors,
          company_name: company.name,
          share_of_voice: mentionsByCompetitor,
          timeline,
          recent_mentions: recentMentions,
          article_count: articles.length,
          cached: true,
        });
      }
    }

    // No cached mentions — scan articles for competitor mentions
    const allCompanies = [company.name, ...competitors];
    const newMentions: any[] = [];

    for (const article of articles) {
      const searchText = `${article.title} ${article.summary} ${article.content || ''}`.toLowerCase();

      for (const companyName of allCompanies) {
        if (!companyName) continue;
        const nameLower = companyName.toLowerCase();
        if (searchText.includes(nameLower)) {
          // Extract context around the mention
          const idx = searchText.indexOf(nameLower);
          const contextStart = Math.max(0, idx - 80);
          const contextEnd = Math.min(searchText.length, idx + nameLower.length + 80);
          const context = searchText.slice(contextStart, contextEnd).trim();

          const mention = {
            id: uuidv4(),
            company_id: company.id,
            competitor_name: companyName,
            article_id: article.id,
            mention_context: context,
            sentiment: 'neutral',
            created_at: article.published_at,
            article_title: article.title,
            article_source: article.source,
          };
          newMentions.push(mention);
        }
      }
    }

    // Save mentions to DB immediately with neutral sentiment (fast path)
    for (const m of newMentions) {
      await sql`
        INSERT INTO competitive_mentions (id, company_id, competitor_name, article_id, mention_context, sentiment, created_at)
        VALUES (${m.id}, ${m.company_id}, ${m.competitor_name}, ${m.article_id}, ${m.mention_context}, ${m.sentiment}, ${m.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Fire-and-forget: let the sentiment endpoint refine sentiment asynchronously
    // so this response returns within the 10s Vercel timeout
    if (process.env.ANTHROPIC_API_KEY && newMentions.length > 0 && newMentions.length <= 100) {
      fireAndForget('/api/sentiment', {
        mentions: newMentions.map((m) => ({
          id: m.id,
          competitor_name: m.competitor_name,
          mention_context: m.mention_context,
        })),
      });
    }

    const mentionsByCompetitor = buildMentionData(newMentions, competitors, company.name);
    const timeline = buildTimeline(newMentions, since);
    const recentMentions = newMentions.slice(0, 20);

    return NextResponse.json({
      competitors,
      company_name: company.name,
      share_of_voice: mentionsByCompetitor,
      timeline,
      recent_mentions: recentMentions,
      article_count: articles.length,
      cached: false,
    });
  } catch (error) {
    console.error('Competitive GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitive data' }, { status: 500 });
  }
}

function buildMentionData(
  mentions: any[],
  competitors: string[],
  companyName: string
): Record<string, { count: number; positive: number; neutral: number; negative: number }> {
  const result: Record<string, { count: number; positive: number; neutral: number; negative: number }> = {};

  const allCompanies = [companyName, ...competitors];
  for (const name of allCompanies) {
    result[name] = { count: 0, positive: 0, neutral: 0, negative: 0 };
  }

  for (const m of mentions) {
    const name = m.competitor_name;
    if (!result[name]) {
      result[name] = { count: 0, positive: 0, neutral: 0, negative: 0 };
    }
    result[name].count++;
    const sentiment = (m.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative';
    if (result[name][sentiment] !== undefined) {
      result[name][sentiment]++;
    }
  }

  return result;
}

function buildTimeline(mentions: any[], since: Date): { date: string; mentions: Record<string, number> }[] {
  const dayMap = new Map<string, Record<string, number>>();

  const now = new Date();
  const current = new Date(since);
  while (current <= now) {
    const key = current.toISOString().split('T')[0];
    dayMap.set(key, {});
    current.setDate(current.getDate() + 1);
  }

  for (const m of mentions) {
    const day = new Date(m.created_at).toISOString().split('T')[0];
    if (!dayMap.has(day)) dayMap.set(day, {});
    const dayData = dayMap.get(day)!;
    dayData[m.competitor_name] = (dayData[m.competitor_name] || 0) + 1;
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, mentions]) => ({ date, mentions }));
}
