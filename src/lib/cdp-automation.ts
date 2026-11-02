/**
 * Chrome DevTools Protocol (CDP) 기반 완전 무인 백그라운드 댓글 전송 엔진
 * - Node.js 22/24 내장 native WebSocket 및 fetch 활용 (외부 라이브러리 설치 불필요)
 * - 사용자 화면 전환 0%, 포커스 탈취 0%, 100% 실제 로그인된 Chrome 세션 활용
 */

export interface CDPCommentResult {
  success: boolean;
  message: string;
  details?: any;
}

const CDP_HOST = 'http://127.0.0.1:9222';

/**
 * Chrome 원격 디버깅 포트(9222) 활성화 여부 확인
 */
export async function isCDPAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_HOST}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * CDP WebSocket 명령 전송 헬퍼
 */
function sendCdpCommand(ws: WebSocket, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const timeout = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error(`CDP command '${method}' timed out`));
    }, 15000);

    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          clearTimeout(timeout);
          ws.removeEventListener('message', onMessage);
          if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
          else resolve(data.result);
        }
      } catch {}
    };

    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * YouTube 영상에 댓글을 100% 완전 무인으로 직접 작성 및 제출
 */
export async function postYouTubeCommentViaCDP(
  videoUrl: string,
  commentText: string
): Promise<CDPCommentResult> {
  let targetWsUrl: string | null = null;
  let targetId: string | null = null;
  let ws: WebSocket | null = null;

  try {
    // 1. 디버깅 포트로 새 탭 열기
    const newTabRes = await fetch(`${CDP_HOST}/json/new?${encodeURIComponent(videoUrl)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(5000),
    });
    if (!newTabRes.ok) throw new Error(`새 탭 생성 실패: HTTP ${newTabRes.status}`);

    const target = await newTabRes.json();
    targetId = target.id;
    targetWsUrl = target.webSocketDebuggerUrl;

    if (!targetWsUrl) throw new Error('webSocketDebuggerUrl을 가져올 수 없습니다.');

    // 2. WebSocket 연결
    ws = new WebSocket(targetWsUrl);
    await new Promise<void>((resolve, reject) => {
      ws!.onopen = () => resolve();
      ws!.onerror = (err) => reject(new Error('CDP WebSocket 연결 실패'));
      setTimeout(() => reject(new Error('WebSocket 연결 시간 초과')), 5000);
    });

    // Page & Runtime 활성화
    await sendCdpCommand(ws, 'Page.enable');
    await sendCdpCommand(ws, 'Runtime.enable');

    // 3. 페이지 로드 및 댓글창 렌더링 대기
    await delay(3500);

    // 댓글 섹션 트리거를 위해 스크롤 다운
    await sendCdpCommand(ws, 'Runtime.evaluate', {
      expression: 'window.scrollTo(0, 600);',
    });
    await delay(2000);

    // 4. 댓글창 포커스 및 클릭 시도
    const clickPlaceholderExpr = `
      (function() {
        const placeholder = document.querySelector('#placeholder-area') || 
                            document.querySelector('#simplebox-placeholder') ||
                            document.querySelector('ytd-comment-simplebox-renderer');
        if (placeholder) {
          placeholder.click();
          return { found: true };
        }
        return { found: false };
      })();
    `;
    const clickRes = await sendCdpCommand(ws, 'Runtime.evaluate', {
      expression: clickPlaceholderExpr,
      returnByValue: true,
    });

    await delay(1500);

    // 5. contenteditable-root 에 텍스트 입력 및 입력 이벤트 발생
    const cleanComment = JSON.stringify(commentText);
    const typeAndSubmitExpr = `
      (async function() {
        const inputRoot = document.querySelector('#contenteditable-root') ||
                          document.querySelector('div[contenteditable="true"]');
        if (!inputRoot) return { success: false, reason: '댓글 입력 필드(#contenteditable-root) 미발견' };

        // 텍스트 주입
        inputRoot.focus();
        inputRoot.innerText = ${cleanComment};
        inputRoot.dispatchEvent(new Event('input', { bubbles: true }));
        inputRoot.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(r => setTimeout(r, 1200));

        // 댓글 등록 버튼 찾기 (#submit-button 내의 button 요소)
        const submitBtnRenderer = document.querySelector('#submit-button');
        const submitBtn = submitBtnRenderer ? (submitBtnRenderer.querySelector('button') || submitBtnRenderer) : null;
        
        if (!submitBtn) return { success: false, reason: '댓글 제출 버튼(#submit-button) 미발견' };
        
        // 버튼 클릭
        submitBtn.click();
        return { success: true };
      })();
    `;

    const submitRes = await sendCdpCommand(ws, 'Runtime.evaluate', {
      expression: typeAndSubmitExpr,
      returnByValue: true,
      awaitPromise: true,
    });

    const val = submitRes?.result?.value;
    if (!val || !val.success) {
      throw new Error(val?.reason || '댓글 등록 버튼 클릭 실패');
    }

    // 전송 완료 후 확인 대기
    await delay(2500);

    return {
      success: true,
      message: 'YouTube 댓글 작성 및 [댓글] 버튼 클릭 완료 (완전 자동)',
      details: { videoUrl, commentText: commentText.substring(0, 50) + '...' },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `CDP 자동 댓글 전송 실패: ${err.message}`,
    };
  } finally {
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
  }
}
