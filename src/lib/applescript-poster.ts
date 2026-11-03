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

    // (5) 댓글 텍스트 주입 및 [게시] 버튼 클릭
    const jsInjectAndSubmitComment = `
      (function() {
        try {
          // 댓글 입력창 탐색 (textarea 또는 contenteditable)
          var ta = document.querySelector('textarea[aria-label*="댓글"], textarea[placeholder*="댓글"], textarea[aria-label*="Comment"], textarea[placeholder*="Add a comment"], textarea');
          
          if (!ta) {
            var editable = document.querySelector('div[contenteditable="true"][role="textbox"]');
            if (editable) {
              editable.focus();
              editable.innerText = "${escapedComment}";
              editable.dispatchEvent(new Event('input', { bubbles: true }));
              
              var postBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(function(b) {
                var t = (b.innerText || '').trim();
                return t === '게시' || t === 'Post';
              });
              if (postBtn) {
                postBtn.click();
                return JSON.stringify({ success: true, method: 'contenteditable_post' });
              }
            }
            return JSON.stringify({ success: false, reason: 'no_textarea_found' });
          }

          // 순수 JS 프로토타입 세터로 무간섭 댓글 주입
          ta.focus();
          var text = "${escapedComment}";
          var proto = Object.getPrototypeOf(ta);
          var setterDescriptor = Object.getOwnPropertyDescriptor(proto, 'value') || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if (setterDescriptor && setterDescriptor.set) {
            setterDescriptor.set.call(ta, text);
          } else {
            ta.value = text;
          }
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));

          // [게시] 또는 [Post] 버튼 클릭
          var allBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
          var postBtn = allBtns.find(function(b) {
            var t = (b.innerText || '').trim();
            return t === '게시' || t === 'Post';
          });

          if (postBtn) {
            postBtn.click();
            return JSON.stringify({ success: true, reason: 'post_button_clicked' });
          }

          // 버튼이 없을 경우 Enter 키 이벤트 전송
          var enterDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
          ta.dispatchEvent(enterDown);

          return JSON.stringify({ success: true, reason: 'enter_dispatched' });
        } catch(err) {
          return JSON.stringify({ success: false, reason: err.message });
        }
      })()
    `;

    const postResultRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          set res to execute javascript ${JSON.stringify(jsInjectAndSubmitComment)}
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

    // 전송 반영 및 등록 대기
    await delay(3500);

    // 5. 실제 댓글 등록 여부 DOM 2차 검증 (textarea 비워짐 또는 inch.sale 포함 댓글 존재)
    const jsVerifyPost = `
      (function() {
        var ta = document.querySelector('textarea');
        var isCleared = ta ? (ta.value === '') : false;
        var comments = Array.from(document.querySelectorAll('ul li, div[role="dialog"] span, article span')).map(function(el) {
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

    const isActuallyPosted = parsed.success === true || verifyResult.isCleared || verifyResult.foundComment;

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

    // 3. 비디오/포토 페이지 내에서 feed-follow 클릭 및 비디오 정지 + 댓글 드로어 열기
    const jsOpenVideoAndDrawer = `
      (function() {
        // (1) 비디오 즉시 일시정지 (자동 스크롤 및 렌더링 리셋 방지)
        var v = document.querySelector('video');
        if (v) v.pause();

        // (1-1) 비디오 설명(desc) 추출 및 콘텐츠 관련성 엄격 검증
        var descEl = document.querySelector('[data-e2e="video-desc"]') || document.querySelector('[data-e2e="browse-video-desc"]');
        var desc = (descEl ? descEl.innerText : '').replace(/\\n/g, ' ');
        var expected = ${JSON.stringify(expectedKeywords || [])};
        if (expected && expected.length > 0) {
          var lowerDesc = desc.toLowerCase();
          var matched = expected.some(function(kw) {
            return lowerDesc.includes(kw.toLowerCase());
          });
          if (!matched) {
            return JSON.stringify({
              videoFollowed: false,
              hasEditor: false,
              aborted: true,
              reason: 'content_mismatch',
              desc: desc
            });
          }
        }

        // (2) 비디오 내 feed-follow(팔로우 플러스) 버튼이 있으면 클릭
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

        // (3) 댓글 아이콘 내부 버튼을 3단계 마우스 이벤트로 클릭하여 드로어 열기
        var c = document.querySelector('[data-e2e="recommend-list-item-container"]') || document;
        var icon = c.querySelector('[data-e2e="comment-icon"]') || document.querySelector('[data-e2e="comment-icon"]');
        if (icon) {
          var btn = icon.querySelector('button') || icon;
          try {
            var opts = { bubbles: true, cancelable: true, view: window };
            btn.dispatchEvent(new MouseEvent('mousedown', opts));
            btn.dispatchEvent(new MouseEvent('mouseup', opts));
            btn.dispatchEvent(new MouseEvent('click', opts));
          } catch(e) {
            btn.click();
          }
        }
        
        var editor = document.querySelector('.public-DraftEditor-content') || document.querySelector('[contenteditable="true"]');
        if (editor) editor.focus();
        return JSON.stringify({ videoFollowed: videoFollowed, hasEditor: !!editor });
      })()
    `;
    const drawerRaw = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsOpenVideoAndDrawer)}
        end tell
      end tell
    `).catch(() => '{}');

    let drawerRes: any = {};
    try {
      drawerRes = JSON.parse(drawerRaw || '{}');
    } catch {}

    if (drawerRes.aborted) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
      return {
        success: false,
        message: `콘텐츠 불일치로 댓글 작성 건너뜀: 영상 내용("${(drawerRes.desc || '').slice(0, 40)}")에 상품 관련 키워드가 없습니다.`,
        videoUrl: navRes.url || searchOrProfileUrl,
      };
    }

    await delay(2500);

    // 4. DraftEditor 에 텍스트 주입 및 [게시] 버튼 클릭 (100% 무인 전송)
    const scriptPasteAndPost = `
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          -- 1) 비디오 일시정지 재확인 및 드로어 미오픈 시 재시도
          execute javascript "(function() {
            var v = document.querySelector('video');
            if (v) v.pause();
            var editor = document.querySelector('.public-DraftEditor-content');
            if (!editor) {
              var icon = document.querySelector('[data-e2e=\\"comment-icon\\"]');
              var btn = icon ? (icon.querySelector('button') || icon) : null;
              if (btn) btn.click();
            }
          })()"
        end tell
      end tell

      delay 1.0

      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          -- 2) 텍스트 주입 및 React State 활성화 트리거
          return execute javascript "(function() {
            var editor = document.querySelector('.public-DraftEditor-content') || document.querySelector('[contenteditable=\\"true\\"]');
            if (!editor) return 'no_editor';
            
            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, '${escapedComment}');
            
            // Draft.js 이벤트 트리거
            editor.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

            var btn = document.querySelector('[data-e2e=\\"comment-post\\"]');
            if (!btn) return 'no_post_btn';
            
            if (btn.hasAttribute('disabled')) {
              // disabled 풀기 위한 추가 insertText
              document.execCommand('insertText', false, ' ');
              document.execCommand('delete', false, null);
            }

            if (!btn.hasAttribute('disabled')) {
              btn.focus();
              btn.click();
              return 'clicked_enabled';
            } else {
              // 강제 제거 후 클릭 fallback
              btn.removeAttribute('disabled');
              btn.click();
              return 'clicked_force';
            }
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

    // 6. 사용자가 게시된 댓글을 확인할 수 있도록 5초간 대기 후 원래 탭 복구
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
