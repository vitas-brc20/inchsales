export type InAppPlatform = 'ios' | 'android' | 'other';

export type InAppName =
  | 'kakao'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'threads'
  | 'naver'
  | 'line'
  | 'other'
  | null;

export interface InAppBrowserInfo {
  isInApp: boolean;
  platform: InAppPlatform;
  appName: InAppName;
}

const IN_APP_PATTERNS: Array<{ pattern: RegExp; appName: Exclude<InAppName, null> }> = [
  { pattern: /kakaotalk/i, appName: 'kakao' },
  { pattern: /instagram/i, appName: 'instagram' },
  { pattern: /tiktok|bytedancewebview|musically|trill/i, appName: 'tiktok' },
  { pattern: /fban|fbav|fb_iab|fb4a/i, appName: 'facebook' },
  { pattern: /barcelona/i, appName: 'threads' },
  { pattern: /naver/i, appName: 'naver' },
  { pattern: /line\//i, appName: 'line' },
  { pattern: /daum|band|twitter/i, appName: 'other' },
];

/**
 * User-Agent를 분석해 인앱 브라우저(WebView) 여부와 플랫폼을 판별합니다.
 */
export function detectInAppBrowser(ua?: string): InAppBrowserInfo {
  const rawUa =
    ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const userAgent = rawUa.toLowerCase();

  const platform: InAppPlatform = /android/.test(userAgent)
    ? 'android'
    : /iphone|ipad|ipod/.test(userAgent)
      ? 'ios'
      : 'other';

  for (const { pattern, appName } of IN_APP_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isInApp: true, platform, appName };
    }
  }

  // 일반 Android WebView (; wv) 감지
  if (platform === 'android' && /; wv\)|\bwv\b/.test(userAgent)) {
    return { isInApp: true, platform, appName: 'other' };
  }

  return { isInApp: false, platform, appName: null };
}

/**
 * 쿠팡 웹 URL 또는 상품명을 기반으로 coupang:// 앱 딥링크를 생성합니다.
 */
export function buildCoupangAppUrl(coupangUrl: string, productName?: string): string {
  try {
    const parsed = new URL(coupangUrl);
    const productMatch = parsed.pathname.match(/\/products\/(\d+)/);
    const productId = productMatch?.[1] || parsed.searchParams.get('pageKey') || '';

    if (productId) {
      const params = new URLSearchParams({ productId });
      const itemId = parsed.searchParams.get('itemId');
      const vendorItemId = parsed.searchParams.get('vendorItemId');
      if (itemId) params.set('itemId', itemId);
      if (vendorItemId) params.set('vendorItemId', vendorItemId);
      return `coupang://product?${params.toString()}`;
    }

    const query = parsed.searchParams.get('q');
    if (query) {
      return `coupang://search?q=${encodeURIComponent(query)}`;
    }
  } catch {
    // URL 파싱 실패 시 아래 fallback으로 진행
  }

  if (productName && productName.trim()) {
    return `coupang://search?q=${encodeURIComponent(productName.trim())}`;
  }

  return 'coupang://';
}

/**
 * 인앱 브라우저에서 외부 브라우저(Chrome / Safari 등)로 탈출하기 위한 URL을 반환합니다.
 * iOS 비-카카오 인앱 브라우저는 JS에서 Safari 강제 실행이 제한되므로 null을 반환합니다.
 */
export function getExternalBrowserUrl(
  targetUrl: string,
  info: InAppBrowserInfo = detectInAppBrowser()
): string | null {
  if (!info.isInApp) return null;

  if (info.appName === 'kakao') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`;
  }

  if (info.platform === 'android') {
    const scheme = targetUrl.startsWith('http://') ? 'http' : 'https';
    const stripped = targetUrl.replace(/^https?:\/\//i, '');
    return `intent://${stripped}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
  }

  return null;
}

/**
 * Android 인앱 브라우저에서 쿠팡 앱을 우선 실행하기 위한 intent:// URL을 생성합니다.
 * 쿠팡 앱이 미설치된 경우 S.browser_fallback_url로 안전하게 폴백합니다.
 */
export function getAndroidCoupangIntentUrl(
  coupangAppUrl: string,
  fallbackUrl: string
): string {
  const stripped = coupangAppUrl.replace(/^coupang:\/\//i, '');
  return `intent://${stripped}#Intent;scheme=coupang;package=com.coupang.mobile;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

/**
 * 인앱 브라우저 환경에서 coupang:// 앱 딥링크를 최우선으로 시도하고,
 * 실행 실패 시 외부 브라우저 또는 기본 웹 URL로 fallback합니다.
 */
export function navigateOutOfInApp(
  targetUrl: string,
  options?: { productName?: string; preferExternalOnly?: boolean }
): void {
  if (typeof window === 'undefined') return;

  const info = detectInAppBrowser();
  if (!info.isInApp) {
    window.location.href = targetUrl;
    return;
  }

  const externalUrl = getExternalBrowserUrl(targetUrl, info);

  let destination: string;
  let fallbackUrl: string;

  if (options?.preferExternalOnly) {
    destination = externalUrl ?? targetUrl;
    fallbackUrl = targetUrl;
  } else {
    const coupangAppUrl = buildCoupangAppUrl(targetUrl, options?.productName);
    destination =
      info.platform === 'android'
        ? getAndroidCoupangIntentUrl(coupangAppUrl, targetUrl)
        : coupangAppUrl;
    fallbackUrl = externalUrl ?? targetUrl;
  }

  if (destination === targetUrl) {
    window.location.href = targetUrl;
    return;
  }

  let settled = false;
  let fallbackTimer = 0;

  const cleanup = () => {
    settled = true;
    window.clearTimeout(fallbackTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', cleanup);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      cleanup();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', cleanup);

  fallbackTimer = window.setTimeout(() => {
    if (!settled && document.visibilityState === 'visible') {
      cleanup();
      window.location.href = fallbackUrl;
    }
  }, 1500);

  window.location.href = destination;
}
