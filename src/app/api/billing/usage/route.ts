import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsageSummary } from '@/lib/billing';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getUsageSummary(user.id);
    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching usage summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage summary' },
      { status: 500 }
    );
  }
}
