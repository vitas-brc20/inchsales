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

// 2. 30분 주기마다 자동 탐색 및 신규 등록할 트렌드/바이럴 상품 큐 (100% 개별 상품 페이지 직행 보장)
const AUTO_DISCOVERY_QUEUE = [
  {
    slug: '카다이프두쫀쿠',
    name: '줄리브 두바이 쫀득 쿠키 선물 세트 (두쫀쿠)',
    category: '간식/디저트',
    priceHint: '39,600원 (24% 특가 로켓배송)',
    shortUrl: 'https://link.coupang.com/a/ik4aZWyRZA',
    queryOrUrl: 'https://link.coupang.com/a/ik4aZWyRZA',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    tagline: '틱톡 200만뷰 화제의 카다이프 피스타치오 두쫀쿠 실시간 재고 확보!',
    hook: '🍪 [품절임박] 틱톡 200만뷰 두바이 카다이프 쿠키 로켓배송 바로가기!',
    description: '구하기 하늘의 별 따기였던 카다이프 피스타치오 쫀득 쿠키! 지금 쿠팡 로켓배송으로 품절 전 주문 가능합니다.',
  },
  {
    slug: '굽네닭가슴살',
    name: '굽네 오븐구이 통 닭가슴살 40팩',
    category: '헬스/단백질',
    priceHint: '38,900원 (팩당 970원대 특가)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8243670605&itemId=130889429&vendorItemId=3121718413&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8243670605&itemId=130889429&vendorItemId=3121718413&lptag=AF5232288',
    imageUrl: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/05/10/14/4/6c85e3b5-3d5f-4d37-885d-ef7579cf653b.jpg',
    tagline: '100% 국산 닭가슴살! 부드럽고 촉촉한 식단관리 필수템 로켓배송',
    hook: '💪 [식단특가] 헬스/다이어터 필수템 굽네 닭가슴살 40팩 팩당 970원대 특가!',
    description: '퍽퍽함 제로! 오븐에 구워 촉촉한 국산 통 닭가슴살 40팩 특가 로켓배송으로 쟁여두세요.',
  },
  {
    slug: '펩시제로',
    name: '펩시 제로슈거 라임향 250ml 30캔',
    category: '식음료/음료',
    priceHint: '14,800원 (캔당 490원대 특가)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8279872054&itemId=23665748009&vendorItemId=74157319832&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8279872054&itemId=23665748009&vendorItemId=74157319832&lptag=AF5232288',
    imageUrl: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/09/20/15/0/0733a1e1-e945-4235-86f3-93d395d85c08.jpg',
    tagline: '탄산 러버들 종결템! 라임향 톡 쏘는 펩시 제로 로켓배송 최저가',
    hook: '🥤 [초특가] 캔당 490원대! 펩시 제로 라임 30캔 로켓배송 최저가 떴습니다',
    description: '편의점에서 사면 2캔에 4,000원인데 30캔 14,800원 로켓배송으로 집 앞까지 배송됩니다.',
  },
  {
    slug: '샥즈오픈핏',
    name: '샥즈 오픈핏 2+ T921 오픈형 무선 블루투스 이어폰',
    category: '디지털/가전',
    priceHint: '249,000원 (로켓배송 무료배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8674824737&vendorItemId=93467707435&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8674824737&vendorItemId=93467707435&lptag=AF5232288',
    imageUrl: 'https://thumbnail10.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/08/22/10/1/4096c14c-eec4-4e2a-a92c-5dfc1e556dfc.jpg',
    tagline: '귀가 편안한 초경량 오픈형 이어폰! 러닝/운동/업무 최강자 로켓배송',
    hook: '🎧 [음질종결] 귀 안 아픈 무선 이어폰 끝판왕 샥즈 오픈핏 2+ 로켓배송!',
    description: '하루 종일 착용해도 귀가 전혀 아프지 않은 오픈핏 무선 이어폰! 운동할 때 필수템입니다.',
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
