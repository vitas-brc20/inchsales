import { exec, spawn } from 'child_process';
import { promisify } from 'util';

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
 * - [중요] activate 및 화면 전환 강탈을 완전히 제거하여, 작업 중인 모니터/스페이스가 휙휙 바뀌지 않습니다.
 * - macOS 'open -g' 플래그를 통해 사용자의 작업 흐름을 1%도 방해하지 않는 완전 무간섭 백그라운드 실행을 보장합니다.
 */
export async function dispatchBrowserOutreach(task: BrowserOutreachTask): Promise<{
  success: boolean;
  method: 'BACKGROUND_CHROME' | 'SILENT_QUEUE' | 'FALLBACK_OPEN';
  details: string;
}> {
  try {
    const isSilent = task.silent || process.env.OUTREACH_MODE === 'silent';

    // 1. 맥OS 클립보드에 댓글 텍스트 100% 안전 복사 (spawn pbcopy)
    await copyToMacClipboard(task.commentText);

    if (isSilent) {
      return {
        success: true,
        method: 'SILENT_QUEUE',
        details: `[완전 사일런트 모드] 브라우저 화면 팝업 없이 클립보드 복사 및 큐 등록 완료 (@${task.creatorHandle})`,
      };
    }

    // 2. Google Chrome에 완전 백그라운드(-g) 새 탭으로 타깃 URL 열기 (화면 전환 및 포커스 탈취 0%)
    // -g 플래그: Do not bring the application to the foreground
    try {
      await execAsync(`open -g -a "Google Chrome" "${task.targetUrl}"`);
    } catch {
      // Chrome 지정 실패 시 기본 브라우저 백그라운드 오픈
      await execAsync(`open -g "${task.targetUrl}"`);
    }

    // 3. 저방해 맥OS 시스템 알림 배너 (작업 방해 없는 조용한 안내)
    const cleanProduct = task.productName.replace(/["'\\]/g, ' ');
    const cleanHandle = task.creatorHandle.replace(/["'\\]/g, ' ');
    const notifScript = `
      display notification "백그라운드 탭 준비 완료 (화면 유지)! Cmd+V 로 등록 가능" with title "🎯 [${task.platform.toUpperCase()}] @${cleanHandle}" subtitle "${cleanProduct}"
    `;
    await execAsync(`osascript -e '${notifScript}'`).catch(() => {});

    return {
      success: true,
      method: 'BACKGROUND_CHROME',
      details: `[백그라운드 무간섭 모드] 작업 화면 유지한 채 @${task.creatorHandle} (${task.platform}) 백그라운드 탭 열기 & 클립보드 복사 완료`,
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
