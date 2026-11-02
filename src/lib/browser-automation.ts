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
 * 사용자가 이미 로그인해 둔 로컬 Chrome 브라우저를 제어하여
 * 30분마다 해당 크리에이터 영상/채널 탭을 열고 댓글을 클립보드에 자동 복사 및 전송 준비를 수행합니다.
 */
export async function dispatchBrowserOutreach(task: BrowserOutreachTask): Promise<{
  success: boolean;
  method: 'APPLESCRIPT_CHROME' | 'FALLBACK_OPEN';
  details: string;
}> {
  try {
    // 1. 맥OS 클립보드에 댓글 텍스트 100% 안전 복사 (spawn pbcopy)
    await copyToMacClipboard(task.commentText);

    // 2. Google Chrome에 새 탭으로 타깃 URL 열기
    const openAppleScript = `
      tell application "Google Chrome"
        activate
        if (count of windows) is 0 then
          make new window
        end if
        open location "${task.targetUrl}"
      end tell
    `;

    await execAsync(`osascript -e '${openAppleScript}'`);

    // 3. 맥OS 시스템 알림 배너 띄우기
    const cleanProduct = task.productName.replace(/["'\\]/g, ' ');
    const cleanHandle = task.creatorHandle.replace(/["'\\]/g, ' ');
    const notifScript = `
      display notification "클립보드 복사 완료! Cmd + V 누르고 등록하세요." with title "🎯 [${task.platform.toUpperCase()}] @${cleanHandle}" subtitle "${cleanProduct}"
    `;
    await execAsync(`osascript -e '${notifScript}'`);

    return {
      success: true,
      method: 'APPLESCRIPT_CHROME',
      details: `Google Chrome에서 @${task.creatorHandle} (${task.platform}) 페이지 열기 및 댓글 클립보드 복사 완료`,
    };
  } catch (err: any) {
    try {
      await copyToMacClipboard(task.commentText);
      await execAsync(`open "${task.targetUrl}"`);
      return {
        success: true,
        method: 'FALLBACK_OPEN',
        details: `기본 브라우저로 열기 및 클립보드 복사 완료: ${err.message}`,
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
