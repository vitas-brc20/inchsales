import { NextResponse } from 'next/server';
import { recordReferralClickAsync } from '@/lib/storage';

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const decodedSlug = decodeURIComponent(params.slug);
  const { searchParams } = new URL(request.url);
  const creator = searchParams.get('creator') || searchParams.get('ref') || 'official';

  const res = await recordReferralClickAsync(decodedSlug, creator);

  return NextResponse.redirect(res.redirectUrl, { status: 302 });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const decodedSlug = decodeURIComponent(params.slug);
  const { searchParams } = new URL(request.url);
  const creator = searchParams.get('creator') || searchParams.get('ref') || 'official';

  const res = await recordReferralClickAsync(decodedSlug, creator);

  return NextResponse.json({
    success: true,
    clicks: res.creatorStat.clicks,
    estimatedEarnings: res.creatorStat.estimatedEarnings,
    redirectUrl: res.redirectUrl,
  });
}
