import crypto from 'crypto';

/**
 * 쿠팡 파트너스 공식 연동 엔진
 * 
 * 1. Tracking ID (AF코드) 기반 공식 게이트웨이 딥링크
 * 2. 원본 link.coupang.com 단축 링크에 subId 주입
 * 3. 쿠팡 파트너스 Open API (HmacSHA256 서명) 딥링크 생성 지원
 */

export interface CoupangConfig {
  trackingId?: string; // 예: AF1234567
  accessKey?: string;
  secretKey?: string;
}

// 기본 플랫폼 쿠팡 파트너스 트래킹 ID (환경변수 또는 기본값)
export function getCoupangTrackingId(): string {
  return process.env.COUPANG_TRACKING_ID || process.env.NEXT_PUBLIC_COUPANG_TRACKING_ID || 'AF5232288';
}

/**
 * 검색어 기반 공식 쿠팡 파트너스 딥링크 생성
 * 쿠팡 파트너스 공식 검색 리디렉션 게이트웨이 규격을 준수합니다.
 */
export function generateCoupangSearchLink(keyword: string, subId: string): string {
  const trackingId = getCoupangTrackingId();
  const encodedKeyword = encodeURIComponent(keyword.trim());
  const encodedSubId = encodeURIComponent(subId.trim());

  // 쿠팡 파트너스 공식 검색 게이트웨이 URL (추적 ID + subId 필수 포함)
  return `https://link.coupang.com/re/AFFSRCH?lptag=${trackingId}&subid=${encodedSubId}&keyword=${encodedKeyword}`;
}

/**
 * 특정 상품 URL 기반 공식 파트너스 딥링크 생성
 */
export function generateCoupangProductLink(originalUrl: string, subId: string): string {
  const trackingId = getCoupangTrackingId();
  const encodedSubId = encodeURIComponent(subId.trim());
  const trimmed = originalUrl.trim();

  // 이미 link.coupang.com 단축 링크인 경우 subId 파라미터 보존/추가
  if (trimmed.includes('link.coupang.com')) {
    try {
      const url = new URL(trimmed);
      url.searchParams.set('subid', encodedSubId);
      return url.toString();
    } catch {
      return `${trimmed}${trimmed.includes('?') ? '&' : '?'}subid=${encodedSubId}`;
    }
  }

  // coupang.com 일반 상품 페이지인 경우 파트너스 리디렉션 게이트웨이로 변환
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/');
    const productsIndex = pathParts.indexOf('products');
    const pageKey = productsIndex !== -1 && pathParts[productsIndex + 1] ? pathParts[productsIndex + 1] : '';

    const itemId = url.searchParams.get('itemId') || '';
    const vendorItemId = url.searchParams.get('vendorItemId') || '';

    let gateway = `https://link.coupang.com/re/AFFSDP?lptag=${trackingId}&subid=${encodedSubId}`;
    if (pageKey) gateway += `&pageKey=${pageKey}`;
    if (itemId) gateway += `&itemId=${itemId}`;
    if (vendorItemId) gateway += `&vendorItemId=${vendorItemId}`;

    return gateway;
  } catch {
    return generateCoupangSearchLink(trimmed, subId);
  }
}

/**
 * 쿠팡 파트너스 Open API를 사용한 실시간 딥링크 생성 (API Key 소유 시)
 */
export async function createOfficialDeepLinkWithApi(
  coupangUrl: string,
  subId: string,
  accessKey?: string,
  secretKey?: string
): Promise<string | null> {
  const aKey = accessKey || process.env.COUPANG_ACCESS_KEY;
  const sKey = secretKey || process.env.COUPANG_SECRET_KEY;

  if (!aKey || !sKey) {
    // API 키가 없으면 공식 게이트웨이 URL 방식으로 대체
    return null;
  }

  const METHOD = 'POST';
  const PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
  const url = `https://api-gateway.coupang.com${PATH}`;

  const datetime = new Date().toISOString().substring(0, 19).replace(/[-:]/g, '') + 'Z';
  const message = datetime + METHOD + PATH;
  const signature = crypto.createHmac('sha256', sKey).update(message).digest('hex');
  const authorization = `CEA algorithm=HmacSHA256, access-key=${aKey}, signed-date=${datetime}, signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: METHOD,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        coupangUrls: [coupangUrl],
        subId,
      }),
    });

    const json = await res.json();
    if (json.data && json.data[0] && json.data[0].shortenUrl) {
      return json.data[0].shortenUrl;
    }
  } catch {
    // ignore
  }

  return null;
}
