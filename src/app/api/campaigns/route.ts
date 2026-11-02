import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CAMPAIGN_DIR = path.join(process.cwd(), 'logs', 'campaigns');

export async function GET() {
  try {
    if (!fs.existsSync(CAMPAIGN_DIR)) {
      return NextResponse.json({ success: true, campaigns: [] });
    }

    const files = fs.readdirSync(CAMPAIGN_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10);

    const campaigns = files.map((file) => {
      const content = fs.readFileSync(path.join(CAMPAIGN_DIR, file), 'utf8');
      return JSON.parse(content);
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '캠페인 목록 조회 실패';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
