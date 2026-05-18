/**
 * POST /api/content/draft-from-conversation
 *
 * The bridge from Market View → Content Producer. Takes a conversation +
 * a recommended action category (Sales / FounderContent / PR / etc.) and
 * generates a first-draft piece of content using:
 *   - The conversation's title, summary, score, and interpretation
 *     (executive summary, what changed, narrative fit, the specific
 *     recommendedActions[category] string)
 *   - The company's voice profile, locale, and brand voice
 *
 * Returns { contentId } so the caller can route to /content?id=<id>
 * which opens the new draft in the editor.
 *
 * This replaces the old Strategy Partner → Content Producer flow with a
 * single click from any Recommended Action.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { rateLimit, safeParseJson, sanitizeString } from '@/lib/validation';
import { getConversation } from '@/lib/market-conversations';
import { generateFromTopic } from '@/lib/generate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VALID_ACTIONS = [
  'Sales', 'Outbound', 'FounderContent', 'Website',
  'PR', 'CampaignPlanning', 'PodcastWebinar',
] as const;
type ActionKey = typeof VALID_ACTIONS[number];

// Map a strategic action category to a Content Producer content type.
// The mapping reflects what format best fits each action — e.g. FounderContent
// → linkedin because that's the natural founder content channel.
const ACTION_TO_CONTENT_TYPE: Record<ActionKey, 'linkedin' | 'email' | 'briefing' | 'trade_media' | 'podcast' | 'newsletter'> = {
  Sales: 'briefing',
  Outbound: 'email',
  FounderContent: 'linkedin',
  Website: 'briefing',
  PR: 'trade_media',
  CampaignPlanning: 'briefing',
  PodcastWebinar: 'podcast',
};

const ACTION_TO_CHANNEL: Record<ActionKey, string | undefined> = {
  Sales: undefined,
  Outbound: 'email',
  FounderContent: 'linkedin',
  Website: undefined,
  PR: 'trade_media',
  CampaignPlanning: undefined,
  PodcastWebinar: undefined,
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`draft-from-conv:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: body, error: parseError } = await safeParseJson(request);
  if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });

  const conversationId = sanitizeString(String((body as any)?.conversationId || ''), 100);
  const action = String((body as any)?.action || '') as ActionKey;
  const formatOverride = (body as any)?.format as string | undefined;
  const extraGuidance = sanitizeString(String((body as any)?.guidance || ''), 2000);

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Allowed: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  await getDb();
  const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) {
    return NextResponse.json({ error: 'No company configured' }, { status: 400 });
  }
  const companyId = company.id as string;

  const conversation = await getConversation(conversationId, companyId, { withItems: true });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const contentType = (formatOverride && ['linkedin', 'email', 'briefing', 'trade_media', 'podcast', 'newsletter'].includes(formatOverride))
    ? formatOverride as 'linkedin' | 'email' | 'briefing' | 'trade_media' | 'podcast' | 'newsletter'
    : ACTION_TO_CONTENT_TYPE[action];

  // Build a topic + context bundle for Content Producer. The topic is the
  // conversation's title; the context bundles the interpretation, scoring,
  // the action category, and any extra guidance the caller passed in.
  const topic = conversation.title;
  const interp = conversation.interpretation;
  const score = conversation.score;
  const suggestion = interp?.recommendedActions?.[action] || '';

  const contextParts: string[] = [];
  if (suggestion) {
    contextParts.push(`Recommended angle for ${action}: ${suggestion}`);
  }
  if (interp?.executiveSummary) {
    contextParts.push(`Conversation summary: ${interp.executiveSummary}`);
  }
  if (interp?.whatChanged) {
    contextParts.push(`What changed: ${interp.whatChanged}`);
  }
  if (interp?.whyThisMatters) {
    contextParts.push(`Why it matters: ${interp.whyThisMatters}`);
  }
  if (interp?.narrativeFit) {
    contextParts.push(`Narrative fit: ${interp.narrativeFit}`);
  }
  if (interp?.recommendedNextMove) {
    contextParts.push(`Top recommended next move: ${interp.recommendedNextMove}`);
  }
  if (score?.companyRelevance) {
    contextParts.push(`Company relevance: ${score.companyRelevance.label} (${score.companyRelevance.value}/10) — ${score.companyRelevance.explanation}`);
  }
  if (interp?.sourceCitations && interp.sourceCitations.length > 0) {
    contextParts.push(`Reference these sources where appropriate: ${interp.sourceCitations.join('; ')}`);
  }
  if (extraGuidance) {
    contextParts.push(`Additional user guidance: ${extraGuidance}`);
  }
  // Cite up to 3 of the underlying article titles for source-grounding
  if (conversation.items && conversation.items.length > 0) {
    const top = conversation.items.slice(0, 3).map(it => `"${it.title}" (${it.source})`).join('; ');
    contextParts.push(`Source items: ${top}`);
  }

  const context = contextParts.join('\n\n');

  const generated = await generateFromTopic(
    topic,
    context,
    company as any,
    [contentType],
    {
      channel: ACTION_TO_CHANNEL[action],
    },
  );

  if (!generated || generated.length === 0) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }

  const contentId = generated[0].id;

  // Tag the new content row with its origin so the editor can show the
  // "drafted from Market Analyst conversation X, action Y" provenance.
  // generated_content already has an `article_ids` field that's underused —
  // we can stash conversation provenance in a new column later; for now
  // store via the metadata-less origin marker on `compliance_notes`.
  try {
    await sql`
      UPDATE generated_content
      SET compliance_notes = ${JSON.stringify({
        origin: 'market-analyst',
        conversationId,
        action,
      })}
      WHERE id = ${contentId} AND company_id = ${companyId}
    `;
  } catch {
    // Best-effort
  }

  return NextResponse.json({
    contentId,
    contentType,
    conversationId,
    action,
  });
}
