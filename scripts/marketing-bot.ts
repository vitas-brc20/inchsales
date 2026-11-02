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

// 트렌드 바이럴 타깃 아이템 풀
const VIRAL_TARGET_POOL = [
  {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    priceHint: '19,900원 (캔당 820원)',
    hook: '🔥 [로컬 핫딜] 쿠팡 로켓배송 코카콜라 제로 캔당 820원대 특가 떴습니다',
    description: '다이어터 필수템 코카콜라 제로 355ml 24캔이 지금 쿠팡 와우회원 특가로 떴네요! 캔당 820원꼴이라 편의점 1+1보다 훨씬 쌉니다.',
  },
  {
    slug: '두쫀쿠',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    hook: '🍪 틱톡 150만뷰 두바이 초콜릿 쫀득 쿠키 15,280원 로켓배송 특가!',
    description: '아직도 두바이 쿠키 못 드셔보신 분? 카다이프 피스타치오 가득 들어간 화제의 그 두쫀쿠 쿠팡 43% 특가로 풀렸습니다!',
  },
  {
    slug: '데스크청소기',
    name: '충전식 미니 데스크 무선 청소기',
    category: '리빙/자취',
    priceHint: '12,500원',
    hook: '🧹 릴스에서 댓글 3,000개 달렸던 1만원대 삶의 질 수직상승템',
    description: '책상 위 지우개똥, 머리카락, 키보드 먼지 3초 만에 싹 흡입하는 미니 무선 청소기! 자취생/재택근무자 필수템입니다.',
  },
  {
    slug: '노트북거치대',
    name: '원목 접이식 각도조절 노트북 거치대',
    category: '데스크테리어',
    priceHint: '24,900원',
    hook: '💻 거북목 탈출 & 데스크 감성 종결템! 원목 각도조절 거치대',
    description: '노트북 오래 쓰면 목 어깨 뻐근하신 분들 필수! 흔들림 없이 탄탄하고 인테리어도 예뻐서 반응 폭발 중인 제품입니다.',
  },
  {
    slug: '스탠리텀블러',
    name: '스탠리 퀜처 H2.0 진공 텀블러 1.18L',
    category: '패션/라이프',
    priceHint: '49,000원',
    hook: '🥤 얼음이 이틀 동안 안 녹는 인스타 필수템 스탠리 퀜처 텀블러!',
    description: '운동할 때, 출근할 때, 차에서 손잡이 잡고 마시기 최고! 1.18L 대용량이라 하루 물 섭취량 채우기 딱입니다.',
  },
  {
    slug: '토리든세럼',
    name: '토리든 다이브인 저분자 히알루론산 세럼 50ml',
    category: '뷰티/스킨케어',
    priceHint: '18,900원',
    hook: '💧 올리브영 1위 수분세럼 쿠팡 로켓배송 1만원대 특가',
    description: '속건조 심하신 분들은 그냥 이거 쓰시면 됩니다. 끈적임 전혀 없고 수분 충전 1초 컷으로 유튜버들 극찬한 수분 세럼!',
  },
  {
    slug: '앤커보조배터리',
    name: '앤커 맥세이프 10000mAh 마그네틱 무선 보조배터리',
    category: '디지털/가전',
    priceHint: '42,900원',
    hook: '🔋 선 없이 착 붙이는 아이폰/갤럭시 맥세이프 대용량 배터리',
    description: '케이블 주렁주렁 들고 다닐 필요 없이 뒤에 착 붙이면 끝! 슬림한데 10000mAh라 하루 종일 든든합니다.',
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
  const directCoupangUrl = target.slug === '제로콜라' 
    ? `https://link.coupang.com/a/ikoqLZW3zg?subid=inch_local_${campaignId}`
    : target.slug === '두쫀쿠'
    ? `https://link.coupang.com/a/ik36itDSai?subid=inch_local_${campaignId}`
    : `https://link.coupang.com/re/AFFSRCH?lptag=${TRACKING_ID}&subid=inch_local_${campaignId}&keyword=${encodeURIComponent(target.name)}`;

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
