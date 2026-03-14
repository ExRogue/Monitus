import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/validation';

interface VoiceProfileResponse {
  preferred_tone: string;
  words_to_use: string[];
  words_to_avoid: string[];
  style_notes: string[];
  edit_count: number;
  common_additions: string[];
  common_removals: string[];
  tone_shifts: { from: string; to: string; frequency: number }[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`voice-profile:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    await getDb();

    // Get the user's company
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'No company profile found' }, { status: 400 });
    }

    // Fetch all voice edits for this company
    const editsResult = await sql`
      SELECT original_text, edited_text, edit_type, created_at
      FROM voice_edits
      WHERE company_id = ${company.id}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    const edits = editsResult.rows;

    if (edits.length === 0) {
      return NextResponse.json({
        voice_profile: null,
        message: 'No edits recorded yet. Edit generated content to start building your voice profile.',
      });
    }

    // Analyse patterns across all edits
    const wordsRemoved = new Map<string, number>();
    const wordsAdded = new Map<string, number>();
    const phrasesRemoved = new Map<string, number>();
    const phrasesAdded = new Map<string, number>();
    const toneSignals: string[] = [];

    for (const edit of edits) {
      const original = (edit.original_text as string).toLowerCase();
      const edited = (edit.edited_text as string).toLowerCase();

      const origWords = original.split(/\s+/).filter(w => w.length > 3);
      const editWords = edited.split(/\s+/).filter(w => w.length > 3);
      const origSet = new Set(origWords);
      const editSet = new Set(editWords);

      // Track individual word changes
      for (const w of origSet) {
        if (!editSet.has(w)) {
          wordsRemoved.set(w, (wordsRemoved.get(w) || 0) + 1);
        }
      }
      for (const w of editSet) {
        if (!origSet.has(w)) {
          wordsAdded.set(w, (wordsAdded.get(w) || 0) + 1);
        }
      }

      // Track bigram phrases
      const origBigrams = getBigrams(origWords);
      const editBigrams = getBigrams(editWords);
      const origBigramSet = new Set(origBigrams);
      const editBigramSet = new Set(editBigrams);

      for (const phrase of origBigramSet) {
        if (!editBigramSet.has(phrase)) {
          phrasesRemoved.set(phrase, (phrasesRemoved.get(phrase) || 0) + 1);
        }
      }
      for (const phrase of editBigramSet) {
        if (!origBigramSet.has(phrase)) {
          phrasesAdded.set(phrase, (phrasesAdded.get(phrase) || 0) + 1);
        }
      }

      // Detect tone shifts
      const origLen = original.length;
      const editLen = edited.length;
      if (editLen < origLen * 0.8) toneSignals.push('concise');
      if (editLen > origLen * 1.2) toneSignals.push('detailed');

      const origExcl = (original.match(/!/g) || []).length;
      const editExcl = (edited.match(/!/g) || []).length;
      if (editExcl < origExcl) toneSignals.push('formal');
      if (editExcl > origExcl) toneSignals.push('casual');

      // Passive voice detection
      const passiveRegex = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
      const origPassive = (original.match(passiveRegex) || []).length;
      const editPassive = (edited.match(passiveRegex) || []).length;
      if (editPassive < origPassive) toneSignals.push('active-voice');
      if (editPassive > origPassive) toneSignals.push('passive-voice');

      // Sentence length analysis
      const origSentences = original.split(/[.!?]+/).filter(Boolean);
      const editSentences = edited.split(/[.!?]+/).filter(Boolean);
      const origAvgLen = origSentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / (origSentences.length || 1);
      const editAvgLen = editSentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / (editSentences.length || 1);
      if (editAvgLen < origAvgLen * 0.8) toneSignals.push('short-sentences');
      if (editAvgLen > origAvgLen * 1.2) toneSignals.push('long-sentences');
    }

    // Build frequency-sorted results (threshold: 2+ occurrences)
    const frequentRemoved = getSortedFrequent(wordsRemoved, 2, 20);
    const frequentAdded = getSortedFrequent(wordsAdded, 2, 20);
    const frequentPhrasesRemoved = getSortedFrequent(phrasesRemoved, 2, 10);
    const frequentPhrasesAdded = getSortedFrequent(phrasesAdded, 2, 10);

    // Determine tone preference
    const toneCounts: Record<string, number> = {};
    for (const signal of toneSignals) {
      toneCounts[signal] = (toneCounts[signal] || 0) + 1;
    }
    const dominantTones = Object.entries(toneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Build style notes
    const styleNotes: string[] = [];
    for (const [tone, count] of dominantTones) {
      const pct = Math.round((count / edits.length) * 100);
      if (pct < 20) continue;
      switch (tone) {
        case 'concise':
          styleNotes.push(`Prefers concise writing (${pct}% of edits shorten content)`);
          break;
        case 'detailed':
          styleNotes.push(`Prefers detailed writing (${pct}% of edits expand content)`);
          break;
        case 'formal':
          styleNotes.push(`Prefers formal tone (${pct}% of edits remove casual markers)`);
          break;
        case 'casual':
          styleNotes.push(`Prefers casual tone (${pct}% of edits add casual markers)`);
          break;
        case 'active-voice':
          styleNotes.push(`Prefers active voice (${pct}% of edits convert passive constructions)`);
          break;
        case 'short-sentences':
          styleNotes.push(`Prefers shorter sentences (${pct}% of edits reduce sentence length)`);
          break;
        case 'long-sentences':
          styleNotes.push(`Prefers longer, more detailed sentences (${pct}% of edits)`);
          break;
      }
    }

    // Build tone shifts
    const toneShifts: { from: string; to: string; frequency: number }[] = [];
    const toneMap: Record<string, string> = {
      'concise': 'verbose',
      'detailed': 'brief',
      'formal': 'casual',
      'casual': 'formal',
      'active-voice': 'passive-voice',
      'short-sentences': 'long-sentences',
    };
    for (const [tone, count] of dominantTones) {
      if (count >= 2 && toneMap[tone]) {
        toneShifts.push({
          from: toneMap[tone],
          to: tone,
          frequency: count,
        });
      }
    }

    const voiceProfile: VoiceProfileResponse = {
      preferred_tone: dominantTones[0]?.[0] || 'professional',
      words_to_use: frequentAdded,
      words_to_avoid: frequentRemoved,
      style_notes: styleNotes,
      edit_count: edits.length,
      common_additions: frequentPhrasesAdded,
      common_removals: frequentPhrasesRemoved,
      tone_shifts: toneShifts,
    };

    return NextResponse.json({ voice_profile: voiceProfile });
  } catch (error) {
    console.error('Voice profile error:', error);
    return NextResponse.json({ error: 'Failed to compute voice profile' }, { status: 500 });
  }
}

function getBigrams(words: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

function getSortedFrequent(map: Map<string, number>, minCount: number, maxResults: number): string[] {
  return [...map.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([word]) => word);
}
