import { notFound } from 'next/navigation';
import { getLinkBySlug } from '@/lib/storage';
import DashboardView from '@/components/DashboardView';
import type { Metadata } from 'next';

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string; id?: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const creatorId = searchParams.ref || searchParams.id;
  const link = getLinkBySlug(params.slug, creatorId);

  if (!link) {
    return {
      title: '대시보드를 찾을 수 없습니다 | inchsales',
    };
  }

  const creatorText = creatorId ? `@${creatorId} 님의 ` : '';
  return {
    title: `${creatorText}${link.productName} 실시간 정산 대시보드 | inchsales`,
    description: `크리에이터님의 실시간 클릭 및 예상 정산 내역`,
  };
}

export default async function DashboardPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string; id?: string }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const creatorId = searchParams.ref || searchParams.id;

  const link = getLinkBySlug(params.slug, creatorId);

  if (!link) {
    notFound();
  }

  return <DashboardView link={link} />;
}
