import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { ProductItem, CreatorStat, ProductLink, CreateLinkPayload, WithdrawalRequest } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const STATS_FILE = path.join(DATA_DIR, 'creator_stats.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');

// 기본 공유 상품 카탈로그 (인플루언서들이 공통으로 가져다 쓸 수 있는 상품들)
const INITIAL_PRODUCTS: Record<string, ProductItem> = {
  '제로콜라': {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    tagline: '칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장',
    queryOrUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    priceHint: '19,900원 (캔당 820원)',
    totalClicks: 345,
    createdAt: new Date().toISOString(),
  },
  'coca-cola-zero': {
    slug: 'coca-cola-zero',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    tagline: '칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장',
    queryOrUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    priceHint: '19,900원 (캔당 820원)',
    totalClicks: 345,
    createdAt: new Date().toISOString(),
  },
  'ddu-zon-cookie': {
    slug: 'ddu-zon-cookie',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    tagline: '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9367416965&itemId=27716021235&vendorItemId=94764729984&lptag=AF5232288',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    totalClicks: 231,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  '두쫀쿠': {
    slug: '두쫀쿠',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    tagline: '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9367416965&itemId=27716021235&vendorItemId=94764729984&lptag=AF5232288',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    totalClicks: 231,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  '카다이프두쫀쿠': {
    slug: '카다이프두쫀쿠',
    name: '줄리브 두바이 쫀득 쿠키 선물 세트 (두쫀쿠)',
    category: '간식/디저트',
    tagline: '틱톡 200만뷰 화제의 카다이프 피스타치오 두쫀쿠 실시간 재고 확보!',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9367416965&itemId=27716021235&vendorItemId=94764729984&lptag=AF5232288',
    priceHint: '39,600원 (24% 특가 로켓배송)',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    totalClicks: 45,
    createdAt: new Date().toISOString(),
  },
  '굽네닭가슴살': {
    slug: '굽네닭가슴살',
    name: '굽네 오븐구이 통 닭가슴살 40팩',
    category: '헬스/단백질',
    tagline: '100% 국산 닭가슴살! 부드럽고 촉촉한 식단관리 필수템 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8243670605&itemId=130889429&vendorItemId=3121718413&lptag=AF5232288',
    priceHint: '38,900원 (팩당 970원대 특가)',
    imageUrl: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/05/10/14/4/6c85e3b5-3d5f-4d37-885d-ef7579cf653b.jpg',
    totalClicks: 18,
    createdAt: new Date().toISOString(),
  },
  '펩시제로': {
    slug: '펩시제로',
    name: '펩시 제로슈거 라임향 250ml 30캔',
    category: '식음료/음료',
    tagline: '탄산 러버들 종결템! 라임향 톡 쏘는 펩시 제로 로켓배송 최저가',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8279872054&itemId=23665748009&vendorItemId=74157319832&lptag=AF5232288',
    priceHint: '14,800원 (캔당 490원대 특가)',
    imageUrl: 'https://thumbnail9.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2023/09/20/15/0/0733a1e1-e945-4235-86f3-93d395d85c08.jpg',
    totalClicks: 25,
    createdAt: new Date().toISOString(),
  },
  '샥즈오픈핏': {
    slug: '샥즈오픈핏',
    name: '샥즈 오픈핏 2+ T921 오픈형 무선 블루투스 이어폰',
    category: '디지털/가전',
    tagline: '귀가 편안한 초경량 오픈형 이어폰! 러닝/운동/업무 최강자 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8674824737&vendorItemId=93467707435&lptag=AF5232288',
    priceHint: '249,000원 (로켓배송 무료배송)',
    imageUrl: 'https://thumbnail10.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/2024/08/22/10/1/4096c14c-eec4-4e2a-a92c-5dfc1e556dfc.jpg',
    totalClicks: 12,
    createdAt: new Date().toISOString(),
  },
  '미백치약': {
    slug: '미백치약',
    name: '오스템파마 뷰센 28 전문 치아미백제 80g',
    category: '덴탈/미백',
    tagline: '커피·흡연 치아 착색 종결! 오스템임플란트 연구진 개발 전문 치아미백제',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=339848193&itemId=1082271085&vendorItemId=5585251715&lptag=AF5232288',
    priceHint: '11,000원 (과산화수소 2.8% 집중미백 로켓배송)',
    imageUrl: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/272776546096053-fc419bca-d55c-437d-b34c-8ab897272f04.jpg',
    totalClicks: 30,
    createdAt: new Date().toISOString(),
  },
  '물광피부로션': {
    slug: '물광피부로션',
    name: '달바 화이트 트러플 프리미엄 퍼스트 스프레이 세럼 100ml',
    category: '뷰티/스킨케어',
    tagline: '뿌리는 즉시 도자기 물광 피부 완성! 3,000만병 돌파 승무원 필수 보습 세럼',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9304025604&itemId=15280462262&lptag=AF5232288',
    priceHint: '16,880원 (누적 3,000만병 승무원 물광보습 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/1025_amir_coupang_oct_80k/2970/cd1098f237e3b55777e2c95b3c455258867666a7917fd09615f9a72d3d6e.jpg',
    totalClicks: 42,
    createdAt: new Date().toISOString(),
  },
  '미백크림': {
    slug: '미백크림',
    name: '코스노리 화이트닝 드레스 톤업크림 50ml 2개',
    category: '뷰티/메이크업',
    tagline: '옷에 묻어남 없이 24시간 맑고 투명한 피부톤! 올리브영 1위 미백 톤업크림',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=28253537&itemId=19166818084&lptag=AF5232288',
    priceHint: '29,520원 (올리브영 1위 24시간 묻어남 없는 미백 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/357249001906818-a69e797f-5867-48cd-ac37-f3c77fcc2cf4.jpg',
    totalClicks: 38,
    createdAt: new Date().toISOString(),
  },
  '미역헤어에센스': {
    slug: '미역헤어에센스',
    name: '모레모 미라클 10 워터 트리트먼트 200ml (10초 물미역 헤어에센스)',
    category: '헤어/바디',
    tagline: '빗자루 개털 머리도 10초 만에 찰랑이는 물미역으로 변신하는 기적의 헤어케어',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9240387387&itemId=19575559037&lptag=AF5232288',
    priceHint: '21,500원 (10초 완성 실크 물미역 머릿결 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/195100722581669-260e3f45-530a-43f6-9026-8e4d73c702bc.jpg',
    totalClicks: 35,
    createdAt: new Date().toISOString(),
  },
  '블랙헤드제거': {
    slug: '블랙헤드제거',
    name: '미팩토리 3단 돼지 코팩 (피지/블랙헤드 뿌리뽑기)',
    category: '뷰티/스킨케어',
    tagline: '딸기코 탈출! 모공 속 묵은 블랙헤드와 피지를 뿌리째 뽑아주는 3단 코팩',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=25470019&itemId=931146193&lptag=AF5232288',
    priceHint: '7,100원 (국민 1위 피지/블랙헤드 올킬 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/866149354384480-4b6d8891-536b-4d7a-8eb3-403cbb7eaf60.jpg',
    totalClicks: 40,
    createdAt: new Date().toISOString(),
  },
  '크리스마스트리': {
    slug: '크리스마스트리',
    name: '프리미엄 리얼 전나무 크리스마스 트리 풀세트 (홀리데이 에디션)',
    category: '홈/인테리어',
    tagline: '올겨울 완벽한 연말 분위기! 풍성하고 고급스러운 프리미엄 전나무 크리스마스 트리',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8413458470&itemId=24328153057&lptag=AF5232288',
    priceHint: '48,900원 (풍성한 솔잎 리얼 전나무 트리 풀세트 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2023/11/06/15/4/19bf2e2d-3cb8-48b0-a0a5-29c488ad5319.jpg',
    totalClicks: 28,
    createdAt: new Date().toISOString(),
  },
  '한정판스타벅스': {
    slug: '한정판스타벅스',
    name: '스타벅스 SS 블랙 데비 콜드컵 보온 보냉 텀블러 473ml (한정판)',
    category: '리빙/텀블러',
    tagline: '품절 대란 스타벅스 한정판 텀블러! 압도적인 보온 보냉력과 고급스러운 감성',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=226277604&itemId=716893557&lptag=AF5232288',
    priceHint: '32,900원 (스타벅스 시그니처 한정판 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2021/04/16/16/4/3ff94b00-349f-4318-ae71-29ad3ecb3d29.jpg',
    totalClicks: 33,
    createdAt: new Date().toISOString(),
  },
  '애플에어팟': {
    slug: '애플에어팟',
    name: 'Apple 정품 에어팟 액티브 노이즈 캔슬링 블루투스 이어폰',
    category: '디지털/가전',
    tagline: 'Apple 공식 정품! 압도적인 액티브 노이즈 캔슬링과 공간 음향',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9729244277&itemId=29114723176&lptag=AF5232288',
    priceHint: '195,020원 (Apple 공식 브랜드관 쿠팡 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2026/09/10/7/7/ce512298-9be6-447c-ab11-3cbcd8c346d2.jpg',
    totalClicks: 56,
    createdAt: new Date().toISOString(),
  },
  '치이카와': {
    slug: '치이카와',
    name: '치이카와 하치와레 우사기 모찌 빅사이즈 봉제인형 쿠션',
    category: '캐릭터/완구',
    tagline: 'SNS 품절 대란! 말랑쫀득 심쿵 비주얼 치이카와 먼작귀 빅사이즈 인형 쿠션',
    queryOrUrl: 'https://link.coupang.com/a/ifZPWVBdHE',
    priceHint: '18,900원 (SNS 품절대란 먼작귀 모찌 쿠션 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/vendor_inventory/a933/bceb3ea0f058cfeb774e1d51a660a5d21469e7f82e1858a2e1d7494a44a1.jpg',
    totalClicks: 64,
    createdAt: new Date().toISOString(),
  },
  '애플아이폰': {
    slug: '애플아이폰',
    name: 'Apple 정품 아이폰 17 Pro Max 자급제 (512GB)',
    category: '디지털/애플',
    tagline: 'Apple 최신 플래그십! A19 Pro 칩셋과 5배 광학 줌 티타늄 디자인 쿠팡 공식 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9024167604&itemId=26462330388&lptag=AF5232288',
    priceHint: '1,900,000원 (Apple 공식 브랜드관 카드할인 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/24819336320112-e9791646-a8bb-42c0-a5cf-4b48458187f8.jpg',
    totalClicks: 75,
    createdAt: new Date().toISOString(),
  },
  '아이폰': {
    slug: '아이폰',
    name: 'Apple 정품 아이폰 17 Pro Max 자급제 (512GB)',
    category: '디지털/애플',
    tagline: 'Apple 최신 플래그십! A19 Pro 칩셋과 5배 광학 줌 티타늄 디자인 쿠팡 공식 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9024167604&itemId=26462330388&lptag=AF5232288',
    priceHint: '1,900,000원 (Apple 공식 브랜드관 카드할인 로켓배송)',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/24819336320112-e9791646-a8bb-42c0-a5cf-4b48458187f8.jpg',
    totalClicks: 72,
    createdAt: new Date().toISOString(),
  },
  '애플아이패드': {
    slug: '애플아이패드',
    name: 'Apple 정품 2024 아이패드 10세대 10.9 Wi-Fi (64GB)',
    category: '디지털/애플',
    tagline: '인강·필기·영상 감상 가성비 원탑! 올 스크린 디자인 Liquid Retina 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=6912124565&lptag=AF5232288',
    priceHint: '529,000원 (Apple 공식 브랜드관 로켓배송 최저가)',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    totalClicks: 68,
    createdAt: new Date().toISOString(),
  },
  '아이패드': {
    slug: '아이패드',
    name: 'Apple 정품 2024 아이패드 10세대 10.9 Wi-Fi (64GB)',
    category: '디지털/애플',
    tagline: '인강·필기·영상 감상 가성비 원탑! 올 스크린 디자인 Liquid Retina 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=6912124565&lptag=AF5232288',
    priceHint: '529,000원 (Apple 공식 브랜드관 로켓배송 최저가)',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    totalClicks: 65,
    createdAt: new Date().toISOString(),
  },
  '애플맥북': {
    slug: '애플맥북',
    name: 'Apple 정품 맥북 프로 14 M5 (512GB 스페이스 블랙)',
    category: '디지털/애플',
    tagline: '전문가를 위한 압도적인 연산 퍼포먼스! M5 칩 탑재 Liquid Retina XDR 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9140128274&itemId=27961799025&vendorItemId=94919837754&lptag=AF5232288',
    priceHint: '2,390,000원 (Apple 정품 M5 프로 로켓배송 최대할인)',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
    totalClicks: 82,
    createdAt: new Date().toISOString(),
  },
  '맥북': {
    slug: '맥북',
    name: 'Apple 정품 맥북 프로 14 M5 (512GB 스페이스 블랙)',
    category: '디지털/애플',
    tagline: '전문가를 위한 압도적인 연산 퍼포먼스! M5 칩 탑재 Liquid Retina XDR 로켓배송',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9140128274&itemId=27961799025&vendorItemId=94919837754&lptag=AF5232288',
    priceHint: '2,390,000원 (Apple 정품 M5 프로 로켓배송 최대할인)',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
    totalClicks: 80,
    createdAt: new Date().toISOString(),
  },
};

const INITIAL_STATS: Record<string, CreatorStat> = {
  'tiktok_sweet:ddu-zon-cookie': {
    creatorId: 'tiktok_sweet',
    slug: 'ddu-zon-cookie',
    productName: '두바이 쫀득 쿠키 (두쫀쿠)',
    clicks: 142,
    estimatedEarnings: 8900,
    lastClickAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
};

// --- 로컬 파일 백업/캐시 헬퍼 ---
function readProducts(): Record<string, ProductItem> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(INITIAL_PRODUCTS, null, 2), 'utf8');
      return { ...INITIAL_PRODUCTS };
    }
    const content = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return { ...INITIAL_PRODUCTS, ...JSON.parse(content) };
  } catch {
    return { ...INITIAL_PRODUCTS };
  }
}

function writeProducts(data: Record<string, ProductItem>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write products file:', e);
  }
}

function readStats(): Record<string, CreatorStat> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STATS_FILE)) {
      fs.writeFileSync(STATS_FILE, JSON.stringify(INITIAL_STATS, null, 2), 'utf8');
      return { ...INITIAL_STATS };
    }
    const content = fs.readFileSync(STATS_FILE, 'utf8');
    return { ...INITIAL_STATS, ...JSON.parse(content) };
  } catch {
    return { ...INITIAL_STATS };
  }
}

function writeStats(data: Record<string, CreatorStat>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write stats file:', e);
  }
}

function readWithdrawals(): Record<string, WithdrawalRequest> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(WITHDRAWALS_FILE)) {
      fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const content = fs.readFileSync(WITHDRAWALS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeWithdrawals(data: Record<string, WithdrawalRequest>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write withdrawals file:', e);
  }
}

import { buildCoupangLinkWithRef } from './coupang';
export { buildCoupangLinkWithRef };

// --- Supabase 비동기 I/O (실패 시 로컬 파일로 자동 Fallback) ---

export async function getAllProductsAsync(): Promise<ProductItem[]> {
  try {
    const { data, error } = await supabase
      .from('inch_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        slug: d.slug,
        name: d.name,
        category: d.category || '트렌드/핫템',
        tagline: d.tagline || '',
        queryOrUrl: d.query_or_url,
        priceHint: d.price_hint,
        totalClicks: d.total_clicks || 0,
        createdAt: d.created_at,
      }));
    }
  } catch {
    // Supabase fallback
  }

  return getAllProducts();
}

export function getAllProducts(): ProductItem[] {
  const products = readProducts();
  return Object.values(products).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProductBySlugOrQueryAsync(slugOrQuery: string): Promise<ProductItem | null> {
  const normalized = slugOrQuery.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('inch_products')
      .select('*')
      .or(`slug.eq.${normalized},name.ilike.%${normalized}%,query_or_url.ilike.%${normalized}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        slug: data.slug,
        name: data.name,
        category: data.category || '트렌드/핫템',
        tagline: data.tagline || '',
        queryOrUrl: data.query_or_url,
        priceHint: data.price_hint,
        totalClicks: data.total_clicks || 0,
        createdAt: data.created_at,
      };
    }
  } catch {
    // Fallback
  }

  return getProductBySlugOrQuery(slugOrQuery);
}

export function getProductBySlugOrQuery(slugOrQuery: string): ProductItem | null {
  const products = readProducts();
  const normalized = slugOrQuery.trim().toLowerCase();

  if (products[normalized]) return products[normalized];

  for (const item of Object.values(products)) {
    if (
      item.slug.toLowerCase() === normalized ||
      item.name.toLowerCase().includes(normalized) ||
      item.queryOrUrl.toLowerCase() === normalized
    ) {
      return item;
    }
  }

  return null;
}

export async function upsertProductAsync(payload: {
  name: string;
  category?: string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  customSlug?: string;
}): Promise<ProductItem> {
  const localItem = upsertProduct(payload);

  try {
    await supabase.from('inch_products').upsert({
      slug: localItem.slug,
      name: localItem.name,
      category: localItem.category,
      tagline: localItem.tagline,
      query_or_url: localItem.queryOrUrl,
      price_hint: localItem.priceHint,
      total_clicks: localItem.totalClicks,
      created_at: localItem.createdAt,
    });
  } catch {
    // ignore
  }

  return localItem;
}

export function upsertProduct(payload: {
  name: string;
  category?: string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  customSlug?: string;
}): ProductItem {
  const products = readProducts();

  let slug = (payload.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!slug) {
    const matched = getProductBySlugOrQuery(payload.name);
    if (matched) return matched;
    slug = payload.name.trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, '-');
    if (!slug) {
      slug = 'item-' + Math.random().toString(36).substring(2, 8);
    }
  }

  if (products[slug]) {
    return products[slug];
  }

  const newProduct: ProductItem = {
    slug,
    name: payload.name.trim(),
    category: payload.category || '트렌드/핫템',
    tagline: payload.tagline?.trim() || `SNS에서 화제된 '${payload.name}' 최저가 구매 좌표`,
    queryOrUrl: payload.queryOrUrl?.trim() || payload.name.trim(),
    priceHint: payload.priceHint?.trim() || '쿠팡 최저가',
    totalClicks: 0,
    createdAt: new Date().toISOString(),
  };

  products[slug] = newProduct;
  writeProducts(products);

  return newProduct;
}

export function normalizeChannel(raw?: string): string {
  if (!raw) return 'general';
  const c = raw.trim().toLowerCase();
  if (['insta', 'instagram', 'ig', 'reels', 'story'].includes(c)) return 'insta';
  if (['tiktok', 'tt', 'tok'].includes(c)) return 'tiktok';
  if (['youtube', 'yt', 'shorts'].includes(c)) return 'youtube';
  if (['threads', 'th', 'twitter', 'x'].includes(c)) return 'threads';
  if (['blog', 'cafe', 'naver'].includes(c)) return 'blog';
  if (['kakao', 'kakaotalk', 'chat'].includes(c)) return 'kakao';
  return 'general';
}

// 클릭 기록 (Supabase + Local 동기화)
export async function recordReferralClickAsync(slugOrQuery: string, creatorId: string, channelInput?: string) {
  const channel = normalizeChannel(channelInput);
  const res = recordReferralClick(slugOrQuery, creatorId, channel);

  try {
    // Supabase inch_products total_clicks 증가
    await supabase
      .from('inch_products')
      .update({ total_clicks: res.product.totalClicks })
      .eq('slug', res.product.slug);

    // Supabase inch_creator_stats upsert
    const statKey = `${res.creatorStat.creatorId}:${res.product.slug}`;
    await supabase.from('inch_creator_stats').upsert({
      id: statKey,
      creator_id: res.creatorStat.creatorId,
      slug: res.product.slug,
      product_name: res.product.name,
      clicks: res.creatorStat.clicks,
      estimated_earnings: res.creatorStat.estimatedEarnings,
      last_click_at: res.creatorStat.lastClickAt,
    });
  } catch {
    // fallback
  }

  return res;
}

export function recordReferralClick(slugOrQuery: string, creatorId: string, channelInput?: string): {
  product: ProductItem;
  creatorStat: CreatorStat;
  redirectUrl: string;
} {
  let product = getProductBySlugOrQuery(slugOrQuery);
  if (!product) {
    product = upsertProduct({ name: slugOrQuery });
  }

  const safeCreator = (creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '') || 'anonymous';
  const channel = normalizeChannel(channelInput);
  const statKey = `${safeCreator}:${product.slug}`;

  const products = readProducts();
  if (products[product.slug]) {
    products[product.slug].totalClicks += 1;
    writeProducts(products);
  }

  const stats = readStats();
  const current = stats[statKey] || {
    creatorId: safeCreator,
    slug: product.slug,
    productName: product.name,
    clicks: 0,
    estimatedEarnings: 0,
    lastClickAt: new Date().toISOString(),
    channelStats: {},
  };

  current.clicks += 1;
  current.estimatedEarnings = Math.round(current.clicks * 35);
  current.lastClickAt = new Date().toISOString();

  if (!current.channelStats) {
    current.channelStats = {};
  }
  const chData = current.channelStats[channel] || {
    clicks: 0,
    estimatedEarnings: 0,
    lastClickAt: new Date().toISOString(),
  };
  chData.clicks += 1;
  chData.estimatedEarnings = Math.round(chData.clicks * 35);
  chData.lastClickAt = new Date().toISOString();
  current.channelStats[channel] = chData;

  stats[statKey] = current;
  writeStats(stats);

  const redirectUrl = buildCoupangLinkWithRef(product.queryOrUrl, safeCreator, product.slug, channel);

  return { product, creatorStat: current, redirectUrl };
}

// 출금 신청 (Supabase + Local)
export async function createWithdrawalRequestAsync(params: {
  creatorId: string;
  slug: string;
  productName: string;
  amount: number;
  accountInfo: string;
}): Promise<WithdrawalRequest> {
  const req = createWithdrawalRequest(params);

  try {
    await supabase.from('inch_withdrawals').insert({
      id: req.id,
      creator_id: req.creatorId,
      slug: req.slug,
      product_name: req.productName,
      amount: req.amount,
      account_info: req.accountInfo,
      status: req.status,
      created_at: req.createdAt,
    });
  } catch {
    // fallback
  }

  return req;
}

export function createWithdrawalRequest(params: {
  creatorId: string;
  slug: string;
  productName: string;
  amount: number;
  accountInfo: string;
}): WithdrawalRequest {
  const withdrawals = readWithdrawals();
  const id = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const request: WithdrawalRequest = {
    id,
    creatorId: params.creatorId,
    slug: params.slug,
    productName: params.productName,
    amount: params.amount,
    accountInfo: params.accountInfo.trim(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  withdrawals[id] = request;
  writeWithdrawals(withdrawals);

  return request;
}

export async function getWithdrawalsByCreatorAsync(creatorId: string): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('inch_withdrawals')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        creatorId: d.creator_id,
        slug: d.slug,
        productName: d.product_name,
        amount: d.amount,
        accountInfo: d.account_info,
        status: d.status,
        createdAt: d.created_at,
        processedAt: d.processed_at,
      }));
    }
  } catch {
    // fallback
  }

  return getWithdrawalsByCreator(creatorId);
}

export function getWithdrawalsByCreator(creatorId: string): WithdrawalRequest[] {
  const withdrawals = readWithdrawals();
  const safeCreator = (creatorId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return Object.values(withdrawals)
    .filter((w) => w.creatorId === safeCreator)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllWithdrawals(): WithdrawalRequest[] {
  const withdrawals = readWithdrawals();
  return Object.values(withdrawals).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// 인터페이스 호환 래퍼들
export function getAllLinks(): ProductLink[] {
  const products = getAllProducts();
  const stats = readStats();

  return products.map((p) => {
    const stat = Object.values(stats).find((s) => s.slug === p.slug);
    const creatorId = stat?.creatorId || 'official';
    return {
      slug: p.slug,
      productName: p.name,
      category: p.category,
      creatorId,
      tagline: p.tagline,
      originalQueryOrUrl: p.queryOrUrl,
      coupangUrl: buildCoupangLinkWithRef(p.queryOrUrl, creatorId, p.slug),
      subId: `inch_${creatorId}_${p.slug}`,
      clicks: p.totalClicks,
      estimatedEarnings: stat?.estimatedEarnings || Math.round(p.totalClicks * 35),
      priceHint: p.priceHint,
      createdAt: p.createdAt,
    };
  });
}

export function getLinkBySlug(slug: string, refCreator?: string, channelInput?: string): ProductLink | null {
  let product = getProductBySlugOrQuery(slug);
  if (!product) {
    // 요청된 상품명이 카탈로그에 없는 경우, 실시간 온디맨드로 바로 생성
    product = upsertProduct({
      name: slug,
      category: '트렌드/핫템',
      tagline: `${slug} - 쿠팡 최저가 로켓배송 실시간 재고 확인`,
      queryOrUrl: slug,
    });
  }

  const creatorId = refCreator || 'official';
  const channel = normalizeChannel(channelInput);
  const statKey = `${creatorId}:${product.slug}`;
  const stats = readStats();
  const stat = stats[statKey];

  const subId = channel && channel !== 'general'
    ? `inch_${creatorId}_${channel}_${product.slug}`
    : `inch_${creatorId}_${product.slug}`;

  return {
    slug: product.slug,
    productName: product.name,
    category: product.category,
    creatorId,
    channel,
    tagline: product.tagline,
    originalQueryOrUrl: product.queryOrUrl,
    coupangUrl: buildCoupangLinkWithRef(product.queryOrUrl, creatorId, product.slug, channel),
    subId,
    clicks: stat?.clicks || product.totalClicks,
    estimatedEarnings: stat?.estimatedEarnings || Math.round(product.totalClicks * 35),
    priceHint: product.priceHint,
    imageUrl: product.imageUrl,
    iframeUrl: product.iframeUrl,
    channelStats: stat?.channelStats,
    createdAt: product.createdAt,
  };
}

export function createProductLink(payload: CreateLinkPayload): ProductLink {
  const product = upsertProduct({
    name: payload.productName,
    category: payload.category,
    tagline: payload.tagline,
    queryOrUrl: payload.queryOrUrl,
    priceHint: payload.priceHint,
    customSlug: payload.customSlug,
  });

  const creatorId = (payload.creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '') || 'creator';
  const channel = normalizeChannel(payload.channel);

  const subId = channel && channel !== 'general'
    ? `inch_${creatorId}_${channel}_${product.slug}`
    : `inch_${creatorId}_${product.slug}`;

  return {
    slug: product.slug,
    productName: product.name,
    category: product.category,
    creatorId,
    channel,
    tagline: product.tagline,
    originalQueryOrUrl: product.queryOrUrl,
    coupangUrl: buildCoupangLinkWithRef(product.queryOrUrl, creatorId, product.slug, channel),
    subId,
    clicks: 0,
    estimatedEarnings: 0,
    priceHint: product.priceHint,
    createdAt: product.createdAt,
  };
}

export function recordClick(slug: string, creatorId?: string, channelInput?: string): ProductLink | null {
  const channel = normalizeChannel(channelInput);
  const res = recordReferralClick(slug, creatorId || 'official', channel);
  return {
    slug: res.product.slug,
    productName: res.product.name,
    category: res.product.category,
    creatorId: res.creatorStat.creatorId,
    channel,
    tagline: res.product.tagline,
    originalQueryOrUrl: res.product.queryOrUrl,
    coupangUrl: res.redirectUrl,
    subId: channel !== 'general'
      ? `inch_${res.creatorStat.creatorId}_${channel}_${res.product.slug}`
      : `inch_${res.creatorStat.creatorId}_${res.product.slug}`,
    clicks: res.creatorStat.clicks,
    estimatedEarnings: res.creatorStat.estimatedEarnings,
    priceHint: res.product.priceHint,
    channelStats: res.creatorStat.channelStats,
    createdAt: res.product.createdAt,
  };
}
