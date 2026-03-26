import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateFromTopic } from '@/lib/generate';
import { trackUsage, checkAndCreateUsageAlerts, getUsageSummary } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';
import { checkTierAccess, tierDeniedResponse } from '@/lib/tier-gate';

export const maxDuration = 60;

const VALID_CONTENT_TYPES = ['newsletter', 'linkedin', 'podcast', 'briefing', 'trade_media', 'email'];

// Content types available to all tiers
const BASIC_CONTENT_TYPES = ['newsletter', 'linkedin'];
// Content types requiring Growth+ (all_content_formats gate)
const GROWTH_CONTENT_TYPES = ['podcast', 'briefing', 'email'];
// Content types requiring Intelligence tier (trade_media gate)
const INTELLIGENCE_CONTENT_TYPES = ['trade_media'];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`generate-topic:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const { topic, context, contentTypes, channel, department, narrative_id, targetIcp } = body;

    // Validate topic
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const sanitizedTopic = sanitizeString(topic, 2000);
    if (sanitizedTopic.length < 10) {
      return NextResponse.json({ error: 'Topic must be at least 10 characters' }, { status: 400 });
    }

    const sanitizedContext = context ? sanitizeString(String(context), 2000) : '';

    // Validate content types
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

    await getDb();
    const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Set up your company profile first' }, { status: 400 });
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

    const results = await generateFromTopic(
      sanitizedTopic,
      sanitizedContext,
      company as any,
      validTypes,
      { channel, department, narrative_id, targetIcp }
    );

    // Track one usage event per content type generated
    for (const ct of validTypes) {
      await trackUsage(user.id, 'content_generated', { contentType: ct, source: 'topic' });
    }

    // Create notification for content generated
    if (results.length > 0) {
      const typeList = validTypes.join(', ');
      await createNotification(
        user.id,
        'content_generated',
        `Content Generated: ${typeList}`,
        `${results.length} piece(s) of content generated from topic "${sanitizedTopic.substring(0, 60)}".`,
        '/content'
      );
    }

    // Check and create usage alerts if thresholds are reached
    await checkAndCreateUsageAlerts(user.id);

    return NextResponse.json({ content: results });
  } catch (error) {
    console.error('Topic generation error:', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}
