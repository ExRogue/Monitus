import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    let combinedText = '';

    for (const file of files) {
      const text = await file.text();
      combinedText += `\n\n--- ${file.name} ---\n${text}`;
    }

    // Basic extraction of company info from text
    const extractedText: Record<string, string> = {};
    const lines = combinedText.split('\n').filter(l => l.trim());

    // Try to find company name and niche from the content
    const companyMatch = combinedText.match(/(?:company|brand|about)\s*(?:name)?[:\s]+([A-Z][A-Za-z0-9\s&]+)/i);
    if (companyMatch) {
      extractedText.companyName = companyMatch[1].trim().substring(0, 100);
    }

    // Store the raw text for the form to use
    extractedText.rawContent = combinedText.substring(0, 10000);

    return NextResponse.json({ extractedText, fileCount: files.length });
  } catch (error: any) {
    console.error('Upload processing error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to process uploaded files' }, { status: 500 });
  }
}
