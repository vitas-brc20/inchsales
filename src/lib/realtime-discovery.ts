import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

import { runAppleScript, delay } from './applescript-poster';
import { getLinkBySlug, getAllLinks, createProductLink } from './storage';

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
                try {
                  handle = '@' + decodeURIComponent(rawHandle);
                } catch {
                  handle = '@' + rawHandle;
                }
              } else if (channelName) {
                handle = `@${channelName.replace(/[\s\-_]+/g, '')}`;
              }
              const published = v.publishedTimeText?.simpleText || '';
              const views = v.viewCountText?.simpleText || '';

              if (videoId && title) {
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

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((p: any) => ({
      ...p,
      platform: 'instagram',
    }));
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
 */
export async function fetchRealtimeTikTokVideos(): Promise<RealtimeVideoTarget[]> {
  let tabId = '';
  try {
    const createScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"https://www.tiktok.com/foryou"}
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
            var authorAnchor = Array.from(document.querySelectorAll('a'))
              .find(a => a.href.includes('/@') && !a.href.includes('/@inchsale'));
            var handle = authorAnchor ? authorAnchor.href.split('/@')[1] : '';
            var desc = document.querySelector('[data-e2e=\\"browse-video-desc\\"]') || document.querySelector('h1') || document.querySelector('h2');
            var descText = desc ? desc.innerText.trim() : '';
            
            return JSON.stringify({
              videoUrl: window.location.href,
              title: descText || 'TikTok 인기 추천 영상',
              caption: descText,
              creatorName: handle || 'tiktok_creator',
              creatorHandle: handle ? ('@' + handle) : '@tiktok_creator'
            });
          })()"
        end tell
      end tell
    `;

    const raw = await runAppleScript(parseScript);

    // 탭 클린업
    await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed.creatorHandle || parsed.creatorHandle === '@') return [];
    return [{
      platform: 'tiktok',
      ...parsed,
    }];
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
  const allProducts = getAllLinks();

  // 1차: 기존 카탈로그의 슬러그 또는 제품명과 직접 매칭
  for (const p of allProducts) {
    if (!p || !p.slug) continue;
    const slugLower = p.slug.toLowerCase();
    const nameLower = (p.name || '').toLowerCase();
    if (fullText.includes(slugLower) || (slugLower.length >= 3 && nameLower.includes(slugLower))) {
      return { slug: p.slug, displayName: (p.name || p.slug).replace(/\(.*\)/g, '').trim() };
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
      // 만약 storage에 없으면 즉시 등록
      if (!getLinkBySlug(info.slug)) {
        createProductLink({
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

  // 3차: 특정 제품명이 직접적으로 파악되지 않는 경우, 영상 제목에서 핵심 명사구를 추출해 신규 동적 슬러그 생성!
  const cleanedTitle = title
    .replace(/[\[\(【].*?[\]\)】]/g, '')
    .replace(/[!?,~★🔥✨❌❓]/g, '')
    .trim();
  const words = cleanedTitle.split(/\s+/).filter(w => w.length >= 2 && !['리뷰', '추천', '솔직', '영상', '내돈내산', '광고', '솔직리뷰'].includes(w));
  if (words.length > 0) {
    const dynamicKeyword = words.slice(0, 2).join(' ');
    const dynamicSlug = words.slice(0, 2).join('-');
    const displayName = `${dynamicKeyword} 추천템`;

    createProductLink({
      customSlug: dynamicSlug,
      productName: displayName,
      category: '실시간핫트렌드',
      tagline: `영상에 등장한 바로 그 ${dynamicKeyword}! 쿠팡 로켓배송 최저가 좌표`,
      queryOrUrl: `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(dynamicKeyword)}`,
      priceHint: '쿠팡 로켓배송 실시간 최저가',
    });

    return { slug: dynamicSlug, displayName, isNewAutoCreated: true };
  }

  return null;
}
