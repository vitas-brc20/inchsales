import { NextResponse } from 'next/server';
import { getLinkBySlug } from '@/lib/storage';

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const decodedSlug = decodeURIComponent(params.slug);
  const link = getLinkBySlug(decodedSlug);

  if (!link) {
    return NextResponse.json(
      { success: false, error: '링크를 찾을 수 없습니다.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, link });
}
