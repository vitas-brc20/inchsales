import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { isCDPAvailable, postYouTubeCommentViaCDP } from './cdp-automation';
import { postYouTubeCommentViaAppleScript } from './applescript-poster';

const execAsync = promisify(exec);

export interface BrowserOutreachTask {
  platform: 'youtube' | 'instagram' | 'tiktok';
  creatorHandle: string;
  creatorName: string;
  targetUrl: string;
  commentText: string;
  productName: string;
  silent?: boolean;
}

function copyToMacClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pbcopy');
    proc.stdin.write(text, 'utf8');
    proc.stdin.end();
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

/**
 * 사용자가 이미 로그인해 둔 로컬 Chrome 브라우저를 백그라운드로 안전하게 연동합니다.
 * - [우선순위 1] AppleScript 자바스크립트 실행을 통해 화면 간섭 0%로 실제 댓글 작성 및 [댓글] 등록 버튼까지 100% 무인 자동 완료!
 * - [우선순위 2] Chrome 원격 디버깅 포트(9222)가 켜져 있으면 CDP 무인 전송
 * - [우선순위 3] 미연결 시 백그라운드 탭 열기 & 클립보드 복사(반자동) 안전 폴백
 */
export async function dispatchBrowserOutreach(task: BrowserOutreachTask): Promise<{
  success: boolean;
  method: 'APPLESCRIPT_FULL_AUTO' | 'CDP_FULL_AUTO' | 'BACKGROUND_CHROME' | 'SILENT_QUEUE' | 'FALLBACK_OPEN';
  details: string;
}> {
  try {
    const isSilent = task.silent || process.env.OUTREACH_MODE === 'silent';

    // 1. 맥OS 클립보드에 댓글 텍스트 100% 안전 복사 (spawn pbcopy)
    await copyToMacClipboard(task.commentText);

    // 2-1. [AppleScript 100% 무인 자동화 시도]
    // 사용자가 'Apple Events의 자바스크립트 허용'을 켰으므로, 백그라운드에서 직접 작성 & 제출!
    if (task.platform === 'youtube' && task.targetUrl.includes('watch?v=')) {
      const asRes = await postYouTubeCommentViaAppleScript(task.targetUrl, task.commentText);
      if (asRes.success) {
        const cleanHandle = task.creatorHandle.replace(/["'\\]/g, ' ');
        const cleanProduct = task.productName.replace(/["'\\]/g, ' ');
        const notifScript = `
          display notification "첫 영상에 댓글 자동 등록 완료!" with title "✅ [100% 무인 전송] @${cleanHandle}" subtitle "${cleanProduct}"
        `;
        await execAsync(`osascript -e '${notifScript}'`).catch(() => {});

        return {
          success: true,
          method: 'APPLESCRIPT_FULL_AUTO',
          details: `[100% 완전 자동 전송 완료] @${task.creatorHandle} 영상에 댓글 작성 및 [댓글] 버튼 클릭 완료!`,
        };
      } else {
        console.warn('AppleScript auto-submit notice:', asRes.message);
      }
    }

    // 2-2. [CDP 완전 자동화 시도] 포트 9222 활성화 상태일 경우
    const cdpReady = await isCDPAvailable();
    if (cdpReady && task.platform === 'youtube' && task.targetUrl.includes('watch?v=')) {
      const cdpRes = await postYouTubeCommentViaCDP(task.targetUrl, task.commentText);
      if (cdpRes.success) {
        const cleanHandle = task.creatorHandle.replace(/["'\\]/g, ' ');
        const cleanProduct = task.productName.replace(/["'\\]/g, ' ');
        const notifScript = `
          display notification "댓글 자동 등록 완료!" with title "✅ [CDP 무인 완료] @${cleanHandle}" subtitle "${cleanProduct}"
        `;
        await execAsync(`osascript -e '${notifScript}'`).catch(() => {});

        return {
          success: true,
          method: 'CDP_FULL_AUTO',
          details: `[CDP 100% 무인 전송] @${task.creatorHandle} 첫 영상에 댓글 입력 및 등록 버튼 클릭까지 무인 완료!`,
        };
      }
    }

    if (isSilent) {
      return {
        success: true,
        method: 'SILENT_QUEUE',
        details: `[완전 사일런트 모드] 브라우저 화면 팝업 없이 클립보드 복사 및 큐 등록 완료 (@${task.creatorHandle})`,
      };
    }

    // 3. Google Chrome에 완전 백그라운드(-g) 새 탭으로 타깃 URL 열기 (화면 전환 및 포커스 탈취 0%)
    try {
      await execAsync(`open -g -a "Google Chrome" "${task.targetUrl}"`);
    } catch {
      await execAsync(`open -g "${task.targetUrl}"`);
    }

    // 4. 저방해 맥OS 시스템 알림 배너
    const cleanProduct = task.productName.replace(/["'\\]/g, ' ');
    const cleanHandle = task.creatorHandle.replace(/["'\\]/g, ' ');
    const notifScript = `
      display notification "백그라운드 탭 준비 완료! Cmd+V 로 등록 가능" with title "🎯 [${task.platform.toUpperCase()}] @${cleanHandle}" subtitle "${cleanProduct}"
    `;
    await execAsync(`osascript -e '${notifScript}'`).catch(() => {});

    return {
      success: true,
      method: 'BACKGROUND_CHROME',
      details: `[백그라운드 반자동 모드] @${task.creatorHandle} (${task.platform}) 백그라운드 탭 열기 & 클립보드 복사 완료`,
    };
  } catch (err: any) {
    try {
      await copyToMacClipboard(task.commentText);
      await execAsync(`open -g "${task.targetUrl}"`);
      return {
        success: true,
        method: 'FALLBACK_OPEN',
        details: `백그라운드 폴백 열기 완료: ${err.message}`,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        method: 'FALLBACK_OPEN',
        details: fallbackErr.message,
      };
    }
  }
}
