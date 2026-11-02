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
          const landingUrl = (raw.landingUrl || raw.localLandingUrl || raw.directLandingUrl || `https://inchsales.vercel.app/p/${encodeURIComponent(targetSlug)}?ref=pub_${campaignId}`)
            .replace(/http:\/\/localhost:\d+/g, 'https://inchsales.vercel.app');

          const replaceLocalhost = (str: string) => (str || '').replace(/http:\/\/localhost:\d+/g, 'https://inchsales.vercel.app');

          return {
            campaignId,
            generatedAt: raw.generatedAt || new Date().toISOString(),
            targetProduct: raw.targetProduct || '추천 상품',
            targetSlug,
            trackingId: raw.trackingId || 'AF5232288',
            landingUrl,
            localLandingUrl: landingUrl,
            directCoupangUrl: raw.directCoupangUrl || '',
            socialPosts: {
              threads: replaceLocalhost(raw.socialPosts?.threads),
              twitterX: replaceLocalhost(raw.socialPosts?.twitterX),
              instagramCaption: replaceLocalhost(raw.socialPosts?.instagramCaption || raw.socialPosts?.instagramStoryText),
              kakaoTalkShare: replaceLocalhost(raw.socialPosts?.kakaoTalkShare),
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
