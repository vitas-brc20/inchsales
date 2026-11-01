import { NextResponse } from 'next/server';
import { recordReferralClickAsync } from '@/lib/storage';

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(request.url);
  const creator = searchParams.get('creator') || 'official';

  const res = await recordReferralClickAsync(params.slug, creator);

  return NextResponse.json({
    success: true,
    clicks: res.creatorStat.clicks,
    estimatedEarnings: res.creatorStat.estimatedEarnings,
    redirectUrl: res.redirectUrl,
  });
}
