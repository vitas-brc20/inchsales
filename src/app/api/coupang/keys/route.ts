import { NextResponse } from 'next/server';
import { getCoupangConfig, setCoupangApiKeys } from '@/lib/coupang';

export async function GET() {
  const config = getCoupangConfig();
  return NextResponse.json({
    success: true,
    trackingId: config.trackingId,
    hasAccessKey: Boolean(config.accessKey),
    hasSecretKey: Boolean(config.secretKey),
    mode: config.accessKey && config.secretKey ? 'OPEN_API_SHORTEN' : 'OFFICIAL_GATEWAY',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessKey, secretKey, trackingId } = body;

    setCoupangApiKeys({
      accessKey,
      secretKey,
      trackingId,
    });

    return NextResponse.json({
      success: true,
      message: '쿠팡 파트너스 API 자동화 설정이 저장되었습니다.',
      mode: accessKey && secretKey ? 'OPEN_API_SHORTEN' : 'OFFICIAL_GATEWAY',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '설정 저장 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
