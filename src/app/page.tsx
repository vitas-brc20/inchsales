import Header from '@/components/Header';
import Studio from '@/components/Studio';
import ProductCardView from '@/components/ProductCardView';
import { getAllLinks, getProductBySlugOrQuery, upsertProduct, buildCoupangLinkWithRef } from '@/lib/storage';
import { ProductLink } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    id?: string;
    ref?: string;
  }>;
}

export default async function HomePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const q = searchParams.q;
  const creatorId = searchParams.id || searchParams.ref;

  // 만약 쿼리스트링으로 ?q=두쫀쿠&id=uuid 가 들어온 경우, 바로 구매자 랜딩 카드를 띄워줌!
  if (q && q.trim()) {
    let product = getProductBySlugOrQuery(q);
    if (!product) {
      product = upsertProduct({ name: q });
    }

    const safeCreator = creatorId || 'tiktok_creator';
    const link: ProductLink = {
      slug: product.slug,
      productName: product.name,
      category: product.category,
      creatorId: safeCreator,
      tagline: product.tagline,
      originalQueryOrUrl: product.queryOrUrl,
      coupangUrl: buildCoupangLinkWithRef(product.queryOrUrl, safeCreator, product.slug),
      subId: `inch_${safeCreator}_${product.slug}`,
      clicks: product.totalClicks,
      estimatedEarnings: Math.round(product.totalClicks * 35),
      priceHint: product.priceHint,
      createdAt: product.createdAt,
    };

    return <ProductCardView link={link} />;
  }

  // 기본 홈 화면 (링크 생성 스튜디오)
  const links = getAllLinks();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header />
      <main className="flex-1">
        <Studio initialLinks={links} />
      </main>
    </div>
  );
}
