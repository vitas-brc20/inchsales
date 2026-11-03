import { NextResponse } from 'next/server';
import { getPostedCommentRecords } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const comments = getPostedCommentRecords(100);
    return NextResponse.json({
      success: true,
      count: comments.length,
      comments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '댓글 목록 조회 실패' },
      { status: 500 }
    );
  }
}
