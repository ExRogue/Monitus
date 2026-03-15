import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

interface RecommendationStatus {
  recommendationIndex: number;
  status: 'accepted' | 'dismissed' | 'deferred';
  notes?: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { reportId, recommendationIndex, status, notes } = body;

    if (!reportId || typeof recommendationIndex !== 'number') {
      return NextResponse.json({ error: 'reportId and recommendationIndex are required' }, { status: 400 });
    }

    if (!['accepted', 'dismissed', 'deferred'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be accepted, dismissed, or deferred' }, { status: 400 });
    }

    await getDb();

    // Fetch the report
    const reportResult = await sql`
      SELECT id, metadata FROM intelligence_reports WHERE id = ${reportId}
    `;

    if (reportResult.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = reportResult.rows[0];
    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(report.metadata || '{}');
    } catch {
      metadata = {};
    }

    // Initialize recommendations_status array if it doesn't exist
    if (!Array.isArray(metadata.recommendations_status)) {
      metadata.recommendations_status = [];
    }

    // Update or add the recommendation status
    const existingIdx = metadata.recommendations_status.findIndex(
      (r: RecommendationStatus) => r.recommendationIndex === recommendationIndex
    );

    const statusEntry: RecommendationStatus = {
      recommendationIndex,
      status,
      notes: notes || '',
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      metadata.recommendations_status[existingIdx] = statusEntry;
    } else {
      metadata.recommendations_status.push(statusEntry);
    }

    // Save updated metadata
    const updatedMetadata = JSON.stringify(metadata);
    await sql`
      UPDATE intelligence_reports SET metadata = ${updatedMetadata} WHERE id = ${reportId}
    `;

    return NextResponse.json({ success: true, recommendations_status: metadata.recommendations_status });
  } catch (error) {
    console.error('Recommendation status error:', error);
    return NextResponse.json({ error: 'Failed to update recommendation status' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    await getDb();

    const reportResult = await sql`
      SELECT metadata FROM intelligence_reports WHERE id = ${reportId}
    `;

    if (reportResult.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(reportResult.rows[0].metadata || '{}');
    } catch {
      metadata = {};
    }

    return NextResponse.json({
      recommendations_status: metadata.recommendations_status || [],
    });
  } catch (error) {
    console.error('Fetch recommendation status error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendation statuses' }, { status: 500 });
  }
}
