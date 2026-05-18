import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listAllSources } from '@/lib/company-sources';

export const runtime = 'nodejs';

/**
 * GET /api/sources
 *
 * Lists every globally-registered RSS source. Used by the Settings → Sources
 * UI to show toggles. Auth-gated since the list reveals our coverage map.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sources = await listAllSources();
  return NextResponse.json({ sources });
}
