import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { NewsArticle } from './news';
import Anthropic from '@anthropic-ai/sdk';
import { getArchetypeById } from './voice-archetypes';
import { fireAndForget } from './validation';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  type: string;
  niche: string;
  description: string;
  brand_voice: string;
  brand_tone: string;
  compliance_frameworks?: string;
  locale?: string;
}

export interface GeneratedContent {
  id: string;
  company_id: string;
  article_ids: string;
  content_type: string;
  title: string;
  content: string;
  pillar_tags: string;
  status: string;
  created_at: string;
}

type ContentType = 'newsletter' | 'linkedin' | 'podcast' | 'briefing' | 'trade_media' | 'email';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

function buildArticleContext(articles: NewsArticle[]): string {
  return articles.map((a, i) => {
    const tags = JSON.parse(a.tags || '[]');
    return `Article ${i + 1}: "${a.title}"
Source: ${a.source}
Tags: ${tags.join(', ')}
Summary: ${a.summary}`;
  }).join('\n\n');
}

function buildCompanyContext(company: Company): string {
  return `Company: ${company.name}
Type: ${company.type || 'Insurance company'}
Niche: ${company.niche || 'Specialty Insurance'}
Brand Voice: ${company.brand_voice || 'Professional and authoritative'}
Description: ${company.description || ''}`;
}

function buildLocaleInstructions(locale: string): string {
  if (locale === 'en-US') {
    return `Write in American English. Use American spelling conventions (e.g. "organization", "color", "analyze", "defense", "license"). Use MM/DD/YYYY date formats. Reference US regulatory bodies (NAIC, State DOI, FTC) where appropriate. Use dollar ($) currency formatting.`;
  }
  return `Write in British English. Use British spelling conventions (e.g. "organisation", "colour", "analyse", "defence", "licence"). Use DD/MM/YYYY date formats. Reference UK regulatory bodies (FCA, PRA, Lloyd's) where appropriate. Use pound sterling (£) currency formatting.`;
}

const SYSTEM_PROMPT = `You are Monitus, an AI content engine for the insurance industry. You generate high-quality, compliant content for insurance companies including MGAs, brokers, and insurtechs.

OBJECTIVE EXECUTION MODE:
- Ground your writing in the context, narrative, and opportunity details provided. Use the company's positioning, market context, and strategic direction to produce credible, expert-level commentary.
- Never fabricate specific statistics, dates, names, or direct quotes. You may reference well-known industry trends and publicly available market dynamics.
- Write with authority on topics within the company's domain expertise. The company's narrative defines what they have a right to say.
- If the topic is clearly outside the company's expertise, note this rather than generating content.

Rules:
- Follow the locale instructions provided in each request for spelling and language conventions. Never use em-dashes. Use en-dashes or commas instead.
- Use professional, authoritative language appropriate for the insurance industry.
- Lead with the implication, not the event. Insurance professionals already know what happened. Tell them what it means.
- Have a point of view. Commentary should feel like expert interpretation, not summarisation.
- Include relevant regulatory disclaimers where appropriate.
- Never make guarantees about returns, coverage outcomes, or market performance.
- Reference the company's brand voice and niche when generating content.
- CRITICAL: Always use the EXACT company name as provided. Never alter, abbreviate, or substitute the company name. If the company is called "ThreatShield", write "ThreatShield" -- not "ThreatSecurity" or any variation.

FORBIDDEN LANGUAGE -- never use these words or phrases:
- cutting edge, revolutionary, game changing, disruptive
- proud to announce, excited to share, thrilled to
- leverage, synergy, best-in-class, world-class
- innovative (unless substantiated with specific evidence)

TONE:
- Emotionally neutral. No pleasantries, no fluff, no filler.
- Direct, concise, specific. Every sentence must earn its place.
- Sound like a sharp insurance market insider, not a marketing department.
- Use insurance industry language: cedents, capacity, binding authority, bordereaux, coverholder, syndicate, treaty, facultative -- where appropriate to the audience.`;

const TYPE_PROMPTS: Record<ContentType, string> = {
  newsletter: `Generate a professional weekly market intelligence newsletter. Structure:
1. Title with company name and week number
2. Opening paragraph summarizing the key themes
3. For each article, create a section with:
   - Headline
   - Summary of the development
   - "Why this matters for [niche]" analysis
   - Relevant tags
4. Market outlook paragraph
5. Regulatory disclaimer

Format in Markdown. Make it substantive and insightful, not just a summary.`,

  linkedin: `Generate 2 LinkedIn posts based on the articles. For each post:
1. Write in first person as the founder ("I", never "we" or third person)
2. Open with a contrarian opinion or provocative insight -- NOT the news itself
3. The reader should be 3 sentences in before they realise what the underlying news story is
4. Build the argument from the opinion, weaving in the news as supporting evidence
5. End with a specific observation or conclusion, NOT a question
6. No hashtags whatsoever
7. No promotional language ("we're proud to announce", "cutting-edge", "excited to share", etc.)
8. No emoji spam, keep it professional
9. Never use em-dashes. Use en-dashes or commas instead.
10. Do not fabricate any statistics, quotes, or details not present in the source articles. If confidence is below 90%, omit the claim.

Each post must be 150-200 words. Separate posts with "---".`,

  podcast: `Generate a podcast episode script. Structure:
1. Episode title and metadata (format, duration 15-20 min, producer)
2. Cold open with host introduction script
3. For each article (up to 3), create a segment with:
   - Segment title and estimated duration (4-5 min)
   - Host script introducing the topic
   - Key discussion points
   - Transition to next segment
4. Wrap-up with call to action
5. Outro with regulatory disclaimer

Write it as a complete, ready-to-read script.

IMPORTANT: Do NOT fabricate host names or staff names. Use placeholders like [HOST NAME] and [GUEST NAME, TITLE] so the user can fill in their own people.`,

  briefing: `Generate a formal client market briefing document. Structure:
1. Title, classification, date, preparer, niche focus
2. Executive summary (1 paragraph covering all developments)
3. For each article, create a "Key Development" section with:
   - Title and source/classification
   - Summary
   - Impact assessment for the company's niche
   - Recommended action
4. Forward look paragraph
5. Confidentiality notice and regulatory disclaimer

This should be a professional, boardroom-ready document.`,

  email: `Generate a professional email newsletter section. Structure:
1. Subject line (compelling, under 60 characters)
2. Preview text (40-90 characters)
3. Opening line — a warm, conversational hook that makes the reader want to continue
4. Body (200-300 words max):
   - Lead with the most important insight
   - Connect it to the reader's interests
   - Provide 2-3 key takeaways in bullet form
   - Weave in relevant article references naturally
5. Closing line with a soft call-to-action (not salesy)
6. P.S. line with one additional insight or teaser

Tone: conversational but authoritative. Write as if emailing a respected colleague.
The email should work as both HTML and plain text.`,

  trade_media: `Generate a complete trade media pitch package with these sections:

1. **PITCH BRIEF** (internal document)
   - News hook: What's the story angle?
   - Why now: Timeliness factor
   - Target publications: 3 specific trade publications that would run this
   - Target journalists: Types of journalists (beat, seniority)
   - Key message: One sentence the company wants in print

2. **PRESS RELEASE** (formal document)
   - Headline (attention-grabbing, newsworthy)
   - Sub-headline with company angle
   - Dateline and body (inverted pyramid: most important first)
   - Spokesperson quote (provocative, quotable, NOT generic)
   - Second quote from a different angle (customer impact or market view)
   - Boilerplate
   - Media contact template

3. **PITCH EMAIL** (to send to journalist)
   - Subject line (under 60 chars, no clickbait)
   - Opening: Why this is relevant to THEIR publication specifically
   - The hook: 2-3 sentences on the story
   - The offer: What you can provide (interview, data, exclusivity)
   - Sign-off with contact details

4. **SOCIAL AMPLIFICATION** (to post when coverage lands)
   - LinkedIn post celebrating the coverage (not salesy)
   - Internal stakeholder notification email template

5. **FOLLOW-UP PLAN**
   - Day 1: Send pitch
   - Day 3: Follow-up approach
   - Day 7: Alternative angle if no response

Make the spokesperson quotes provocative and insightful — something a journalist would actually want to use. The angle should be slightly controversial or forward-looking, backed by industry expertise.

IMPORTANT: Do NOT fabricate real-sounding spokesperson names. Use placeholders like [SPOKESPERSON NAME, TITLE] and [SECOND SPOKESPERSON NAME, TITLE] so the user can fill in their own people. Never invent names, titles, or biographical details for any spokesperson.`,
};

export interface VoiceProfile {
  preferred_tone: string;
  words_to_use: string[];
  words_to_avoid: string[];
  style_notes: string[];
  edit_count: number;
}

async function getVoiceProfile(companyId: string): Promise<VoiceProfile | null> {
  try {
    const result = await sql`
      SELECT original_text, edited_text, edit_type
      FROM voice_edits
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (result.rows.length < 3) return null;

    const edits = result.rows;

    // Analyse patterns across edits
    const wordsRemoved = new Map<string, number>();
    const wordsAdded = new Map<string, number>();
    const toneSignals: string[] = [];

    for (const edit of edits) {
      const origWords = new Set((edit.original_text as string).toLowerCase().split(/\s+/));
      const editWords = new Set((edit.edited_text as string).toLowerCase().split(/\s+/));

      // Words the user consistently removes
      for (const w of origWords) {
        if (!editWords.has(w) && w.length > 3) {
          wordsRemoved.set(w, (wordsRemoved.get(w) || 0) + 1);
        }
      }

      // Words the user consistently adds
      for (const w of editWords) {
        if (!origWords.has(w) && w.length > 3) {
          wordsAdded.set(w, (wordsAdded.get(w) || 0) + 1);
        }
      }

      // Detect tone shifts
      const origLen = (edit.original_text as string).length;
      const editLen = (edit.edited_text as string).length;
      if (editLen < origLen * 0.8) toneSignals.push('concise');
      if (editLen > origLen * 1.2) toneSignals.push('detailed');

      const origExclamations = ((edit.original_text as string).match(/!/g) || []).length;
      const editExclamations = ((edit.edited_text as string).match(/!/g) || []).length;
      if (editExclamations < origExclamations) toneSignals.push('formal');
      if (editExclamations > origExclamations) toneSignals.push('casual');

      // Passive to active detection
      const origPassive = ((edit.original_text as string).match(/\b(is|are|was|were|been|being)\s+\w+ed\b/gi) || []).length;
      const editPassive = ((edit.edited_text as string).match(/\b(is|are|was|were|been|being)\s+\w+ed\b/gi) || []).length;
      if (editPassive < origPassive) toneSignals.push('active-voice');
    }

    // Build profile from frequency analysis (threshold: appears in 2+ edits)
    const frequentRemoved = [...wordsRemoved.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    const frequentAdded = [...wordsAdded.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);

    // Determine preferred tone from signals
    const toneCounts: Record<string, number> = {};
    for (const signal of toneSignals) {
      toneCounts[signal] = (toneCounts[signal] || 0) + 1;
    }
    const dominantTone = Object.entries(toneCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tone]) => tone);

    const styleNotes: string[] = [];
    if (dominantTone.includes('concise')) styleNotes.push('User prefers concise writing — trim excess words');
    if (dominantTone.includes('detailed')) styleNotes.push('User prefers detailed explanations — be thorough');
    if (dominantTone.includes('formal')) styleNotes.push('User prefers formal tone — avoid exclamation marks and casual language');
    if (dominantTone.includes('casual')) styleNotes.push('User prefers conversational tone');
    if (dominantTone.includes('active-voice')) styleNotes.push('User prefers active voice — avoid passive constructions');

    return {
      preferred_tone: dominantTone[0] || 'professional',
      words_to_use: frequentAdded,
      words_to_avoid: frequentRemoved,
      style_notes: styleNotes,
      edit_count: edits.length,
    };
  } catch {
    // Table may not exist yet or other error — not critical
    return null;
  }
}

async function getNarrativeContext(narrativeId: string, companyId: string): Promise<string> {
  try {
    const bibleResult = await sql`
      SELECT * FROM messaging_bibles WHERE narrative_id = ${narrativeId} AND company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
    `;
    const bible = bibleResult.rows[0];
    if (!bible) return '';

    const parts: string[] = ['Narrative Context (practice area specific positioning):'];

    if (bible.company_description) {
      parts.push(`- Focus area description: ${bible.company_description}`);
    }

    const pillars = bible.messaging_pillars || bible.narrative_pillars;
    if (pillars) {
      try {
        const parsed = JSON.parse(pillars);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parts.push(`- Messaging pillars: ${parsed.map((p: any) => typeof p === 'string' ? p : p.name).join('; ')}`);
        }
      } catch {}
    }

    if (bible.elevator_pitch) {
      parts.push(`- Elevator pitch: ${bible.elevator_pitch}`);
    }

    if (bible.brand_voice_guide) {
      parts.push(`- Voice guide: ${bible.brand_voice_guide.substring(0, 500)}`);
    }

    const icpProfiles = bible.icp_profiles;
    if (icpProfiles) {
      try {
        const parsed = JSON.parse(icpProfiles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parts.push(`- Target buyer profiles: ${parsed.map((p: any) => p.name || p.role || '').filter(Boolean).join(', ')}`);
        }
      } catch {}
    }

    const voiceRules = bible.voice_rules;
    if (voiceRules) {
      try {
        const parsed = JSON.parse(voiceRules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parts.push(`- Voice rules: ${parsed.join('; ')}`);
        }
      } catch {}
    }

    const excludedLanguage = bible.excluded_language;
    if (excludedLanguage) {
      try {
        const parsed = JSON.parse(excludedLanguage);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parts.push(`- Excluded language: ${parsed.join(', ')}`);
        }
      } catch {}
    }

    return parts.length > 1 ? `\n\n${parts.join('\n')}` : '';
  } catch {
    return '';
  }
}

async function generateWithClaude(
  articles: NewsArticle[],
  company: Company,
  contentType: ContentType,
  options?: { channel?: string; department?: string; narrative_id?: string; }
): Promise<{ title: string; content: string }> {
  if (!anthropic) {
    // Fall back to template-based generation if no API key
    return generateWithTemplate(articles, company, contentType);
  }

  const articleContext = buildArticleContext(articles);
  const companyContext = buildCompanyContext(company);
  const typePrompt = TYPE_PROMPTS[contentType];

  // Fetch learned voice profile
  let voiceContext = '';
  try {
    // Check for voice archetype (stored in brand_voice field)
    const archetype = getArchetypeById(company.brand_voice);
    if (archetype) {
      const archetypeParts: string[] = [`Voice Archetype: "${archetype.name}" — ${archetype.description}`];
      archetypeParts.push(`- Tone keywords: ${archetype.toneKeywords.join(', ')}`);
      archetypeParts.push(`- Words to use: ${archetype.wordsToUse.join(', ')}`);
      archetypeParts.push(`- Words to avoid: ${archetype.wordsToAvoid.join(', ')}`);
      archetypeParts.push(`- Sample phrase style: "${archetype.samplePhrase}"`);
      voiceContext = `\n\n${archetypeParts.join('\n')}`;
    }

    const voiceProfile = await getVoiceProfile(company.id);
    if (voiceProfile && voiceProfile.edit_count >= 3) {
      const parts: string[] = ['Voice Profile (learned from user edits):'];
      parts.push(`- Preferred tone: ${voiceProfile.preferred_tone}`);
      if (voiceProfile.words_to_use.length > 0) {
        parts.push(`- Words to use: ${voiceProfile.words_to_use.join(', ')}`);
      }
      if (voiceProfile.words_to_avoid.length > 0) {
        parts.push(`- Words to avoid: ${voiceProfile.words_to_avoid.join(', ')}`);
      }
      if (voiceProfile.style_notes.length > 0) {
        parts.push(`- Style notes: ${voiceProfile.style_notes.join('; ')}`);
      }
      voiceContext += `\n\n${parts.join('\n')}`;
    }
  } catch {
    // Non-critical — proceed without voice profile
  }

  // Fetch narrative-specific context if narrative_id is provided
  let narrativeContext = '';
  if (options?.narrative_id) {
    narrativeContext = await getNarrativeContext(options.narrative_id, company.id);
  }

  let channelInstructions = '';
  if (options?.channel === 'linkedin') {
    channelInstructions = '\n\nChannel: LinkedIn. Write in first person as the founder ("I", not "we"). Open with a contrarian opinion or bold insight — do NOT lead with the news. The reader should be 3 sentences in before they realise the underlying news story. End with a specific observation, not a question. No hashtags. No promotional language. 150-200 words.';
  } else if (options?.channel === 'email') {
    channelInstructions = '\n\nChannel: Email Newsletter. Write as if emailing a respected colleague. Use a warm, conversational opening hook. Lead with the most important insight, then provide 2-3 key takeaways in bullet form. Keep body to 200-300 words max. Include a subject line (under 60 chars) and preview text (40-90 chars). Close with a soft CTA and a P.S. line with one additional insight. Must work as both HTML and plain text.';
  } else if (options?.channel === 'trade_media') {
    channelInstructions = '\n\nChannel: Trade Media/PR. Write for journalists. Lead with the newsworthy angle. Include a quotable spokesperson comment. Keep it factual but with a clear opinion angle.';
  }

  let departmentContext = '';
  if (options?.department) {
    const deptMap: Record<string, string> = {
      'c-suite': 'Target audience: C-Suite executives. Focus on strategic implications, market positioning, and business impact. Use high-level language, avoid technical details.',
      'underwriting': 'Target audience: Underwriting teams. Focus on risk assessment implications, pricing impact, and portfolio considerations. Be technical and specific.',
      'claims': 'Target audience: Claims department. Focus on claims trends, settlement implications, and operational impact.',
      'technology': 'Target audience: IT/Technology teams. Focus on technical implementation, integration considerations, and technology trends.',
      'compliance': 'Target audience: Compliance officers. Focus on regulatory implications, reporting requirements, and risk management frameworks.',
      'operations': 'Target audience: Operations teams. Focus on process impact, efficiency considerations, and practical implementation.',
      'marketing': 'Target audience: Marketing teams. Focus on messaging opportunities, brand positioning, and market differentiation.',
      'sales': 'Target audience: Sales teams. Focus on conversation starters, objection handling, and competitive positioning.',
    };
    const deptInstruction = deptMap[options.department];
    if (deptInstruction) {
      departmentContext = `\n\nIMPORTANT — DEPARTMENT TARGETING:\n${deptInstruction}\nYou MUST tailor the language, depth, and focus for this specific audience. The content should feel like it was written specifically for them, not a generic piece with a department label.`;
    }
  }

  const localeInstructions = buildLocaleInstructions(company.locale || 'en-GB');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `${companyContext}${voiceContext}${narrativeContext}

Locale: ${localeInstructions}

Source Articles:
${articleContext}

Task: ${typePrompt}${channelInstructions}${departmentContext}

Generate the ${contentType} content now. Output only the content itself, no meta-commentary.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract title from first markdown heading or first line
  const titleMatch = text.match(/^#\s+(.+)/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${company.name} — ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;

  // Append source citations footer
  const citationLines = articles
    .filter(a => a.title && a.source)
    .map((a, i) => {
      const url = a.source_url ? ` — [${a.source}](${a.source_url})` : ` — ${a.source}`;
      return `${i + 1}. *${a.title}*${url}`;
    });

  const contentWithCitations = citationLines.length > 0
    ? `${text}\n\n---\n\n**Sources**\n\n${citationLines.join('\n')}`
    : text;

  return { title, content: contentWithCitations };
}

// Template-based fallback (original implementation)
function generateWithTemplate(articles: NewsArticle[], company: Company, contentType: ContentType): { title: string; content: string } {
  switch (contentType) {
    case 'newsletter': return generateNewsletter(articles, company);
    case 'linkedin': return generateLinkedIn(articles, company);
    case 'podcast': return generatePodcast(articles, company);
    case 'briefing': return generateBriefing(articles, company);
    case 'trade_media': return generateTradeMedia(articles, company);
    case 'email': return generateEmail(articles, company);
  }
}

export async function generateContent(
  articles: NewsArticle[],
  company: Company,
  contentTypes: ContentType[],
  options?: { channel?: string; department?: string; narrative_id?: string; }
): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];
  await getDb();
  const articleIds = JSON.stringify(articles.map(a => a.id));

  for (const type of contentTypes) {
    const { title, content } = await generateWithClaude(articles, company, type, options);

    const id = uuidv4();

    // Use fast keyword matching for immediate pillar tags, then fire off
    // an async AI-powered tagging request so we stay within the 10s timeout.
    let pillarTags = '[]';
    try {
      const bibleResult = await sql`
        SELECT messaging_pillars FROM messaging_bibles
        WHERE company_id = ${company.id}
        ORDER BY updated_at DESC LIMIT 1
      `;
      const pillarsRaw = bibleResult.rows[0]?.messaging_pillars;
      const pillars: string[] = pillarsRaw ? JSON.parse(pillarsRaw) : [];

      if (pillars.length > 0) {
        // Immediate: keyword-based tagging (no API call, ~0ms)
        pillarTags = JSON.stringify(keywordMatchPillars(content, pillars));
      }
    } catch {
      // Non-critical — proceed without pillar tags
    }

    // Save to DB immediately so the response can return fast
    const narrativeId = options?.narrative_id || null;
    await sql`
      INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, compliance_notes, pillar_tags, status, narrative_id)
      VALUES (${id}, ${company.id}, ${articleIds}, ${type}, ${title}, ${content}, 'passed', '{}', ${pillarTags}, 'draft', ${narrativeId})
    `;

    // Fire-and-forget: let the AI tagging endpoint refine the tags asynchronously
    if (anthropic) {
      fireAndForget('/api/tag-content', {
        contentId: id,
        companyId: company.id,
        contentSnippet: content.substring(0, 2000),
      });
    }

    results.push({
      id, company_id: company.id, article_ids: articleIds, content_type: type,
      title, content, pillar_tags: pillarTags, status: 'draft',
      created_at: new Date().toISOString(),
      narrative_id: narrativeId,
      ...(options?.department ? { department: options.department } : {}),
      ...(options?.channel ? { channel: options.channel } : {}),
    } as any);
  }

  return results;
}

// Simple keyword matching for pillar tagging when Claude is unavailable
function keywordMatchPillars(content: string, pillars: string[]): string[] {
  const contentLower = content.toLowerCase();
  return pillars.filter((pillar) => {
    // Split pillar into keywords (words of 4+ chars)
    const keywords = pillar.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    // Match if at least one keyword appears in content
    return keywords.some((keyword) => contentLower.includes(keyword));
  });
}

// --- TEMPLATE FALLBACK FUNCTIONS ---

function generateNewsletter(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} Market Intelligence — Week ${weekNum}`;

  const articleSections = articles.map((a, i) => {
    const tags = JSON.parse(a.tags || '[]');
    const tagLabels = tags.map((t: string) => `#${t}`).join(' ');
    return `### ${i + 1}. ${a.title}\n\n${a.summary}\n\n**Why this matters for ${niche}:** ${generateInsight(a, company)}\n\n${tagLabels}`;
  }).join('\n\n---\n\n');

  const content = `# ${title}\n\n*Your weekly intelligence briefing from ${company.name}*\n*${today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n---\n\n## This Week's Key Developments\n\n${articleSections}\n\n---\n\n## Market Outlook\n\nThe developments covered this week signal continued evolution in the ${niche.toLowerCase()} market. We recommend that our clients and partners review their exposure to these emerging trends and consider how they may impact renewal strategies in the coming quarters.\n\n${company.name} continues to monitor these developments and will provide updates as market conditions evolve.\n\n---\n\n*This newsletter is prepared by ${company.name} for informational purposes only. It does not constitute advice or a recommendation. ${company.name} is authorised and regulated by the Financial Conduct Authority.*\n\n*To unsubscribe, reply to this email or contact us at info@${company.name.toLowerCase().replace(/\\s+/g, '')}.com*`;

  return { title, content };
}

function generateLinkedIn(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const mainArticle = articles[0];
  const niche = company.niche || 'insurance';

  const posts = articles.slice(0, 2).map((article, i) => {
    const insight = generateInsight(article, company);
    return `## Post ${i + 1}: ${article.title}\n\nI've been thinking about something that most people in ${niche.toLowerCase()} are getting wrong.\n\n${insight}\n\nThe underlying story here — ${article.summary.toLowerCase().substring(0, 120)} — only reinforces what I've seen firsthand.\n\nThe firms that will thrive in this environment are the ones rethinking their assumptions now, not waiting for the market to force their hand.\n\n---`;
  });

  return { title: `LinkedIn Posts — ${mainArticle.title.substring(0, 50)}...`, content: posts.join('\n\n') };
}

function generatePodcast(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} Market Pulse — Episode Script`;

  const topicSegments = articles.slice(0, 3).map((a, i) => {
    const insight = generateInsight(a, company);
    return `### Segment ${i + 1}: ${a.title}\n**Duration:** 4-5 minutes\n\n**Host script:**\n\n"Our ${i === 0 ? 'first' : i === 1 ? 'second' : 'final'} story this week takes us to ${a.source}."\n\n"${a.summary}"\n\n**Key discussion points:**\n- What this means for ${niche.toLowerCase()} specifically\n- ${insight}\n- How market participants should be positioning themselves\n\n**Transition:** "${i < articles.length - 1 ? 'Moving on to our next development...' : 'And that brings us to the end of this week\'s key stories.'}"`;
  });

  const content = `# ${title}\n\n## Episode Overview\n**Format:** Weekly market intelligence podcast\n**Duration:** 15-20 minutes\n**Produced by:** ${company.name}\n**Niche focus:** ${niche}\n\n---\n\n## Cold Open\n**Duration:** 1-2 minutes\n\n**Host script:**\n\n"Welcome to ${company.name} Market Pulse, your weekly briefing on the developments shaping the ${niche.toLowerCase()} market. I'm [Host Name], and this week we've got ${articles.length} key stories."\n\n"Let's dive straight in."\n\n---\n\n${topicSegments.join('\n\n---\n\n')}\n\n---\n\n## Wrap-Up\n\n"That's your market intelligence for this week. Don't forget to subscribe so you never miss an update. Until next time, stay sharp and stay informed."\n\n*"${company.name} Market Pulse is produced for informational purposes only and does not constitute insurance advice. ${company.name} is authorised and regulated by the Financial Conduct Authority."*`;

  return { title, content };
}

function generateBriefing(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} — Client Market Briefing`;

  const developments = articles.map((a, i) => {
    const insight = generateInsight(a, company);
    const tags = JSON.parse(a.tags || '[]');
    return `### ${i + 1}. ${a.title}\n\n**Source:** ${a.source} | **Classification:** ${tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}\n\n${a.summary}\n\n**Impact Assessment for ${niche}:**\n${insight}\n\n**Recommended Action:** ${generateAction(a, company)}`;
  });

  const content = `# ${title}\n\n**Classification:** For Client Distribution\n**Date:** ${today.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}\n**Prepared by:** ${company.name} Market Intelligence\n**Niche Focus:** ${niche}\n\n---\n\n## Executive Summary\n\nThis briefing covers ${articles.length} key market developments relevant to ${niche.toLowerCase()} from the past week.\n\n---\n\n## Key Developments\n\n${developments.join('\n\n---\n\n')}\n\n---\n\n## Forward Look\n\nBased on the developments outlined above, we anticipate continued market attention on these themes through the upcoming renewal season.\n\n---\n\n*This document is prepared by ${company.name} for the exclusive use of its clients and business partners. It does not constitute insurance or financial advice.*\n\n*${company.name} is authorised and regulated by the Financial Conduct Authority.*`;

  return { title, content };
}

function generateTradeMedia(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const mainArticle = articles[0];
  const tags = JSON.parse(mainArticle.tags || '[]');
  const companyType = company.type === 'mga' ? 'Managing General Agent' : company.type === 'broker' ? 'specialist broker' : 'insurtech company';
  const title = `${company.name} — Trade Media Pitch: ${mainArticle.title.substring(0, 60)}`;
  const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const emailDomain = company.name.toLowerCase().replace(/\s+/g, '');
  const insight = generateInsight(mainArticle, company);

  const content = `# ${company.name} — Trade Media Pitch Package

---

## 1. PITCH BRIEF (Internal Document)

**News Hook:** ${mainArticle.title} — ${company.name} offers expert commentary and market analysis on this significant ${niche.toLowerCase()} development.

**Why Now:** This development is breaking news in the ${niche.toLowerCase()} market. Journalists are actively seeking expert commentary from market practitioners who can contextualise the impact for their readers.

**Target Publications:**
1. Insurance Times — UK market focus, covers ${niche.toLowerCase()} extensively
2. The Insurer — London Market and specialty focus
3. Insurance Journal — Broader market perspective with ${tags[0] || niche.toLowerCase()} coverage

**Target Journalists:** Senior insurance reporters covering ${tags[0] || niche.toLowerCase()}; market intelligence editors; specialist correspondents with 3+ years on the ${niche.toLowerCase()} beat.

**Key Message:** "${company.name} believes this development will fundamentally reshape how ${niche.toLowerCase()} risk is assessed, priced, and transferred — and firms that act now will define the next generation of market leadership."

---

## 2. PRESS RELEASE

# ${mainArticle.title}: ${company.name} Outlines Impact on ${niche} Market

## Leading ${companyType} warns of significant implications for risk pricing and capacity

**${today} — London**

${mainArticle.summary}

As a leading ${companyType} in the ${niche.toLowerCase()} space, ${company.name} sees this development as a significant indicator of where the market is heading. ${insight}

"[SPOKESPERSON NAME, TITLE at ${company.name}] said: 'The industry needs to move beyond reactive positioning and start building frameworks that anticipate these shifts. ${insight} Those who adapt early will capture the opportunity; those who wait will find themselves playing catch-up. We are already working with our clients to adjust their strategies in light of this.'"

"[SECOND SPOKESPERSON / CLIENT PERSPECTIVE] said: 'From a customer standpoint, what matters is that their ${niche.toLowerCase()} partners are ahead of developments like this. ${company.name} has been proactive in helping us understand the implications and adjust our risk profile accordingly.'"

### About ${company.name}

${company.description || `${company.name} is a ${companyType} focused on the ${niche.toLowerCase()} market, providing specialist expertise and innovative solutions to clients across the insurance value chain.`}

### Media Contact

**Name:** [Media Contact Name]
**Title:** Head of Communications
**Email:** press@${emailDomain}.com
**Phone:** [Phone Number]

---

## 3. PITCH EMAIL

**Subject:** Expert comment: ${mainArticle.title.substring(0, 45)}

Hi [Journalist Name],

I noticed [PUBLICATION] has been covering developments in ${tags[0] || niche.toLowerCase()} closely — the recent piece on [RELATED TOPIC] was particularly insightful.

${company.name} has a strong perspective on the latest ${niche.toLowerCase()} developments: ${mainArticle.summary.substring(0, 150)}. Our [SPOKESPERSON NAME, TITLE] can provide on-the-record commentary on what this means for the wider market, including exclusive data on how ${niche.toLowerCase()} practitioners are responding.

Happy to arrange a 15-minute call, provide a written quote, or offer an exclusive angle for your publication. Let me know what works best.

Best regards,
[Your Name]
[Your Title], ${company.name}
press@${emailDomain}.com
[Phone Number]

---

## 4. SOCIAL AMPLIFICATION

### LinkedIn Post (when coverage lands)

Great to see [PUBLICATION] covering the latest developments in ${niche.toLowerCase()}.

Our [SPOKESPERSON NAME] shared ${company.name}'s perspective on what ${mainArticle.title.toLowerCase().substring(0, 60)} means for the market.

Key takeaway: ${insight}

The full piece is well worth a read for anyone in the ${niche.toLowerCase()} space. Link in comments.

#insurance #${niche.toLowerCase().replace(/\s+/g, '')} ${tags.map((t: string) => `#${t}`).join(' ')}

### Internal Stakeholder Notification

**Subject:** Media Coverage — ${company.name} quoted in [PUBLICATION]

Team,

${company.name} has been quoted in [PUBLICATION] regarding ${mainArticle.title.toLowerCase().substring(0, 80)}.

**Publication:** [PUBLICATION NAME]
**Article title:** [ARTICLE TITLE]
**Link:** [URL]
**Key quote used:** [PASTE RELEVANT QUOTE]

Please feel free to share on your personal LinkedIn profiles. A suggested post is available from the Communications team.

Regards,
[Communications Team]

---

## 5. FOLLOW-UP PLAN

**Day 1 — Send Pitch:**
Send the pitch email above to target journalists at the three identified publications. Personalise the opening line for each journalist based on their recent coverage.

**Day 3 — Follow-Up:**
If no response, send a brief follow-up: "Hi [Name], just circling back on the below. Happy to take a different angle if the original pitch isn't quite right for your current editorial calendar. We also have data on [RELATED TOPIC] if that's of interest."

**Day 7 — Alternative Angle:**
If still no response, pivot to a different story angle. Consider: (a) a data-led pitch with specific market statistics, (b) an opinion piece / byline offer, or (c) a broader industry trend piece that incorporates the original news hook as one element. Approach different journalists at the same publications or expand to secondary targets.`;

  return { title, content };
}

function generateEmail(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const mainArticle = articles[0];
  const insight = generateInsight(mainArticle, company);
  const tags = JSON.parse(mainArticle.tags || '[]');

  const subjectLine = `${mainArticle.title.substring(0, 55)}`;
  const previewText = `Key ${niche.toLowerCase()} developments you need to know about this week`;
  const title = `${company.name} — Email: ${subjectLine.substring(0, 50)}`;

  const takeaways = articles.slice(0, 3).map(a => {
    const aInsight = generateInsight(a, company);
    return `- **${a.title.substring(0, 60)}** — ${aInsight}`;
  }).join('\n');

  const content = `**Subject:** ${subjectLine}

**Preview:** ${previewText}

---

Hi there,

Something caught my eye this week that I think you will find genuinely useful — especially if you are navigating the ${niche.toLowerCase()} market right now.

${insight} The developments we are seeing suggest this is not a passing trend but a structural shift that will shape how ${niche.toLowerCase()} risk is assessed and priced going forward.

Here are the key takeaways worth your time:

${takeaways}

Each of these developments connects to a broader theme: the ${niche.toLowerCase()} market is evolving faster than most participants realise, and the firms paying attention now will be best positioned when renewal season arrives.

If any of these resonate, I would welcome a conversation about what they mean for your specific portfolio. Simply reply to this email — no formalities needed.

Best regards,
${company.name} Market Intelligence

P.S. Keep an eye on ${tags[0] || 'market'} developments over the coming weeks — early signals suggest there is more to come that could materially impact ${niche.toLowerCase()} pricing.

---

*This email is prepared by ${company.name} for informational purposes only. It does not constitute advice or a recommendation. ${company.name} is authorised and regulated by the Financial Conduct Authority.*`;

  return { title, content };
}

// --- HELPERS ---

function generateHook(article: NewsArticle): string {
  const tags = JSON.parse(article.tags || '[]');
  if (tags.includes('regulation')) return 'Important regulatory update that will impact how the industry approaches risk.';
  if (tags.includes('ils') || tags.includes('reinsurance')) return 'New data just dropped that has significant implications for the specialty market.';
  if (tags.includes('cyber')) return 'Breaking development in the insurance market that every underwriter should be watching closely.';
  return 'The market is shifting. Here is what you need to know about the latest development.';
}

function generateInsight(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');
  const niche = company.niche || 'specialty insurance';
  const insights: Record<string, string> = {
    cyber: `For ${niche} specialists, this development directly impacts how cyber risk is assessed, priced, and transferred.`,
    regulation: `Regulatory shifts like this require immediate attention from ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'insurtech firms'} in the ${niche} space.`,
    lloyds: `As a ${niche} specialist in the London Market, this has direct implications for how we structure and place risk.`,
    reinsurance: `The reinsurance market dynamics described here will flow through to the ${niche} market via pricing, capacity, and treaty terms.`,
    climate: `Climate risk continues to reshape the insurance landscape for ${niche} practitioners.`,
    insurtech: `The technology evolution in insurance continues to accelerate for ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'carriers'}.`,
    ils: `The convergence of traditional and alternative risk transfer creates new opportunities for ${niche}.`,
  };
  for (const tag of tags) {
    if (insights[tag]) return insights[tag];
  }
  return `This development has implications across the ${niche} market.`;
}

function generateAction(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');
  if (tags.includes('regulation')) return 'Review compliance framework and update internal processes.';
  if (tags.includes('cyber')) return 'Assess current cyber exposure and review policy wordings.';
  if (tags.includes('climate')) return 'Review natural catastrophe exposure models and update accumulation scenarios.';
  if (tags.includes('lloyds')) return 'Monitor capacity provider communications and review placement strategy.';
  if (tags.includes('reinsurance')) return 'Evaluate reinsurance programme structure and engage with partners ahead of renewal.';
  return 'Monitor developments and assess potential impact on current portfolio.';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

async function generateTopicWithClaude(
  topic: string,
  context: string,
  company: Company,
  contentType: ContentType,
  options?: { channel?: string; department?: string; narrative_id?: string; }
): Promise<{ title: string; content: string }> {
  if (!anthropic) {
    // Fall back to a simple template when no API key is available
    const title = `${company.name} — ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${topic.substring(0, 60)}`;
    const content = `# ${title}\n\n**Topic:** ${topic}\n\n${context ? `**Context:** ${context}\n\n` : ''}*Content generation is temporarily unavailable. Please try again shortly.*`;
    return { title, content };
  }

  const companyContext = buildCompanyContext(company);
  const typePrompt = TYPE_PROMPTS[contentType];

  // Build topic-specific source context
  const topicContext = `Topic: ${topic}${context ? `\nAdditional Context: ${context}` : ''}`;

  // Fetch learned voice profile (same as article-based)
  let voiceContext = '';
  try {
    const archetype = getArchetypeById(company.brand_voice);
    if (archetype) {
      const archetypeParts: string[] = [`Voice Archetype: "${archetype.name}" — ${archetype.description}`];
      archetypeParts.push(`- Tone keywords: ${archetype.toneKeywords.join(', ')}`);
      archetypeParts.push(`- Words to use: ${archetype.wordsToUse.join(', ')}`);
      archetypeParts.push(`- Words to avoid: ${archetype.wordsToAvoid.join(', ')}`);
      archetypeParts.push(`- Sample phrase style: "${archetype.samplePhrase}"`);
      voiceContext = `\n\n${archetypeParts.join('\n')}`;
    }

    const voiceProfile = await getVoiceProfile(company.id);
    if (voiceProfile && voiceProfile.edit_count >= 3) {
      const parts: string[] = ['Voice Profile (learned from user edits):'];
      parts.push(`- Preferred tone: ${voiceProfile.preferred_tone}`);
      if (voiceProfile.words_to_use.length > 0) {
        parts.push(`- Words to use: ${voiceProfile.words_to_use.join(', ')}`);
      }
      if (voiceProfile.words_to_avoid.length > 0) {
        parts.push(`- Words to avoid: ${voiceProfile.words_to_avoid.join(', ')}`);
      }
      if (voiceProfile.style_notes.length > 0) {
        parts.push(`- Style notes: ${voiceProfile.style_notes.join('; ')}`);
      }
      voiceContext += `\n\n${parts.join('\n')}`;
    }
  } catch {
    // Non-critical — proceed without voice profile
  }

  // Fetch narrative-specific context if narrative_id is provided
  let narrativeContext = '';
  if (options?.narrative_id) {
    narrativeContext = await getNarrativeContext(options.narrative_id, company.id);
  }

  let channelInstructions = '';
  if (options?.channel === 'linkedin') {
    channelInstructions = '\n\nChannel: LinkedIn. Write in first person as the founder ("I", not "we"). Open with a contrarian opinion or bold insight — do NOT lead with the topic directly. The reader should be 3 sentences in before they realise the underlying subject. End with a specific observation, not a question. No hashtags. No promotional language. 150-200 words.';
  } else if (options?.channel === 'email') {
    channelInstructions = '\n\nChannel: Email Newsletter. Write as if emailing a respected colleague. Use a warm, conversational opening hook. Lead with the most important insight, then provide 2-3 key takeaways in bullet form. Keep body to 200-300 words max. Include a subject line (under 60 chars) and preview text (40-90 chars). Close with a soft CTA and a P.S. line with one additional insight. Must work as both HTML and plain text.';
  } else if (options?.channel === 'trade_media') {
    channelInstructions = '\n\nChannel: Trade Media/PR. Write for journalists. Lead with the newsworthy angle. Include a quotable spokesperson comment. Keep it factual but with a clear opinion angle.';
  }

  let departmentContext = '';
  if (options?.department) {
    const deptMap: Record<string, string> = {
      'c-suite': 'Target audience: C-Suite executives. Focus on strategic implications, market positioning, and business impact. Use high-level language, avoid technical details.',
      'underwriting': 'Target audience: Underwriting teams. Focus on risk assessment implications, pricing impact, and portfolio considerations. Be technical and specific.',
      'claims': 'Target audience: Claims department. Focus on claims trends, settlement implications, and operational impact.',
      'technology': 'Target audience: IT/Technology teams. Focus on technical implementation, integration considerations, and technology trends.',
      'compliance': 'Target audience: Compliance officers. Focus on regulatory implications, reporting requirements, and risk management frameworks.',
      'operations': 'Target audience: Operations teams. Focus on process impact, efficiency considerations, and practical implementation.',
      'marketing': 'Target audience: Marketing teams. Focus on messaging opportunities, brand positioning, and market differentiation.',
      'sales': 'Target audience: Sales teams. Focus on conversation starters, objection handling, and competitive positioning.',
    };
    const deptInstruction = deptMap[options.department];
    if (deptInstruction) {
      departmentContext = `\n\nIMPORTANT — DEPARTMENT TARGETING:\n${deptInstruction}\nYou MUST tailor the language, depth, and focus for this specific audience. The content should feel like it was written specifically for them, not a generic piece with a department label.`;
    }
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `${companyContext}${voiceContext}${narrativeContext}

The user has provided a topic and context for content generation (there are no source articles — generate based on the provided topic and your knowledge of the insurance industry):

${topicContext}

Task: ${typePrompt}${channelInstructions}${departmentContext}

Generate the ${contentType} content now based on the provided topic and context. Draw on your knowledge of the insurance industry to create substantive, insightful content. Output only the content itself, no meta-commentary.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract title from first markdown heading or first line
  const titleMatch = text.match(/^#\s+(.+)/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${company.name} — ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;

  return { title, content: text };
}

export async function generateFromTopic(
  topic: string,
  context: string,
  company: Company,
  contentTypes: ContentType[],
  options?: { channel?: string; department?: string; narrative_id?: string; }
): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];
  await getDb();

  for (const type of contentTypes) {
    const { title, content } = await generateTopicWithClaude(topic, context, company, type, options);

    const id = uuidv4();

    // Use fast keyword matching for immediate pillar tags, then fire off
    // an async AI-powered tagging request so we stay within the 10s timeout.
    let pillarTags = '[]';
    try {
      const bibleResult = await sql`
        SELECT messaging_pillars FROM messaging_bibles
        WHERE company_id = ${company.id}
        ORDER BY updated_at DESC LIMIT 1
      `;
      const pillarsRaw = bibleResult.rows[0]?.messaging_pillars;
      const pillars: string[] = pillarsRaw ? JSON.parse(pillarsRaw) : [];

      if (pillars.length > 0) {
        pillarTags = JSON.stringify(keywordMatchPillars(content, pillars));
      }
    } catch {
      // Non-critical — proceed without pillar tags
    }

    // Save to DB immediately so the response can return fast
    const narrativeId = options?.narrative_id || null;
    await sql`
      INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, compliance_notes, pillar_tags, status, source_type, topic_brief, narrative_id)
      VALUES (${id}, ${company.id}, ${'[]'}, ${type}, ${title}, ${content}, 'passed', '{}', ${pillarTags}, 'draft', 'topic', ${topic}, ${narrativeId})
    `;

    // Fire-and-forget: let the AI tagging endpoint refine the tags asynchronously
    if (anthropic) {
      fireAndForget('/api/tag-content', {
        contentId: id,
        companyId: company.id,
        contentSnippet: content.substring(0, 2000),
      });
    }

    results.push({
      id, company_id: company.id, article_ids: '[]', content_type: type,
      title, content, pillar_tags: pillarTags, status: 'draft',
      created_at: new Date().toISOString(),
      narrative_id: narrativeId,
      ...(options?.department ? { department: options.department } : {}),
      ...(options?.channel ? { channel: options.channel } : {}),
    } as any);
  }

  return results;
}

export async function getContentByCompany(companyId: string, type?: string): Promise<GeneratedContent[]> {
  await getDb();
  if (type) {
    const result = await sql`SELECT * FROM generated_content WHERE company_id = ${companyId} AND content_type = ${type} ORDER BY created_at DESC`;
    return result.rows as unknown as GeneratedContent[];
  }
  const result = await sql`SELECT * FROM generated_content WHERE company_id = ${companyId} ORDER BY created_at DESC`;
  return result.rows as unknown as GeneratedContent[];
}

/**
 * Generate a stakeholder-specific variant of existing content.
 * Takes an existing piece of content and rewrites it for a specific stakeholder
 * using the Stakeholder Messaging Matrix from the messaging bible.
 */
export async function generateStakeholderVariant(
  companyId: string,
  contentId: string,
  targetStakeholder: string,
  coreArgument: string,
  recommendation?: { why_it_matters?: string; why_now?: string; source_development?: string; }
): Promise<{ id: string; content: string; title: string }> {
  if (!anthropic) {
    throw new Error('Anthropic API key not configured');
  }

  await getDb();

  // Fetch original content
  const contentResult = await sql`
    SELECT * FROM generated_content WHERE id = ${contentId} AND company_id = ${companyId}
  `;
  if (!contentResult.rows.length) {
    throw new Error('Content not found');
  }
  const original = contentResult.rows[0];

  // Fetch company
  const companyResult = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
  if (!companyResult.rows.length) {
    throw new Error('Company not found');
  }
  const company = companyResult.rows[0];

  // Fetch messaging bible + stakeholder matrix
  const bibleResult = await sql`
    SELECT * FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
  `;
  const bible = bibleResult.rows[0];

  let stakeholderContext = '';
  if (bible?.stakeholder_matrix) {
    try {
      const matrix = JSON.parse(bible.stakeholder_matrix);
      if (Array.isArray(matrix) && matrix.length > 0) {
        stakeholderContext = `\nStakeholder Messaging Matrix:\n${JSON.stringify(matrix, null, 2)}`;
      }
    } catch {}
  }

  let icpContext = '';
  if (bible?.icp_profiles) {
    try {
      const icps = JSON.parse(bible.icp_profiles);
      if (Array.isArray(icps) && icps.length > 0) {
        icpContext = `\nICP Profiles:\n${JSON.stringify(icps, null, 2)}`;
      }
    } catch {}
  }

  const localeInstructions = buildLocaleInstructions(company.locale || 'en-GB');

  const prompt = `You are a Content Producer for an insurance/insurtech company. Your job is to rewrite an existing piece of content for a SPECIFIC stakeholder audience.

COMPANY: ${company.name}
TYPE: ${company.type || 'Insurance company'}
NICHE: ${company.niche || 'Specialty Insurance'}
${stakeholderContext}
${icpContext}

TARGET STAKEHOLDER: ${targetStakeholder}
CORE ARGUMENT: ${coreArgument}
${recommendation?.source_development ? `SOURCE DEVELOPMENT: ${recommendation.source_development}` : ''}
${recommendation?.why_it_matters ? `WHY IT MATTERS: ${recommendation.why_it_matters}` : ''}
${recommendation?.why_now ? `WHY NOW: ${recommendation.why_now}` : ''}

ORIGINAL CONTENT:
${String(original.content).substring(0, 4000)}

Rewrite this content specifically for the "${targetStakeholder}" stakeholder. Change:
1. THE LEAD: What gets their attention first — what does ${targetStakeholder} care about most?
2. THE IMPLICATION: What does this mean for THEM in their role?
3. THE PROOF: What evidence resonates with ${targetStakeholder}? (data, case studies, regulatory references, etc.)
4. THE FRAMING: Use their language, their concerns, their metrics
5. THE CLOSE/CTA: What action should ${targetStakeholder} take?

${localeInstructions}

Output the rewritten content only. No meta-commentary. Keep the same approximate length and format as the original.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract title
  const titleMatch = text.match(/^#\s+(.+)/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${String(original.title)} — ${targetStakeholder} Variant`;

  // Store as new content piece linked to the original
  const id = uuidv4();
  const contentType = String(original.content_type);

  await sql`
    INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, pillar_tags, status, source_type)
    VALUES (${id}, ${companyId}, ${String(original.article_ids || '[]')}, ${contentType}, ${title}, ${text}, 'pending', ${String(original.pillar_tags || '[]')}, 'draft', 'stakeholder_variant')
  `;

  return { id, content: text, title };
}
