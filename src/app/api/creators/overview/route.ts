import { NextRequest, NextResponse } from 'next/server';
import { getCreatorOverview, normalizeCreatorHandle, verifyCreatorOwnership, getCreatorAccount } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle') || searchParams.get('id') || searchParams.get('ref') || '';
    const ownerUserId = searchParams.get('userId') || undefined;

    if (!handle.trim()) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    const norm = normalizeCreatorHandle(handle);
    const ownership = verifyCreatorOwnership(norm, ownerUserId);
    const account = getCreatorAccount(norm);

    // 소유자가 이미 있는 채널인데 인증되지 않은 사용자(또는 다른 사용자)가 조회를 시도할 경우
    if (!ownership.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: ownership.reason,
          handle: norm,
          displayHandle: `@${norm}`,
          isLocked: true,
          provider: account?.provider,
        },
        { status: 403 }
      );
    }

    const overview = getCreatorOverview(norm);
    return NextResponse.json({
      success: true,
      handle: norm,
      displayHandle: `@${norm}`,
      isBound: !!account,
      boundAccount: account,
      overview,
    });
  } catch (error: any) {
    console.error('Error fetching creator overview:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
