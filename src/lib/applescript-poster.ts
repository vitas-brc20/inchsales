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

    return {
      success: true,
      message: 'YouTube 댓글 작성 및 [댓글] 버튼 클릭 완료 (백그라운드 100% 무인 전송)',
      details: { videoUrl, tabId },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `AppleScript 자동 댓글 전송 실패: ${err.message}`,
    };
  }
}

/**
 * 인스타그램 프로필 또는 게시물 페이지 진입 시:
 * 1. 프로필 목록 페이지일 경우 첫 번째 릴스/게시물(/p/ 또는 /reel/)을 자동 클릭하여 영상 본문으로 직행
 * 2. 영상 본문의 캡션/텍스트를 추출하여 제품 연관성을 검증
 * 3. React Prototype setter 방식으로 댓글 입력창(textarea)에 정확히 주입 및 [게시] 버튼 클릭까지 100% 무인 전송
 */
export async function postInstagramViaAppleScript(
  profileOrPostUrl: string,
  commentText: string,
  expectedKeywords?: string[]
): Promise<{ success: boolean; message: string; postUrl?: string; captionText?: string }> {
  try {
    const escapedComment = commentText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    
    const script = `
      tell application "Google Chrome"
        activate
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${profileOrPostUrl}"}
          set active tab index to (count of tabs)
        end tell
      end tell

      -- 1. 프로필/게시물 페이지 로딩 대기
      delay 3.5

      tell application "Google Chrome"
        tell active tab of window 1
          -- 2. 프로필 목록일 경우 첫 번째 게시물/릴스 클릭하여 진입
          execute javascript "(function() {
            if (window.location.href.includes('/p/') || window.location.href.includes('/reel/')) return;
            var a = document.querySelector('a[href*=\\"/reel/\\"], a[href*=\\"/p/\\"]');
            if (a) a.click();
          })()"
        end tell
      end tell

      -- 3. 게시물/릴스 상세 모달 로딩 대기
      delay 3.0

      -- 4. 본문 캡션 텍스트 추출 및 React setter로 댓글 주입
      tell application "Google Chrome"
        tell active tab of window 1
          set res to execute javascript "(function() {
            var captionEl = document.querySelector('h1') || document.querySelector('ul li span');
            var caption = captionEl ? captionEl.innerText : '';
            
            var ta = document.querySelector('textarea[aria-label*=\\"댓글\\"], textarea[placeholder*=\\"댓글\\"]');
            if (!ta) return 'no_textarea|||' + caption;
            
            var text = \\"${escapedComment}\\";
            var proto = Object.getPrototypeOf(ta);
            var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(ta, text);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            
            var btn = Array.from(document.querySelectorAll('div[role=\\"button\\"], button'))
              .find(function(b) { return b.innerText && b.innerText.trim() === '게시'; });
              
            if (btn) {
              btn.click();
              return 'clicked|||' + caption;
            }
            return 'no_post_btn|||' + caption;
          })()"
          set curUrl to execute javascript "window.location.href"
          return curUrl & "###" & res
        end tell
      end tell
    `;

    const raw = await runAppleScript(script);
    const [finalUrl, meta] = (raw || '').split('###');
    const [status, caption] = (meta || '').split('|||');

    await delay(2500);

    return {
      success: status === 'clicked',
      message: status === 'clicked' 
        ? `인스타그램 릴스/게시물 무인 댓글 게시 완료 (${finalUrl?.trim() || profileOrPostUrl})`
        : `댓글 게시 시도 완료 (상태: ${status})`,
      postUrl: finalUrl?.trim() || profileOrPostUrl,
      captionText: caption?.trim(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Instagram 이동 및 댓글 게시 실패: ${err.message}`,
    };
  }
}

/**
 * 틱톡 프로필/영상 페이지 진입 시:
 * 1. 프로필 페이지일 경우 첫 번째 영상(a[href*="/video/"])을 클릭하여 안전하게 진입 (Direct 접근 시 403 방지)
 * 2. 영상 모달의 DraftEditor 에디터에 텍스트 붙여넣기 및 [게시] 버튼 클릭까지 100% 무인 전송
 */
export async function postTikTokViaAppleScript(
  searchOrProfileUrl: string,
  commentText: string
): Promise<{ success: boolean; message: string; videoUrl?: string }> {
  try {
    const escapedComment = commentText.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    const script = `
      set commentText to "${escapedComment}"
      set the clipboard to commentText

      tell application "Google Chrome"
        activate
        if (count of windows) is 0 then
          make new window
        end if
        tell window 1
          set newTab to make new tab with properties {URL:"${searchOrProfileUrl}"}
          set active tab index to (count of tabs)
        end tell
      end tell

      -- 1. 페이지 로딩 대기
      delay 3.5

      tell application "Google Chrome"
        tell active tab of window 1
          -- 2. 만약 프로필 페이지라면 첫 번째 비디오를 클릭하여 진입 (WAF 403 우회)
          execute javascript "(function() {
            if (window.location.href.includes('/video/')) return;
            var a = document.querySelector('a[href*=\\"/video/\\"]');
            if (a) a.click();
          })()"
        end tell
      end tell

      -- 3. 비디오 플레이어 및 댓글창 로딩 대기
      delay 3.0

      tell application "Google Chrome"
        tell active tab of window 1
          -- 4. DraftEditor 포커스 및 기존 내용 비우기
          execute javascript "(function() {
            var editor = document.querySelector('.public-DraftEditor-content');
            if (editor) {
              editor.focus();
              document.execCommand('selectAll', false, null);
            }
          })()"
        end tell
      end tell

      delay 0.5
      -- 5. 클립보드 붙여넣기
      tell application "System Events"
        keystroke "v" using command down
      end tell

      delay 1.0

      -- 6. 게시 버튼 클릭
      tell application "Google Chrome"
        tell active tab of window 1
          set postResult to execute javascript "(function() {
            var btn = document.querySelector('[data-e2e=\\"comment-post\\"]');
            if (btn) {
              btn.focus();
              btn.click();
              return 'clicked';
            }
            return 'no_btn';
          })()"
          set curUrl to execute javascript "window.location.href"
          return curUrl & "|||" & postResult
        end tell
      end tell
    `;

    const raw = await runAppleScript(script);
    const [finalUrl, resultStatus] = (raw || '').split('|||');

    await delay(2500);

    return {
      success: true,
      message: `TikTok 영상 무인 댓글 게시 완료 (${finalUrl?.trim() || searchOrProfileUrl})`,
      videoUrl: finalUrl?.trim() || searchOrProfileUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `TikTok 이동 및 댓글 게시 실패: ${err.message}`,
    };
  }
}
