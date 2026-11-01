import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://srimeahesuhiakdlxhwr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaW1lYWhlc3VoaWFrZGx4aHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Mzc1MzksImV4cCI6MjEwOTExMzUzOX0.1RBDeIhNyJlpyYTSoJZv0CH0a3NZOK2ifwnX5y3M6b0';
const TRACKING_ID = process.env.COUPANG_TRACKING_ID || 'AF5232288';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');

// 트렌드 바이럴 후보 아이템 풀
const VIRAL_TARGET_POOL = [
  {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    priceHint: '19,900원 (캔당 820원)',
    hook: '🔥 [속보] 쿠팡 로켓배송 코카콜라 제로 캔당 820원대 특가 떴습니다',
    threadsCopy: `다이어터 필수템 코카콜라 제로 355ml 24캔이 지금 쿠팡 와우회원 특가로 떴네요! 캔당 820원꼴이라 편의점 1+1보다 훨씬 쌉니다.\n\n👇 최저가 좌표 & 실시간 재고 확인:\nhttps://inchsales.vercel.app/p/제로콜라?ref=viral_threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
  },
  {
    slug: '두쫀쿠',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    priceHint: '16,900원',
    hook: '🍪 틱톡 150만뷰 두바이 초콜릿 쫀득 쿠키 품절 풀렸습니다!',
    threadsCopy: `아직도 두바이 쿠키 못 드셔보신 분? 카다이프 피스타치오 가득 들어간 화제의 그 두쫀쿠 쿠팡에 소량 재입고됐어요!\n\n👇 품절 전 로켓배송 좌표:\nhttps://inchsales.vercel.app/p/두쫀쿠?ref=viral_threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
  },
  {
    slug: '데스크청소기',
    name: '충전식 미니 데스크 무선 청소기',
    category: '리빙/자취',
    priceHint: '12,500원',
    hook: '🧹 릴스에서 댓글 3,000개 달렸던 1만원대 삶의 질 수직상승템',
    threadsCopy: `책상 위 지우개똥, 머리카락, 키보드 먼지 3초 만에 싹 흡입하는 미니 무선 청소기! 자취생/재택근무자 필수템입니다.\n\n👇 영상 속 화제의 청소기 보러가기:\nhttps://inchsales.vercel.app/p/데스크청소기?ref=viral_threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
  },
];

async function runMarketingCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 inchsales 30분 정기 마케팅 사이클 가동 시작`);

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

  // 3. 캠페인 포스팅 번들 저장
  const campaignFile = path.join(CAMPAIGN_DIR, `campaign_${Date.now()}.json`);
  const campaignData = {
    generatedAt: timestamp,
    targetProduct: target.name,
    targetSlug: target.slug,
    trackingId: TRACKING_ID,
    directLandingUrl: `https://inchsales.vercel.app/p/${encodeURIComponent(target.slug)}?ref=auto_${Date.now().toString(36)}`,
    socialPosts: {
      threads: target.threadsCopy,
      twitterX: `${target.hook}\n\n👇 최저가 확인:\nhttps://inchsales.vercel.app/p/${encodeURIComponent(target.slug)}?ref=x_viral\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      instagramStoryText: `🔥 영상 속 그 템 최저가 좌표\nhttps://inchsales.vercel.app/p/${encodeURIComponent(target.slug)}?ref=insta_story`,
    },
    systemStats: {
      totalClicks,
      totalWithdrawals,
    },
  };

  fs.writeFileSync(campaignFile, JSON.stringify(campaignData, null, 2), 'utf8');

  // 4. 마케팅 활동 로그 기록
  const logMessage = `[${timestamp}] 캠페인 생성: ${target.name} | 누적클릭: ${totalClicks}회 | 출금신청: ${totalWithdrawals}건 | 생성파일: ${path.basename(campaignFile)}\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`[${timestamp}] ✅ 마케팅 사이클 완료! 타깃: ${target.name}`);
}

runMarketingCycle().catch(console.error);
