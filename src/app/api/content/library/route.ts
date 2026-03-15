import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getContentByCompany } from '@/lib/generate';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

const VALID_CONTENT_TYPES = ['newsletter', 'linkedin', 'podcast', 'briefing', 'trade_media', 'email'];

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
    return NextResponse.json({ error: `Invalid content type filter. Valid types: ${VALID_CONTENT_TYPES.join(', ')}` }, { status: 400 });
  }

  let content = await getContentByCompany(company.id as string, type);

  // Also include briefings from intelligence_reports if no type filter or type is 'briefing'
  if (!type || type === 'briefing') {
    try {
      const briefingsResult = await sql`
        SELECT id, company_id, 'briefing' as content_type, title, content,
               'passed' as compliance_status, '[]' as compliance_notes,
               '[]' as pillar_tags, '[]' as article_ids, 'draft' as status,
               report_type, metadata, created_at
        FROM intelligence_reports
        WHERE company_id = ${company.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const briefings = briefingsResult.rows.map(b => ({
        ...b,
        content_type: `briefing_${b.report_type || 'general'}`,
      })) as any[];
      content = [...content, ...briefings] as any[];
      // Re-sort by created_at descending
      content.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      // Non-critical: briefings table might not exist
    }
  }

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    content = content.filter((c: any) =>
      c.title?.toLowerCase().includes(q) || c.content?.toLowerCase().includes(q)
    );
  }

  // Apply limit
  content = content.slice(0, limit);

  return NextResponse.json({ content, total: content.length });
}
