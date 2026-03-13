import { NextRequest, NextResponse } from 'next/server';
import { getPlans } from '@/lib/billing';

export async function GET(request: NextRequest) {
  try {
    const plans = await getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
