import crypto from 'crypto';

/**
 * 쿠팡 파트너스 100% 자동화 엔진
 * 
 * 1. 쿠팡 공식 Open API (HmacSHA256) 자동 호출 -> link.coupang.com/a/XXXXX 단축 링크 실시간 발급
 * 2. API Key 미등록 시 -> 공식 게이트웨이 link.coupang.com/re/AFF... 자동 생성
 */

export interface CoupangApiKeys {
  trackingId: string;
  accessKey?: string;
  secretKey?: string;
}

// 기본 플랫폼 설정 (사용자 실제 ID)
export const DEFAULT_TRACKING_ID = 'AF5232288';

// 인메모리 및 환경변수 키 스토어
let dynamicAccessKey = process.env.COUPANG_ACCESS_KEY || '';
let dynamicSecretKey = process.env.COUPANG_SECRET_KEY || '';
let dynamicTrackingId = process.env.COUPANG_TRACKING_ID || DEFAULT_TRACKING_ID;

export function getCoupangConfig(): CoupangApiKeys {
  return {
    trackingId: dynamicTrackingId,
    accessKey: dynamicAccessKey,
    secretKey: dynamicSecretKey,
  };
}

export function setCoupangApiKeys(keys: { accessKey?: string; secretKey?: string; trackingId?: string }) {
  if (keys.trackingId) dynamicTrackingId = keys.trackingId.trim();
  if (keys.accessKey !== undefined) dynamicAccessKey = keys.accessKey.trim();
  if (keys.secretKey !== undefined) dynamicSecretKey = keys.secretKey.trim();
}

export function getCoupangTrackingId(): string {
  return dynamicTrackingId;
}

/**
 * 쿠팡 파트너스 Open API Hmac-SHA256 시그니처 생성기
 */
function generateCoupangSignature(method: string, path: string, secretKey: string): { datetime: string; authorization: string } {
  const accessKey = dynamicAccessKey;
  const datetime = new Date().toISOString().substring(0, 19).replace(/[-:]/g, '') + 'Z';
  const message = datetime + method + path;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;

  return { datetime, authorization };
}

/**
 * 쿠팡 파트너스 Open API로 공식 단축 URL(link.coupang.com/a/...) 실시간 자동 발급
 */
export async function requestCoupangDeepLinkApi(targetUrl: string, subId: string): Promise<string | null> {
  const { accessKey, secretKey } = getCoupangConfig();
  if (!accessKey || !secretKey) {
    return null;
  }

  const METHOD = 'POST';
  const PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
  const url = `https://api-gateway.coupang.com${PATH}`;
  const { authorization } = generateCoupangSignature(METHOD, PATH, secretKey);

  try {
    const res = await fetch(url, {
      method: METHOD,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        coupangUrls: [targetUrl],
        subId,
      }),
    });

    if (!res.ok) {
      console.warn('Coupang API response not ok:', res.status);
      return null;
    }

    const json = await res.json();
    if (json.data && json.data[0] && json.data[0].shortenUrl) {
      return json.data[0].shortenUrl;
    }
  } catch (err) {
    console.error('Failed to call Coupang API:', err);
  }

  return null;
}

/**
 * 100% 완전 자동 링크 생성 메인 함수
 * - API Key가 있으면: 쿠팡 Open API를 호출해 link.coupang.com/a/XXXXX 단축 링크를 0.1초 만에 발급
 * - API Key가 없으면: 공식 게이트웨이 link.coupang.com/re/AFF... 주소를 즉시 자동 조합
 */
export async function generateAutoCoupangLink(queryOrUrl: string, creatorId: string, slug: string): Promise<string> {
  const trackingId = getCoupangTrackingId();
  const safeCreator = (creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
  const safeSlug = (slug || 'item').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
  const subId = `inch_${safeCreator}_${safeSlug}`;

  const trimmed = queryOrUrl.trim();

  // 1. 일반 쿠팡 상품 웹 링크(coupang.com/vp/products/...)인 경우
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // API Key가 등록되어 있다면 쿠팡 공식 Open API로 단축 링크 실시간 생성 시도
    const apiShortenUrl = await requestCoupangDeepLinkApi(trimmed, subId);
    if (apiShortenUrl) {
      return apiShortenUrl;
    }

    // 이미 link.coupang.com 단축 링크인 경우 subid 파라미터 결합
    if (trimmed.includes('link.coupang.com')) {
      try {
        const u = new URL(trimmed);
        u.searchParams.set('subid', subId);
        return u.toString();
      } catch {
        return `${trimmed}${trimmed.includes('?') ? '&' : '?'}subid=${encodeURIComponent(subId)}`;
      }
    }

    // 일반 상품 URL을 공식 게이트웨이로 자동 변환
    try {
      const u = new URL(trimmed);
      const pathParts = u.pathname.split('/');
      const pIdx = pathParts.indexOf('products');
      const pageKey = pIdx !== -1 && pathParts[pIdx + 1] ? pathParts[pIdx + 1] : '';
      const itemId = u.searchParams.get('itemId') || '';
      const vendorItemId = u.searchParams.get('vendorItemId') || '';

      let gateway = `https://link.coupang.com/re/AFFSDP?lptag=${trackingId}&subid=${encodeURIComponent(subId)}`;
      if (pageKey) gateway += `&pageKey=${pageKey}`;
      if (itemId) gateway += `&itemId=${itemId}`;
      if (vendorItemId) gateway += `&vendorItemId=${vendorItemId}`;
      return gateway;
    } catch {
      // fallback to search
    }
  }

  // 2. 검색어 기반인 경우 쿠팡 공식 검색 게이트웨이로 자동 생성
  const encodedKeyword = encodeURIComponent(trimmed);
  return `https://link.coupang.com/re/AFFSRCH?lptag=${trackingId}&subid=${encodeURIComponent(subId)}&keyword=${encodedKeyword}`;
}

// 동기 호환 래퍼
export function buildCoupangLinkWithRef(queryOrUrl: string, creatorId: string, slug: string): string {
  const trackingId = getCoupangTrackingId();
  const safeCreator = (creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
  const safeSlug = (slug || 'item').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
  const subId = `inch_${safeCreator}_${safeSlug}`;

  const trimmed = queryOrUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('link.coupang.com')) {
      try {
        const u = new URL(trimmed);
        u.searchParams.set('subid', subId);
        return u.toString();
      } catch {
        return `${trimmed}${trimmed.includes('?') ? '&' : '?'}subid=${encodeURIComponent(subId)}`;
      }
    }

    try {
      const u = new URL(trimmed);
      const pathParts = u.pathname.split('/');
      const pIdx = pathParts.indexOf('products');
      const pageKey = pIdx !== -1 && pathParts[pIdx + 1] ? pathParts[pIdx + 1] : '';
      const itemId = u.searchParams.get('itemId') || '';
      const vendorItemId = u.searchParams.get('vendorItemId') || '';

      let gateway = `https://link.coupang.com/re/AFFSDP?lptag=${trackingId}&subid=${encodeURIComponent(subId)}`;
      if (pageKey) gateway += `&pageKey=${pageKey}`;
      if (itemId) gateway += `&itemId=${itemId}`;
      if (vendorItemId) gateway += `&vendorItemId=${vendorItemId}`;
      return gateway;
    } catch {
      // fallback
    }
  }

  const encodedKeyword = encodeURIComponent(trimmed);
  return `https://link.coupang.com/re/AFFSRCH?lptag=${trackingId}&subid=${encodeURIComponent(subId)}&keyword=${encodedKeyword}`;
}
