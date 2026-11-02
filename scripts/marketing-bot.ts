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
const OUTREACH_FILE = path.join(process.cwd(), 'logs', 'outreach-queue.json');

// ============================================================================
// 유명 크리에이터 검증 풀 및 카테고리 엄격 매핑 정의 (불일치 제품 댓글 원천 차단)
// ============================================================================
export interface VerifiedCreator {
  channelName: string;
  handle: string;
  platform: 'youtube' | 'insta' | 'both';
  category: '먹방/디저트' | '뷰티/헤어' | '스킨케어/덴탈' | 'IT/테크' | '헬스/식단' | '캐릭터/키덜트' | '크리스마스/홈파티';
  allowedSlugs: string[];
  relevanceKeywords: string[];
}

export const VERIFIED_CREATORS: VerifiedCreator[] = [
  // 1. 먹방 / 디저트 분야 (간식, 음료, 디저트만 엄격 매핑)
  {
    channelName: '입짧은햇님',
    handle: 'haetnim_mukbang',
    platform: 'both',
    category: '먹방/디저트',
    allowedSlugs: ['두쫀쿠', '카다이프두쫀쿠', 'ddu-zon-cookie', '제로콜라', 'coca-cola-zero', '펩시제로'],
    relevanceKeywords: ['디저트', '쿠키', '먹방', '간식', '초콜릿', '음료'],
  },
  {
    channelName: '쯔양',
    handle: 'tzuyang_official',
    platform: 'both',
    category: '먹방/디저트',
    allowedSlugs: ['두쫀쿠', '카다이프두쫀쿠', 'ddu-zon-cookie', '제로콜라', 'coca-cola-zero', '펩시제로'],
    relevanceKeywords: ['먹방', '간식', '디저트', '음료', '쿠키'],
  },
  {
    channelName: '여수언니 정혜영',
    handle: 'yeosu_unnie',
    platform: 'both',
    category: '먹방/디저트',
    allowedSlugs: ['두쫀쿠', '카다이프두쫀쿠', 'ddu-zon-cookie'],
    relevanceKeywords: ['디저트', '약과', '쿠키', '빵', '베이커리'],
  },
  {
    channelName: '나도Nado',
    handle: 'nado_eat',
    platform: 'both',
    category: '먹방/디저트',
    allowedSlugs: ['두쫀쿠', '카다이프두쫀쿠', '제로콜라', '펩시제로'],
    relevanceKeywords: ['디저트', '쿠키', '먹방', '초콜릿'],
  },

  // 2. 뷰티 / 헤어 / 스킨케어 분야 (헤어, 미백, 톤업, 피지제거만 엄격 매핑)
  {
    channelName: '회사원A',
    handle: 'office_worker_a',
    platform: 'both',
    category: '뷰티/헤어',
    allowedSlugs: ['물미역트리트먼트', '물미역헤어에센스', '미역헤어에센스', '물광피부로션', '미백치약', '미백크림', '블랙헤드제거'],
    relevanceKeywords: ['머릿결', '트리트먼트', '스킨케어', '올영', '뷰티'],
  },
  {
    channelName: '이사배',
    handle: 'risabae_art',
    platform: 'both',
    category: '뷰티/헤어',
    allowedSlugs: ['미백크림', '물광피부로션', '블랙헤드제거', '물미역트리트먼트'],
    relevanceKeywords: ['메이크업', '피부표현', '톤업', '베이스', '스킨케어'],
  },
  {
    channelName: '레오제이',
    handle: 'leojmakeup',
    platform: 'both',
    category: '뷰티/헤어',
    allowedSlugs: ['물광피부로션', '미백크림', '블랙헤드제거', '미백치약'],
    relevanceKeywords: ['피부관리', '물광', '스킨케어', '모공케어', '미백'],
  },
  {
    channelName: '유트루',
    handle: 'yootrue_beauty',
    platform: 'both',
    category: '뷰티/헤어',
    allowedSlugs: ['물광피부로션', '미백크림', '블랙헤드제거', '물미역트리트먼트'],
    relevanceKeywords: ['기초케어', '물광', '진정세럼', '보습'],
  },

  // 3. 덴탈 / 모공 전문 분야
  {
    channelName: '피부임상연구소',
    handle: 'dr_skin_lab',
    platform: 'both',
    category: '스킨케어/덴탈',
    allowedSlugs: ['미백치약', '물광피부로션', '블랙헤드제거'],
    relevanceKeywords: ['피부과', '치아미백', '블랙헤드', '모공청소'],
  },

  // 4. IT / 테크 / 전자기기 분야 (애플 정품, 음향기기만 엄격 매핑)
  {
    channelName: '잇섭 (ITSub)',
    handle: 'itsub_official',
    platform: 'both',
    category: 'IT/테크',
    allowedSlugs: ['애플아이폰', '아이폰', '애플맥북', '맥북', '애플아이패드', '아이패드', '애플에어팟', '샥즈오픈핏'],
    relevanceKeywords: ['아이폰', '맥북', '아이패드', '애플', '전자기기', '테크'],
  },
  {
    channelName: '주연 (ZUYONI)',
    handle: 'juyeon_tech',
    platform: 'both',
    category: 'IT/테크',
    allowedSlugs: ['애플아이폰', '아이폰', '애플아이패드', '아이패드', '애플맥북', '맥북', '애플에어팟'],
    relevanceKeywords: ['아이패드', '애플신제품', '맥북에어', '자급제'],
  },
  {
    channelName: '테크몽',
    handle: 'techmong_it',
    platform: 'both',
    category: 'IT/테크',
    allowedSlugs: ['애플아이패드', '아이패드', '애플맥북', '맥북', '애플아이폰', '아이폰'],
    relevanceKeywords: ['아이패드활용법', '맥북프로', '태블릿추천'],
  },
  {
    channelName: '뻘짓연구소',
    handle: 'bboljit_lab',
    platform: 'both',
    category: 'IT/테크',
    allowedSlugs: ['애플맥북', '맥북', '애플아이폰', '아이폰', '애플에어팟', '샥즈오픈핏'],
    relevanceKeywords: ['M5맥북', '오픈핏이어폰', '하드웨어'],
  },

  // 5. 헬스 / 식단 분야 (닭가슴살, 제로음료, 운동기기만 엄격 매핑)
  {
    channelName: '핏블리 (FITVELY)',
    handle: 'fitvely_diet',
    platform: 'both',
    category: '헬스/식단',
    allowedSlugs: ['굽네닭가슴살', '제로콜라', '펩시제로', '샥즈오픈핏'],
    relevanceKeywords: ['식단관리', '닭가슴살', '다이어트', '단백질', '운동'],
  },
  {
    channelName: '피지컬갤러리 (김계란)',
    handle: 'physical_gallery',
    platform: 'both',
    category: '헬스/식단',
    allowedSlugs: ['굽네닭가슴살', '샥즈오픈핏', '제로콜라', '펩시제로'],
    relevanceKeywords: ['운동이어폰', '단백질식단', '헬스', '닭가슴살'],
  },

  // 6. 캐릭터 / 키덜트 분야 (먼작귀 치이카와만 엄격 매핑)
  {
    channelName: '치이카와 굿즈룸',
    handle: 'chii_goods_collector',
    platform: 'both',
    category: '캐릭터/키덜트',
    allowedSlugs: ['치이카와'],
    relevanceKeywords: ['치이카와', '먼작귀', '인형', '키링', '소품샵'],
  },

  // 7. 크리스마스 / 홈파티 / 시즌선물 분야
  {
    channelName: '오늘의 감성홈',
    handle: 'home_interior_cafe',
    platform: 'both',
    category: '크리스마스/홈파티',
    allowedSlugs: ['크리스마스트리', '한정판스타벅스'],
    relevanceKeywords: ['크리스마스', '오르골', '홈파티', '연말선물', '트리', '스타벅스'],
  },
];

// 크리에이터-상품 매칭 엄격 안전 검증기
export function matchCreatorSafely(targetSlug: string, targetCategory: string): VerifiedCreator | null {
  const eligible = VERIFIED_CREATORS.filter((creator) => {
    return creator.allowedSlugs.includes(targetSlug);
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// 매칭된 크리에이터 전용 댓글 및 제안문 생성기
export function generateCreatorCommentBundle(creator: VerifiedCreator, targetProduct: any) {
  const baseDomain = BASE_URL;
  const ytUrl = `${baseDomain}/p/${encodeURIComponent(targetProduct.slug)}?ref=${encodeURIComponent(creator.handle)}&ch=youtube`;
  const instaUrl = `${baseDomain}/p/${encodeURIComponent(targetProduct.slug)}?ref=${encodeURIComponent(creator.handle)}&ch=insta`;
  const statsUrl = `${baseDomain}/?id=${encodeURIComponent(creator.handle)}`;

  const ytComment = `안녕하세요 @${creator.handle} (${creator.channelName})님! 영상 보신 팬분들이 [${targetProduct.name}] 구매처를 정말 많이 물어보셔서, 채널 전용으로 70% 수익 정산 링크를 미리 준비해 두었습니다 😊\n👉 ${ytUrl}\n\n영상 고정댓글이나 더보기란에 이 링크만 복사해 두시면 시청자분들이 구매할 때마다 판매 수수료 70% 편하게 정산받으세요 ! (쿠팡 파트너스 번거로운 가입 불필요, 100원부터 즉시 출금 가능)`;

  const instaComment = `@${creator.handle} 영상 속 [${targetProduct.name}] 어디서 사는지 물어보는 분들 많길래 @${creator.handle}님 전용 70% 정산 링크 미리 만들어뒀어요! 🎁👉 ${instaUrl} 프로필 링크나 스토리에 걸어두시면 팬분들도 편하게 사고 수수료 70% 편하게 정산받으세요 ! ✨`;

  const instaDm = `안녕하세요 @${creator.handle} 크리에이터님! ${creator.channelName} 채널의 알찬 콘텐츠 항상 즐겁게 챙겨보고 있습니다 ✨\n\n콘텐츠에 소개해주신 [${targetProduct.name}] 상품에 대해 팬분들의 구매 문의가 쇄도할 것 같아, 번거로운 제휴 가입 절차 없이 바로 수익화하실 수 있도록 @${creator.handle}님 전용 70% 정산 링크를 미리 생성해 두었습니다.\n\n🔗 @${creator.handle}님 전용 정산 링크:\n${instaUrl}\n\n💡 핵심 혜택:\n1. 쿠팡 파트너스 별도 가입 불필요 (링크만 게시하면 즉시 유효)\n2. 판매 수수료 70% 크리에이터 지급 (업계 최고 수준)\n3. ${baseDomain} 에서 '@${creator.handle}' 입력 시 누적 클릭 및 수익 실시간 확인 & 100원부터 즉시 계좌 출금\n\n팬분들과의 소통과 채널 수익화에 든든한 날개가 되었으면 좋겠습니다. 항상 응원하겠습니다! 😊`;

  return {
    creatorHandle: creator.handle,
    creatorName: creator.channelName,
    creatorCategory: creator.category,
    targetProductSlug: targetProduct.slug,
    targetProductName: targetProduct.name,
    ytUrl,
    instaUrl,
    statsUrl,
    ytComment,
    instaComment,
    instaDm,
  };
}

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
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9367416965&itemId=27716021235&vendorItemId=94764729984&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9367416965&itemId=27716021235&vendorItemId=94764729984&lptag=AF5232288',
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
  {
    slug: '미백치약',
    name: '오스템파마 뷰센 28 전문 치아미백제 80g',
    category: '덴탈/미백',
    priceHint: '11,000원 (과산화수소 2.8% 집중미백 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=339848193&itemId=1082271085&vendorItemId=5585251715&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=339848193&itemId=1082271085&vendorItemId=5585251715&lptag=AF5232288',
    imageUrl: 'https://thumbnail8.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/images/272776546096053-fc419bca-d55c-437d-b34c-8ab897272f04.jpg',
    tagline: '커피·흡연 치아 착색 종결! 오스템임플란트 연구진 개발 전문 치아미백제',
    hook: '🦷 [치과미백효과] 누런 이 고민 끝! 오스템 뷰센 28 미백치약 로켓배송 특가',
    description: '치과에서 실제 사용하는 과산화수소 2.8% 함유! 매일 양치만으로 착색 치아를 맑고 하얗게 가꿔줍니다.',
  },
  {
    slug: '물광피부로션',
    name: '달바 화이트 트러플 프리미엄 퍼스트 스프레이 세럼 100ml',
    category: '뷰티/스킨케어',
    priceHint: '16,880원 (누적 3,000만병 승무원 물광보습 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9304025604&itemId=15280462262&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9304025604&itemId=15280462262&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/1025_amir_coupang_oct_80k/2970/cd1098f237e3b55777e2c95b3c455258867666a7917fd09615f9a72d3d6e.jpg',
    tagline: '뿌리는 즉시 도자기 물광 피부 완성! 3,000만병 돌파 승무원 필수 보습 세럼',
    hook: '✨ [물광피부] 건조할 틈 없는 여배우/승무원 원조 물광 스프레이 세럼 최저가!',
    description: '화이트 트러플과 아보카도 오일의 황금 비율! 푸석한 피부에 뿌리는 즉시 24시간 촉촉한 꿀광이 차오릅니다.',
  },
  {
    slug: '미백크림',
    name: '코스노리 화이트닝 드레스 톤업크림 50ml 2개',
    category: '뷰티/메이크업',
    priceHint: '29,520원 (올리브영 1위 24시간 묻어남 없는 미백 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=28253537&itemId=19166818084&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=28253537&itemId=19166818084&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/357249001906818-a69e797f-5867-48cd-ac37-f3c77fcc2cf4.jpg',
    tagline: '옷에 묻어남 없이 24시간 맑고 투명한 피부톤! 올리브영 1위 미백 톤업크림',
    hook: '🌸 [자연스런 쌩얼미백] 파데프리 종결템! 코스노리 화이트닝 톤업크림 1+1 기획',
    description: '목과 얼굴 경계 없이 원래 하얀 피부처럼! 벚꽃수 함유로 촉촉하고 끈적임 없이 24시간 화사함이 유지됩니다.',
  },
  {
    slug: '미역헤어에센스',
    name: '모레모 미라클 10 워터 트리트먼트 200ml (10초 물미역 헤어에센스)',
    category: '헤어/바디',
    priceHint: '21,500원 (10초 완성 실크 물미역 머릿결 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9240387387&itemId=19575559037&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9240387387&itemId=19575559037&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/195100722581669-260e3f45-530a-43f6-9026-8e4d73c702bc.jpg',
    tagline: '빗자루 개털 머리도 10초 만에 찰랑이는 물미역으로 변신하는 기적의 헤어케어',
    hook: '💇‍♀️ [개털탈출] 빗자루 모발도 10초 만에 찰랑이는 물미역 머릿결! 모레모 미라클 10',
    description: '바르고 10초 방치 후 헹구면 끝! 고농축 미세 단백질이 큐티클 사이사이 침투해 즉각적인 실크 머릿결을 선사합니다.',
  },
  {
    slug: '물미역트리트먼트',
    name: '모레모 미라클 10 워터 트리트먼트 200ml (10초 물미역 헤어에센스)',
    category: '헤어/바디',
    priceHint: '21,500원 (10초 완성 실크 물미역 머릿결 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9240387387&itemId=19575559037&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9240387387&itemId=19575559037&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/195100722581669-260e3f45-530a-43f6-9026-8e4d73c702bc.jpg',
    tagline: '빗자루 개털 머리도 10초 만에 찰랑이는 물미역으로 변신하는 기적의 헤어케어',
    hook: '💇‍♀️ [개털탈출] 빗자루 모발도 10초 만에 찰랑이는 물미역 머릿결! 모레모 미라클 10',
    description: '바르고 10초 방치 후 헹구면 끝! 고농축 미세 단백질이 큐티클 사이사이 침투해 즉각적인 실크 머릿결을 선사합니다.',
  },
  {
    slug: '블랙헤드제거',
    name: '미팩토리 3단 돼지 코팩 (피지/블랙헤드 뿌리뽑기)',
    category: '뷰티/스킨케어',
    priceHint: '7,100원 (국민 1위 피지/블랙헤드 올킬 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=25470019&itemId=931146193&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=25470019&itemId=931146193&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/866149354384480-4b6d8891-536b-4d7a-8eb3-403cbb7eaf60.jpg',
    tagline: '딸기코 탈출! 모공 속 묵은 블랙헤드와 피지를 뿌리째 뽑아주는 3단 코팩',
    hook: '🐽 [피지폭발주의] 딸기코 구원투수! 3단 돼지코팩으로 블랙헤드 뿌리뽑기',
    description: '1단계 열어주고, 2단계 쏙 뽑고, 3단계 조여주는 3스텝 완벽 모공 케어! 피지 쾌감을 느껴보세요.',
  },
  {
    slug: '크리스마스트리',
    name: '프리미엄 리얼 전나무 크리스마스 트리 풀세트 (홀리데이 에디션)',
    category: '홈/인테리어',
    priceHint: '48,900원 (풍성한 솔잎 리얼 전나무 트리 풀세트 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8413458470&itemId=24328153057&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=8413458470&itemId=24328153057&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2023/11/06/15/4/19bf2e2d-3cb8-48b0-a0a5-29c488ad5319.jpg',
    tagline: '올겨울 완벽한 연말 분위기! 풍성하고 고급스러운 프리미엄 전나무 크리스마스 트리',
    hook: '🎄 [얼리버드특가] 품절 전 준비하는 연말 필수템! 프리미엄 전나무 크리스마스 트리 풀세트',
    description: '빈약한 트리와는 차원이 다른 풍성한 솔잎! 전구와 오너먼트까지 풀세트로 완벽한 감성 홈파티를 완성하세요.',
  },
  {
    slug: '한정판스타벅스',
    name: '스타벅스 SS 블랙 데비 콜드컵 보온 보냉 텀블러 473ml (한정판)',
    category: '리빙/텀블러',
    priceHint: '32,900원 (스타벅스 시그니처 한정판 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=226277604&itemId=716893557&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=226277604&itemId=716893557&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2021/04/16/16/4/3ff94b00-349f-4318-ae71-29ad3ecb3d29.jpg',
    tagline: '품절 대란 스타벅스 한정판 텀블러! 압도적인 보온 보냉력과 고급스러운 감성',
    hook: '☕ [한정수량] 매장 품절 대란 스타벅스 데비 스테인리스 텀블러 로켓배송 긴급 입고!',
    description: '아침 얼음이 저녁까지 그대로! 시크한 매트 블랙 디자인에 완벽한 밀폐력까지 갖춘 머스트헤브 텀블러입니다.',
  },
  {
    slug: '애플에어팟',
    name: 'Apple 정품 에어팟 액티브 노이즈 캔슬링 블루투스 이어폰',
    category: '디지털/가전',
    priceHint: '195,020원 (Apple 공식 브랜드관 쿠팡 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9729244277&itemId=29114723176&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9729244277&itemId=29114723176&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/2026/09/10/7/7/ce512298-9be6-447c-ab11-3cbcd8c346d2.jpg',
    tagline: 'Apple 공식 정품! 압도적인 액티브 노이즈 캔슬링과 공간 음향',
    hook: '🍏 [Apple특가] 액티브 노이즈 캔슬링 탑재! Apple 정품 에어팟 카드할인 특가 로켓배송',
    description: '주변 소음을 마법처럼 지워주는 역대급 노이즈 캔슬링! 쿠팡 공식 Apple 브랜드관에서 내일 아침 바로 받으세요.',
  },
  {
    slug: '치이카와',
    name: '치이카와 하치와레 우사기 모찌 빅사이즈 봉제인형 쿠션',
    category: '캐릭터/완구',
    priceHint: '18,900원 (SNS 품절대란 먼작귀 모찌 쿠션 로켓배송)',
    shortUrl: 'https://link.coupang.com/a/ifZPWVBdHE',
    queryOrUrl: 'https://link.coupang.com/a/ifZPWVBdHE',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/vendor_inventory/a933/bceb3ea0f058cfeb774e1d51a660a5d21469e7f82e1858a2e1d7494a44a1.jpg',
    tagline: 'SNS 품절 대란! 말랑쫀득 심쿵 비주얼 치이카와 먼작귀 빅사이즈 인형 쿠션',
    hook: '🧸 [심쿵주의] SNS 품절 대란! 말랑쫀득 치이카와 빅사이즈 모찌 인형 쿠션 특가',
    description: '압도적인 귀여움과 폭신폭신한 촉감! 침대 위 힐링템이자 인테리어 포인트로 완벽한 치이카와 정품 쿠션입니다.',
  },
  {
    slug: '애플아이폰',
    name: 'Apple 정품 아이폰 17 Pro Max 자급제 (512GB)',
    category: '디지털/애플',
    priceHint: '1,900,000원 (Apple 공식 브랜드관 카드할인 로켓배송)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9024167604&itemId=26462330388&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9024167604&itemId=26462330388&lptag=AF5232288',
    imageUrl: 'https://thumbnail.coupangcdn.com/thumbnails/remote/490x490ex/image/retail/images/24819336320112-e9791646-a8bb-42c0-a5cf-4b48458187f8.jpg',
    tagline: 'Apple 최신 플래그십! A19 Pro 칩셋과 5배 광학 줌 티타늄 디자인 쿠팡 공식 로켓배송',
    hook: '📱 [Apple플래그십] 영롱한 티타늄! Apple 정품 아이폰 17 Pro Max 자급제 로켓배송',
    description: '역대 최강 성능 A19 Pro와 프로 카메라 시스템! 쿠팡 공식 Apple 브랜드관 정품 로켓배송으로 내일 바로 언박싱하세요.',
  },
  {
    slug: '애플아이패드',
    name: 'Apple 정품 2024 아이패드 10세대 10.9 Wi-Fi (64GB)',
    category: '디지털/애플',
    priceHint: '529,000원 (Apple 공식 브랜드관 로켓배송 최저가)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=6912124565&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=6912124565&lptag=AF5232288',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
    tagline: '인강·필기·영상 감상 가성비 원탑! 올 스크린 디자인 Liquid Retina 로켓배송',
    hook: '🖊️ [가성비태블릿] 대학생·직장인 필수! Apple 2024 아이패드 10세대 10.9 로켓배송 특가',
    description: '화사한 올 스크린 디스플레이와 강력한 A14 바이오닉! 인강, 필기, 넷플릭스 머신 원탑 아이패드를 로켓배송으로 만나보세요.',
  },
  {
    slug: '애플맥북',
    name: 'Apple 정품 맥북 프로 14 M5 (512GB 스페이스 블랙)',
    category: '디지털/애플',
    priceHint: '2,390,000원 (Apple 정품 M5 프로 로켓배송 최대할인)',
    shortUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9140128274&itemId=27961799025&vendorItemId=94919837754&lptag=AF5232288',
    queryOrUrl: 'https://link.coupang.com/re/AFFSDP?pageKey=9140128274&itemId=27961799025&vendorItemId=94919837754&lptag=AF5232288',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
    tagline: '전문가를 위한 압도적인 연산 퍼포먼스! M5 칩 탑재 Liquid Retina XDR 로켓배송',
    hook: '💻 [프로종결템] 차원이 다른 퍼포먼스! Apple 정품 맥북 프로 14 M5 로켓배송 즉시출고',
    description: '영상 편집, 코딩, 그래픽 작업 완벽 지원! Liquid Retina XDR 디스플레이와 스페이스 블랙의 독보적인 아우라를 느껴보세요.',
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

  // 4. 캠페인 포스팅 번들 저장 (다채널 6대 홍보 채널 자동 생성)
  const campaignFile = path.join(CAMPAIGN_DIR, `campaign_${Date.now()}.json`);

  // 4-1. 유명 크리에이터 맞춤 댓글 홍보 매칭 (카테고리/제목 어울림 엄격 검증)
  const matchedCreator = matchCreatorSafely(target.slug, target.category);
  let creatorOutreachBundle: any = null;
  if (matchedCreator) {
    creatorOutreachBundle = generateCreatorCommentBundle(matchedCreator, target);
    
    // outreach-queue.json 에도 추가/갱신
    try {
      let currentOutreach: any = { targets: [] };
      if (fs.existsSync(OUTREACH_FILE)) {
        currentOutreach = JSON.parse(fs.readFileSync(OUTREACH_FILE, 'utf8'));
      }
      currentOutreach.generatedAt = timestamp;
      currentOutreach.latestAutoMatch = creatorOutreachBundle;
      if (!Array.isArray(currentOutreach.targets)) currentOutreach.targets = [];
      // 중복 방지 후 선두에 추가
      currentOutreach.targets = [
        creatorOutreachBundle,
        ...currentOutreach.targets.filter((t: any) => t.creatorHandle !== matchedCreator.handle),
      ].slice(0, 20);

      fs.writeFileSync(OUTREACH_FILE, JSON.stringify(currentOutreach, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to update outreach queue:', e);
    }
  }

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
    matchedCreator: creatorOutreachBundle
      ? {
          name: creatorOutreachBundle.creatorName,
          handle: creatorOutreachBundle.creatorHandle,
          category: creatorOutreachBundle.creatorCategory,
        }
      : null,
    targetedCreatorOutreach: creatorOutreachBundle,
    socialPosts: {
      naverBlog: {
        title: `[솔직후기] ${target.name} 실사용 장단점 & 쿠팡 로켓배송 최저가 혜택 총정리`,
        content: `안녕하세요! 오늘은 최근 SNS와 입소문으로 큰 화제를 모으고 있는 [${target.name}] 실사용 리뷰 및 최저가 정보를 정리해 드립니다.\n\n📌 1. 왜 이렇게 인기일까?\n${target.tagline}\n${target.description}\n\n📌 2. 핵심 포인트 및 가격 정보\n- 현재 할인가: ${target.priceHint}\n- 배송: 쿠팡 와우회원 로켓배송 (자정 전 주문 시 내일 아침 도착 보장)\n- 공식 보증: 쿠팡 공식 로켓배송 정품 보장으로 믿고 주문하실 수 있습니다.\n\n📌 3. 이런 분들께 강력 추천합니다!\n- 가성비와 품질 모두 챙긴 ${target.category} 추천템을 찾으시는 분\n- 품절 전에 빠른 로켓배송으로 받아보고 싶으신 분\n\n👇 실시간 할인가 및 재고 확인하기:\n${landingUrl}&ch=blog\n\n⚖️ 공정거래위원회 문구:\n"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."`,
      },
      youtubeShorts: {
        script: `[00:00~00:03] 🔥 Hook (시선집중)\n"${target.hook}"\n\n[00:03~00:09] 💡 Problem & Solution (핵심 특징)\n"${target.description}"\n\n[00:09~00:15] 💰 Price & Value (가격/혜택)\n"지금 쿠팡 로켓배송으로 ${target.priceHint} 특가에 풀렸습니다!"\n\n[00:15~00:20] 🛒 Call To Action (구매 유도)\n"품절되기 전에 고정 댓글이나 프로필 링크에서 지금 바로 확인해보세요!"`,
        pinnedComment: `📌 [영상 속 추천템 최저가 좌표]\n${target.name} 👉 ${landingUrl}&ch=youtube\n\n* 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`,
      },
      community: {
        title: `[쿠팡/로켓] ${target.name} (${target.priceHint})`,
        content: `${target.hook}\n\n${target.description}\n\n와우회원 무료배송 및 카드 즉시할인 적용 기준입니다. 필요하신 분들 품절 전에 확인해보세요.\n\n구매 링크: ${landingUrl}&ch=community\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      },
      telegramChannel: `⚡ [실시간 핫딜 알림] ${target.name}\n\n🏷️ 가격: ${target.priceHint}\n🚚 배송: 쿠팡 로켓배송 (내일 도착 보장)\n✨ 포인트: ${target.tagline}\n\n👉 실시간 최저가 확인: ${landingUrl}&ch=kakao\n\n* 쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다.`,
      instagramCaption: `[영상 속 핫딜 좌표] ${target.name}\n\n${target.tagline}\n${target.priceHint}\n\n프로필 링크 또는 스토리 스티커를 확인해주세요!\n👉 ${landingUrl}&ch=insta\n\n#쿠팡로켓배송 #추천템 #인스타공구 #핫딜 #쇼핑 #${target.category.replace(/[/]/g, '')}\n\n* 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`,
      threads: `${target.description}\n\n👇 최저가 좌표 & 실시간 재고 확인:\n${landingUrl}&ch=threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
      twitterX: `${target.hook}\n\n👇 최저가 확인:\n${landingUrl}&ch=threads\n\n(이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.)`,
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
  const creatorLog = creatorOutreachBundle
    ? ` | 🎯크리에이터 댓글홍보: @${creatorOutreachBundle.creatorHandle} (${creatorOutreachBundle.creatorName} - ${creatorOutreachBundle.creatorCategory})`
    : '';
  const logMessage = `[${timestamp}] [정기 사이클] ${newlyAddedProduct ? '★신규등록★ ' : ''}타깃: ${target.name} | 랜딩URL: ${landingUrl}${creatorLog} | 누적클릭: ${totalClicks}회 | 상품수: ${Object.keys(currentProducts).length}개\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`[${timestamp}] ✅ 마케팅 캠페인 번들 생성 완료: ${target.name} (${landingUrl})`);
  if (creatorOutreachBundle) {
    console.log(`[${timestamp}] 🎯 [크리에이터 맞춤 댓글 홍보 매칭] @${creatorOutreachBundle.creatorHandle} (${creatorOutreachBundle.creatorName}) -> ${target.name}`);
    console.log(`[${timestamp}] 💬 [유튜브 댓글] "${creatorOutreachBundle.ytComment.slice(0, 80)}..."`);
    console.log(`[${timestamp}] 💬 [인스타 댓글] "${creatorOutreachBundle.instaComment}"`);
  }
  return campaignData;
  return campaignData;
}

runMarketingCycle().catch(console.error);
