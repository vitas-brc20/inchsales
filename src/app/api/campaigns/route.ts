import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');

export async function GET() {
  try {
    if (!fs.existsSync(CAMPAIGN_DIR)) {
      return NextResponse.json({ success: true, campaigns: [] });
    }

    const files = fs.readdirSync(CAMPAIGN_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10);

    const campaigns = files
      .map((file) => {
        try {
          const content = fs.readFileSync(path.join(CAMPAIGN_DIR, file), 'utf8');
          const raw = JSON.parse(content);
          const campaignId = raw.campaignId || `camp_${file.replace(/[^0-9]/g, '')}`;
          const targetSlug = raw.targetSlug || raw.slug || 'item';
          const localLandingUrl = raw.localLandingUrl || raw.directLandingUrl || `/p/${encodeURIComponent(targetSlug)}?ref=local_${campaignId}`;
          return {
            campaignId,
            generatedAt: raw.generatedAt || new Date().toISOString(),
            targetProduct: raw.targetProduct || '추천 상품',
            targetSlug,
            trackingId: raw.trackingId || 'AF5232288',
            localLandingUrl,
            directCoupangUrl: raw.directCoupangUrl || '',
            socialPosts: {
              threads: raw.socialPosts?.threads || '',
              twitterX: raw.socialPosts?.twitterX || '',
              instagramCaption: raw.socialPosts?.instagramCaption || raw.socialPosts?.instagramStoryText || '',
              kakaoTalkShare: raw.socialPosts?.kakaoTalkShare || '',
            },
            systemStats: {
              totalClicks: raw.systemStats?.totalClicks || 0,
              totalWithdrawals: raw.systemStats?.totalWithdrawals || 0,
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, campaigns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '캠페인 목록 조회 실패';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
