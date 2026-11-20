import { notFound } from 'next/navigation';
import { getLinkBySlug, getRankedCreatorFeeds } from '@/lib/storage';
import ProductCardView from '@/components/ProductCardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function safeDecodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function safeDecodeCreatorId(ref?: string): string {
  if (!ref) return 'official';
  let decoded = ref.trim();
  for (let i = 0; i < 3; i++) {
    if (decoded.includes('%')) {
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        break;
      }
    } else {
      break;
    }
  }
  return decoded.replace(/^@+/, '').trim() || 'official';
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string; id?: string; ch?: string; channel?: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const decodedSlug = safeDecodeSlug(params.slug);
  const searchParams = await props.searchParams;
  const rawCreatorId = searchParams.ref || searchParams.id;
  const creatorId = safeDecodeCreatorId(rawCreatorId);
  const channel = searchParams.ch || searchParams.channel;
  const link = getLinkBySlug(decodedSlug, creatorId, channel);

  if (!link) {
    return {
      title: '상품을 찾을 수 없습니다 | inchsales',
      openGraph: {
        title: '상품을 찾을 수 없습니다 | inchsales',
        description: '요청하신 상품 페이지를 찾을 수 없습니다.',
        type: 'website',
        siteName: 'inchsales',
        locale: 'ko_KR',
      },
    };
  }

  const cleanCreator = (creatorId || '').replace(/^@+/, '');
  const creatorPrefix = cleanCreator && cleanCreator !== 'official' ? `@${cleanCreator} 님의 추천 - ` : '';
  const ogTitle = `${creatorPrefix}${link.productName}`;
  const encodedSlug = encodeURIComponent(link.slug);
  const pageUrl = `https://inch.sale/p/${encodedSlug}`;
  const ogImageUrl = link.imageUrl || `https://inch.sale/p/${encodedSlug}/opengraph-image`;

  return {
    title: `${ogTitle} 최저가 바로가기 | inchsales`,
    description: link.tagline,
    openGraph: {
      title: ogTitle,
      description: link.tagline,
      url: pageUrl,
      siteName: 'inchsales',
      locale: 'ko_KR',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: link.productName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: link.tagline,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string; id?: string; ch?: string; channel?: string }>;
  }
) {
  const params = await props.params;
  const decodedSlug = safeDecodeSlug(params.slug);
  const searchParams = await props.searchParams;
  const rawCreatorId = searchParams.ref || searchParams.id;
  const creatorId = safeDecodeCreatorId(rawCreatorId);
  const channel = searchParams.ch || searchParams.channel;

  const link = getLinkBySlug(decodedSlug, creatorId, channel);

  if (!link) {
    notFound();
  }

  // 실시간 클릭수 랭킹 기반 인플루언서 피드 및 역홍보 목록
  const topFeeds = getRankedCreatorFeeds(3).filter((f) => f.slug !== decodedSlug);

  return <ProductCardView link={link} topFeeds={topFeeds} />;
}
