import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit, sanitizeString, withTimeout } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const POSITIONING_SYSTEM_PROMPT = `You are an expert brand strategist conducting a discovery interview for an insurance/insurtech company. Your goal is to deeply understand their positioning and messaging needs through natural conversation.

OPERATING MODE:
- Every claim about the company must come from what the user tells you. Never assume or invent details.
- If something is unclear, ask. Do not fill gaps with plausible-sounding assumptions.
- Write in British English. Never use em-dashes. Use en-dashes or commas instead.
- Be direct, concise, and specific. No pleasantries beyond the opening greeting. No filler.
- Sound like a sharp market insider who has done this for Lloyd's syndicates and Series A insurtechs, not a generic brand consultant.

You are in Phase A -- Positioning Discovery.

Ask about: What they do, who they serve (specific buyer personas in insurance -- CUOs, Heads of Distribution, brokers, syndicate leads), what makes them different from named competitors, key challenges their customers face, their market position, their growth ambitions.

Push back on vague answers. If they say "we're different because of our technology", ask what specifically their technology does that a competitor's does not. If they say "insurance companies", ask which type -- MGAs, Lloyd's syndicates, brokers, carriers, reinsurers.

Ask one or two questions at a time. Follow up on what they say rather than running through a checklist.

When you have gathered enough information (typically after 6+ exchanges covering company overview, target audience, competitive positioning, differentiators, customer challenges, and market ambitions), respond with:

1. A brief summary of what you have learned
2. Ask for confirmation that your understanding is correct
3. Include the exact marker [PHASE_COMPLETE] at the very end of your message (on its own line)

IMPORTANT: Do NOT include [PHASE_COMPLETE] until you have covered all major topics. Be thorough.

Start by introducing yourself and asking what their company does and what part of the insurance market they operate in.`;

const VOICE_SYSTEM_PROMPT = `You are an expert brand strategist continuing a discovery interview for an insurance/insurtech company. You have already learned about their positioning in Phase A.

OPERATING MODE:
- Every claim must come from what the user tells you. Never assume or invent details.
- Write in British English. Never use em-dashes. Use en-dashes or commas instead.
- Be direct, concise, specific. No pleasantries or filler.
- Sound like a market insider, not a generic brand consultant.

You are now in Phase B -- Voice & Tone Discovery.

Ask about:
- How they want to be perceived by their market (insurers, brokers, MGAs, Lloyd's participants)
- Show them pairs of opposite tones and ask them to pick where they sit on the spectrum:
  * Formal vs Casual
  * Technical vs Accessible
  * Bold/Provocative vs Measured/Conservative
  * Data-driven vs Story-driven
  * Authority vs Peer-to-peer
- Ask for examples of content, brands, or publications they admire (e.g. Insurance Insider, The Insurer, specific LinkedIn voices in the market)
- Ask what their CEO's keynote speaking style would be like
- Ask about words or phrases they love vs ones they would never use
- Ask about their content goals (thought leadership, lead generation, brand awareness, trade media coverage)

Push back on vague answers. If they say "professional", ask what professional means to them specifically. If they admire a brand, ask what exactly about that brand's voice they want to emulate.

Ask one or two questions at a time. Dig deeper on interesting answers.

When you have enough information about their voice and tone preferences (typically after 6+ exchanges), respond with:

1. A summary of the brand voice profile you have built
2. Ask for confirmation
3. Include the exact marker [INTERVIEW_COMPLETE] at the very end of your message (on its own line)

IMPORTANT: Do NOT include [INTERVIEW_COMPLETE] until you have covered tone preferences, brand examples, and content style thoroughly.`;

const EXTRACTION_PROMPT = `Analyse the following interview conversation and extract structured data. Return ONLY valid JSON with no additional text. Extract only what was explicitly stated. Do not invent or assume details not present in the conversation.

The JSON must have this exact structure:
{
  "companyName": "string",
  "companyType": "string (one of: mga, broker, carrier, insurtech, reinsurer, tpa, other)",
  "niche": "string",
  "companyDescription": "string (2-3 sentence overview)",
  "targetAudiences": [
    { "name": "string", "role": "string", "painPoints": "string" }
  ],
  "competitors": [
    { "name": "string", "difference": "string" }
  ],
  "differentiators": ["string"],
  "keyChallenges": ["string"],
  "departments": [
    { "name": "string", "focus": "strategic or operational" }
  ],
  "channels": ["string"],
  "brandVoice": {
    "toneSpectrum": {
      "formalVsCasual": "number 1-10 (1=very formal, 10=very casual)",
      "technicalVsAccessible": "number 1-10",
      "boldVsMeasured": "number 1-10",
      "dataDrivenVsStoryDriven": "number 1-10",
      "authorityVsPeer": "number 1-10"
    },
    "admiredBrands": ["string"],
    "wordsToUse": ["string"],
    "wordsToAvoid": ["string"],
    "voiceSummary": "string (2-3 sentence description of ideal brand voice)",
    "contentGoals": ["string"]
  }
}

Extract as much detail as possible from the conversation. If something wasn't discussed, use reasonable defaults based on context. For departments and channels, infer from context if not explicitly discussed.`;

// Minimum exchanges per phase before completion markers are respected
const MIN_POSITIONING_EXCHANGES = 5;
const MIN_VOICE_EXCHANGES = 5;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`interview:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { message, sessionId, phase, websiteContext } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sanitizedMessage = sanitizeString(message, 5000);
    await getDb();

    // Get or create session
    let session: any;
    if (sessionId) {
      const sessionResult = await sql`
        SELECT * FROM interview_sessions WHERE id = ${sessionId} AND user_id = ${user.id}
      `;
      session = sessionResult.rows[0];
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    if (!session) {
      // Create new session
      const newId = uuidv4();

      // Get company_id if exists
      const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id} LIMIT 1`;
      const companyId = companyResult.rows[0]?.id || null;

      await sql`
        INSERT INTO interview_sessions (id, user_id, company_id, phase, messages, extracted_data, status)
        VALUES (${newId}, ${user.id}, ${companyId}, 'positioning', '[]', '{}', 'active')
      `;

      session = {
        id: newId,
        user_id: user.id,
        company_id: companyId,
        phase: 'positioning',
        messages: '[]',
        extracted_data: '{}',
        status: 'active',
      };
    }

    const currentPhase = phase || session.phase;
    const messages: ChatMessage[] = JSON.parse(session.messages || '[]');

    // Add user message
    messages.push({ role: 'user', content: sanitizedMessage });

    // Build messages for Claude
    const systemPrompt =
      currentPhase === 'positioning' ? POSITIONING_SYSTEM_PROMPT : VOICE_SYSTEM_PROMPT;

    // If transitioning to voice phase, prepend context from positioning
    let claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // If website context was provided (first message of new session), prepend it
    if (websiteContext && typeof websiteContext === 'string' && messages.length <= 1) {
      claudeMessages.push({
        role: 'user',
        content: `[Website Content - extracted from the company's website for additional context. Use this to inform your questions and avoid asking about things already covered here]:\n\n${websiteContext.substring(0, 8000)}`,
      });
      claudeMessages.push({
        role: 'assistant',
        content: "Thanks, I've reviewed the website content. I'll use this as background context for our conversation. Let me ask some deeper questions to build on what I can see.",
      });
    }

    if (currentPhase === 'voice') {
      // Include a condensed summary of positioning phase as context
      const extractedData = JSON.parse(session.extracted_data || '{}');
      if (extractedData.positioningSummary) {
        claudeMessages.push({
          role: 'user',
          content: `[Context from Phase A - Positioning Discovery]: ${extractedData.positioningSummary}`,
        });
        claudeMessages.push({
          role: 'assistant',
          content:
            "Thanks for that context. I have a good understanding of the company's positioning. Let me now explore the brand voice and tone. " +
            (messages.length > 1 ? '' : "Let's start with how you want your brand to be perceived in the market. When people read your content or hear about your company, what's the first impression you want them to have?"),
        });
      }
    }

    // Add conversation messages
    for (const msg of messages) {
      claudeMessages.push({ role: msg.role, content: msg.content });
    }

    // Generate AI response with an 8s timeout to stay within Vercel's 10s limit
    let aiReply: string;

    if (anthropic) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: claudeMessages,
      });
      aiReply = response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      // Fallback for development without API key
      aiReply = generateFallbackReply(currentPhase, messages.length);
    }

    // Check for phase completion markers
    const userExchangeCount = messages.filter((m) => m.role === 'user').length;
    let phaseComplete = false;
    let interviewComplete = false;
    let cleanReply = aiReply;

    if (currentPhase === 'positioning') {
      if (
        aiReply.includes('[PHASE_COMPLETE]') &&
        userExchangeCount >= MIN_POSITIONING_EXCHANGES
      ) {
        phaseComplete = true;
        cleanReply = aiReply.replace('[PHASE_COMPLETE]', '').trim();
      }
    } else if (currentPhase === 'voice') {
      if (
        aiReply.includes('[INTERVIEW_COMPLETE]') &&
        userExchangeCount >= MIN_VOICE_EXCHANGES
      ) {
        interviewComplete = true;
        cleanReply = aiReply.replace('[INTERVIEW_COMPLETE]', '').trim();
      }
    }

    // Add assistant reply to messages
    messages.push({ role: 'assistant', content: cleanReply });

    // Determine next state
    let newPhase = currentPhase;
    let newStatus = session.status;
    let extractedData = JSON.parse(session.extracted_data || '{}');

    if (phaseComplete) {
      // Extract positioning summary with a timeout to stay within Vercel's 10s limit.
      // If it times out, we still transition to voice phase and save a placeholder.
      extractedData.positioningSummary = await withTimeout(
        extractPositioningSummary(messages),
        20000,
        'Positioning data collected — summary will be generated on next interaction.'
      );
      newPhase = 'voice';
    }

    if (interviewComplete) {
      // Extract structured data with a timeout; use fallback if the AI call is too slow
      const fullExtraction = await withTimeout(
        extractStructuredData(messages, session),
        25000,
        buildFallbackExtraction()
      );
      extractedData = { ...extractedData, ...fullExtraction };
      newStatus = 'complete';

      // Auto-save messaging bible — this is DB-only (no AI calls), so it's fast
      await autoSaveMessagingBible(user.id, session.company_id, extractedData);
    }

    // Save session
    await sql`
      UPDATE interview_sessions SET
        phase = ${newPhase},
        messages = ${JSON.stringify(messages)},
        extracted_data = ${JSON.stringify(extractedData)},
        status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${session.id}
    `;

    // Build progress hints
    const progressHint = buildProgressHint(currentPhase, messages);

    return NextResponse.json({
      reply: cleanReply,
      sessionId: session.id,
      phase: newPhase,
      phaseComplete,
      interviewComplete,
      status: newStatus,
      progressHint,
      extractedData: interviewComplete ? extractedData : undefined,
    });
  } catch (error: any) {
    console.error('Interview API error:', error);
    const errorMsg = error?.message || '';
    if (errorMsg.includes('credit balance is too low')) {
      return NextResponse.json(
        { error: 'AI service billing issue. Please contact support.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Interview request failed' }, { status: 500 });
  }
}

// GET: Resume an existing session or get initial greeting
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await getDb();

  // Find active session
  const sessionResult = await sql`
    SELECT * FROM interview_sessions
    WHERE user_id = ${user.id} AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1
  `;

  const session = sessionResult.rows[0];

  if (session) {
    const messages: ChatMessage[] = JSON.parse(session.messages || '[]');
    return NextResponse.json({
      sessionId: session.id,
      phase: session.phase,
      messages,
      status: session.status,
      progressHint: buildProgressHint(session.phase, messages),
    });
  }

  // Also check for completed sessions
  const completedResult = await sql`
    SELECT * FROM interview_sessions
    WHERE user_id = ${user.id} AND status = 'complete'
    ORDER BY updated_at DESC LIMIT 1
  `;

  if (completedResult.rows[0]) {
    const s = completedResult.rows[0];
    return NextResponse.json({
      sessionId: s.id,
      phase: s.phase,
      messages: JSON.parse(s.messages || '[]'),
      status: 'complete',
      extractedData: JSON.parse(s.extracted_data || '{}'),
    });
  }

  // No session - return initial greeting
  return NextResponse.json({
    sessionId: null,
    phase: 'positioning',
    messages: [],
    status: 'none',
    initialGreeting:
      "I'm your brand strategist. Let's build your Narrative. Tell me about your company -- what do you do, and what part of the insurance market do you operate in?",
  });
}

function generateMessagingPillars(extractedData: Record<string, any>): string[] {
  const pillars: string[] = [];

  // Derive pillars from differentiators (most important source)
  const diffs = extractedData.differentiators || [];
  for (const diff of diffs.slice(0, 4)) {
    const pillar = typeof diff === 'string' ? diff : '';
    if (pillar && pillar.length <= 60) {
      pillars.push(pillar);
    } else if (pillar) {
      // Truncate long differentiators to create pillar labels
      pillars.push(pillar.slice(0, 57) + '...');
    }
  }

  // Add pillars from key challenges if we have fewer than 4
  const challenges = extractedData.keyChallenges || [];
  for (const challenge of challenges.slice(0, 3)) {
    if (pillars.length >= 6) break;
    const c = typeof challenge === 'string' ? challenge : '';
    if (c && !pillars.some(p => p.toLowerCase().includes(c.toLowerCase().slice(0, 10)))) {
      pillars.push(c.length <= 60 ? c : c.slice(0, 57) + '...');
    }
  }

  // Add niche as a pillar if we still have few
  if (pillars.length < 3 && extractedData.niche) {
    pillars.push(extractedData.niche);
  }

  // Add content goals from voice data
  const contentGoals = extractedData.brandVoice?.contentGoals || [];
  for (const goal of contentGoals.slice(0, 2)) {
    if (pillars.length >= 6) break;
    const g = typeof goal === 'string' ? goal.replace(/_/g, ' ') : '';
    if (g && !pillars.includes(g)) {
      pillars.push(g.charAt(0).toUpperCase() + g.slice(1));
    }
  }

  return pillars.slice(0, 6); // Max 6 pillars
}

async function autoSaveMessagingBible(userId: string, companyId: string | null, extractedData: Record<string, any>): Promise<void> {
  try {
    // Get company ID if not provided
    let cId = companyId;
    if (!cId) {
      const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${userId} LIMIT 1`;
      cId = companyResult.rows[0]?.id;
    }
    if (!cId) return; // No company, can't save bible

    // Update company profile with extracted data
    if (extractedData.companyDescription) {
      await sql`
        UPDATE companies SET
          description = ${(extractedData.companyDescription || '').slice(0, 2000)},
          type = COALESCE(NULLIF(${(extractedData.companyType || '').slice(0, 100)}, ''), type),
          niche = COALESCE(NULLIF(${(extractedData.niche || '').slice(0, 200)}, ''), niche),
          updated_at = NOW()
        WHERE id = ${cId}
      `;
    }

    // Check for existing bible
    const existingResult = await sql`
      SELECT id FROM messaging_bibles WHERE company_id = ${cId} ORDER BY updated_at DESC LIMIT 1
    `;

    const bibleId = existingResult.rows[0]?.id || uuidv4();
    const targetAudiences = JSON.stringify(extractedData.targetAudiences || []);
    const competitors = JSON.stringify(extractedData.competitors || []);
    const differentiators = JSON.stringify(extractedData.differentiators || []);
    const keyChallenges = JSON.stringify(extractedData.keyChallenges || []);
    const departments = JSON.stringify(extractedData.departments || []);
    const channels = JSON.stringify(extractedData.channels || ['linkedin', 'email', 'trade_media']);

    // Generate messaging pillars from differentiators, challenges, and niche
    const messagingPillars = generateMessagingPillars(extractedData);
    const messagingPillarsJson = JSON.stringify(messagingPillars);

    // Build voice guide from extracted voice data
    const voiceGuide = extractedData.brandVoice?.voiceSummary || '';

    if (existingResult.rows[0]) {
      await sql`
        UPDATE messaging_bibles SET
          company_description = ${(extractedData.companyDescription || '').slice(0, 2000)},
          target_audiences = ${targetAudiences},
          competitors = ${competitors},
          differentiators = ${differentiators},
          key_challenges = ${keyChallenges},
          departments = ${departments},
          channels = ${channels},
          messaging_pillars = ${messagingPillarsJson},
          brand_voice_guide = ${voiceGuide.slice(0, 2000)},
          status = 'draft',
          updated_at = NOW()
        WHERE id = ${bibleId}
      `;
    } else {
      await sql`
        INSERT INTO messaging_bibles (id, company_id, company_description, target_audiences, competitors, differentiators, key_challenges, departments, channels, messaging_pillars, brand_voice_guide)
        VALUES (${bibleId}, ${cId}, ${(extractedData.companyDescription || '').slice(0, 2000)}, ${targetAudiences}, ${competitors}, ${differentiators}, ${keyChallenges}, ${departments}, ${channels}, ${messagingPillarsJson}, ${voiceGuide.slice(0, 2000)})
      `;
    }
  } catch (error) {
    console.error('Auto-save messaging bible error:', error);
    // Non-fatal: interview data is still saved in interview_sessions
  }
}

async function extractPositioningSummary(messages: ChatMessage[]): Promise<string> {
  if (!anthropic) {
    return 'Positioning phase summary not available (no API key).';
  }

  try {
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Strategist'}: ${m.content}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system:
        'Summarise the key positioning insights from this brand discovery conversation in 3-5 bullet points. Include: company overview, target audiences, competitors, differentiators, and key customer challenges. Extract only what was explicitly stated. Do not invent or assume details. Be concise but comprehensive. Write in British English. No em-dashes.',
      messages: [{ role: 'user', content: conversationText }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  } catch (error) {
    console.error('Positioning summary extraction error:', error);
    return 'Positioning data collected - summary extraction failed.';
  }
}

async function extractStructuredData(
  messages: ChatMessage[],
  session: any
): Promise<Record<string, any>> {
  if (!anthropic) {
    return buildFallbackExtraction();
  }

  try {
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Strategist'}: ${m.content}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: conversationText }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    // Parse JSON from response, handling potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error('Structured data extraction error:', error);
    return buildFallbackExtraction();
  }
}

function buildFallbackExtraction(): Record<string, any> {
  return {
    companyName: '',
    companyType: 'insurtech',
    niche: '',
    companyDescription: '',
    targetAudiences: [{ name: 'Insurance professionals', role: '', painPoints: '' }],
    competitors: [],
    differentiators: [],
    keyChallenges: [],
    departments: [],
    channels: ['linkedin', 'email', 'trade_media'],
    brandVoice: {
      toneSpectrum: {
        formalVsCasual: 4,
        technicalVsAccessible: 5,
        boldVsMeasured: 5,
        dataDrivenVsStoryDriven: 5,
        authorityVsPeer: 4,
      },
      admiredBrands: [],
      wordsToUse: [],
      wordsToAvoid: [],
      voiceSummary: 'Professional yet approachable voice that balances expertise with accessibility.',
      contentGoals: ['thought_leadership'],
    },
  };
}

function buildProgressHint(phase: string, messages: ChatMessage[]): string {
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const content = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  if (phase === 'positioning') {
    const topics: string[] = [];
    if (content.match(/company|we do|we are|our business|founded/)) topics.push('company overview');
    if (content.match(/audience|customers?|clients?|serve|buyer|persona/))
      topics.push('target audience');
    if (content.match(/competitor|compete|versus|vs|rival|alternative/))
      topics.push('competitive landscape');
    if (content.match(/different|unique|stand out|advantage|differentiator/))
      topics.push('differentiators');
    if (content.match(/challenge|struggle|pain|problem|frustrat/))
      topics.push('customer challenges');

    const covered = topics.length;
    const needed = 5;

    if (covered >= needed && userMsgCount >= MIN_POSITIONING_EXCHANGES) {
      return 'Great progress! Wrapping up positioning discovery soon.';
    }

    const missing: string[] = [];
    if (!topics.includes('company overview')) missing.push('company overview');
    if (!topics.includes('target audience')) missing.push('audience');
    if (!topics.includes('competitive landscape')) missing.push('competition');
    if (!topics.includes('differentiators')) missing.push('differentiators');
    if (!topics.includes('customer challenges')) missing.push('challenges');

    if (missing.length > 0 && covered > 0) {
      return `Covered: ${topics.join(', ')}. Still exploring: ${missing.join(', ')}.`;
    }

    if (userMsgCount === 0) return 'Let\'s start learning about your company.';
    return `${covered} of ${needed} key topics covered so far.`;
  }

  if (phase === 'voice') {
    const topics: string[] = [];
    if (content.match(/formal|casual|tone|sound|perceived/)) topics.push('tone preferences');
    if (content.match(/brand|admire|like|example|inspire/)) topics.push('brand inspiration');
    if (content.match(/word|phrase|language|avoid|use|say/)) topics.push('language preferences');
    if (content.match(/content|goal|thought leader|lead gen|awareness/))
      topics.push('content goals');

    if (topics.length >= 3 && userMsgCount >= MIN_VOICE_EXCHANGES) {
      return 'Almost done! Finalising your brand voice profile.';
    }

    if (userMsgCount === 0) return 'Now let\'s discover your ideal brand voice.';
    return `Exploring your voice and tone -- ${topics.length} of 4 areas covered.`;
  }

  return '';
}

function generateFallbackReply(phase: string, messageCount: number): string {
  if (phase === 'positioning') {
    const questions = [
      "Thanks for sharing that! Can you tell me more about who your ideal customers are? What types of companies or roles are you typically selling to?",
      "Interesting. What would you say are the biggest pain points your customers face before they find you?",
      "That's really helpful context. Now, who do you consider your main competitors, and what do you think sets you apart from them?",
      "Great. What about your growth ambitions? Where do you see the company in 2-3 years, and what markets or segments are you targeting?",
      "Excellent. Let me summarise what I've gathered so far about your positioning. Does this capture things accurately?\n\n[PHASE_COMPLETE]",
    ];
    const idx = Math.min(Math.floor(messageCount / 2), questions.length - 1);
    return questions[idx];
  }

  const questions = [
    "Great, now let's talk about your brand voice. When someone reads your content, how do you want them to feel? Would you say you lean more formal and authoritative, or conversational and approachable?",
    "That makes sense. Let me give you some spectrum choices -- on a scale of technical jargon to plain English, where do you sit? And bold/provocative versus measured/conservative?",
    "Are there any brands or publications whose tone you admire? Could be inside or outside of insurance.",
    "What about words or phrases -- any that you love using, or any that make you cringe when you see them in insurance marketing?",
    "Perfect. Here's the brand voice profile I've built from our conversation. Does this feel right to you?\n\n[INTERVIEW_COMPLETE]",
  ];
  const idx = Math.min(Math.floor(messageCount / 2), questions.length - 1);
  return questions[idx];
}
