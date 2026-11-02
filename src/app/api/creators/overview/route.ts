import { NextRequest, NextResponse } from 'next/server';
import { getCreatorOverview, normalizeCreatorHandle } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle') || searchParams.get('id') || searchParams.get('ref') || '';
    if (!handle.trim()) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    const overview = getCreatorOverview(handle);
    return NextResponse.json({
      success: true,
      handle: normalizeCreatorHandle(handle),
      displayHandle: `@${normalizeCreatorHandle(handle)}`,
      overview,
    });
  } catch (error: any) {
    console.error('Error fetching creator overview:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
