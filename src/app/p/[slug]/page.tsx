import { notFound } from 'next/navigation';
import { getLinkBySlug } from '@/lib/storage';
import ProductCardView from '@/components/ProductCardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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
  const decodedSlug = decodeURIComponent(params.slug);
  const searchParams = await props.searchParams;
  const rawCreatorId = searchParams.ref || searchParams.id;
  const creatorId = safeDecodeCreatorId(rawCreatorId);
  const channel = searchParams.ch || searchParams.channel;
  const link = getLinkBySlug(decodedSlug, creatorId, channel);

  if (!link) {
    return {
      title: '상품을 찾을 수 없습니다 | inchsales',
    };
  }

  const creatorPrefix = creatorId && creatorId !== 'official' ? `@${creatorId} 님의 추천 - ` : '';

  return {
    title: `${creatorPrefix}${link.productName} 최저가 바로가기 | inchsales`,
    description: link.tagline,
    openGraph: {
      title: `${creatorPrefix}${link.productName}`,
      description: link.tagline,
      type: 'website',
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
  const decodedSlug = decodeURIComponent(params.slug);
  const searchParams = await props.searchParams;
  const rawCreatorId = searchParams.ref || searchParams.id;
  const creatorId = safeDecodeCreatorId(rawCreatorId);
  const channel = searchParams.ch || searchParams.channel;

  const link = getLinkBySlug(decodedSlug, creatorId, channel);

  if (!link) {
    notFound();
  }

  return <ProductCardView link={link} />;
}
