import { NextRequest, NextResponse } from 'next/server';
import { checkSlugHealth } from '../../../../lib/events/slugHealthCheck';

export async function GET(request: NextRequest) {
  try {
    const report = await checkSlugHealth();
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error checking slug health:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check slug health' },
      { status: 500 }
    );
  }
}
