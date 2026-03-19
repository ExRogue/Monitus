import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getArticlesByIds } from '@/lib/news';
import { generateContent, getContentByCompany } from '@/lib/generate';
import { trackUsage, checkAndCreateUsageAlerts, getUsageSummary, getUserSubscription } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

const VALID_CONTENT_TYPES = ['newsletter', 'linkedin', 'podcast', 'briefing', 'trade_media', 'email'];

// Weekly LinkedIn draft limits per plan
const WEEKLY_LINKEDIN_LIMITS: Record<string, number | null> = {
  'plan-trial': 3,
  'plan-starter': 3,
  'plan-professional': 10,
  'plan-enterprise': null, // unlimited
};

// Content types available to all tiers
const BASIC_CONTENT_TYPES = ['newsletter', 'linkedin'];
// Content types requiring Growth+ (all_content_formats gate)
const GROWTH_CONTENT_TYPES = ['podcast', 'briefing', 'email'];
// Content types requiring Intelligence tier (trade_media gate)
const INTELLIGENCE_CONTENT_TYPES = ['trade_media'];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`generate:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { articleIds, contentTypes, channel, department } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0 || articleIds.length > 20) {
      return NextResponse.json({ error: 'Select between 1 and 20 articles' }, { status: 400 });
    }

    if (!Array.isArray(contentTypes) || contentTypes.length === 0) {
      return NextResponse.json({ error: 'Select at least one content type' }, { status: 400 });
    }

    const validTypes = contentTypes.filter((t: string) => VALID_CONTENT_TYPES.includes(t));
    if (validTypes.length === 0) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Check Intelligence-tier content types (trade_media)
    const hasIntelligenceTypes = validTypes.some((t: string) => INTELLIGENCE_CONTENT_TYPES.includes(t));
    if (hasIntelligenceTypes) {
      const gate = await checkTierAccess(user.id, 'trade_media');
      if (!gate.allowed) {
        const intelligenceRequested = validTypes.filter((t: string) => INTELLIGENCE_CONTENT_TYPES.includes(t));
        const denied = tierDeniedResponse(gate);
        return NextResponse.json(
          {
            ...denied,
            error: `Content types ${intelligenceRequested.join(', ')} require the ${denied.requiredTier || 'Intelligence'} plan.`,
          },
          { status: 403 }
        );
      }
    }

    // Check Growth-tier content types (podcast, briefing, email)
    const hasGrowthTypes = validTypes.some((t: string) => GROWTH_CONTENT_TYPES.includes(t));
    if (hasGrowthTypes) {
      const gate = await checkTierAccess(user.id, 'all_content_formats');
      if (!gate.allowed) {
        const growthRequested = validTypes.filter((t: string) => GROWTH_CONTENT_TYPES.includes(t));
        const denied = tierDeniedResponse(gate);
        return NextResponse.json(
          {
            ...denied,
            error: `Content types ${growthRequested.join(', ')} require the ${denied.requiredTier || 'Growth'} plan. Newsletter and LinkedIn are available on your current plan.`,
          },
          { status: 403 }
        );
      }
    }

    const safeIds = articleIds.map((id: string) => sanitizeString(String(id), 100)).filter(Boolean);

    await getDb();
    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
    }

    const articles = await getArticlesByIds(safeIds);
    if (articles.length === 0) {
      return NextResponse.json({ error: 'No valid articles found' }, { status: 400 });
    }

    // Enforce usage limits (null = unlimited)
    const usage = await getUsageSummary(user.id);
    if (usage.content_pieces_limit !== null && usage.content_pieces_used >= usage.content_pieces_limit) {
      return NextResponse.json(
        { error: `You've reached your monthly content limit (${usage.content_pieces_limit} pieces). Upgrade your plan to continue generating content.` },
        { status: 403 }
      );
    }
    if (usage.content_pieces_limit !== null && usage.content_pieces_used + validTypes.length > usage.content_pieces_limit) {
      const remaining = usage.content_pieces_limit - usage.content_pieces_used;
      return NextResponse.json(
        { error: `You can only generate ${remaining} more content piece(s) this month. You selected ${validTypes.length} content type(s). Remove some content types or upgrade your plan.` },
        { status: 403 }
      );
    }

    // Enforce weekly LinkedIn draft limit
    const linkedinRequested = validTypes.filter((t: string) => t === 'linkedin');
    if (linkedinRequested.length > 0) {
      const subscription = await getUserSubscription(user.id);
      const planId = subscription?.plan_id || 'plan-trial';
      const weeklyLimit = WEEKLY_LINKEDIN_LIMITS[planId] ?? null;

      if (weeklyLimit !== null) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const linkedinCountResult = await sql`
          SELECT COUNT(*) as count FROM usage_events
          WHERE user_id = ${user.id}
            AND event_type = 'content_generated'
            AND (metadata::json->>'contentType') = 'linkedin'
            AND created_at >= ${sevenDaysAgo}
        `;
        const linkedinUsed = parseInt(linkedinCountResult.rows[0]?.count || '0');

        if (linkedinUsed >= weeklyLimit) {
          return NextResponse.json(
            { error: `You've reached your weekly LinkedIn draft limit (${weeklyLimit}/week). Upgrade your plan for more LinkedIn drafts.` },
            { status: 403 }
          );
        }

        if (linkedinUsed + linkedinRequested.length > weeklyLimit) {
          const remaining = weeklyLimit - linkedinUsed;
          return NextResponse.json(
            { error: `You can only generate ${remaining} more LinkedIn draft(s) this week. Upgrade your plan for more.` },
            { status: 403 }
          );
        }
      }
    }

    const results = await generateContent(articles, company as any, validTypes, { channel, department });
    // Track one usage event per content type generated (not per request)
    for (const ct of validTypes) {
      await trackUsage(user.id, 'content_generated', { articleCount: articles.length, contentType: ct });
    }

    // Create notification for content generated
    if (results.length > 0) {
      const typeList = validTypes.join(', ');
      await createNotification(
        user.id,
        'content_generated',
        `Content Generated: ${typeList}`,
        `${results.length} piece(s) of content generated (${typeList}).`,
        '/content'
      );
    }

    // Check and create usage alerts if thresholds are reached
    await checkAndCreateUsageAlerts(user.id);

    return NextResponse.json({ content: results });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ content: [] });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;
  const search = searchParams.get('search') || '';
  const limitParam = parseInt(searchParams.get('limit') || '50');
  const limit = Math.min(Math.max(limitParam, 1), 100);

  if (type && !VALID_CONTENT_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid content type filter' }, { status: 400 });
  }

  let content = await getContentByCompany(company.id as string, type);

  // Client-side search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    content = content.filter((c: any) =>
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.content_type && c.content_type.toLowerCase().includes(q)) ||
      (c.content && c.content.toLowerCase().includes(q))
    );
  }

  content = content.slice(0, limit);
  return NextResponse.json({ content });
}
