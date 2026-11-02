import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://srimeahesuhiakdlxhwr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaW1lYWhlc3VoaWFrZGx4aHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Mzc1MzksImV4cCI6MjEwOTExMzUzOX0.1RBDeIhNyJlpyYTSoJZv0CH0a3NZOK2ifwnX5y3M6b0';
const TRACKING_ID = process.env.COUPANG_TRACKING_ID || 'AF5232288';
const LOCAL_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3456';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');

// 100% 검증된 공식 쿠팡 파트너스 단축 링크(link.coupang.com/a/...) 전용 풀
const VIRAL_TARGET_POOL = [
  {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    priceHint: '19,900원 (캔당 820원)',
    shortUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    hook: '🔥 [로컬 핫딜] 쿠팡 로켓배송 코카콜라 제로 캔당 820원대 특가 떴습니다',
    description: '다이어터 필수템 코카콜라 제로 355ml 24캔이 지금 쿠팡 와우회원 특가로 떴네요! 캔당 820원꼴이라 편의점 1+1보다 훨씬 쌉니다.',
  },
  {
    slug: '두쫀쿠',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    shortUrl: 'https://link.coupang.com/a/ik4aZWyRZA',
    hook: '🍪 틱톡 150만뷰 두바이 초콜릿 쫀득 쿠키 15,280원 로켓배송 특가!',
    description: '아직도 두바이 쿠키 못 드셔보신 분? 카다이프 피스타치오 가득 들어간 화제의 그 두쫀쿠 쿠팡 43% 특가로 풀렸습니다!',
  },
];

export async function runMarketingCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 [로컬 전용] inchsales 30분 정기 마케팅 사이클 실행`);

  if (!fs.existsSync(CAMPAIGN_DIR)) {
    fs.mkdirSync(CAMPAIGN_DIR, { recursive: true });
  }

  // 1. Supabase 현재 실적 수집
  let totalClicks = 0;
  let totalWithdrawals = 0;
  try {
    const { data: stats } = await supabase.from('inch_creator_stats').select('clicks');
    if (stats) {
      totalClicks = stats.reduce((acc, cur) => acc + (cur.clicks || 0), 0);
    }
    const { count: wdCount } = await supabase.from('inch_withdrawals').select('*', { count: 'exact', head: true });
    totalWithdrawals = wdCount || 0;
  } catch (err) {
    console.warn('Supabase stats fetch warning:', err);
  }

  // 2. 오늘의 타깃 바이럴 캠페인 선정 및 생성
  const randomIndex = Math.floor(Math.random() * VIRAL_TARGET_POOL.length);
  const target = VIRAL_TARGET_POOL[randomIndex];

  const campaignId = `camp_${Date.now().toString(36)}`;
  const localUrl = `${LOCAL_BASE_URL}/p/${encodeURIComponent(target.slug)}?ref=local_${campaignId}`;
  const directCoupangUrl = `${target.shortUrl}?subid=inch_local_${campaignId}`;

  // 3. 캠페인 포스팅 번들 저장
  const campaignFile = path.join(CAMPAIGN_DIR, `campaign_${Date.now()}.json`);
  const campaignData = {
    campaignId,
    generatedAt: timestamp,
    targetProduct: target.name,
    targetSlug: target.slug,
    trackingId: TRACKING_ID,
    localLandingUrl: localUrl,
    directCoupangUrl,
    socialPosts: {
      threads: `${target.description}\n\n👇 최저가 좌표 & 실시간 재고 확인:\n${localUrl}\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      twitterX: `${target.hook}\n\n👇 최저가 확인:\n${localUrl}\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      instagramCaption: `[영상 속 핫딜 좌표] ${target.name}\n\n프로필 링크 또는 스토리 스티커를 확인해주세요!\n👉 ${localUrl}\n\n* 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`,
      kakaoTalkShare: `[핫딜 알림] ${target.name} 최저가 떴습니다! 확인해보세요 👉 ${localUrl}`,
    },
    systemStats: {
      totalClicks,
      totalWithdrawals,
    },
  };

  fs.writeFileSync(campaignFile, JSON.stringify(campaignData, null, 2), 'utf8');

  // 4. 마케팅 활동 로그 기록
  const logMessage = `[${timestamp}] [로컬 사이클] 타깃: ${target.name} | 로컬URL: ${localUrl} | 누적클릭: ${totalClicks}회 | 출금: ${totalWithdrawals}건\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`[${timestamp}] ✅ 로컬 마케팅 캠페인 번들 생성 완료: ${target.name} (${localUrl})`);
  return campaignData;
}

runMarketingCycle().catch(console.error);
