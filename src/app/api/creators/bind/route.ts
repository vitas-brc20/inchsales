import { NextRequest, NextResponse } from 'next/server';
import { bindCreatorAccount, getCreatorAccount, normalizeCreatorHandle } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, platform, ownerUserId, ownerEmail, ownerName, provider } = body;

    if (!creatorId || !ownerUserId) {
      return NextResponse.json(
        { error: '채널 아이디와 OAuth 인증 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const norm = normalizeCreatorHandle(creatorId);
    const result = bindCreatorAccount({
      creatorId: norm,
      platform: platform || 'youtube',
      ownerUserId,
      ownerEmail,
      ownerName,
      provider: provider || 'google',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      account: result.account,
      displayHandle: `@${norm}`,
      message: `@${norm} 채널의 소유권이 회원님의 ${provider?.toUpperCase()} 계정에 안전하게 잠금(Lock)되었습니다.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('handle') || searchParams.get('creatorId') || '';
    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    const norm = normalizeCreatorHandle(creatorId);
    const account = getCreatorAccount(norm);

    return NextResponse.json({
      success: true,
      hasOwner: !!account,
      provider: account?.provider || null,
      displayHandle: `@${norm}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
