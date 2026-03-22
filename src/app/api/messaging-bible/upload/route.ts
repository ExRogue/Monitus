import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    // Support both 'file' (single) and 'files' (multiple) field names
    const file = formData.get('file') as File | null;
    const files = formData.getAll('files') as File[];
    const allFiles = file ? [file, ...files.filter(f => f !== file)] : files;

    if (!allFiles.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    let combinedText = '';

    for (const f of allFiles) {
      const name = f.name.toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
        // Plain text files
        const text = await f.text();
        combinedText += `\n\n--- ${f.name} ---\n${text}`;
      } else {
        // For PDF, DOCX, etc. — extract readable text from raw bytes
        // On Vercel we can't use heavy PDF parsers, so extract what we can
        const buffer = await f.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Extract printable ASCII/UTF-8 strings from binary
        let extracted = '';
        let current = '';
        for (const byte of bytes) {
          if (byte >= 32 && byte < 127) {
            current += String.fromCharCode(byte);
          } else if (current.length > 4) {
            extracted += current + ' ';
            current = '';
          } else {
            current = '';
          }
        }
        if (current.length > 4) extracted += current;
        // Clean up common artifacts
        extracted = extracted
          .replace(/\s{3,}/g, '\n')
          .replace(/[^\x20-\x7E\n]/g, '')
          .substring(0, 15000);
        combinedText += `\n\n--- ${f.name} ---\n${extracted}`;
      }
    }

    if (combinedText.trim().length < 20) {
      return NextResponse.json({ error: 'Could not extract meaningful text from the uploaded file. Try a .txt or .md file.' }, { status: 400 });
    }

    // Use Claude to extract structured company information
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Extract key company information from this document to help build a company narrative/positioning document.

Document content:
${combinedText.substring(0, 8000)}

Return a JSON object with these fields (leave empty string if not found):
{
  "company_name": "",
  "what_they_do": "1-2 sentence description of what the company does",
  "target_buyers": "Who their ideal customers are",
  "key_differentiators": "What makes them different from competitors",
  "market_position": "How they position themselves in the market",
  "competitors": "Any competitors mentioned",
  "value_proposition": "Their core value proposition",
  "tone_and_voice": "The tone/voice used in the document (professional, casual, technical, etc.)",
  "key_messages": "Main messaging themes or talking points",
  "summary": "A 3-4 sentence summary of the company that could be used as interview context"
}

Return ONLY the JSON, no markdown.`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let extracted: Record<string, string> = {};
    try {
      extracted = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    } catch {
      extracted = { summary: text.substring(0, 500), rawContent: combinedText.substring(0, 5000) };
    }

    extracted.rawContent = combinedText.substring(0, 5000);

    return NextResponse.json({ extractedText: extracted, fileCount: allFiles.length });
  } catch (error: any) {
    console.error('Upload processing error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to process uploaded files' }, { status: 500 });
  }
}
