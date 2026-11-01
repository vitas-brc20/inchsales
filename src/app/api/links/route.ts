import { NextResponse } from 'next/server';
import { getAllLinks, createProductLink } from '@/lib/storage';
import { CreateLinkPayload } from '@/lib/types';

export async function GET() {
  const links = getAllLinks();
  return NextResponse.json({ success: true, links });
}

export async function POST(request: Request) {
  try {
    const body: CreateLinkPayload = await request.json();

    if (!body.productName || body.productName.trim() === '') {
      return NextResponse.json(
        { success: false, error: '상품명을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const created = createProductLink(body);
    return NextResponse.json({ success: true, link: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
