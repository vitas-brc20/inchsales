import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://srimeahesuhiakdlxhwr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaW1lYWhlc3VoaWFrZGx4aHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Mzc1MzksImV4cCI6MjEwOTExMzUzOX0.1RBDeIhNyJlpyYTSoJZv0CH0a3NZOK2ifwnX5y3M6b0';
const TRACKING_ID = process.env.COUPANG_TRACKING_ID || 'AF5232288';
const BASE_URL = process.env.APP_BASE_URL || 'https://inchsales.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');

// 1. 기존 검증된 핵심 상품 풀
const INITIAL_TARGET_POOL = [
  {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    priceHint: '19,900원 (캔당 820원)',
    shortUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    hook: '🔥 [핫딜] 쿠팡 로켓배송 코카콜라 제로 캔당 820원대 특가 떴습니다',
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

// 2. 30분 주기마다 자동 탐색 및 신규 등록할 트렌드/바이럴 상품 큐
const AUTO_DISCOVERY_QUEUE = [
  {
    slug: '카다이프두쫀쿠',
    name: '두쫀쿠 카다이프 피스타치오 쫀득 쿠키 12개입',
    category: '간식/디저트',
    priceHint: '16,300원 (로켓배송 당일도착)',
    shortUrl: 'https://link.coupang.com/a/ik36itDSai',
    queryOrUrl: 'https://link.coupang.com/a/ik36itDSai',
    imageUrl: 'https://t2c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2026/06/24/15/7/d06b8ffb-1943-45e0-9ede-bf29442de22d.jpg',
    tagline: '틱톡 200만뷰 화제의 카다이프 피스타치오 두쫀쿠 실시간 재고 확보!',
    hook: '🍪 [품절임박] 틱톡 200만뷰 카다이프 두쫀쿠 16,300원 로켓배송 풀렸습니다!',
    description: '구하기 하늘의 별 따기였던 카다이프 피스타치오 쫀득 쿠키! 지금 쿠팡 로켓배송으로 바로 주문 가능합니다.',
  },
  {
    slug: '단백질음료',
    name: '셀렉스 프로틴 락토프리 음료 125ml 24팩',
    category: '헬스/단백질',
    priceHint: '23,900원 (팩당 990원)',
    shortUrl: 'https://www.coupang.com/np/search?component=&q=%EC%85%80%EB%A0%89%EC%8A%A4%20%ED%94%84%EB%A1%9C%ED%8B%B4%20%EB%9D%BD%ED%86%A0%ED%94%84%EB%A6%AC%2024%ED%8Pack&channel=user&lptag=AF5232288',
    queryOrUrl: 'https://www.coupang.com/np/search?component=&q=%EC%85%80%EB%A0%89%EC%8A%A4%20%ED%94%84%EB%A1%9C%ED%8B%B4%20%EB%9D%BD%ED%86%A0%ED%94%84%EB%A6%AC%2024%ED%8Pack&channel=user&lptag=AF5232288',
    imageUrl: 'https://thumbnail6.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/10/11/17/5/52f1bda8-5ca8-4770-9d8a-669c5e3f4fc4.jpg',
    tagline: '속 편한 락토프리 고단백질 12g! 헬스/다이어트 필수 식단 아이템',
    hook: '💪 [식단특가] 헬스인 필수템 셀렉스 락토프리 프로틴 팩당 990원대 특가!',
    description: '유당불내증 걱정 없는 락토프리 고단백질 음료! 운동 전후 간편하게 챙겨 드세요.',
  },
  {
    slug: '스탠리텀블러',
    name: '스탠리 퀜처 H2.0 플로우스테이트 텀블러 887ml',
    category: '주방/텀블러',
    priceHint: '39,900원 (보온/보냉 48시간)',
    shortUrl: 'https://www.coupang.com/np/search?component=&q=%EC%8A%A4%ED%83%A0%EB%A6%AC%20%ED%80%84%EC%B2%98%20887ml&channel=user&lptag=AF5232288',
    queryOrUrl: 'https://www.coupang.com/np/search?component=&q=%EC%8A%A4%ED%83%A0%EB%A6%AC%20%ED%80%84%EC%B2%98%20887ml&channel=user&lptag=AF5232288',
    imageUrl: 'https://thumbnail7.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/11/02/10/1/4096c14c-eec4-4e2a-a92c-5dfc1e556dfc.jpg',
    tagline: '인스타/틱톡 릴스 감성 필수템! 얼음 48시간 유지 대용량 텀블러',
    hook: '🧊 [감성템] 틱톡 릴스 화제의 스탠리 퀜처 887ml 로켓배송 재고 오픈!',
    description: '하루 물 2L 채우기 가장 쉬운 텀블러! 감성 색상 재고 풀렸을 때 바로 챙기세요.',
  },
  {
    slug: '마그네틱거치대',
    name: '마그네틱 접이식 알루미늄 태블릿/스마트폰 거치대',
    category: '데스크테리어',
    priceHint: '19,800원 (각도/높이 무단조절)',
    shortUrl: 'https://www.coupang.com/np/search?component=&q=%EB%A7%88%EA%B7%B8%EB%84%A4%ED%8B%B1%20%EC%A0%91%EC%9D%B4%EC%8B%9D%20%EA%B1%B0%EC%B9%98%EB%8C%80&channel=user&lptag=AF5232288',
    queryOrUrl: 'https://www.coupang.com/np/search?component=&q=%EB%A7%88%EA%B7%B8%EB%84%A4%ED%8B%B1%20%EC%A0%91%EC%9D%B4%EC%8B%9D%20%EA%B1%B0%EC%B9%98%EB%8C%80&channel=user&lptag=AF5232288',
    imageUrl: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/08/17/11/3/4ef8f0b7-c12e-4b68-9a99-b1ff53f9e9cf.jpg',
    tagline: '목디스크 방지 & 감성 데스크테리어 필수템! 단단한 알루미늄 마그네틱 스탠드',
    hook: '📱 [데스크셋업] 거북목 탈출! 마그네틱 접이식 메탈 거치대 1만원대 특가!',
    description: '책상 위가 깔끔해지는 알루미늄 마그네틱 스탠드. 흔들림 없는 안정감 최고입니다.',
  },
  {
    slug: '무선에어건',
    name: '10만RPM 초강력 무선 에어건 먼지제거기 휴대용 청소기',
    category: '디지털/생활',
    priceHint: '28,500원 (100,000RPM 초강력)',
    shortUrl: 'https://www.coupang.com/np/search?component=&q=%EC%B4%88%EA%B0%95%EB%A0%A5%20%EB%AC%B4%EC%84%A0%20%EC%97%90%EC%96%B4%EA%B1%B4%20%EB%A8%BC%EC%A7%80%EC%A0%9C%EA%B1%B0%EA%B8%B0&channel=user&lptag=AF5232288',
    queryOrUrl: 'https://www.coupang.com/np/search?component=&q=%EC%B4%88%EA%B0%95%EB%A0%A5%20%EB%AC%B4%EC%84%A0%20%EC%97%90%EC%96%B4%EA%B1%B4%20%EB%A8%BC%EC%A7%80%EC%A0%9C%EA%B1%B0%EA%B8%B0&channel=user&lptag=AF5232288',
    imageUrl: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/12/05/14/7/371e7d0e-2d4e-4f1b-90f7-ee24b6e8e89f.jpg',
    tagline: '컴퓨터 본체, 키보드, 차량 먼지 0.1초 컷! 10만 RPM 제트블로워 에어건',
    hook: '💨 [꿀템] 캔 스프레이 그만 사세요! 10만 RPM 무선 에어건 2만원대 특가!',
    description: '키보드 사이사이, 본체 먼지, 세차 후 물기 제거까지 한 방에 해결하는 만능 에어건!',
  },
];

// 로컬 파일에서 상품 읽기
function getLocalProducts(): Record<string, any> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PRODUCTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// 로컬 파일에 상품 저장
function saveLocalProducts(data: Record<string, any>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

// 30분 태스크 내 신규 상품 자동 발굴 및 등록 함수
async function autoDiscoverAndAddProducts(timestamp: string): Promise<any | null> {
  const currentProducts = getLocalProducts();
  let newlyAdded: any = null;

  for (const item of AUTO_DISCOVERY_QUEUE) {
    const slugKey = item.slug.toLowerCase();
    if (!currentProducts[slugKey]) {
      // 신규 상품 등록
      const productRecord = {
        slug: item.slug,
        name: item.name,
        category: item.category,
        tagline: item.tagline,
        queryOrUrl: item.queryOrUrl,
        priceHint: item.priceHint,
        imageUrl: item.imageUrl,
        totalClicks: 0,
        createdAt: timestamp,
      };

      currentProducts[slugKey] = productRecord;
      saveLocalProducts(currentProducts);

      // Supabase에도 동기화
      try {
        await supabase.from('inch_products').upsert({
          slug: item.slug,
          name: item.name,
          category: item.category,
          tagline: item.tagline,
          query_or_url: item.queryOrUrl,
          price_hint: item.priceHint,
          total_clicks: 0,
          created_at: timestamp,
        });
      } catch (err) {
        console.warn('Supabase product sync warning:', err);
      }

      newlyAdded = item;
      const addLog = `[${timestamp}] 📦 [신규 상품 자동 등록] ${item.name} (/p/${item.slug}) | 가격: ${item.priceHint}\n`;
      fs.appendFileSync(LOG_FILE, addLog, 'utf8');
      console.log(`[${timestamp}] 📦 [신규 상품 자동 등록 완료] ${item.name} (/p/${item.slug})`);
      break; // 한 사이클당 1개씩 점진적 신규 등록
    }
  }

  return newlyAdded;
}

export async function runMarketingCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 inchsales 30분 정기 마케팅 & 상품 등록 사이클 실행`);

  if (!fs.existsSync(CAMPAIGN_DIR)) {
    fs.mkdirSync(CAMPAIGN_DIR, { recursive: true });
  }

  // 1. 신규 상품 자동 발굴 및 등록
  const newlyAddedProduct = await autoDiscoverAndAddProducts(timestamp);

  // 2. Supabase 현재 실적 수집
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

  // 3. 전체 활성 타깃 풀 구성 (기존 + 큐에서 이미 등록된 상품들)
  const currentProducts = getLocalProducts();
  const activePool: any[] = [...INITIAL_TARGET_POOL];

  for (const item of AUTO_DISCOVERY_QUEUE) {
    if (currentProducts[item.slug.toLowerCase()]) {
      if (!activePool.some((p) => p.slug === item.slug)) {
        activePool.push(item);
      }
    }
  }

  // 신규 등록된 상품이 있다면 해당 상품을 최우선 타깃으로 선정, 없으면 랜덤 로테이션
  const target = newlyAddedProduct || activePool[Math.floor(Math.random() * activePool.length)];

  const campaignId = `camp_${Date.now().toString(36)}`;
  const landingUrl = `${BASE_URL}/p/${encodeURIComponent(target.slug)}?ref=pub_${campaignId}`;
  const directCoupangUrl = target.shortUrl.includes('?')
    ? `${target.shortUrl}&subid=inch_pub_${campaignId}`
    : `${target.shortUrl}?subid=inch_pub_${campaignId}`;

  // 4. 캠페인 포스팅 번들 저장 (채널별 태깅 적용)
  const campaignFile = path.join(CAMPAIGN_DIR, `campaign_${Date.now()}.json`);
  const campaignData = {
    campaignId,
    generatedAt: timestamp,
    targetProduct: target.name,
    targetSlug: target.slug,
    trackingId: TRACKING_ID,
    newlyDiscovered: !!newlyAddedProduct,
    landingUrl,
    localLandingUrl: landingUrl,
    directCoupangUrl,
    socialPosts: {
      threads: `${target.description}\n\n👇 최저가 좌표 & 실시간 재고 확인:\n${landingUrl}&ch=threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      twitterX: `${target.hook}\n\n👇 최저가 확인:\n${landingUrl}&ch=threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      instagramCaption: `[영상 속 핫딜 좌표] ${target.name}\n\n프로필 링크 또는 스토리 스티커를 확인해주세요!\n👉 ${landingUrl}&ch=insta\n\n* 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`,
      kakaoTalkShare: `[핫딜 알림] ${target.name} 최저가 떴습니다! 확인해보세요 👉 ${landingUrl}&ch=kakao`,
    },
    systemStats: {
      totalClicks,
      totalWithdrawals,
      catalogSize: Object.keys(currentProducts).length,
    },
  };

  fs.writeFileSync(campaignFile, JSON.stringify(campaignData, null, 2), 'utf8');

  // 5. 마케팅 활동 로그 기록
  const logMessage = `[${timestamp}] [정기 사이클] ${newlyAddedProduct ? '★신규등록★ ' : ''}타깃: ${target.name} | 랜딩URL: ${landingUrl} | 누적클릭: ${totalClicks}회 | 상품수: ${Object.keys(currentProducts).length}개\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`[${timestamp}] ✅ 마케팅 캠페인 번들 생성 완료: ${target.name} (${landingUrl})`);
  return campaignData;
}

runMarketingCycle().catch(console.error);
