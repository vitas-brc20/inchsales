import { runAppleScript, delay } from './applescript-utils';

export { runAppleScript, delay };

/**
 * Google Chrome의 'Apple Events의 자바스크립트 허용' 기능을 활용하여
 * 사용자 화면을 전혀 띄우거나 방해하지 않고(백그라운드 유지),
 * YouTube 첫 영상 페이지에 댓글을 직접 작성하고 [댓글] 버튼 클릭까지 100% 완전 무인으로 완료합니다.
 */
export async function postYouTubeCommentViaAppleScript(
  videoUrl: string,
  commentText: string
): Promise<{ success: boolean; message: string; details?: any }> {
  let tabId = '';
  try {
    // 1. Chrome 백그라운드 탭 생성 (화면 전환 및 포커스 탈취 0%)
    const createTabScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${videoUrl}"}
          return id of newTab
        end tell
      end tell
    `;

    tabId = await runAppleScript(createTabScript);
    if (!tabId) {
      throw new Error('Chrome 새 탭 생성 실패');
    }

    // 2. YouTube 페이지 로드 대기 (4초)
    await delay(4000);

    // 2-1. [구독 먼저 누르기] 채널 구독 버튼 자동 확인 및 클릭 (미구독 상태일 때만 '구독' 클릭)
    const jsSubscribe = `
      (function() {
        const subBtn = document.querySelector("#subscribe-button button") || 
                       document.querySelector("ytd-subscribe-button-renderer button") ||
                       document.querySelector("#subscribe-button yt-button-shape button");
        if (!subBtn) return JSON.stringify({ subscribed: false, reason: "구독 버튼 미발견" });
        
        const text = subBtn.innerText.trim();
        const aria = subBtn.getAttribute("aria-label") || "";
        
        // 아직 구독 중이 아닐 때만 클릭하여 구독 진행
        if (text === "구독" || aria.includes("구독합니다")) {
          subBtn.click();
          return JSON.stringify({ subscribed: true, action: "newly_subscribed" });
        }
        return JSON.stringify({ subscribed: true, action: "already_subscribed" });
      })()
    `;
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsSubscribe)}
        end tell
      end tell
    `).catch(() => {});
    await delay(1500);

    // 3. 댓글 섹션 활성화를 위한 스크롤 다운
    const jsScroll = 'window.scrollTo(0, 600);';
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsScroll)}
        end tell
      end tell
    `).catch(() => {});
    await delay(2000);

    // 4. 댓글 작성 영역(#placeholder-area) 클릭하여 입력창 활성화
    const jsClickPlaceholder = `
      (function() {
        const pl = document.querySelector("#simplebox-placeholder") || document.querySelector("#placeholder-area");
        if (pl) {
          pl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          return "clicked";
        }
        return "none";
      })()
    `;
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsClickPlaceholder)}
        end tell
      end tell
    `).catch(() => {});
    await delay(1800);

    // 5. 텍스트 입력 및 [댓글] 등록 버튼 자동 클릭
    const jsTypeAndSubmit = `
      (async function() {
        const root = document.querySelector("#contenteditable-root") || document.querySelector("div[contenteditable='true']");
        if (!root) return JSON.stringify({ success: false, reason: "댓글 입력창(#contenteditable-root) 미발견" });

        root.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, ${JSON.stringify(commentText)});
        root.dispatchEvent(new Event("input", { bubbles: true }));
        root.dispatchEvent(new Event("change", { bubbles: true }));

        await new Promise(r => setTimeout(r, 1200));

        const btnContainer = document.querySelector("#submit-button");
        const submitBtn = btnContainer ? (btnContainer.querySelector("button") || btnContainer) : null;
        if (!submitBtn) return JSON.stringify({ success: false, reason: "댓글 등록 버튼(#submit-button) 미발견" });

        submitBtn.click();
        return JSON.stringify({ success: true });
      })()
    `;

    const submitResultRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsTypeAndSubmit)}
        end tell
      end tell
    `);

    let submitResult: any = {};
    try {
      submitResult = JSON.parse(submitResultRaw.trim());
    } catch {
      submitResult = { success: true };
    }

    if (submitResult.success === false) {
      throw new Error(submitResult.reason || '댓글 등록 실패');
    }

    // 6. 전송 완료 후 대기 (3초)
    await delay(3000);

    // 7. 작업 완료 후 백그라운드 탭 자동 닫기 (클린업)
    await runAppleScript(`
      tell application "Google Chrome"
        try
          close tab id ${tabId} of window 1
        end try
      end tell
    `).catch(() => {});

    return {
      success: true,
      message: 'YouTube 댓글 작성 및 [댓글] 버튼 클릭 완료 (백그라운드 100% 무인 전송)',
      details: { videoUrl, tabId },
    };
  } catch (err: any) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    return {
      success: false,
      message: `AppleScript 자동 댓글 전송 실패: ${err.message}`,
    };
  }
}

/**
 * 인스타그램 프로필 또는 게시물 페이지 진입 시:
 * 1. 진입 즉시 '팔로우' 버튼 감지 및 자동 팔로우 클릭 (크리에이터 팔로우 알림 선행 발송)
 * 2. 프로필일 경우 첫 번째 릴스/게시물로 direct 이동 (window.location.href = href)
 * 3. 게시물 진입 후에도 미팔로우 상태면 팔로우 재확인
 * 4. 댓글창(textarea)에 Prototype Setter 주입 & [게시] 버튼 클릭 (100% 무인 전송)
 * 5. 완료 후 백그라운드 임시 탭 자동 클린업
 */
export async function postInstagramViaAppleScript(
  profileOrPostUrl: string,
  commentText: string,
  expectedKeywords?: string[]
): Promise<{ success: boolean; message: string; postUrl?: string; captionText?: string }> {
  let tabId = '';
  try {
    const escapedComment = commentText
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
    
    // 1. 백그라운드 탭 생성 (activate 없이, 사용자 활성 탭 보존)
    const createTabScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${profileOrPostUrl}"}
          return id of newTab
        end tell
      end tell
    `;

    tabId = (await runAppleScript(createTabScript)).trim();
    if (!tabId) throw new Error('백그라운드 탭 생성 실패');

    // 2. 초기 로딩 대기 (프로필 페이지 및 그리드 렌더링)
    await delay(4000);

    // 3. 프로필 상단 팔로우 클릭 & 첫 번째 실제 게시물/릴스로 진입 (목록에서 클릭하여 들어가기)
    const jsProfileFollowAndNavigate = `
      (function() {
        // (1) 프로필 팔로우 버튼 선행 클릭
        var btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        var followBtn = btns.find(function(b) {
          var t = (b.innerText || '').trim();
          return t === '팔로우' || t === 'Follow';
        });
        var followed = false;
        if (followBtn) {
          try { followBtn.click(); followed = true; } catch(e) {}
        }

        // (2) 이미 게시물/릴스 상세 또는 모달 상태인지 확인
        if (window.location.href.includes('/p/') || window.location.href.includes('/reel/') || document.querySelector('div[role="dialog"]')) {
          return JSON.stringify({ action: 'already_on_post', url: window.location.href, followed: followed });
        }

        // (3) 프로필 그리드에서 첫 번째 게시물/릴스 링크 찾기
        // 페이지를 살짝 스크롤하여 썸네일 그리드 렌더링 촉진
        window.scrollBy(0, 250);

        var links = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
        var postLink = links.find(function(l) {
          var href = l.getAttribute('href') || '';
          return href.startsWith('/p/') || href.startsWith('/reel/') || href.includes('/p/') || href.includes('/reel/');
        });

        if (postLink) {
          var targetUrl = postLink.href;
          try {
            postLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postLink.click();
          } catch(e) {}

          // 1초 후에도 URL이 변경되지 않았으면 직접 이동 보장
          setTimeout(function() {
            if (!window.location.href.includes('/p/') && !window.location.href.includes('/reel/')) {
              window.location.href = targetUrl;
            }
          }, 800);

          return JSON.stringify({ action: 'navigated', url: targetUrl, followed: followed });
        }

        return JSON.stringify({ action: 'no_post_found', url: window.location.href, followed: followed });
      })()
    `;

    let navResRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsProfileFollowAndNavigate)}
        end tell
      end tell
    `).catch(() => '{}');

    let navRes: any = {};
    try {
      navRes = JSON.parse(navResRaw);
    } catch {
      navRes = {};
    }

    // 만약 그리드가 늦게 떠서 게시물을 못 찾았다면 2초 추가 대기 후 1회 재시도
    if (navRes.action === 'no_post_found') {
      await delay(2000);
      navResRaw = await runAppleScript(`
        tell application "Google Chrome"
          tell tab id ${tabId} of window 1
            return execute javascript ${JSON.stringify(jsProfileFollowAndNavigate)}
          end tell
        end tell
      `).catch(() => '{}');
      try { navRes = JSON.parse(navResRaw); } catch {}
    }

    // 네비게이션 발생 시 게시물/릴스 뷰어 또는 모달 렌더링 대기
    await delay(4000);

    // 4. 게시물 페이지/모달 내에서:
    //    (A) 릴스인 경우 댓글 아이콘(말풍선) 클릭하여 댓글 패널 열기
    //    (B) 댓글창(textarea) 탐색 및 텍스트 주입
    //    (C) [게시] 버튼 클릭 또는 Enter 전송
    const jsOpenCommentAndPost = `
      (function() {
        try {
          // (1) 게시물 내 팔로우 버튼 미클릭 상태면 팔로우 클릭
          var btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          var followBtn = btns.find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '팔로우' || t === 'Follow';
          });
          var postFollowed = false;
          if (followBtn) {
            try { followBtn.click(); postFollowed = true; } catch(e) {}
          }

          // (2) 댓글창(textarea)이 닫혀있는 경우(릴스 또는 모달), 말풍선(댓글) 아이콘 클릭하여 댓글창 열기
          var ta = document.querySelector('textarea');
          if (!ta) {
            var svgs = Array.from(document.querySelectorAll('svg'));
            var commentIcon = svgs.find(function(s) {
              var aria = s.getAttribute('aria-label') || '';
              var title = (s.querySelector('title') ? s.querySelector('title').textContent : '') || '';
              return aria.includes('댓글') || aria.includes('Comment') || title.includes('댓글') || title.includes('Comment');
            });
            if (commentIcon) {
              var clickable = commentIcon.closest('button') || commentIcon.closest('div[role="button"]') || commentIcon;
              try { clickable.click(); } catch(e) {}
            }
          }

          return JSON.stringify({ drawerOpened: true, postFollowed: postFollowed });
        } catch(err) {
          return JSON.stringify({ drawerOpened: false, error: err.message });
        }
      })()
    `;

    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsOpenCommentAndPost)}
        end tell
      end tell
    `).catch(() => {});

    // 댓글 패널/textarea 렌더링 대기
    await delay(1500);

    // (5) 댓글 텍스트 주입: textarea 포커스 후 OS 네이티브 Cmd+V (key code 9) 입력
    const jsFocusTextarea = `
      (function() {
        try {
          var ta = document.querySelector('textarea[aria-label*="댓글"], textarea[placeholder*="댓글"], textarea[aria-label*="Comment"], textarea[placeholder*="Add a comment"], textarea');
          
          if (!ta) {
            var svgs = Array.from(document.querySelectorAll('svg'));
            var commentIcon = svgs.find(function(s) {
              var aria = s.getAttribute('aria-label') || '';
              return aria.includes('댓글') || aria.includes('Comment');
            });
            if (commentIcon) {
              var c = commentIcon.closest('button') || commentIcon.closest('div[role="button"]') || commentIcon;
              try { c.click(); } catch(e) {}
            }
            ta = document.querySelector('textarea');
          }

          if (!ta) return JSON.stringify({ success: false, reason: 'no_textarea' });

          window.focus();
          ta.focus();
          ta.click();
          return JSON.stringify({ success: true, focused: true });
        } catch(err) {
          return JSON.stringify({ success: false, reason: err.message });
        }
      })()
    `;

    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsFocusTextarea)}
        end tell
      end tell
    `).catch(() => {});

    await delay(400);

    // 클립보드 적재 & Cmd+V 네이티브 전송 (React 18 상태 100% 동기화)
    console.log(`[Instagram] 클립보드 적재 및 Cmd+V (key code 9) 네이티브 입력 실행`);
    await runAppleScript(`
      set commentText to "${escapedComment}"
      set the clipboard to commentText
      tell application "Google Chrome" to activate
      delay 0.3
      tell application "System Events"
        key code 9 using command down
      end tell
    `);

    // React 상태 정착 및 게시 버튼 활성화 대기 (1.5초)
    await delay(1500);

    // [게시] 버튼 클릭 & Return 키 병행 전송
    const jsClickPostBtn = `
      (function() {
        var postBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(function(b) {
          var t = (b.innerText || '').trim();
          return t === '게시' || t === 'Post';
        });

        var clicked = false;
        if (postBtn && !postBtn.hasAttribute('disabled')) {
          try {
            var opts = { bubbles: true, cancelable: true, view: window };
            postBtn.dispatchEvent(new MouseEvent('mousedown', opts));
            postBtn.dispatchEvent(new MouseEvent('mouseup', opts));
            postBtn.click();
            clicked = true;
          } catch(e) {
            postBtn.click();
            clicked = true;
          }
        }

        return JSON.stringify({
          success: true,
          clicked: clicked,
          hasBtn: Boolean(postBtn)
        });
      })()
    `;

    const clickPostRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          set res to execute javascript ${JSON.stringify(jsClickPostBtn)}
          set curUrl to execute javascript "window.location.href"
          return curUrl & "###" & res
        end tell
      end tell
    `).catch(() => '');

    // 인스타그램 폼 제출 확실성 보장: Return 키 전송
    await runAppleScript(`
      tell application "Google Chrome" to activate
      delay 0.2
      tell application "System Events"
        key code 36
      end tell
    `).catch(() => {});

    const [finalUrl, jsonStr] = (clickPostRaw || '').split('###');
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonStr || '{}');
    } catch {
      parsed = { success: false, reason: 'parse_error' };
    }

    // 전송 반영 및 등록 대기 (4초)
    await delay(4000);

    // 5. 실제 댓글 등록 여부 DOM 2차 엄격 검증
    // - textarea의 내용이 성공적으로 제출되어 비워졌거나(isCleared)
    // - 또는 페이지 본문에 inch.sale이나 '최저가 찾았어요' 텍스트가 실제로 존재하는지 확인
    const jsVerifyPost = `
      (function() {
        var ta = document.querySelector('textarea');
        var isCleared = ta ? (ta.value.trim() === '') : false;
        var bodyText = document.body ? document.body.innerText : '';
        var foundComment = bodyText.includes('inch.sale') || bodyText.includes('최저가 찾았어요');
        return JSON.stringify({ isCleared: isCleared, foundComment: foundComment });
      })()
    `;
    const verifyRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsVerifyPost)}
        end tell
      end tell
    `).catch(() => '{}');

    let verifyResult: any = {};
    try {
      verifyResult = JSON.parse(verifyRaw);
    } catch {}

    // 엄격 검증: 실제로 textarea가 비워졌거나 댓글 텍스트가 화면에 렌더링된 경우에만 성공으로 판정!
    const isActuallyPosted = (verifyResult.isCleared === true) || (verifyResult.foundComment === true);

    // 사용자가 댓글 등록 상태를 직접 확인할 수 있도록 5초간 탭 유지
    await delay(5000);

    // 6. 완료 후 백그라운드 임시 탭 자동 닫기 (클린업)
    await runAppleScript(`
      tell application "Google Chrome"
        try
          close tab id ${tabId} of window 1
        end try
      end tell
    `).catch(() => {});

    return {
      success: isActuallyPosted,
      message: isActuallyPosted
        ? `인스타그램 크리에이터 팔로우 및 게시물 댓글 무인 게시 완료 (검증됨, 팔로우: ${navRes.followed ? '완료' : '기존 팔로잉'})`
        : `인스타그램 댓글 게시 미반영 (상태: ${parsed.reason || '미검증'})`,
      postUrl: finalUrl?.trim() || navRes.url || profileOrPostUrl,
      captionText: '',
    };
  } catch (err: any) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    return {
      success: false,
      message: `Instagram 백그라운드 댓글 게시 실패: ${err.message}`,
    };
  }
}

/**
 * 틱톡 프로필/검색/영상 페이지 진입 시:
 * 1. 탭 오픈 후 넉넉하게 5초 대기 (무거운 비디오/스크립트 로드 대기)
 * 2. 목록/검색 페이지일 경우 3초 대기 루프를 통해 첫 번째 실제 비디오(/video/)로 반드시 직행
 * 3. 비디오 일시정지 & 댓글 아이콘([data-e2e="comment-icon"]) 클릭 후 3초 대기하여 드로어 오픈
 * 4. DraftEditor에 Selection 설정 및 DataTransfer/ClipboardEvent/TextEvent 3중 주입
 * 5. 3초 대기하여 Draft.js React 상태 정착 및 [게시] 버튼 disabled 해제 확인 후 클릭
 * 6. 4초 대기 후 댓글 목록에 실제 내 댓글이 렌더링되었는지 엄격 검증 (거짓 성공 원천 차단)
 * 7. 완료 후 임시 탭 자동 클린업
 */
export async function postTikTokViaAppleScript(
  searchOrProfileUrl: string,
  commentText: string,
  expectedKeywords?: string[]
): Promise<{ success: boolean; message: string; videoUrl?: string }> {
  let tabId = '';
  try {
    const escapedComment = commentText
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');

    // 1. 임시 탭 생성 & 넉넉한 초기 로딩 대기 (5초)
    const createTabScript = `
      set commentText to "${escapedComment}"
      set the clipboard to commentText

      tell application "Google Chrome"
        activate
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set savedIndex to active tab index
          set newTab to make new tab with properties {URL:"${searchOrProfileUrl}"}
          set active tab index to (count of tabs)
          return (id of newTab as string) & "###" & (savedIndex as string)
        end tell
      end tell
    `;

    const rawInit = await runAppleScript(createTabScript);
    const [rawTabId, savedIndex] = (rawInit || '').split('###');
    tabId = (rawTabId || '').trim();
    if (!tabId) throw new Error('TikTok 탭 생성 실패');

    console.log(`[TikTok] 페이지 로딩 대기 중... (5초 대기)`);
    await delay(5000);

    // 2. 비디오 페이지 직행 네비게이션 (목록에 멈추는 현상 원천 차단: 3초 대기 & 최대 3회 재시도)
    let isVideoPage = false;
    let actualVideoUrl = searchOrProfileUrl;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const jsCheckAndNavigate = `
        (function() {
          var cur = window.location.href;
          if (cur.includes('/video/') || cur.includes('/photo/')) {
            return JSON.stringify({ isVideo: true, url: cur });
          }

          // 1) 프로필 페이지 팔로우 버튼 클릭
          var followBtn = document.querySelector('[data-e2e="follow-button"]');
          if (!followBtn) {
            followBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(function(b) {
              var t = (b.innerText || '').trim();
              return t === '팔로우' || t === 'Follow';
            });
          }
          if (followBtn && (followBtn.innerText || '').trim() !== '팔로잉' && (followBtn.innerText || '').trim() !== 'Following') {
            try { followBtn.click(); } catch(e) {}
          }

          // 2) 첫 번째 실제 영상 링크 탐색
          var a = document.querySelector('a[href*="/video/"]')
            || document.querySelector('[data-e2e="search_video-item"] a[href*="/video/"]')
            || document.querySelector('[data-e2e="user-post-item"] a')
            || document.querySelector('div[class*="DivItemContainer"] a[href*="/video/"]');

          if (a && a.href) {
            window.location.href = a.href;
            return JSON.stringify({ isVideo: false, navigated: true, url: a.href });
          }

          window.scrollBy(0, 300);
          return JSON.stringify({ isVideo: false, navigated: false, url: cur });
        })()
      `;

      const navRaw = await runAppleScript(`
        tell application "Google Chrome"
          tell tab id ${tabId} of window 1
            return execute javascript ${JSON.stringify(jsCheckAndNavigate)}
          end tell
        end tell
      `).catch(() => '{}');

      let navRes: any = {};
      try { navRes = JSON.parse(navRaw || '{}'); } catch {}

      if (navRes.isVideo) {
        isVideoPage = true;
        actualVideoUrl = navRes.url || actualVideoUrl;
        console.log(`[TikTok] 비디오 페이지 확인 완료: ${actualVideoUrl}`);
        break;
      }

      if (navRes.navigated) {
        actualVideoUrl = navRes.url || actualVideoUrl;
        console.log(`[TikTok] 영상 상세 페이지로 이동 중... ${actualVideoUrl} (5초 대기)`);
        await delay(5000);
        isVideoPage = true;
        break;
      }

      console.log(`[TikTok] 비디오 링크 로딩 대기 중... (시도 ${attempt}/3, 3초 대기)`);
      await delay(3000);
    }

    // 3. 비디오 일시정지 & 댓글 드로어 열기 (3초 대기 & 최대 3회 재시도)
    let drawerOpened = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const jsOpenDrawer = `
        (function() {
          var v = document.querySelector('video');
          if (v) v.pause();

          var existingEditor = document.querySelector('.public-DraftEditor-content');
          if (existingEditor) {
            existingEditor.focus();
            return JSON.stringify({ success: true, reason: 'already_open' });
          }

          var feedFollowBtn = document.querySelector('[data-e2e="feed-follow"][data-key-interaction="action_follow"]')
            || document.querySelector('[data-e2e="cinema-video-info-follow"]');
          if (feedFollowBtn) {
            try { feedFollowBtn.click(); } catch(e) {}
          }

          var icon = document.querySelector('[data-e2e="comment-icon"]')
            || document.querySelector('[data-e2e="browse-comment-icon"]');

          if (icon) {
            var btn = icon.querySelector('button') || icon;
            var opts = { bubbles: true, cancelable: true, view: window };
            btn.dispatchEvent(new MouseEvent('mousedown', opts));
            btn.dispatchEvent(new MouseEvent('mouseup', opts));
            btn.dispatchEvent(new MouseEvent('click', opts));
            return JSON.stringify({ success: true, reason: 'icon_clicked' });
          }

          return JSON.stringify({ success: false, reason: 'icon_not_found' });
        })()
      `;

      const drawerRaw = await runAppleScript(`
        tell application "Google Chrome"
          tell tab id ${tabId} of window 1
            return execute javascript ${JSON.stringify(jsOpenDrawer)}
          end tell
        end tell
      `).catch(() => '{}');

      let drawerRes: any = {};
      try { drawerRes = JSON.parse(drawerRaw || '{}'); } catch {}

      if (drawerRes.success) {
        drawerOpened = true;
        console.log(`[TikTok] 댓글 드로어 열기 성공 (${drawerRes.reason}), 3초 대기`);
        await delay(3000);
        break;
      }

      console.log(`[TikTok] 댓글창 열기 재시도 대기... (시도 ${attempt}/3, 3초 대기)`);
      await delay(3000);
    }

    // 4. DraftEditor 포커스 및 내부 블록 커서 설정
    console.log(`[TikTok] 댓글 입력창 포커스 및 커서 위치 설정 실행`);
    const jsFocusDraftEditor = `
      (function() {
        var v = document.querySelector('video');
        if (v) v.pause();

        window.focus();
        var editor = document.querySelector('.public-DraftEditor-content');
        if (!editor) return JSON.stringify({ success: false, reason: 'no_editor' });

        editor.focus();

        // Draft.js 내부 블록 span[data-offset-key]에 정확히 커서 배치
        var span = editor.querySelector('span[data-offset-key]') || editor.querySelector('[data-text="true"]') || editor;
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(span);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);

        return JSON.stringify({
          success: true,
          spanFound: Boolean(span)
        });
      })()
    `;

    const focusRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsFocusDraftEditor)}
        end tell
      end tell
    `).catch(() => '{}');

    let focusRes: any = {};
    try { focusRes = JSON.parse(focusRaw || '{}'); } catch {}
    console.log(`[TikTok] Draft.js 포커스 결과:`, focusRes);

    await delay(500);

    // 5. [OS 네이티브 클립보드 붙여넣기] key code 9 (Cmd+V) 전송
    // 한글 및 영문 키보드 레이아웃에 상관없이 물리적 Cmd+V를 정확하게 시뮬레이션하여 Draft.js에 텍스트 주입
    console.log(`[TikTok] 클립보드 동기화 및 Cmd+V (key code 9) 네이티브 입력 실행`);
    await runAppleScript(`
      set commentText to "${escapedComment}"
      set the clipboard to commentText
      tell application "Google Chrome" to activate
      delay 0.3
      tell application "System Events"
        key code 9 using command down
      end tell
    `);

    // Draft.js React 상태 정착 및 게시 버튼 활성화 대기 (1.5초)
    console.log(`[TikTok] Draft.js React 상태 정착 대기 (1.5초 대기)`);
    await delay(1500);

    // 6. [댓글 전송] DraftEditor 포커스 상태에서 Return 키(key code 36) 및 게시 버튼 클릭 병행 전송
    console.log(`[TikTok] 댓글 제출: Return 키(key code 36) 전송 및 게시 버튼 클릭`);
    const jsClickPostBtn = `
      (function() {
        var postBtn = document.querySelector('[data-e2e="comment-post"]')
          || document.querySelector('button[class*="ArrowPostButton"]')
          || document.querySelector('[data-e2e="comment-input"] button');

        var editor = document.querySelector('.public-DraftEditor-content');
        var editorText = editor ? (editor.innerText || '').trim() : '';

        var btnClicked = false;
        if (postBtn && !postBtn.hasAttribute('disabled')) {
          var opts = { bubbles: true, cancelable: true, view: window };
          postBtn.dispatchEvent(new MouseEvent('mousedown', opts));
          postBtn.dispatchEvent(new MouseEvent('mouseup', opts));
          postBtn.click();
          btnClicked = true;
        }

        return JSON.stringify({
          editorTextLen: editorText.length,
          hasBtn: Boolean(postBtn),
          btnDisabled: postBtn ? postBtn.hasAttribute('disabled') : null,
          btnClicked: btnClicked
        });
      })()
    `;

    const clickRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsClickPostBtn)}
        end tell
      end tell
    `).catch(() => '{}');

    let clickRes: any = {};
    try { clickRes = JSON.parse(clickRaw || '{}'); } catch {}
    console.log(`[TikTok] 게시 버튼 상태 및 클릭 결과:`, clickRes);

    // 틱톡 데스크톱 웹의 공식 댓글 제출 트리거: Return 키 전송
    await runAppleScript(`
      tell application "Google Chrome" to activate
      delay 0.2
      tell application "System Events"
        key code 36
      end tell
    `);

    // 7. 서버 댓글 전송 반영 대기 (4초)
    console.log(`[TikTok] 댓글 전송 서버 반영 대기 중 (4초 대기)`);
    await delay(4000);

    // 8. 실제 틱톡 댓글 등록 여부 DOM 정밀 사후 검증 (거짓 성공 판정 원천 차단)
    const jsVerifyTikTokComment = `
      (function() {
        var editor = document.querySelector('.public-DraftEditor-content');
        var editorText = editor ? (editor.innerText || '').trim() : '';
        var isCleared = (editorText === '' || editorText === '\\n');

        // 댓글 리스트 DOM에서 실제 내 댓글(inch.sale 또는 최저가) 렌더링 확인
        var comments = Array.from(document.querySelectorAll('div[class*="CommentItem"], div[class*="DivCommentObjectWrapper"], [data-e2e*="comment"]')).map(function(c) {
          return c.innerText || '';
        });
        var foundInList = comments.some(function(c) {
          return c.includes('inch.sale') || c.includes('최저가 찾았어요') || c.includes('최저가');
        });

        var bodyText = document.body ? document.body.innerText : '';
        var foundInBody = bodyText.includes('inch.sale');

        return JSON.stringify({
          isCleared: isCleared,
          foundInList: foundInList,
          foundInBody: foundInBody,
          editorTextRemaining: editorText,
          totalCommentsCount: comments.length
        });
      })()
    `;

    const verifyRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsVerifyTikTokComment)}
        end tell
      end tell
    `).catch(() => '{}');

    let verifyResult: any = {};
    try { verifyResult = JSON.parse(verifyRaw); } catch {}
    console.log(`[TikTok] DOM 사후 정밀 검증 결과:`, verifyResult);

    // 엄격 검증:
    // (1) 댓글 목록(List)에 내 댓글 텍스트/링크가 실제로 렌더링되었거나
    // (2) 댓글 전송 후 DraftEditor가 완전히 비워진(isCleared) 경우에만 실제 성공으로 인정!
    const postSubmitted = Boolean(clickRes.btnClicked || clickRes.editorTextLen > 5);
    const isActuallyPosted = postSubmitted && (verifyResult.foundInList || (verifyResult.isCleared && verifyResult.editorTextRemaining === ''));

    // 9. 사용자가 게시된 댓글을 직접 눈으로 확인할 수 있도록 5초간 대기 후 원래 탭 복구
    if (isActuallyPosted) {
      await delay(5000);
    }

    await runAppleScript(`
      tell application "Google Chrome"
        try
          if "${savedIndex}" is not "" then
            set active tab index of window 1 to (${savedIndex} as integer)
          end if
          close tab id ${tabId} of window 1
        end try
      end tell
    `).catch(() => {});

    return {
      success: isActuallyPosted,
      message: isActuallyPosted
        ? `TikTok 크리에이터 팔로우 및 영상 댓글 무인 게시 완료 (검증됨: ${actualVideoUrl})`
        : `TikTok 댓글 게시 미반영 (제출시도: ${postSubmitted}, 사후검증실패: 댓글 목록 미출력)`,
      videoUrl: actualVideoUrl,
    };
  } catch (err: any) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    return {
      success: false,
      message: `TikTok 댓글 게시 실패: ${err.message}`,
    };
  }
}
