import { NextResponse } from 'next/server';
import { getCoupangConfig, setCoupangApiKeys } from '@/lib/coupang';

const ADMIN_PIN = process.env.ADMIN_PIN || '7777';

function isAuthorized(request: Request): boolean {
  // Check authorization header, custom header, or url query
  const authPin = request.headers.get('x-admin-pin');
  const url = new URL(request.url);
  const queryPin = url.searchParams.get('pin');

  if (authPin === ADMIN_PIN || queryPin === ADMIN_PIN) {
    return true;
  }

  // Allow local development origin
  const host = request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: '관리자 인증이 필요합니다.' }, { status: 401 });
  }

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: '관리자 권한이 없습니다.' }, { status: 401 });
  }

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
