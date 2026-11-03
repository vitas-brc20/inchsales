import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { publishYouTubeComment, publishInstagramComment, publishTikTokComment } from '../src/lib/sns-api';
import { dispatchBrowserOutreach } from '../src/lib/browser-automation';
import {
  fetchRealtimeYouTubeVideos,
  fetchRealtimeInstagramPosts,
  fetchRealtimeTikTokVideos,
  analyzeAndMatchProduct,
} from '../src/lib/realtime-discovery';
import { getPostedCommentRecords } from '../src/lib/storage';

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://srimeahesuhiakdlxhwr.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyaW1lYWhlc3VoaWFrZGx4aHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Mzc1MzksImV4cCI6MjEwOTExMzUzOX0.1RBDeIhNyJlpyYTSoJZv0CH0a3NZOK2ifwnX5y3M6b0';
const TRACKING_ID = process.env.COUPANG_TRACKING_ID || 'AF5232288';
const BASE_URL = process.env.APP_BASE_URL || 'https://inch.sale';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const LOG_FILE = path.join(process.cwd(), 'logs', 'marketing-activity.log');
const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');
const OUTREACH_FILE = path.join(process.cwd(), 'logs', 'outreach-queue.json');

// 이미 댓글을 게시했거나 시도한 URL 목록을 로드하여 동일 영상에 대한 중복 댓글을 100% 원천 차단
export function getAlreadyCommentedUrls(): Set<string> {
  const set = new Set<string>();
  try {
    const list = getPostedCommentRecords(1000);
    for (const item of list) {
      if (item.targetUrl) set.add(item.targetUrl.trim());
      if (item.postUrl) set.add(item.postUrl.trim());
    }
  } catch {}
  return set;
}

// ============================================================================
// 유명 크리에이터 검증 풀 및 카테고리 엄격 매핑 정의 (불일치 제품 댓글 원천 차단)
// 대형 크리에이터(Mega: 인지도) + 소형 크리에이터(Micro: 5천~5만, 압도적 댓글 반응율) 듀얼 타겟팅
// ============================================================================
export interface VerifiedCreator {
  channelName: string;
  handle: string;
  youtubeHandle?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  tier?: 'mega' | 'micro';
  searchKeyword: string;
  platform: 'youtube' | 'insta' | 'tiktok' | 'all';
  category: '먹방/디저트' | '뷰티/헤어' | '스킨케어/덴탈' | 'IT/테크' | '헬스/식단' | '캐릭터/키덜트' | '크리스마스/홈파티';
  allowedSlugs: string[];
  relevanceKeywords: string[];
}

// 사용자 요청으로 영구 제외된 크리에이터 블랙리스트 (타깃팅, 실시간 스크랩, 댓글 일체 금지)
export const EXCLUDED_CREATORS = [
  'yootrue',
  'yootrue5502',
  'yootrue_beauty',
  '유트루',
  'yootrue_onair',
];

export function isCreatorExcluded(identifier?: string): boolean {
  if (!identifier) return false;
  const lower = identifier.toLowerCase().replace(/[@\s_\-]/g, '');
  return EXCLUDED_CREATORS.some((ex) => {
    const exLower = ex.toLowerCase().replace(/[@\s_\-]/g, '');
    return lower.includes(exLower) || exLower.includes(lower);
  });
}

// 사용자 지침: 하드코딩된 특정 채널, 고정 링크, 중복 도배 방지를 위해 고정 크리에이터 목록을 완전 삭제함
export const VERIFIED_CREATORS: VerifiedCreator[] = [];

// 하드코딩된 고정 채널을 쓰지 않고 오직 실시간 발견된 새 콘텐츠만 대상으로 함
export function matchCreatorSafely(
  targetSlug: string,
  targetCategory: string,
  requestedPlatform?: 'youtube' | 'tiktok' | 'instagram'
): VerifiedCreator | null {
  return null;
}

// ============================================================================
// 상품별 영상 제목(Video Title) & 자연스러운 구어체 상품명 매핑 맵
// (크리에이터의 영상 제목을 직접 인용하여 거부감을 없애고 클릭 전환율 극대화)
// ============================================================================
export const PRODUCT_VIDEO_CONTEXTS: Record<string, { shortName: string; sampleVideoTitles: string[] }> = {
  '두쫀쿠': {
    shortName: '두바이 쫀득 쿠키 (두쫀쿠)',
    sampleVideoTitles: ['두바이 쫀득 쿠키 드디어 먹어봤습니다', '카다이프 피스타치오 두쫀쿠 디저트 먹방', 'SNS 대란 두바이 쿠키 솔직 리뷰'],
  },
  '카다이프두쫀쿠': {
    shortName: '카다이프 두바이 쿠키',
    sampleVideoTitles: ['카다이프 피스타치오 쫀득 쿠키 먹방', '틱톡 200만뷰 두바이 쿠키 실물 리뷰'],
  },
  '물미역트리트먼트': {
    shortName: '10초 물미역 헤어 트리트먼트',
    sampleVideoTitles: ['10초 만에 개털 머리 물미역 되는 트리트먼트 추천', '올영세일 손상모 구원템 물미역 트리트먼트'],
  },
  '물광피부로션': {
    shortName: '달바 프리미엄 물광세럼',
    sampleVideoTitles: ['승무원 원조 물광 스프레이 세럼 스킨케어 루틴', '뿌리자마자 꿀광 도자기 피부 완성'],
  },
  '미백치약': {
    shortName: '오스템 뷰센 28 미백치약',
    sampleVideoTitles: ['누런 이 치과 미백 효과 뷰센 28 미백치약 솔직후기', '치아 착색 관리 홈케어 추천'],
  },
  '미백크림': {
    shortName: '코스노리 톤업 미백크림',
    sampleVideoTitles: ['옷에 묻어남 없는 24시간 톤업 미백크림 추천', '학생/직장인 쌩얼 메이크업 종결템'],
  },
  '블랙헤드제거': {
    shortName: '미팩토리 3단 돼지 코팩',
    sampleVideoTitles: ['피지/블랙헤드 뿌리뽑는 3단 코팩 피르가즘', '모공 청소 블랙헤드 완벽 제거'],
  },
  '애플아이폰': {
    shortName: '아이폰 17 Pro Max',
    sampleVideoTitles: ['아이폰 17 프로 맥스 자급제 언박싱 솔직후기', '새로 바꾼 아이폰 17 Pro 카메라 테스트'],
  },
  '애플맥북': {
    shortName: '맥북 프로 14 M5',
    sampleVideoTitles: ['M5 맥북 프로 14인치 전문가 작업 성능 테스트', '새로 산 맥북 프로 언박싱 및 세팅'],
  },
  '애플아이패드': {
    shortName: '아이패드 에어 11 M3',
    sampleVideoTitles: ['대학생/직장인 아이패드 에어 M3 갓성비 활용법', '아이패드 언박싱 및 필수 앱 세팅'],
  },
  '굽네닭가슴살': {
    shortName: '굽네 오븐 통 닭가슴살',
    sampleVideoTitles: ['퍽퍽함 제로 촉촉한 닭가슴살 식단 다이어트', '맛있는 다이어트 식단 통 닭가슴살 추천'],
  },
  '제로콜라': {
    shortName: '코카콜라 제로',
    sampleVideoTitles: ['다이어터 필수 코카콜라 제로 24캔 쟁이기', '치킨 먹방엔 무조건 코카콜라 제로'],
  },
  '펩시제로': {
    shortName: '펩시 제로 라임',
    sampleVideoTitles: ['탄산 종결 펩시 제로 라임 대량 구매 후기', '야식 먹방에 빠질 수 없는 펩시 제로 라임'],
  },
  '샥즈오픈핏': {
    shortName: '샥즈 오픈핏 무선 이어폰',
    sampleVideoTitles: ['귀 안 아픈 러닝용 오픈형 무선 이어폰 종결', '운동할 때 최고 샥즈 오픈핏 솔직 사용기'],
  },
  '치이카와': {
    shortName: '치이카와 정품 인형 & 키링',
    sampleVideoTitles: ['귀여움 폭발 먼작귀 치이카와 정품 굿즈 언박싱', '내 가방에 달고 다니는 치이카와 키링'],
  },
  '크리스마스트리': {
    shortName: '전나무 크리스마스 트리 풀세트',
    sampleVideoTitles: ['연말 분위기 물씬 크리스마스 트리 풀세트 꾸미기', '겨울 홈인테리어 감성 크리스마스 트리'],
  },
};

// 매칭된 크리에이터 전용 댓글 및 제안문 생성기 (영상 제목 & 자연스러운 상품명 인용 융합)
export function generateCreatorCommentBundle(
  creator: VerifiedCreator,
  targetProduct: any,
  specificVideoTitle?: string,
  specificVideoUrl?: string
) {
  const baseDomain = BASE_URL;
  // 핸들에 반드시 @가 포함되도록 풀네임 포맷팅 (이중 인코딩 원천 방지)
  const fullHandle = (handle?: string) => {
    let raw = (handle || creator.handle || '').trim();
    for (let i = 0; i < 3; i++) {
      if (raw.includes('%')) {
        try { raw = decodeURIComponent(raw); } catch { break; }
      } else { break; }
    }
    const clean = raw.replace(/^@+/, '').trim();
    return `@${clean}`;
  };

  const ytRef = fullHandle(creator.youtubeHandle || creator.handle);
  const igRef = fullHandle(creator.instagramHandle || creator.handle);
  const ttRef = fullHandle(creator.tiktokHandle || creator.handle);

  const ytUrl = `${baseDomain}/p/${encodeURIComponent(targetProduct.slug)}?ref=${encodeURIComponent(ytRef)}&ch=youtube`;
  const instaUrl = `${baseDomain}/p/${encodeURIComponent(targetProduct.slug)}?ref=${encodeURIComponent(igRef)}&ch=instagram`;
  const tiktokUrl = `${baseDomain}/p/${encodeURIComponent(targetProduct.slug)}?ref=${encodeURIComponent(ttRef)}&ch=tiktok`;
  const statsUrl = `${baseDomain}/?id=${encodeURIComponent(creator.handle)}`;

  // 상품의 자연스러운 간결명 및 영상 제목 컨텍스트 추출
  const context = PRODUCT_VIDEO_CONTEXTS[targetProduct.slug] || {
    shortName: targetProduct.name.replace(/\(.*\)/g, '').trim(),
    sampleVideoTitles: [`${targetProduct.name} 솔직 후기`],
  };

  const productDisplayName = context.shortName;
  const videoTitle = specificVideoTitle || context.sampleVideoTitles[Math.floor(Math.random() * context.sampleVideoTitles.length)];

  const isMicro = creator.tier === 'micro';

  // 자연스러운 시청자 정보공유 댓글 (친절한 존댓말 톤 & 유튜브 100% 파란색 하이퍼링크 자동 변환)
  const ytComment = `오 영상에 나왔던 [${productDisplayName}] 최저가 찾았어요 ! ✨\n${ytUrl}`;

  // 인스타그램 릴스/피드 댓글 (친절한 존댓말 톤)
  const instaComment = `오 영상에 나왔던 [${productDisplayName}] 최저가 찾았어요 ! ✨\n${instaUrl}`;

  // 틱톡 숏폼 댓글 (친절한 존댓말 톤)
  const tiktokComment = `오 영상에 나왔던 [${productDisplayName}] 최저가 찾았어요 ! ✨\n${tiktokUrl}`;

  // 인스타그램 DM 협업 제안 전문 (영상 제목 직접 인용 & 파트너스 실제 통계 정산 정책 명시)
  const instaDm = `안녕하세요 @${creator.handle} 크리에이터님! ${creator.channelName} 채널의 '${videoTitle}' 콘텐츠 항상 너무 즐겁게 챙겨보고 있습니다 ✨\n\n이번 영상에 소개해주신 [${productDisplayName}] 상품에 대해 팬분들의 구매 문의가 쇄도할 것 같아, 번거로운 제휴 가입 절차 없이 바로 수익화하실 수 있도록 @${creator.handle}님 전용 정산 링크를 미리 생성해 두었습니다.\n\n🔗 @${creator.handle}님 전용 정산 링크:\n${instaUrl}\n\n💡 핵심 혜택:\n1. 쿠팡 파트너스 별도 가입 불필요 (링크만 게시하면 즉시 유효)\n2. 플랫폼 최고 수준의 투명한 크리에이터 수익 정산\n3. ${baseDomain} 에서 '@${creator.handle}' 입력 시 누적 클릭 및 실시간 통계 확인 가능\n* 정산 기준: 대시보드의 클릭당 금액은 활동 지원 예상 추정치이며, 실제 정산은 쿠팡 파트너스 공식 리포트 화면의 @${creator.handle}님 채널 파라미터(subId) 통계에 기록된 실구매 매출액 및 정산 수수료를 1원 단위까지 100% 투명하게 확인하여 정산해 드립니다.\n\n팬분들과의 소통과 채널 수익화에 든든한 날개가 되었으면 좋겠습니다. 항상 응원하겠습니다! 😊`;

  return {
    creatorHandle: creator.handle,
    creatorName: creator.channelName,
    creatorTier: creator.tier || 'mega',
    creatorCategory: creator.category,
    videoTitle,
    targetVideoUrl: specificVideoUrl,
    productDisplayName,
    targetProductSlug: targetProduct.slug,
    targetProductName: targetProduct.name,
    ytUrl,
    instaUrl,
    tiktokUrl,
    statsUrl,
    ytComment,
    instaComment,
    tiktokComment,
    instaDm,
  };
}

/**
 * 쇼츠(Shorts) 영상 여부를 확인합니다.
 * (유튜브 정책상 쇼츠 영상은 댓글 하이퍼링크가 강제 비활성화(일반 텍스트)되므로,
 * 하이퍼링크가 파란색 링크로 100% 작동하는 일반 롱폼 정규 영상만 선별하기 위함)
 */
async function isYouTubeShort(id: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`curl -s -I --max-time 4 "https://www.youtube.com/shorts/${id}" | head -n 1`);
    // Shorts는 200 OK를 반환하고, 일반 롱폼 영상은 303 Redirect를 반환함
    return stdout.includes('200');
  } catch {
    return false;
  }
}

/**
 * YouTube 검색 결과에서 가장 최신의 실제 첫 번째 롱폼 영상(/watch?v=...)을 추출합니다.
 * (쇼츠는 댓글 링크 클릭이 유튜브에 의해 차단되므로, 링크가 100% 클릭 가능한 일반 가로 롱폼 영상만 엄격 선별)
 */
export async function resolveFirstYouTubeVideo(
  query: string
): Promise<{ videoUrl: string; videoTitle?: string; videoId?: string; channelName?: string; channelHandle?: string } | null> {
  try {
    // 1차: 일반 롱폼 동영상 후보군 추출
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const cmd = `curl -s -L --max-time 6 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${url}" | grep -o '"videoId":"[a-zA-Z0-9_-]\\{11\\}"' | head -n 10`;
    const { stdout } = await execAsync(cmd);
    const videoMatches = Array.from(stdout.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map((m) => m[1]);
    const uniqueIds = Array.from(new Set(videoMatches));

    // 쇼츠가 아닌 정규 롱폼 비디오만 필터링 (댓글 하이퍼링크 100% 활성화 보장)
    let chosenId = '';
    for (const id of uniqueIds) {
      const shortCheck = await isYouTubeShort(id);
      if (!shortCheck) {
        chosenId = id;
        break;
      }
    }

    if (!chosenId && uniqueIds.length > 0) {
      chosenId = uniqueIds[0];
    }
    if (!chosenId) return null;

    const videoId = chosenId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 실제 첫 영상 제목 및 채널 정보 파싱 시도
    let videoTitle: string | undefined;
    let channelName: string | undefined;
    let channelHandle: string | undefined;

    try {
      const titleCmd = `curl -s -L --max-time 6 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "${videoUrl}"`;
      const { stdout: tOut } = await execAsync(titleCmd, { maxBuffer: 10 * 1024 * 1024 });

      const titleMatch = tOut.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        videoTitle = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim();
      }

      const authorMatch = tOut.match(/"author":"([^"]+)"/);
      if (authorMatch && authorMatch[1]) {
        channelName = authorMatch[1].trim();
      }

      const handleMatch = tOut.match(/"canonicalBaseUrl":"\/@([^"]+)"/) || tOut.match(/"\/@([^"/]+)"/);
      if (handleMatch && handleMatch[1]) {
        channelHandle = decodeURIComponent(handleMatch[1].split('/')[0]).trim();
      }
    } catch {}

    return {
      videoId,
      videoUrl,
      videoTitle,
      channelName,
      channelHandle,
    };
  } catch (err) {
    console.warn('resolveFirstYouTubeVideo error:', err);
    return null;
  }
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
    shortUrl: 'https://www.coupang.com/np/search?q=%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84+%EB%A6%AC%EC%96%BC+%EC%A0%84%EB%82%98%EB%AC%B4+%ED%81%AC%EB%A6%AC%EC%8A%A4%EB%A7%88%EC%8A%A4+%ED%8A%B8%EB%A6%AC+%ED%92%80%EC%84%B8%ED%8A%B8&channel=user&lptag=AF5232288',
    queryOrUrl: 'https://www.coupang.com/np/search?q=%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84+%EB%A6%AC%EC%96%BC+%EC%A0%84%EB%82%98%EB%AC%B4+%ED%81%AC%EB%A6%AC%EC%8A%A4%EB%A7%88%EC%8A%A4+%ED%8A%B8%EB%A6%AC+%ED%92%80%EC%84%B8%ED%8A%B8&channel=user&lptag=AF5232288',
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

export type PlatformType = 'youtube' | 'tiktok' | 'instagram';
const CYCLE_STATE_FILE = path.join(process.cwd(), 'logs', 'cycle-state.json');

export function getNextPlatform(forced?: PlatformType): PlatformType {
  if (forced) return forced;
  try {
    if (fs.existsSync(CYCLE_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CYCLE_STATE_FILE, 'utf8'));
      if (data.lastPlatform === 'youtube') return 'tiktok';
      if (data.lastPlatform === 'tiktok') return 'instagram';
      if (data.lastPlatform === 'instagram') return 'youtube';
    }
  } catch {}
  return 'youtube';
}

export function saveLastPlatform(platform: PlatformType) {
  try {
    const dir = path.dirname(CYCLE_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CYCLE_STATE_FILE, JSON.stringify({
      lastPlatform: platform,
      updatedAt: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch {}
}

export async function runMarketingCycle(forcedPlatform?: PlatformType) {
  const selectedPlatform = getNextPlatform(forcedPlatform);
  saveLastPlatform(selectedPlatform);

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 inchsales [${selectedPlatform.toUpperCase()}] 사이클 실행 (10분 교차 로테이션)`);

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

  // 4-1. [실시간 핫 트렌드 크리에이터 발굴 엔진] (1순위)
  // 고정 목록에 의존하지 않고, 지금 유튜브/인스타/틱톡 실시간 급상승 및 추천 피드를 스크랩하여 핫 크리에이터를 즉시 발굴
  let realtimeTarget: any = null;
  let matchedProduct: any = null;
  let creatorOutreachBundle: any = null;
  let apiPublishStatus: any = null;
  let browserTaskResult: any = null;

  try {
    const alreadyCommented = getAlreadyCommentedUrls();

    if (selectedPlatform === 'youtube') {
      const liveVideos = await fetchRealtimeYouTubeVideos();
      for (const v of liveVideos) {
        if (alreadyCommented.has(v.videoUrl.trim())) {
          console.log(`[${timestamp}] ⏭️ [이미 작성된 영상 스킵] ${v.videoUrl}`);
          continue;
        }
        const prod = await analyzeAndMatchProduct(v.title, v.caption);
        if (prod) {
          realtimeTarget = v;
          matchedProduct = prod;
          break;
        }
      }
    } else if (selectedPlatform === 'instagram') {
      const livePosts = await fetchRealtimeInstagramPosts();
      for (const p of livePosts) {
        if (alreadyCommented.has(p.videoUrl.trim())) {
          console.log(`[${timestamp}] ⏭️ [이미 작성된 게시물 스킵] ${p.videoUrl}`);
          continue;
        }
        const prod = await analyzeAndMatchProduct(p.title, p.caption);
        if (prod) {
          realtimeTarget = p;
          matchedProduct = prod;
          break;
        }
      }
    } else {
      const liveTikToks = await fetchRealtimeTikTokVideos();
      for (const t of liveTikToks) {
        if (alreadyCommented.has(t.videoUrl.trim())) {
          console.log(`[${timestamp}] ⏭️ [이미 작성된 틱톡 영상 스킵] ${t.videoUrl}`);
          continue;
        }
        const prod = await analyzeAndMatchProduct(t.title, t.caption);
        if (prod) {
          realtimeTarget = t;
          matchedProduct = prod;
          break;
        }
      }
    }
  } catch (err) {
    console.warn(`[${timestamp}] 실시간 피드 탐색 경고:`, err);
  }

  // 실시간 발굴 성공 시 -> 실시간 영상과 핫 크리에이터에 즉시 타깃팅!
  if (realtimeTarget && matchedProduct) {
    let cleanH = (realtimeTarget.creatorHandle || '').trim();
    for (let i = 0; i < 3; i++) {
      if (cleanH.includes('%')) {
        try { cleanH = decodeURIComponent(cleanH); } catch { break; }
      } else { break; }
    }
    cleanH = cleanH.replace(/^@+/, '').trim();

    if (isCreatorExcluded(cleanH) || isCreatorExcluded(realtimeTarget.creatorName)) {
      console.log(`[${timestamp}] 🚫 [제외 크리에이터 감지 건너뜀] ${cleanH} (${realtimeTarget.creatorName})`);
      realtimeTarget = null;
    }
  }

  if (realtimeTarget && matchedProduct) {
    let cleanH = (realtimeTarget.creatorHandle || '').trim();
    for (let i = 0; i < 3; i++) {
      if (cleanH.includes('%')) {
        try { cleanH = decodeURIComponent(cleanH); } catch { break; }
      } else { break; }
    }
    cleanH = cleanH.replace(/^@+/, '').trim();
    const fullHandle = `@${cleanH}`;
    const targetUrl = realtimeTarget.videoUrl;
    const prodLandingUrl = `${BASE_URL}/p/${encodeURIComponent(matchedProduct.slug)}?ref=${encodeURIComponent(fullHandle)}&ch=${selectedPlatform}`;
    const commentText = `오 영상에 나왔던 [${matchedProduct.displayName}] 최저가 찾았어요 ! ✨\n${prodLandingUrl}`;

    console.log(`[${timestamp}] 🔥 [실시간 핫 크리에이터 발굴 성공!] 플랫폼: ${selectedPlatform.toUpperCase()} | 채널: ${realtimeTarget.creatorName} (${fullHandle}) | 영상: "${realtimeTarget.title}"`);
    console.log(`[${timestamp}] 🎯 [영상 내용 기반 제품 매칭] -> [${matchedProduct.displayName}] (슬러그: ${matchedProduct.slug})`);

    console.log(`[${timestamp}] 💬 [실시간 댓글 전송 준비] "${commentText}"`);

    creatorOutreachBundle = {
      creatorHandle: fullHandle,
      creatorName: realtimeTarget.creatorName,
      creatorTier: 'realtime_trending',
      creatorCategory: '실시간핫트렌드',
      videoTitle: realtimeTarget.title,
      targetVideoUrl: targetUrl,
      productDisplayName: matchedProduct.displayName,
      targetProductSlug: matchedProduct.slug,
      targetProductName: matchedProduct.displayName,
      landingUrl: prodLandingUrl,
      commentText,
      ytComment: commentText,
      instaComment: commentText,
      tiktokComment: commentText,
    };

    // 공식 API 백그라운드 전송 시도
    try {
      const ytResult = selectedPlatform === 'youtube' ? await publishYouTubeComment(fullHandle, commentText) : null;
      const igResult = selectedPlatform === 'instagram' ? await publishInstagramComment(fullHandle, commentText) : null;
      const ttResult = selectedPlatform === 'tiktok' ? await publishTikTokComment(fullHandle, commentText) : null;
      apiPublishStatus = { youtube: ytResult, instagram: igResult, tiktok: ttResult };
    } catch (e) {
      console.warn('API publish check warning:', e);
    }

    // Chrome 브라우저 자동화 무인 전송
    try {
      const keywords = [
        matchedProduct.displayName,
        matchedProduct.slug,
        matchedProduct.name,
      ].filter(Boolean);

      browserTaskResult = await dispatchBrowserOutreach({
        platform: selectedPlatform,
        creatorHandle: fullHandle,
        creatorName: realtimeTarget.creatorName,
        targetUrl,
        commentText,
        productName: matchedProduct.displayName,
        expectedKeywords: keywords,
      });
    } catch (e) {
      console.warn('Browser outreach dispatch error:', e);
    }

    // outreach-queue.json 기록
    try {
      let currentOutreach: any = { targets: [] };
      if (fs.existsSync(OUTREACH_FILE)) {
        currentOutreach = JSON.parse(fs.readFileSync(OUTREACH_FILE, 'utf8'));
      }
      currentOutreach.generatedAt = timestamp;
      currentOutreach.latestAutoMatch = {
        ...creatorOutreachBundle,
        selectedPlatform,
        targetUrl,
        apiPublishStatus,
        browserTaskResult,
      };
      if (!Array.isArray(currentOutreach.targets)) currentOutreach.targets = [];
      currentOutreach.targets = [
        {
          ...creatorOutreachBundle,
          selectedPlatform,
          targetUrl,
          apiPublishStatus,
          browserTaskResult,
        },
        ...currentOutreach.targets.filter((t: any) => t.creatorHandle !== fullHandle),
      ].slice(0, 20);

      fs.writeFileSync(OUTREACH_FILE, JSON.stringify(currentOutreach, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to update outreach queue:', e);
    }
  } else {
    console.log();
  }

  const campaignData = {
    campaignId,
    generatedAt: timestamp,
    selectedPlatform,
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
          platform: selectedPlatform,
        }
      : null,
    targetedCreatorOutreach: creatorOutreachBundle
      ? {
          ...creatorOutreachBundle,
          selectedPlatform,
          apiPublishStatus,
        }
      : null,
    complianceNotice: {
      title: '🚨 [필독] 쿠팡 파트너스 Google 검색 광고 운영 시 주의사항',
      negativeKeywords: ['쿠팡', 'coupang', 'Coupang', 'COUPANG', '로켓배송', '로켓와우', '쿠팡와우', '쿠팡플레이', '쿠팡이츠'],
      rule: '‘쿠팡’, ‘coupang’을 반드시 제외 키워드로 등록 / 이외 연관 브랜드 키워드를 활용한 광고 금지',
      description: '쿠팡 파트너스에서는 "쿠팡" 및 쿠팡 브랜드 키워드를 활용한 검색 광고를 엄격하게 금지하고 있습니다. 제외 키워드를 등록하지 않을 경우 구글 확장 검색 로직에 의해 자동 매칭되어 상표권 침해로 서비스 해지 및 수익금 몰수 조치될 수 있습니다.',
    },
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
  const cleanLogHandle = creatorOutreachBundle ? creatorOutreachBundle.creatorHandle.replace(/^@+/, '') : '';
  const creatorLog = creatorOutreachBundle
    ? ` | 🎯크리에이터 댓글홍보: @${cleanLogHandle} (${creatorOutreachBundle.creatorName} - ${selectedPlatform})`
    : '';
  const logMessage = `[${timestamp}] [정기 사이클 · ${selectedPlatform.toUpperCase()}] ${newlyAddedProduct ? '★신규등록★ ' : ''}타깃: ${target.name} | 랜딩URL: ${landingUrl}${creatorLog} | 누적클릭: ${totalClicks}회 | 상품수: ${Object.keys(currentProducts).length}개\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');

  console.log(`[${timestamp}] ✅ 마케팅 캠페인 번들 생성 완료: ${target.name} (${landingUrl})`);
  if (creatorOutreachBundle) {
    const cleanTag = creatorOutreachBundle.creatorHandle.replace(/^@+/, '');
    const displayTag = `@${cleanTag}`;
    console.log(`[${timestamp}] 🎯 [${selectedPlatform.toUpperCase()} 크리에이터 매칭] ${displayTag} (${creatorOutreachBundle.creatorName}) -> ${target.name}`);
    if (selectedPlatform === 'youtube') {
      console.log(`[${timestamp}] 💬 [유튜브 댓글] "${creatorOutreachBundle.ytComment}"`);
    } else if (selectedPlatform === 'instagram') {
      console.log(`[${timestamp}] 💬 [인스타 댓글] "${creatorOutreachBundle.instaComment}"`);
    } else {
      console.log(`[${timestamp}] 💬 [틱톡 댓글] "${creatorOutreachBundle.tiktokComment}"`);
    }
    if (browserTaskResult) {
      console.log(`[${timestamp}] 🖥️ [로컬 Chrome 브라우저 자동화] ${browserTaskResult.details}`);
    }
  }
  return campaignData;
}

/**
 * 10분 단위 교차 스케줄러 (유튜브 30분, 틱톡 30분, 인스타 30분)
 * - 00분, 30분: 유튜브
 * - 10분, 40분: 틱톡
 * - 20분, 50분: 인스타그램
 */
export async function start10MinScheduler() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ⏰ 10분 간격 교차 스케줄러 시작! (유튜브 30분, 틱톡 30분, 인스타 30분)`);

  // 즉시 현재 사이클 1회 실행
  await runMarketingCycle();

  // 10분(600,000ms)마다 다음 플랫폼으로 교차 실행
  const INTERVAL_MS = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      await runMarketingCycle();
    } catch (e) {
      console.error('Scheduled cycle error:', e);
    }
  }, INTERVAL_MS);
}

// CLI 실행 처리
const cliArgs = process.argv.slice(2);
const platformFlag = cliArgs.find((a, i) => a === '--platform' && cliArgs[i + 1])
  ? (cliArgs[cliArgs.indexOf('--platform') + 1] as PlatformType)
  : undefined;
const isSchedulerMode = cliArgs.includes('--scheduler') || cliArgs.includes('-s') || cliArgs.includes('--daemon');

if (isSchedulerMode) {
  start10MinScheduler().catch(console.error);
} else {
  runMarketingCycle(platformFlag).catch(console.error);
}
