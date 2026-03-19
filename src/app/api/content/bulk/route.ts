import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { action, contentIds, status } = body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return NextResponse.json({ error: 'No content IDs provided' }, { status: 400 });
    }

    // Verify user owns all content
    const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const company = companyResult.rows[0];
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    if (action === 'delete') {
      await sql`
        DELETE FROM generated_content
        WHERE id = ANY(${contentIds as any}) AND company_id = ${company.id}
      `;
      return NextResponse.json({ success: true, message: `Deleted ${contentIds.length} item(s)` });
    } else if (action === 'update_status') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }
      await sql`
        UPDATE generated_content
        SET status = ${status}
        WHERE id = ANY(${contentIds as any}) AND company_id = ${company.id}
      `;
      return NextResponse.json({ success: true, message: `Updated ${contentIds.length} item(s)` });
    } else if (action === 'export') {
      const exportResult = await sql`
        SELECT id, title, content, content_type, created_at
        FROM generated_content
        WHERE company_id = ${company.id} AND id = ANY(${contentIds as any})
      `;
      const results = exportResult.rows;

      const csv = [
        ['ID', 'Title', 'Content Type', 'Created At', 'Content'].join(','),
        ...results.map((row: any) =>
          [
            row.id,
            `"${(row.title || '').replace(/"/g, '""')}"`,
            row.content_type,
            row.created_at,
            `"${(row.content || '').replace(/"/g, '""').substring(0, 200)}"`,
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="content-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
  }
}
