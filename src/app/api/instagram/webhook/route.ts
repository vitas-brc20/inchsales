import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Meta 인스타그램 Webhook 인증 토큰 (설정된 환경변수 또는 기본값)
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'inchsales_insta_token_2026';
const INSTAGRAM_PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || '';

/**
 * 1. Meta Webhook 검증 엔드포인트 (GET)
 * Meta for Developers에서 Webhook URL 등록 시 호출됨
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram Webhook] Verify Token 일치 - 인증 성공');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: '인증 실패' }, { status: 403 });
}

/**
 * 2. 실시간 인스타그램 댓글 & 메시지 수신 및 자동 DM 발송 (POST)
 * 릴스/게시물에 사용자가 댓글을 남기면 실시간으로 감지하여 다이렉트 메시지(DM) 발송
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === 'instagram' && body.entry) {
      for (const entry of body.entry) {
        // (1) 댓글(Comments) 이벤트 감지
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'comments') {
              const comment = change.value;
              const commentText = (comment.text || '').toLowerCase();
              const commenterId = comment.from?.id;
              const commentId = comment.id;

              console.log(`[Instagram Comment 감지] 작성자: ${commenterId} | 내용: "${commentText}"`);

              // 구매/링크 관련 키워드 감지
              if (/링크|정보|좌표|얼마|가격|구매|사고싶|쿠키|아이폰|맥북|치약|물미역|트리트먼트|두쫀쿠/.test(commentText)) {
                console.log(`[Instagram Auto-DM 트리거] "${commentText}" 키워드 감지 -> DM 발송 시도`);
                await sendInstagramDM(commenterId, `안녕하세요! 요청하신 상품의 쿠팡 로켓배송 최저가 구매 좌표입니다 👇\nhttps://inchsales.vercel.app/?ch=insta_dm\n\n품절 전에 확인해보세요!`);
              }
            }
          }
        }

        // (2) DM 메시지(Messaging) 수신 이벤트 감지
        if (entry.messaging) {
          for (const messageEvent of entry.messaging) {
            const senderId = messageEvent.sender?.id;
            const messageText = messageEvent.message?.text || '';

            if (senderId && messageText) {
              console.log(`[Instagram DM 수신] 보낸이: ${senderId} | 내용: "${messageText}"`);
              await sendInstagramDM(senderId, `안녕하세요! inchsales 실시간 최저가 링크 안내입니다.\n원하시는 상품을 확인해보세요 👇\nhttps://inchsales.vercel.app/?ch=insta_dm`);
            }
          }
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    return NextResponse.json({ status: 'NOT_INSTAGRAM_EVENT' }, { status: 404 });
  } catch (error) {
    console.error('[Instagram Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * 인스타그램 공식 Send API를 통한 DM 발송 헬퍼 함수
 */
async function sendInstagramDM(recipientId: string, messageText: string) {
  if (!INSTAGRAM_PAGE_ACCESS_TOKEN) {
    console.warn('[Instagram Send API] INSTAGRAM_PAGE_ACCESS_TOKEN이 설정되지 않아 모의 발송 로그로 기록됩니다.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${INSTAGRAM_PAGE_ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
      }),
    });

    const data = await res.json();
    console.log('[Instagram Send API 결과]', data);
  } catch (err) {
    console.error('[Instagram Send API 실패]', err);
  }
}
