import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * macOS AppleScript를 비동기로 안전하게 실행하는 공통 유틸리티
 */
export async function runAppleScript(script: string): Promise<string> {
  const cleanScript = script.trim();
  const escaped = cleanScript.replace(/'/g, "'\\''");
  try {
    const { stdout } = await execAsync(`osascript -e '${escaped}'`, { maxBuffer: 10 * 1024 * 1024 });
    return stdout ? stdout.trim() : '';
  } catch (err: any) {
    throw new Error(`AppleScript Execution Failed: ${err.message}`);
  }
}
