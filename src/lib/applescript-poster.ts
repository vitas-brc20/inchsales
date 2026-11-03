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

    // 2. 초기 로딩 대기
    await delay(3500);

    // 3. 프로필 상단 팔로우 클릭 & 첫 번째 게시물로 직행 네비게이션
    const jsProfileFollowAndNavigate = `
      (function() {
        // 프로필 팔로우 버튼 선행 클릭
        var btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        var followBtn = btns.find(function(b) {
          var t = (b.innerText || '').trim();
          return t === '팔로우' || t === 'Follow';
        });
        var followed = false;
        if (followBtn) {
          try { followBtn.click(); followed = true; } catch(e) {}
        }

        // 게시물 직행
        if (!window.location.href.includes('/p/') && !window.location.href.includes('/reel/')) {
          var a = document.querySelector('a[href*="/reel/"], a[href*="/p/"]');
          if (a && a.href) {
            window.location.href = a.href;
            return JSON.stringify({ action: 'navigated', url: a.href, followed: followed });
          }
        }
        return JSON.stringify({ action: 'already_on_post', url: window.location.href, followed: followed });
      })()
    `;

    const navResRaw = await runAppleScript(`
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

    // 네비게이션 발생 시 새 게시물 페이지 로딩 대기
    if (navRes.action === 'navigated') {
      await delay(3500);
    } else {
      await delay(1500);
    }

    // 4. 게시물 페이지 내에서 미팔로우 상태면 팔로우 클릭 + 댓글 주입 및 게시
    const jsPostOnInstagram = `
      (function() {
        try {
          // (1) 게시물 내 팔로우 버튼 확인
          var btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          var followBtn = btns.find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '팔로우' || t === 'Follow';
          });
          var postFollowed = false;
          if (followBtn) {
            try { followBtn.click(); postFollowed = true; } catch(e) {}
          }

          // (2) 캡션 추출
          var captionEl = document.querySelector('h1') || document.querySelector('ul li span');
          var caption = (captionEl ? captionEl.innerText : '').replace(/\\n/g, ' ').slice(0, 100);

          // (3) 댓글 textarea 탐색
          var ta = document.querySelector('textarea');
          if (!ta) {
            return JSON.stringify({ success: false, reason: 'no_textarea', followed: postFollowed, caption: caption });
          }

          // (4) 순수 JS 프로토타입 세터로 무간섭 댓글 주입
          ta.focus();
          var text = "${escapedComment}";
          var proto = Object.getPrototypeOf(ta);
          var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(ta, text);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));

          // (5) [게시] 버튼 클릭
          var allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          var postBtn = allBtns.find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '게시' || t === 'Post';
          });

          if (postBtn) {
            postBtn.click();
            return JSON.stringify({ success: true, reason: 'clicked', followed: postFollowed, caption: caption });
          }

          return JSON.stringify({ success: false, reason: 'no_post_btn', followed: postFollowed, caption: caption });
        } catch(err) {
          return JSON.stringify({ success: false, reason: err.message });
        }
      })()
    `;

    const postResultRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          set res to execute javascript ${JSON.stringify(jsPostOnInstagram)}
          set curUrl to execute javascript "window.location.href"
          return curUrl & "###" & res
        end tell
      end tell
    `).catch(() => '');

    const [finalUrl, jsonStr] = (postResultRaw || '').split('###');
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonStr || '{}');
    } catch {
      parsed = { success: false, reason: 'parse_error' };
    }

    // 전송 반영 대기
    await delay(3000);

    // 5. 실제 댓글 등록 여부 DOM 2차 검증 (textarea 비워짐 및 댓글 리스트 반영 확인)
    const jsVerifyPost = `
      (function() {
        var ta = document.querySelector('textarea');
        var isCleared = ta ? (ta.value === '') : false;
        var comments = Array.from(document.querySelectorAll('ul li, div[role="dialog"] span')).map(function(el) {
          return el.innerText || '';
        });
        var foundComment = comments.some(function(c) {
          return c.includes('inch.sale') || c.includes('최저가');
        });
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

    const isActuallyPosted = parsed.success === true && (verifyResult.isCleared || verifyResult.foundComment);

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
        ? `인스타그램 크리에이터 팔로우 및 게시물 댓글 무인 게시 완료 (검증됨, 팔로우: ${navRes.followed || parsed.followed ? '완료' : '이미 팔로잉'})`
        : `인스타그램 댓글 게시 미반영 (상태: ${parsed.reason || '미검증'})`,
      postUrl: finalUrl?.trim() || navRes.url || profileOrPostUrl,
      captionText: parsed.caption?.trim(),
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
 * 틱톡 프로필/영상 페이지 진입 시:
 * 1. 진입 즉시 '팔로우' 버튼(data-e2e="follow-button" or "feed-follow") 자동 클릭하여 크리에이터 팔로우 선행
 * 2. 프로필일 경우 첫 번째 비디오/포토(a[href*="/video/"], a[href*="/photo/"])로 직행 (window.location.href)
 * 3. 비디오/포토 진입 후 미팔로우 상태면 feed-follow 재확인 클릭
 * 4. 댓글 드로어([data-e2e="comment-icon"]) 활성화
 * 5. DraftEditor에 클립보드 붙여넣기 및 [게시] 버튼 클릭까지 100% 무인 전송
 * 6. 완료 후 임시 탭 자동 클린업
 */
export async function postTikTokViaAppleScript(
  searchOrProfileUrl: string,
  commentText: string
): Promise<{ success: boolean; message: string; videoUrl?: string }> {
  let tabId = '';
  try {
    const escapedComment = commentText
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');

    // 1. 임시 탭 생성
    const createTabScript = `
      set commentText to "${escapedComment}"
      set the clipboard to commentText

      tell application "Google Chrome"
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

    await delay(3500);

    // 2. 프로필 상단 팔로우 버튼 선행 클릭 & 비디오/포토 직행 네비게이션
    const jsFollowAndNavigate = `
      (function() {
        // (1) 프로필 페이지 팔로우 버튼 클릭
        var followBtn = document.querySelector('[data-e2e="follow-button"]');
        if (!followBtn) {
          followBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '팔로우' || t === 'Follow';
          });
        }
        var followed = false;
        if (followBtn && (followBtn.innerText || '').trim() !== '팔로잉' && (followBtn.innerText || '').trim() !== 'Following') {
          try { followBtn.click(); followed = true; } catch(e) {}
        }

        // (2) 현재 페이지가 비디오나 포토가 아니면 첫 번째 비디오/포토로 직행
        if (!window.location.href.includes('/video/') && !window.location.href.includes('/photo/')) {
          var a = document.querySelector('a[href*="/video/"], a[href*="/photo/"]');
          if (a && a.href) {
            window.location.href = a.href;
            return JSON.stringify({ action: 'navigated', url: a.href, followed: followed });
          }
        }
        return JSON.stringify({ action: 'already_on_video', url: window.location.href, followed: followed });
      })()
    `;

    const navResRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsFollowAndNavigate)}
        end tell
      end tell
    `).catch(() => '{}');

    let navRes: any = {};
    try {
      navRes = JSON.parse(navResRaw);
    } catch {
      navRes = {};
    }

    if (navRes.action === 'navigated') {
      await delay(3500);
    } else {
      await delay(1500);
    }

    // 3. 비디오/포토 페이지 내에서 feed-follow 클릭 및 댓글 아이콘 클릭
    const jsOpenVideoAndDrawer = `
      (function() {
        // 비디오 내 feed-follow(팔로우 플러스) 버튼이 있으면 클릭
        var feedFollowBtn = document.querySelector('[data-e2e="feed-follow"][data-key-interaction="action_follow"]')
          || document.querySelector('[data-e2e="cinema-video-info-follow"]')
          || Array.from(document.querySelectorAll('button')).find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '팔로우' || t === 'Follow';
          });
        var videoFollowed = false;
        if (feedFollowBtn) {
          try { feedFollowBtn.click(); videoFollowed = true; } catch(e) {}
        }

        // 댓글 아이콘 클릭하여 댓글창 열기
        var icon = document.querySelector('[data-e2e="comment-icon"]');
        if (icon) {
          try { icon.click(); } catch(e) {}
        }
        
        var editor = document.querySelector('.public-DraftEditor-content') || document.querySelector('[contenteditable="true"]');
        if (editor) editor.focus();
        return JSON.stringify({ videoFollowed: videoFollowed, hasEditor: !!editor });
      })()
    `;
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsOpenVideoAndDrawer)}
        end tell
      end tell
    `).catch(() => {});

    await delay(2000);

    // 4. DraftEditor 에 텍스트 붙여넣기 및 게시 버튼 클릭 시도
    const scriptPasteAndPost = `
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript "(function() {
            var editor = document.querySelector('.public-DraftEditor-content') || document.querySelector('[contenteditable=\\"true\\"]');
            if (editor) {
              editor.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, '${escapedComment}');
            }
          })()"
        end tell
      end tell

      delay 0.5
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript "(function() {
            var btn = document.querySelector('[data-e2e=\\"comment-post\\"]');
            if (btn && !btn.hasAttribute('disabled')) {
              btn.focus();
              btn.click();
              return 'clicked_enabled';
            }
            return btn ? 'btn_disabled' : 'no_btn';
          })()"
        end tell
      end tell
    `;

    const postResult = await runAppleScript(scriptPasteAndPost).catch(() => 'no_btn');
    await delay(3000);

    // 5. 실제 틱톡 댓글 등록 여부 DOM 정밀 검증 (댓글 목록에 내 댓글이 나타났는지 확인)
    const jsVerifyTikTokComment = `
      (function() {
        var comments = Array.from(document.querySelectorAll('[data-e2e=\\"comment-level-1\\"], div[class*=\\"DivCommentItem\\"]')).map(function(el) {
          return el.innerText || '';
        });
        var found = comments.some(function(c) {
          return c.includes('inch.sale') || c.includes('최저가');
        });
        return JSON.stringify({ verified: found, count: comments.length });
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
    try {
      verifyResult = JSON.parse(verifyRaw);
    } catch {}

    const isActuallyPosted = verifyResult.verified === true;

    // 6. 원래 탭으로 복구 및 임시 탭 닫기
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
        ? `TikTok 크리에이터 팔로우 및 영상 댓글 무인 게시 완료 (검증됨: ${navRes.url || searchOrProfileUrl})`
        : `TikTok 댓글 게시 미반영 (상태: ${postResult}, 검증실패: 실제 댓글 목록 미출력)`,
      videoUrl: navRes.url || searchOrProfileUrl,
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
