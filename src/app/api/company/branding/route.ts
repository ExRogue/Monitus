import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { sanitizeString, rateLimit } from '@/lib/validation';

// Color validation helper
function isValidColor(color: string): boolean {
  // Validate hex color (#RRGGBB or #RGB)
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();
  const result = await sql`
    SELECT
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      custom_css
    FROM companies
    WHERE user_id = ${user.id}
  `;

  const company = result.rows[0];
  if (!company) {
    return NextResponse.json({
      branding: {
        logo_url: '',
        primary_color: '#3B82F6',
        secondary_color: '#8B5CF6',
        accent_color: '#10B981',
        custom_css: '',
      },
    });
  }

  return NextResponse.json({ branding: company });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`company:branding:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { logo_url, primary_color, secondary_color, accent_color, custom_css } = body;

    // Validate colors
    const safePrimaryColor = primary_color && isValidColor(primary_color) ? primary_color : '#3B82F6';
    const safeSecondaryColor = secondary_color && isValidColor(secondary_color) ? secondary_color : '#8B5CF6';
    const safeAccentColor = accent_color && isValidColor(accent_color) ? accent_color : '#10B981';

    // Validate logo URL (basic validation)
    const safeLogoUrl = logo_url
      ? sanitizeString(logo_url, 500)
      : '';

    // Validate custom CSS (limit to 2000 chars)
    const safeCustomCss = custom_css ? sanitizeString(custom_css, 2000) : '';

    await getDb();
    const existing = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;

    if (!existing.rows[0]) {
      return NextResponse.json(
        { error: 'Company profile not found. Please set up your company first.' },
        { status: 404 }
      );
    }

    const companyId = existing.rows[0].id;
    await sql`
      UPDATE companies
      SET
        logo_url = ${safeLogoUrl},
        primary_color = ${safePrimaryColor},
        secondary_color = ${safeSecondaryColor},
        accent_color = ${safeAccentColor},
        custom_css = ${safeCustomCss},
        updated_at = NOW()
      WHERE id = ${companyId}
    `;

    const updated = await sql`
      SELECT
        logo_url,
        primary_color,
        secondary_color,
        accent_color,
        custom_css
      FROM companies
      WHERE id = ${companyId}
    `;

    return NextResponse.json({ branding: updated.rows[0] });
  } catch (error) {
    console.error('Branding error:', error);
    return NextResponse.json({ error: 'Failed to save branding settings' }, { status: 500 });
  }
}
