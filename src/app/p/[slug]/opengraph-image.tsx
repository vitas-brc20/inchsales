import { ImageResponse } from 'next/og';
import { getLinkBySlug } from '@/lib/storage';

export const runtime = 'nodejs';
export const alt = 'inchsales 상품 미리보기';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

let cachedFontData: ArrayBuffer | null = null;

async function loadKoreanFont(): Promise<ArrayBuffer | null> {
  if (cachedFontData) return cachedFontData;
  try {
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap',
      { signal: AbortSignal.timeout(2500) }
    );
    if (!cssRes.ok) return null;
    const cssText = await cssRes.text();
    const match = cssText.match(/src:\s*url\(([^)]+\.ttf)\)/);
    if (!match?.[1]) return null;

    const fontRes = await fetch(match[1], { signal: AbortSignal.timeout(2500) });
    if (!fontRes.ok) return null;
    cachedFontData = await fontRes.arrayBuffer();
    return cachedFontData;
  } catch {
    return null;
  }
}

function safeDecodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = safeDecodeSlug(slug);
  const link = getLinkBySlug(decodedSlug);
  const fontData = await loadKoreanFont();

  const productName = link?.productName || decodedSlug || 'inchsales 추천 상품';
  const category = link?.category || '쿠팡 추천템';
  const priceHint = link?.priceHint || '실시간 최저가 확인하기';
  const tagline = link?.tagline || '크리에이터 추천 로켓배송 최저가 바로가기';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
          color: '#ffffff',
          fontFamily: fontData ? '"Noto Sans KR", sans-serif' : 'sans-serif',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 900,
              }}
            >
              1&quot;
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>
              inchsales
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 999,
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.4)',
              color: '#93c5fd',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {category}
          </div>
        </div>

        {/* Center product title & tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: productName.length > 26 ? 46 : 56,
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#ffffff',
              wordBreak: 'keep-all',
            }}
          >
            {productName}
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#cbd5e1',
              lineHeight: 1.4,
            }}
          >
            {tagline.length > 60 ? `${tagline.slice(0, 60)}...` : tagline}
          </div>
        </div>

        {/* Bottom price & CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: 24,
            borderTop: '1px solid rgba(148, 163, 184, 0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            {priceHint}
          </div>
          <div
            style={{
              display: 'flex',
              padding: '14px 28px',
              borderRadius: 14,
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            최저가 바로가기 →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fontData
        ? {
            fonts: [
              {
                name: 'Noto Sans KR',
                data: fontData,
                style: 'normal',
                weight: 700,
              },
            ],
          }
        : {}),
    }
  );
}
