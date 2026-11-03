import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

import { runAppleScript, delay } from './applescript-utils';
import { getLinkBySlug, getAllLinks, createProductLink } from './storage';

// 제외 크리에이터 블랙리스트 (유트루 등)
const BLACKLIST_IDENTIFIERS = ['yootrue', 'yootrue5502', 'yootrue_beauty', '유트루'];

// 반드시 포함되어야 하는 쇼핑/리뷰/상품 카테고리 화이트리스트 키워드
const REQUIRED_SHOPPING_KEYWORDS = [
  // 1. 리뷰/쇼핑 명시적 키워드
  '내돈내산', '올영', '올리브영', '추천템', '꿀템', '리뷰', '후기', '솔직후기',
  '하울', '언박싱', '공구', '인생템', '정착템', '비교', '가성비', '장단점', '세일',
  // 2. 구체적 상품군/성분
  '앰플', '세럼', '크림', '토너', '에센스', '트리트먼트', '린스', '샴푸', '선크림',
  '쿠션', '파데', '파운데이션', '틴트', '립스틱', '립밤', '마스크팩', '패드', '코팩',
  '블랙헤드', '모공', '미백', 'pdrn', '나이아신', '레티놀', '시카', '수분크림',
  '이어폰', '에어팟', '헤드폰', '키보드', '마우스', '거치대', '충전기', '케이스',
  '아이폰', '맥북', '아이패드', '갤캠스', '태블릿', '노트북',
  '닭가슴살', '단백질', '프로틴', '쉐이크', '다이어트식단', '쿠키', '두바이', '카다이프',
  '제로콜라', '펩시제로', '치약', '미백치약', '칫솔'
];

// 일상/셀카/친목/댄스 등 상품과 무관한 피드 엄격 배제 키워드
const IRRELEVANT_CONTENT_KEYWORDS = [
  '셀카', '일상', '친구', '친목', '학교', '중딩', '고딩', '09', '08', '07', '06',
  '광주', '서울', '부산', '대구', '대전', '동창', '체육복', '남친', '여친', '연애',
  '소통', '맞팔', '선팔', '좋반', 'fyp', '추천떠라', '기절', '웃긴', '개웃김',
  '챌린지', '댄스', '커버댄스', '노래', '아이돌', '직캠', '오운완', '심심'
];

export function hasStrictShoppingOrReviewIntent(text: string): boolean {
  if (!text || text.length < 2) return false;
  const lower = text.toLowerCase();
  
  // (1) 실제 상품/리뷰 키워드가 하나라도 있는지 확인
  const hasShoppingWord = REQUIRED_SHOPPING_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasShoppingWord) return false;

  // (2) 일상 키워드만 있고 제품명이 희미한 경우 차단
  const irrelevantMatchCount = IRRELEVANT_CONTENT_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (irrelevantMatchCount >= 2 && !lower.includes('리뷰') && !lower.includes('내돈내산') && !lower.includes('추천템')) {
    return false;
  }

  return true;
}

export function isBlacklisted(str?: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().replace(/[@\s_\-]/g, '');
  return BLACKLIST_IDENTIFIERS.some((b) => lower.includes(b));
}

export function safeDecodeHandle(input: string): string {
  if (!input) return '';
  let str = input.trim();
  for (let i = 0; i < 3; i++) {
    if (str.includes('%')) {
      try {
        str = decodeURIComponent(str);
      } catch {
        break;
      }
    } else {
      break;
    }
  }
  return str.replace(/^@+/, '');
}

export interface RealtimeVideoTarget {
  platform: 'youtube' | 'instagram' | 'tiktok';
  videoUrl: string;
  title: string;
  caption?: string;
  creatorName: string;
  creatorHandle: string; // @handle
  publishedTime?: string;
  viewsText?: string;
  matchedSlug?: string;
  matchedProductName?: string;
}

// 실시간 유튜브 탐색 쿼리 프리셋 (시청자가 몰리는 핫 트렌드 키워드)
const YOUTUBE_SEARCH_QUERIES = [
  '추천템 리뷰 내돈내산',
  '올영 추천템 솔직후기',
  '신상 언박싱 리뷰',
  '가성비 꿀템 내돈내산',
  '스킨케어 추천템',
  '테크 추천템 내돈내산',
  '다이어트 식단 추천',
];

// 실시간 인스타그램 탐색 태그
const INSTAGRAM_TAGS = [
  '내돈내산',
  '올영추천템',
  '스킨케어추천',
  '데스크셋업',
  '꿀템추천',
  '다이어트식단',
];

/**
 * 유튜브 조회수 텍스트를 숫자로 파싱하여 마이크로/중소형 크리에이터 우선 순위 산출
 */
function parseViewCount(viewsText?: string): number {
  if (!viewsText) return 500;
  const t = viewsText.replace(/,/g, '');
  if (t.includes('만')) {
    const num = parseFloat(t.replace(/[^0-9.]/g, '')) || 1;
    return num * 10000;
  }
  if (t.includes('천')) {
    const num = parseFloat(t.replace(/[^0-9.]/g, '')) || 1;
    return num * 1000;
  }
  const match = t.match(/\d+/);
  return match ? parseInt(match[0], 10) : 500;
}

/**
 * 1. YouTube 실시간 급상승/최신 영상 탐색 (Node HTTPS 요청으로 0.5초 즉시 완료)
 * - 최근 1주일/오늘 업로드된 실시간 영상 중 롱폼 정규 영상만 필터링
 */
export async function fetchRealtimeYouTubeVideos(query?: string): Promise<RealtimeVideoTarget[]> {
  const selectedQuery = query || YOUTUBE_SEARCH_QUERIES[Math.floor(Math.random() * YOUTUBE_SEARCH_QUERIES.length)];
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedQuery)}&sp=EgIIAw%253D%253D&hl=ko&gl=KR`;

  return new Promise((resolve) => {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    };

    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const match = data.match(/var ytInitialData = ({.*?});<\/script>/);
        if (!match) return resolve([]);
        try {
          const json = JSON.parse(match[1]);
          const results: RealtimeVideoTarget[] = [];
          
          function scan(obj: any) {
            if (!obj || typeof obj !== 'object') return;
            if (obj.videoRenderer) {
              const v = obj.videoRenderer;
              const videoId = v.videoId;
              const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
              const channelName = v.ownerText?.runs?.[0]?.text || '';
              const handleUrl = v.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || '';
              let handle = '';
              if (handleUrl.includes('/@')) {
                const rawHandle = handleUrl.split('/@')[1].split('/')[0];
                handle = '@' + safeDecodeHandle(rawHandle);
              } else if (channelName) {
                handle = `@${safeDecodeHandle(channelName).replace(/[\s\-_]+/g, '')}`;
              }
              const published = v.publishedTimeText?.simpleText || '';
              const views = v.viewCountText?.simpleText || '';

              if (videoId && title && !isBlacklisted(handle) && !isBlacklisted(channelName)) {
                results.push({
                  platform: 'youtube',
                  videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                  title,
                  creatorName: channelName || handle,
                  creatorHandle: handle.startsWith('@') ? handle : `@${handle}`,
                  publishedTime: published,
                  viewsText: views,
                });
              }
            }
            for (const k of Object.keys(obj)) scan(obj[k]);
          }

          scan(json);

          // 인기 좀 없는 마이크로/루키 크리에이터 우선 지원 정렬
          // (조회수가 너무 높은 메가 크리에이터보다, 100~15,000회 수준의 중소형 크리에이터가 댓글 반응률과 수익화 참여율이 압도적임)
          results.sort((a, b) => {
            const va = parseViewCount(a.viewsText);
            const vb = parseViewCount(b.viewsText);
            return va - vb;
          });

          resolve(results);
        } catch {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * 2. Instagram 실시간 인기 탐색 태그 스크랩 (Chrome 백그라운드 탭 & 무간섭)
 */
export async function fetchRealtimeInstagramPosts(tag?: string): Promise<RealtimeVideoTarget[]> {
  const selectedTag = tag || INSTAGRAM_TAGS[Math.floor(Math.random() * INSTAGRAM_TAGS.length)];
  const tagUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(selectedTag)}/`;
  let tabId = '';

  try {
    const createScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${tagUrl}"}
          return id of newTab
        end tell
      end tell
    `;

    tabId = (await runAppleScript(createScript)).trim();
    if (!tabId) return [];

    await delay(3500);

    const parseScript = `
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript "(function() {
            var anchors = Array.from(document.querySelectorAll('a[href*=\\"/p/\\"], a[href*=\\"/reel/\\"]'));
            var results = [];
            for (var a of anchors) {
              var img = a.querySelector('img');
              var alt = img ? img.alt : '';
              if (!alt || alt.length < 15) continue;
              
              var handleMatch = alt.match(/@([a-zA-Z0-9._-]+)/);
              var handle = handleMatch ? ('@' + handleMatch[1]) : '@instagram_creator';
              
              results.push({
                videoUrl: a.href,
                title: alt.substring(0, 80).replace(/\\n/g, ' '),
                caption: alt,
                creatorName: handle,
                creatorHandle: handle
              });
              if (results.length >= 6) break;
            }
            return JSON.stringify(results);
          })()"
        end tell
      end tell
    `;

    const raw = await runAppleScript(parseScript);
    
    // 탭 클린업
    await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});

    if (!raw || raw.trim() === '' || raw.trim() === 'missing value') return [];
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    return parsed
      .map((p: any) => {
        const cleanHandle = safeDecodeHandle(p.creatorHandle || '');
        return {
          ...p,
          creatorHandle: cleanHandle ? `@${cleanHandle}` : '@instagram_creator',
          platform: 'instagram' as const,
        };
      })
      .filter((p: any) => !isBlacklisted(p.creatorHandle) && !isBlacklisted(p.creatorName));
  } catch (err) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    console.warn('Realtime Instagram scrape warning:', err);
    return [];
  }
}

/**
 * 3. TikTok 실시간 추천 피드/탐색 스크랩 (Chrome 백그라운드 탭 & 무간섭)
 * - 단순 일상/셀카 피드가 뜨는 foryou 대신, 실제 [올영추천템 / 내돈내산리뷰] 검색 피드에서 쇼핑 의도 100% 확실한 영상만 수집
 */
export async function fetchRealtimeTikTokVideos(): Promise<RealtimeVideoTarget[]> {
  let tabId = '';
  const searchQueries = ['올영추천템', '내돈내산추천', '화장품솔직후기', '올영세일꿀템'];
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;

  try {
    const createScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${searchUrl}"}
          return id of newTab
        end tell
      end tell
    `;

    tabId = (await runAppleScript(createScript)).trim();
    if (!tabId) return [];

    await delay(3500);

    const parseScript = `
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript "(function() {
            var cards = Array.from(document.querySelectorAll('[data-e2e=\\"search_video-item\\"], div[class*=\\"DivItemContainer\\"]'));
            var results = [];
            for (var card of cards) {
              var a = card.querySelector('a[href*=\\"/video/\\"]');
              if (!a) continue;
              
              var descEl = card.querySelector('[data-e2e=\\"search-card-video-caption\\"], div[class*=\\"DivCaption\\"]');
              var desc = descEl ? descEl.innerText.trim() : '';
              if (!desc || desc.length < 5) continue;
              
              var authorA = card.querySelector('a[href*=\\"/@\\"]');
              var handle = authorA ? authorA.href.split('/@')[1].split('/')[0].split('?')[0] : '';
              var authorName = authorA ? authorA.innerText.trim() : handle;
              
              results.push({
                videoUrl: a.href,
                title: desc.slice(0, 100),
                caption: desc,
                creatorName: authorName || handle || 'tiktok_creator',
                creatorHandle: handle ? ('@' + handle) : '@tiktok_creator'
              });
              if (results.length >= 6) break;
            }
            return JSON.stringify(results);
          })()"
        end tell
      end tell
    `;

    const raw = await runAppleScript(parseScript);

    // 탭 클린업
    await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});

    if (!raw || raw.trim() === '' || raw.trim() === 'missing value') return [];
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    return parsed
      .map((p: any) => {
        const cleanHandle = safeDecodeHandle(p.creatorHandle || '');
        return {
          ...p,
          creatorHandle: cleanHandle ? `@${cleanHandle}` : '@tiktok_creator',
          platform: 'tiktok' as const,
        };
      })
      .filter((p: any) => {
        if (!p.creatorHandle || p.creatorHandle === '@') return false;
        if (isBlacklisted(p.creatorHandle) || isBlacklisted(p.creatorName)) return false;
        // 쇼핑/리뷰 의도 검증
        return hasStrictShoppingOrReviewIntent(p.caption || p.title);
      });
  } catch (err) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    console.warn('Realtime TikTok scrape warning:', err);
    return [];
  }
}

/**
 * 4. 영상 제목 및 캡션 본문에서 상품명/키워드 지능형 분석 및 카탈로그 자동 매칭
 */
export async function analyzeAndMatchProduct(
  title: string,
  caption?: string
): Promise<{ slug: string; displayName: string; isNewAutoCreated?: boolean } | null> {
  const fullText = `${title} ${caption || ''}`.toLowerCase();

  // 0. 상품/쇼핑/리뷰 의도가 전혀 없는 단순 일상/셀카/인물 피드는 100% 즉시 거절!
  if (!hasStrictShoppingOrReviewIntent(fullText)) {
    return null;
  }

  const allProducts = getAllLinks();

  // 1차: 기존 카탈로그의 슬러그 또는 제품명과 직접 매칭
  for (const p of allProducts) {
    if (!p || !p.slug) continue;
    const slugLower = p.slug.toLowerCase();
    const nameLower = (p.productName || p.slug || '').toLowerCase();
    if (fullText.includes(slugLower) || (slugLower.length >= 3 && nameLower.includes(slugLower))) {
      return { slug: p.slug, displayName: (p.productName || p.slug).replace(/\(.*\)/g, '').trim() };
    }
  }

  // 2차: 대표적인 핫 트렌드 상품 키워드 사전 매칭
  const KEYWORD_MAP: Record<string, { slug: string; name: string; query: string }> = {
    pdrn: { slug: '메디큐브pdrn', name: '메디큐브 PDRN 핑크 앰플 기획세트', query: '메디큐브 pdrn 앰플' },
    메디큐브: { slug: '메디큐브pdrn', name: '메디큐브 PDRN 핑크 앰플 기획세트', query: '메디큐브 pdrn 앰플' },
    오픈핏: { slug: '샥즈오픈핏', name: '샥즈 오픈핏 프로 오픈형 블루투스 이어폰', query: '샥즈 오픈핏 프로' },
    샥즈: { slug: '샥즈오픈핏', name: '샥즈 오픈핏 프로 오픈형 블루투스 이어폰', query: '샥즈 오픈핏 프로' },
    에어팟: { slug: '애플에어팟', name: 'Apple 정품 에어팟 노이즈캔슬링', query: '애플 에어팟' },
    아이폰: { slug: '애플아이폰', name: 'Apple 정품 아이폰 17 Pro Max', query: '애플 아이폰 17 Pro' },
    맥북: { slug: '애플맥북', name: 'Apple 정품 맥북 프로 14 M5', query: '애플 맥북 프로 M5' },
    아이패드: { slug: '애플아이패드', name: 'Apple 정품 2024 아이패드 10세대', query: '애플 아이패드 10세대' },
    치이카와: { slug: '치이카와', name: '치이카와 먼작귀 모찌 인형 쿠션', query: '치이카와 인형 쿠션' },
    먼작귀: { slug: '치이카와', name: '치이카와 먼작귀 모찌 인형 쿠션', query: '치이카와 인형 쿠션' },
    모레모: { slug: '모레모', name: '모레모 미라클 10 워터 트리트먼트', query: '모레모 워터 트리트먼트' },
    물미역: { slug: '모레모', name: '모레모 미라클 10 워터 트리트먼트', query: '모레모 워터 트리트먼트' },
    트리트먼트: { slug: '모레모', name: '모레모 미라클 10 워터 트리트먼트', query: '모레모 워터 트리트먼트' },
    닭가슴살: { slug: '굽네닭가슴살', name: '굽네 오븐 통 닭가슴살 혼합 패키지', query: '굽네 통 닭가슴살' },
    단백질: { slug: '굽네닭가슴살', name: '굽네 오븐 통 닭가슴살 혼합 패키지', query: '굽네 통 닭가슴살' },
    쿠키: { slug: '두쫀쿠', name: '두쫀쿠 리얼 수제 쫀득 두바이 쿠키', query: '두바이 쫀득 쿠키' },
    두바이: { slug: '두쫀쿠', name: '두쫀쿠 리얼 수제 쫀득 두바이 쿠키', query: '두바이 쫀득 쿠키' },
    코팩: { slug: '블랙헤드제거', name: '미팩토리 3단 돼지 코팩 (블랙헤드 제거)', query: '미팩토리 돼지 코팩' },
    블랙헤드: { slug: '블랙헤드제거', name: '미팩토리 3단 돼지 코팩 (블랙헤드 제거)', query: '미팩토리 돼지 코팩' },
    선크림: { slug: '물광피부로션', name: '촉촉 물광 자외선 차단 선크림', query: '촉촉 선크림 로켓배송' },
    앰플: { slug: '메디큐브pdrn', name: '메디큐브 PDRN 핑크 앰플 기획세트', query: '메디큐브 pdrn 앰플' },
  };

  for (const [kw, info] of Object.entries(KEYWORD_MAP)) {
    if (fullText.includes(kw)) {
      if (!getLinkBySlug(info.slug)) {
        createProductLink({
          creatorId: 'official',
          customSlug: info.slug,
          productName: info.name,
          category: '실시간핫트렌드',
          tagline: `영상에 나온 화제의 ${info.name}! 쿠팡 로켓배송 최저가`,
          queryOrUrl: `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(info.query)}`,
          priceHint: '최저가 로켓배송 실시간 특가',
        });
      }
      return { slug: info.slug, displayName: info.name, isNewAutoCreated: true };
    }
  }

  // 매칭되는 구체적 상품이 없는 경우, 절대 억지 댓글을 달지 않고 null 반환!
  return null;
}
