import { NextResponse } from 'next/server';
import { createWithdrawalRequestAsync, getWithdrawalsByCreatorAsync, getAllWithdrawals } from '@/lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const creator = searchParams.get('creator');

  if (creator) {
    const list = await getWithdrawalsByCreatorAsync(creator);
    return NextResponse.json({ success: true, withdrawals: list });
  }

  const all = getAllWithdrawals();
  return NextResponse.json({ success: true, withdrawals: all });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorId, slug, productName, amount, accountInfo } = body;

    if (!creatorId || !accountInfo || !accountInfo.trim()) {
      return NextResponse.json(
        { success: false, error: '추천인 ID와 입금받을 계좌/토스 아이디를 입력해주세요.' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return NextResponse.json(
        { success: false, error: '최소 출금 가능 금액은 100원입니다.' },
        { status: 400 }
      );
    }

    const created = await createWithdrawalRequestAsync({
      creatorId,
      slug: slug || 'general',
      productName: productName || '수수료 정산',
      amount: parsedAmount,
      accountInfo: accountInfo.trim(),
    });

    return NextResponse.json({ success: true, withdrawal: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '출금 신청 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
