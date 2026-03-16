import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getUsageSummary } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const companyResult = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ members: [], invites: [] });

  // Get team members
  const membersResult = await sql`
    SELECT tm.id, tm.role, tm.created_at, u.email, u.name
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.company_id = ${company.id}
    ORDER BY tm.created_at ASC
  `;

  // Get pending invites
  const invitesResult = await sql`
    SELECT id, email, role, expires_at, created_at
    FROM team_invites
    WHERE company_id = ${company.id} AND accepted = false AND expires_at > NOW()
    ORDER BY created_at DESC
  `;

  // Include the owner
  const members = [
    { id: 'owner', email: user.email, name: user.name, role: 'owner', created_at: user.created_at },
    ...membersResult.rows,
  ];

  return NextResponse.json({ members, invites: invitesResult.rows });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  const companyResult = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
  const companyId = companyResult.rows[0]?.id;
  if (!companyId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const inviteId = searchParams.get('inviteId');

  if (memberId) {
    await sql`DELETE FROM team_members WHERE id = ${memberId} AND company_id = ${companyId}`;
    return NextResponse.json({ success: true });
  }

  if (inviteId) {
    await sql`DELETE FROM team_invites WHERE id = ${inviteId} AND company_id = ${companyId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Provide memberId or inviteId' }, { status: 400 });
}
