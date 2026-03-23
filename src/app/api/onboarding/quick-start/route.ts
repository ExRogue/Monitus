import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit, sanitizeString } from '@/lib/validation';
import Anthropic from '@anthropic-ai/sdk';
import { analyzeSignalRelevance, analyzeBatch, MessagingBible } from '@/lib/signals';
import { generateOpportunitiesFromSignals } from '@/lib/opportunities';
import { NewsArticle } from '@/lib/news';

export const maxDuration = 60;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * POST /api/onboarding/quick-start
 *
 * Orchestrates the full "60-second onboarding" pipeline:
 *   1. Scan the website (or accept pre-scanned data)
 *   2. Create company + messaging bible from website context alone
 *   3. Generate the narrative document (streamed)
 *
 * Returns SSE stream with progress steps + final result.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`quick-start:${user.id}`, 10, 300_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Please wait a few minutes before trying again.' },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, websiteData, websiteRawText, narrativeId } = body;

  if (!url && !websiteData) {
    return NextResponse.json({ error: 'URL or website data required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, any>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {}
      };

      try {
        await getDb();

        // --- Step 1: Scan website (or use pre-scanned data) ---
        let extracted = websiteData;
        let rawText = websiteRawText || '';

        if (!extracted && url) {
          send({ step: 'scanning', label: 'Scanning website...' });

          const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
          const pages = [parsedUrl.toString()];
          const aboutPaths = ['/about', '/about-us', '/company', '/who-we-are', '/solutions', '/products'];
          for (const path of aboutPaths) {
            pages.push(new URL(path, parsedUrl.origin).toString());
          }

          const results: string[] = [];
          for (const pageUrl of pages) {
            try {
              const res = await fetch(pageUrl, {
                headers: { 'User-Agent': 'Monitus/1.0 (Content Platform; website scanner)' },
                signal: AbortSignal.timeout(5000),
              });
              if (!res.ok) continue;
              const html = await res.text();
              const cleaned = html
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<nav[\s\S]*?<\/nav>/gi, '')
                .replace(/<footer[\s\S]*?<\/footer>/gi, '')
                .replace(/<header[\s\S]*?<\/header>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim();
              if (cleaned.length > 100) {
                results.push(`--- ${pageUrl} ---\n${cleaned.substring(0, 3000)}`);
              }
            } catch {}
          }

          if (results.length === 0) {
            send({ error: 'Could not extract content from that website. Please check the URL.' });
            controller.close();
            return;
          }

          rawText = results.join('\n\n').substring(0, 10000);
          send({ step: 'scanning_done', label: 'Scanning website...' });

          // Extract structured data with Claude
          send({ step: 'extracting', label: 'Extracting positioning...' });

          if (anthropic) {
            try {
              const extractRes = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2000,
                messages: [{
                  role: 'user',
                  content: `Analyse the following website content and extract key company information. Return ONLY valid JSON with no additional text or markdown.

Website content:
${rawText}

Return this exact JSON structure (use empty string "" if information is not found):
{
  "company_name": "The company's name",
  "what_they_do": "2-3 sentence description of what the company does",
  "target_market": "Who their ideal customers/buyers are",
  "value_proposition": "Their core value proposition",
  "key_differentiators": "What makes them different, unique advantages",
  "competitors_mentioned": "Any competitors or alternatives mentioned",
  "tone_of_voice": "The tone/voice of the website (professional, casual, technical, bold, etc.)",
  "product_features": "Key products or features mentioned",
  "team_info": "Any team or leadership information found",
  "summary": "A comprehensive 4-5 sentence summary of everything known about this company from the website"
}`,
                }],
              });
              const text = extractRes.content[0].type === 'text' ? extractRes.content[0].text : '{}';
              extracted = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
            } catch {
              extracted = {
                company_name: new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '').split('.')[0],
                what_they_do: '',
                summary: rawText.substring(0, 500),
              };
            }
          }

          send({ step: 'extracting_done', label: 'Extracting positioning...' });
        }

        if (!extracted) {
          // Anthropic key may be missing — build a basic fallback from raw text
          if (rawText) {
            const hostname = url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '').split('.')[0] : 'My Company';
            extracted = {
              company_name: hostname.charAt(0).toUpperCase() + hostname.slice(1),
              what_they_do: '',
              summary: rawText.substring(0, 500),
            };
          } else {
            send({ error: 'Failed to extract website data.' });
            controller.close();
            return;
          }
        }

        // --- Step 2: Create/update company + bible record ---
        send({ step: 'building_narrative', label: 'Building draft narrative...' });

        const companyName = sanitizeString(extracted.company_name || 'My Company', 200);
        const companyDescription = sanitizeString(
          [extracted.what_they_do, extracted.value_proposition, extracted.summary]
            .filter(Boolean).join('. '),
          2000
        );

        // Create or update company
        const companyResult = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
        let company = companyResult.rows[0];

        if (!company) {
          const companyId = uuidv4();
          await sql`
            INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice)
            VALUES (${companyId}, ${user.id}, ${companyName}, 'insurtech', ${sanitizeString(extracted.target_market || '', 200)}, ${companyDescription}, ${sanitizeString(extracted.tone_of_voice || 'Professional and authoritative', 100)})
          `;
          const newResult = await sql`SELECT * FROM companies WHERE id = ${companyId}`;
          company = newResult.rows[0];
        } else {
          // Update with website data (only if fields are more complete)
          await sql`
            UPDATE companies SET
              name = CASE WHEN ${companyName} != 'My Company' THEN ${companyName} ELSE COALESCE(NULLIF(name, 'My Company'), ${companyName}) END,
              description = CASE WHEN LENGTH(${companyDescription}) > LENGTH(COALESCE(description, '')) THEN ${companyDescription} ELSE description END,
              niche = COALESCE(NULLIF(niche, ''), ${sanitizeString(extracted.target_market || '', 200)}),
              brand_voice = COALESCE(NULLIF(brand_voice, ''), ${sanitizeString(extracted.tone_of_voice || '', 100)}),
              updated_at = NOW()
            WHERE id = ${company.id}
          `;
          const updated = await sql`SELECT * FROM companies WHERE id = ${company.id}`;
          company = updated.rows[0];
        }

        // Build the website context string for generation
        const websiteContext = [
          extracted.company_name && `Company: ${extracted.company_name}`,
          extracted.what_they_do && `What they do: ${extracted.what_they_do}`,
          extracted.target_market && `Target market: ${extracted.target_market}`,
          extracted.value_proposition && `Value proposition: ${extracted.value_proposition}`,
          extracted.key_differentiators && `Differentiators: ${extracted.key_differentiators}`,
          extracted.competitors_mentioned && `Competitors: ${extracted.competitors_mentioned}`,
          extracted.tone_of_voice && `Tone: ${extracted.tone_of_voice}`,
          extracted.product_features && `Products/features: ${extracted.product_features}`,
          extracted.team_info && `Team: ${extracted.team_info}`,
          extracted.summary && `Summary: ${extracted.summary}`,
        ].filter(Boolean).join('\n');

        // Create messaging bible record
        const effectiveNarrativeId = narrativeId || null;
        let bibleId: string;

        // Check for existing bible
        let existingBible;
        if (effectiveNarrativeId) {
          existingBible = await sql`
            SELECT id FROM messaging_bibles WHERE company_id = ${company.id} AND narrative_id = ${effectiveNarrativeId} ORDER BY updated_at DESC LIMIT 1
          `;
        } else {
          existingBible = await sql`
            SELECT id FROM messaging_bibles WHERE company_id = ${company.id} ORDER BY updated_at DESC LIMIT 1
          `;
        }

        bibleId = existingBible.rows[0]?.id || uuidv4();

        // Build target audiences from website data
        const targetAudiences = extracted.target_market
          ? JSON.stringify([{ name: extracted.target_market, role: '', painPoints: '' }])
          : '[]';

        // Build competitors from website data
        const competitors = extracted.competitors_mentioned
          ? JSON.stringify([{ name: extracted.competitors_mentioned, difference: '' }])
          : '[]';

        // Build differentiators from website data
        const differentiators = extracted.key_differentiators
          ? JSON.stringify([extracted.key_differentiators])
          : '[]';

        if (existingBible.rows[0]) {
          await sql`
            UPDATE messaging_bibles SET
              company_description = ${companyDescription},
              target_audiences = ${targetAudiences},
              competitors = ${competitors},
              differentiators = ${differentiators},
              status = 'draft',
              updated_at = NOW()
            WHERE id = ${bibleId}
          `;
        } else {
          await sql`
            INSERT INTO messaging_bibles (id, company_id, company_description, target_audiences, competitors, differentiators, key_challenges, departments, channels, narrative_id)
            VALUES (${bibleId}, ${company.id}, ${companyDescription}, ${targetAudiences}, ${competitors}, ${differentiators}, '[]', '[]', '["linkedin","email","trade_media"]', ${effectiveNarrativeId})
          `;
        }

        // --- Step 3: Generate narrative with streaming ---
        if (!anthropic) {
          send({ step: 'building_narrative_done', label: 'Building draft narrative...' });
          send({ done: true, bibleId, companyName: company.name, extracted });
          controller.close();
          return;
        }

        const SYSTEM_PROMPT = `You are Monitus, a strategic messaging consultant for insurance and insurtech companies. You create comprehensive Narrative documents that define how a company should communicate across all channels.

IMPORTANT: This is a DRAFT narrative generated automatically from a website scan. It should be clearly good and useful, but acknowledge it can be refined further with direct input from the team.

Generate a complete Narrative document in Markdown format with these sections:

1. **Executive Summary** -- 2-3 paragraph overview of the company's positioning and communication strategy
2. **Brand Voice & Tone Guidelines** -- Detailed guide on how the company should sound
3. **Elevator Pitch** -- Both a 30-second and 60-second version
4. **Tagline Options** -- 3 distinct options with rationale for each
5. **Ideal Customer Profiles (ICPs)** -- For each target audience, create a detailed profile with:
   - Who they are (role, company type, seniority)
   - Their key pain points
   - What they care about
   - How to reach them
   - Key messages that resonate
6. **Messaging Pillars** -- 3-5 core themes. For each:
   - Pillar name
   - Why it matters
   - Proof points
   - Sample messaging
7. **Channel-Specific Guidelines**:
   - **LinkedIn**: tone, post structure, content themes, frequency, example post
   - **Email Newsletter**: tone, format, section structure, frequency
   - **Trade Media/PR**: pitch angles, spokesperson quote templates
8. **Competitive Differentiation** -- How to position against competitors
9. **Do's and Don'ts** -- Clear rules for brand communication

Write in British English. Be specific, actionable, and tailored to this exact company. Not generic.`;

        const userPrompt = `Create a complete Narrative for this company based on their website:

**Company:** ${company.name}
**Type:** ${company.type || 'Insurtech'}
**Niche:** ${company.niche || 'Insurance technology'}
**Description:** ${companyDescription || 'Not provided'}

**Context from website scan:**
${websiteContext}

${rawText ? `\n**Raw website text (for additional context):**\n${rawText.substring(0, 4000)}\n` : ''}

Generate a complete, specific Narrative now. Make it tailored to ${company.name} -- reference their actual positioning, market, and differentiators throughout. This is a draft generated from website data alone, so infer intelligently where data is sparse, but stay grounded in what was found.`;

        const stream = await anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });

        send({ step: 'building_narrative_done', label: 'Building draft narrative...' });
        send({ step: 'generating', label: 'Writing your narrative...' });

        let fullDocument = '';

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullDocument += event.delta.text;
          }
        }

        send({ step: 'generating_done', label: 'Writing your narrative...' });

        // --- Step 4: Extract structured fields ---
        send({ step: 'extracting_fields', label: 'Analysing narrative structure...' });

        let elevatorPitch = '';
        let icpProfiles = '[]';
        let messagingPillars = '';

        try {
          const extractionResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: `Extract two things from this Narrative document. Return ONLY valid JSON with this exact structure:

{
  "elevator_pitch": "The 30-second elevator pitch from the document. Copy it exactly as written.",
  "icp_profiles": [
    {
      "name": "profile name",
      "role": "their job title",
      "company_type": "type of company they work at",
      "pain_points": ["pain point 1", "pain point 2"],
      "what_they_care_about": ["priority 1", "priority 2"],
      "how_to_reach_them": "channel/approach",
      "key_messages": ["message 1", "message 2"],
      "objections": ["objection 1", "objection 2"]
    }
  ]
}

Document:
${fullDocument.substring(0, 6000)}

Return ONLY the JSON, no markdown.`,
            }],
          });
          const extractText = extractionResponse.content[0].type === 'text' ? extractionResponse.content[0].text : '{}';
          const parsed = JSON.parse(extractText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
          if (parsed.elevator_pitch) elevatorPitch = String(parsed.elevator_pitch).substring(0, 1000);
          if (Array.isArray(parsed.icp_profiles)) icpProfiles = JSON.stringify(parsed.icp_profiles);
        } catch {}

        // Extract messaging pillars
        const pillarsMatch = fullDocument.match(/messaging pillars[^]*?(?=##\s|$)/i);
        messagingPillars = pillarsMatch ? pillarsMatch[0].substring(0, 2000) : '';

        // Save the generated narrative
        await sql`
          UPDATE messaging_bibles SET
            full_document = ${fullDocument},
            elevator_pitch = ${elevatorPitch},
            icp_profiles = ${icpProfiles},
            messaging_pillars = ${messagingPillars},
            status = 'complete',
            updated_at = NOW()
          WHERE id = ${bibleId}
        `;

        // Update company brand voice
        const voiceMatch = fullDocument.match(/brand voice[^]*?(?=##|$)/i);
        if (voiceMatch) {
          const voiceSummary = voiceMatch[0].substring(0, 500);
          await sql`
            UPDATE companies SET brand_voice = ${voiceSummary}, updated_at = NOW()
            WHERE id = ${company.id}
          `;
        }

        send({ step: 'extracting_fields_done', label: 'Analysing narrative structure...' });

        // --- Step 5: 7-day bootstrap scan — analyse recent articles and auto-generate opportunities ---
        send({ step: 'analyzing_signals', label: 'Scanning market intelligence...' });

        let signalCount = 0;
        let topSignals: any[] = [];
        let bootstrapOpportunities = 0;
        try {
          // Fetch recent articles from the last 7 days
          const recentArticles = await sql`
            SELECT id, title, summary, source, source_url, category, tags, published_at
            FROM news_articles
            WHERE published_at >= NOW() - INTERVAL '7 days'
            ORDER BY published_at DESC
            LIMIT 20
          `;
          signalCount = recentArticles.rows.length;

          if (signalCount > 0 && anthropic) {
            // Build the messaging bible object for signal analysis
            const bibleForAnalysis: MessagingBible = {
              id: bibleId,
              company_id: company.id as string,
              elevator_pitch: elevatorPitch,
              messaging_pillars: messagingPillars,
              icp_profiles: icpProfiles,
              competitors: existingBible.rows[0]?.competitors || competitors || '[]',
              target_audiences: existingBible.rows[0]?.target_audiences || targetAudiences || '[]',
              company_description: companyDescription,
              differentiators: existingBible.rows[0]?.differentiators || differentiators || '[]',
              stakeholder_matrix: existingBible.rows[0]?.stakeholder_matrix || '[]',
            };

            // Run enhanced 8-dimension signal analysis on up to 20 articles (5 concurrent)
            const articles = recentArticles.rows.map(r => ({
              id: r.id as string,
              title: r.title as string,
              summary: (r.summary || '') as string,
              source: (r.source || '') as string,
              source_url: (r.source_url || '') as string,
              category: (r.category || '') as string,
              tags: (r.tags || '[]') as string,
              published_at: (r.published_at || '') as string,
              content: '',
              fetched_at: '',
            })) as NewsArticle[];

            const analysisResults = await analyzeBatch(articles, bibleForAnalysis, 5);

            // Store signal analyses in DB
            for (const analysis of analysisResults) {
              try {
                await sql`
                  INSERT INTO signal_analyses (
                    id, company_id, article_id, narrative_fit, urgency,
                    why_it_matters, why_it_matters_to_buyers, recommended_action,
                    competitor_context, themes,
                    icp_fit, stakeholder_fit_score, right_to_say, strategic_significance,
                    timeliness, competitor_relevance, actionability, usefulness_score,
                    strongest_stakeholder, secondary_stakeholder, reasoning
                  ) VALUES (
                    ${uuidv4()}, ${analysis.company_id}, ${analysis.article_id},
                    ${analysis.narrative_fit}, ${analysis.urgency},
                    ${analysis.why_it_matters}, ${analysis.why_it_matters_to_buyers},
                    ${analysis.recommended_action}, ${analysis.competitor_context},
                    ${JSON.stringify(analysis.themes)},
                    ${analysis.icp_fit}, ${analysis.stakeholder_fit_score}, ${analysis.right_to_say},
                    ${analysis.strategic_significance}, ${analysis.timeliness},
                    ${analysis.competitor_relevance}, ${analysis.actionability},
                    ${analysis.usefulness_score}, ${analysis.strongest_stakeholder},
                    ${analysis.secondary_stakeholder}, ${analysis.reasoning}
                  )
                  ON CONFLICT (company_id, article_id) DO UPDATE SET
                    narrative_fit = EXCLUDED.narrative_fit,
                    urgency = EXCLUDED.urgency,
                    why_it_matters = EXCLUDED.why_it_matters,
                    why_it_matters_to_buyers = EXCLUDED.why_it_matters_to_buyers,
                    recommended_action = EXCLUDED.recommended_action,
                    competitor_context = EXCLUDED.competitor_context,
                    themes = EXCLUDED.themes,
                    icp_fit = EXCLUDED.icp_fit,
                    stakeholder_fit_score = EXCLUDED.stakeholder_fit_score,
                    right_to_say = EXCLUDED.right_to_say,
                    strategic_significance = EXCLUDED.strategic_significance,
                    timeliness = EXCLUDED.timeliness,
                    competitor_relevance = EXCLUDED.competitor_relevance,
                    actionability = EXCLUDED.actionability,
                    usefulness_score = EXCLUDED.usefulness_score,
                    strongest_stakeholder = EXCLUDED.strongest_stakeholder,
                    secondary_stakeholder = EXCLUDED.secondary_stakeholder,
                    reasoning = EXCLUDED.reasoning
                `;
              } catch (insertErr) {
                console.error('[quick-start] Failed to store signal analysis:', insertErr);
              }
            }

            // Auto-generate opportunities from signals scoring 8+ (act_now)
            try {
              const oppResult = await generateOpportunitiesFromSignals(company.id as string, 3);
              bootstrapOpportunities = oppResult.generated;
            } catch (oppErr) {
              console.error('[quick-start] Failed to generate bootstrap opportunities:', oppErr);
            }

            // Retrieve top signals for the response
            const signalsResult = await sql`
              SELECT sa.*, na.title, na.source, na.summary
              FROM signal_analyses sa
              JOIN news_articles na ON sa.article_id = na.id
              WHERE sa.company_id = ${company.id}
              ORDER BY COALESCE(sa.usefulness_score, sa.narrative_fit / 10.0) DESC
              LIMIT 3
            `;
            topSignals = signalsResult.rows;
          } else if (signalCount > 0) {
            // No anthropic key — just get existing signals
            const signalsResult = await sql`
              SELECT sa.*, na.title, na.source, na.summary
              FROM signal_analyses sa
              JOIN news_articles na ON sa.article_id = na.id
              WHERE sa.company_id = ${company.id}
              ORDER BY sa.narrative_fit DESC
              LIMIT 3
            `;
            topSignals = signalsResult.rows;
          }
        } catch (bootstrapErr) {
          console.error('[quick-start] Bootstrap scan error:', bootstrapErr);
        }

        send({ step: 'analyzing_signals_done', label: 'Scanning market intelligence...', signalCount, bootstrapOpportunities });

        // Skip sample post generation server-side to stay within 60s timeout
        // The welcome view will show the narrative + signals immediately
        send({ step: 'generating_content', label: 'Finalising...' });
        const samplePost = '';
        send({ step: 'generating_content_done', label: 'Finalising...' });

        // --- Done ---
        // Parse ICP count and pillar count for the summary
        let icpCount = 0;
        let pillarCount = 0;
        try {
          const icps = JSON.parse(icpProfiles);
          icpCount = Array.isArray(icps) ? icps.length : 0;
        } catch {}
        try {
          // Count pillar headings
          const pillarMatches = fullDocument.match(/###\s+(?:Pillar\s+\d|.*?pillar)/gi);
          pillarCount = pillarMatches ? pillarMatches.length : 0;
          if (pillarCount === 0) {
            // Try counting numbered pillars
            const numbered = messagingPillars.match(/\d+\.\s+\*\*/g);
            pillarCount = numbered ? numbered.length : 3;
          }
        } catch {}

        send({
          done: true,
          bibleId,
          companyName: company.name,
          companyId: company.id,
          narrativeId: effectiveNarrativeId,
          elevatorPitch,
          icpCount,
          pillarCount,
          signalCount,
          topSignals,
          samplePost,
          extracted,
          bootstrapOpportunities,
        });

        controller.close();
      } catch (err: any) {
        console.error('Quick-start error:', err?.message || err);
        send({ error: err?.message || 'An unexpected error occurred.' });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
