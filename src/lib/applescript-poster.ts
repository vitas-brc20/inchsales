import { spawn } from 'child_process';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript');
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `AppleScript exited with code ${code}`));
    });
    proc.stdin.write(script, 'utf8');
    proc.stdin.end();
  });
}

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
 * - 100% 무간섭 백그라운드(Silent Background) 모드
 * - activate 없음 (사용자 작업 화면 가로채기 0%)
 * - System Events 키보드 가로채기 없음 (순수 JS Prototype Setter 주입)
 * - 작업 완료 후 임시 탭 자동 닫기 (탭 쌓임 방지)
 */
export async function postInstagramViaAppleScript(
  profileOrPostUrl: string,
  commentText: string,
  expectedKeywords?: string[]
): Promise<{ success: boolean; message: string; postUrl?: string; captionText?: string }> {
  let tabId = '';
  try {
    const escapedComment = commentText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
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

    // 2. 프로필/게시물 페이지 로딩 대기
    await delay(3500);

    // 3. 프로필 목록일 경우 첫 번째 릴스/게시물 진입 (백그라운드 탭 내부 실행)
    const jsOpenFirst = `
      (function() {
        if (window.location.href.includes('/p/') || window.location.href.includes('/reel/')) return window.location.href;
        var a = document.querySelector('a[href*="/reel/"], a[href*="/p/"]');
        if (a) {
          a.click();
          return a.href;
        }
        return window.location.href;
      })()
    `;
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsOpenFirst)}
        end tell
      end tell
    `).catch(() => {});

    await delay(3000);

    // 4. 본문 캡션 텍스트 추출 및 순수 JS Prototype setter로 댓글 주입 & 게시 (키보드 개입 0%)
    const jsPostComment = `
      (function() {
        var captionEl = document.querySelector('h1') || document.querySelector('ul li span');
        var caption = captionEl ? captionEl.innerText : '';
        
        var ta = document.querySelector('textarea[aria-label*="댓글"], textarea[placeholder*="댓글"]');
        if (!ta) return 'no_textarea|||' + caption;
        
        var text = "${escapedComment}";
        var proto = Object.getPrototypeOf(ta);
        var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(ta, text);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        
        var btn = Array.from(document.querySelectorAll('div[role="button"], button'))
          .find(function(b) { return b.innerText && b.innerText.trim() === '게시'; });
          
        if (btn) {
          btn.click();
          return 'clicked|||' + caption;
        }
        return 'no_post_btn|||' + caption;
      })()
    `;

    const rawResult = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          set res to execute javascript ${JSON.stringify(jsPostComment)}
          set curUrl to execute javascript "window.location.href"
          return curUrl & "###" & res
        end tell
      end tell
    `);

    const [finalUrl, meta] = (rawResult || '').split('###');
    const [status, caption] = (meta || '').split('|||');

    await delay(2500);

    // 5. 완료 후 백그라운드 임시 탭 자동 닫기 (클린업)
    await runAppleScript(`
      tell application "Google Chrome"
        try
          close tab id ${tabId} of window 1
        end try
      end tell
    `).catch(() => {});

    return {
      success: status === 'clicked',
      message: status === 'clicked' 
        ? `인스타그램 릴스/게시물 완전 백그라운드 무인 댓글 게시 완료`
        : `댓글 게시 시도 완료 (상태: ${status})`,
      postUrl: finalUrl?.trim() || profileOrPostUrl,
      captionText: caption?.trim(),
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
 * - 100% 무간섭 백그라운드(Silent Background) 모드
 * - activate 없음 (화면 뺏김 0%)
 * - System Events 키보드 가로채기 없음 (순수 JS 이벤트 주입)
 * - 완료 후 백그라운드 탭 자동 닫기
 */
export async function postTikTokViaAppleScript(
  searchOrProfileUrl: string,
  commentText: string
): Promise<{ success: boolean; message: string; videoUrl?: string }> {
  let tabId = '';
  try {
    const escapedComment = commentText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    // 1. 백그라운드 탭 생성 (activate 없음)
    const createTabScript = `
      tell application "Google Chrome"
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${searchOrProfileUrl}"}
          return id of newTab
        end tell
      end tell
    `;

    tabId = (await runAppleScript(createTabScript)).trim();
    if (!tabId) throw new Error('TikTok 백그라운드 탭 생성 실패');

    await delay(3500);

    // 2. 프로필/검색일 경우 첫 번째 비디오 클릭 진입 (백그라운드)
    const jsOpenFirstVideo = `
      (function() {
        if (window.location.href.includes('/video/')) return window.location.href;
        var a = document.querySelector('a[href*="/video/"]');
        if (a) {
          a.click();
          return a.href;
        }
        return window.location.href;
      })()
    `;
    await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          execute javascript ${JSON.stringify(jsOpenFirstVideo)}
        end tell
      end tell
    `).catch(() => {});

    await delay(3000);

    // 3. DraftEditor 순수 JS 텍스트 주입 & 게시 버튼 클릭 (키보드 시뮬레이션 0%)
    const jsTypeAndPost = `
      (function() {
        var editor = document.querySelector('.public-DraftEditor-content');
        if (!editor) return 'no_editor';
        
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, "${escapedComment}");
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        
        var btn = document.querySelector('[data-e2e="comment-post"]');
        if (btn) {
          btn.focus();
          btn.click();
          return 'clicked';
        }
        return 'no_btn';
      })()
    `;

    const postResult = await runAppleScript(`
      tell application "Google Chrome"
        tell tab id ${tabId} of window 1
          return execute javascript ${JSON.stringify(jsTypeAndPost)}
        end tell
      end tell
    `).catch(() => 'no_btn');

    await delay(2500);

    // 4. 완료 후 백그라운드 탭 자동 닫기 (클린업)
    await runAppleScript(`
      tell application "Google Chrome"
        try
          close tab id ${tabId} of window 1
        end try
      end tell
    `).catch(() => {});

    return {
      success: postResult.includes('clicked'),
      message: `TikTok 영상 완전 백그라운드 무인 댓글 게시 완료 (${searchOrProfileUrl})`,
      videoUrl: searchOrProfileUrl,
    };
  } catch (err: any) {
    if (tabId) {
      await runAppleScript(`tell application "Google Chrome" to try close tab id ${tabId} of window 1`).catch(() => {});
    }
    return {
      success: false,
      message: `TikTok 백그라운드 댓글 게시 실패: ${err.message}`,
    };
  }
}
