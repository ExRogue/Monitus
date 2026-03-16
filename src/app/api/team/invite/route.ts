import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { getUsageSummary } from '@/lib/billing';
import { sendTeamInviteEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { sanitizeString, rateLimit, safeParseJson } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(`invite:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  await getDb();

  const companyResult = await sql`SELECT id, name FROM companies WHERE user_id = ${user.id}`;
  const company = companyResult.rows[0];
  if (!company) return NextResponse.json({ error: 'Set up your company first' }, { status: 400 });

  try {
    const { data: body, error: parseError } = await safeParseJson(request);
    if (parseError) return NextResponse.json({ error: parseError }, { status: 400 });
    const email = sanitizeString(body.email || '', 254).toLowerCase();
    const VALID_ROLES = ['editor', 'viewer'];
    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role "${body.role}". Valid roles: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }
    const role = VALID_ROLES.includes(body.role) ? body.role : 'editor';

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Check team size limits (count active members + pending invites)
    const usage = await getUsageSummary(user.id);
    const memberCount = await sql`SELECT COUNT(*) as count FROM team_members WHERE company_id = ${company.id}`;
    const pendingInviteCount = await sql`
      SELECT COUNT(*) as count FROM team_invites
      WHERE company_id = ${company.id} AND accepted = false AND expires_at > NOW()
    `;
    const activeMembers = parseInt(memberCount.rows[0]?.count || '0');
    const pendingInvites = parseInt(pendingInviteCount.rows[0]?.count || '0');
    const currentTeamAdditions = activeMembers + pendingInvites;
    // users_limit includes the owner, so extra seats = limit - 1
    const extraSeatsAllowed = (usage.users_limit ?? 1) - 1;

    if (usage.users_limit !== null && currentTeamAdditions >= extraSeatsAllowed) {
      return NextResponse.json(
        { error: `Your plan allows up to ${extraSeatsAllowed} additional team member(s) (you currently have ${activeMembers} member(s) and ${pendingInvites} pending invite(s)). Upgrade your plan to add more team members.`, upgradeUrl: '/billing' },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await sql`
      SELECT tm.id FROM team_members tm JOIN users u ON tm.user_id = u.id
      WHERE tm.company_id = ${company.id} AND u.email = ${email}
    `;
    if (existingMember.rows[0]) {
      return NextResponse.json({ error: 'This person is already a team member' }, { status: 400 });
    }

    // Check for existing pending invite
    const existingInvite = await sql`
      SELECT id FROM team_invites
      WHERE company_id = ${company.id} AND email = ${email} AND accepted = false AND expires_at > NOW()
    `;
    if (existingInvite.rows[0]) {
      return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const id = uuidv4();
    const expires = new Date(Date.now() + 7 * 86400_000).toISOString(); // 7 days

    await sql`
      INSERT INTO team_invites (id, company_id, email, role, token, invited_by, expires_at)
      VALUES (${id}, ${company.id}, ${email}, ${role}, ${token}, ${user.id}, ${expires})
    `;

    await sendTeamInviteEmail(email, user.name, company.name, token);

    return NextResponse.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}
