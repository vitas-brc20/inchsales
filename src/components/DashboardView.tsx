'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductLink } from '@/lib/types';
import { BarChart3, TrendingUp, Users, Copy, Check, ExternalLink, ArrowLeft, DollarSign, Wallet, ShieldCheck, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  link: ProductLink;
}

export default function DashboardView({ link }: DashboardViewProps) {
  const [copied, setCopied] = useState(false);
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [tossIdOrAccount, setTossIdOrAccount] = useState('');
  const [withdrawnSuccess, setWithdrawnSuccess] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [recentWithdrawals, setRecentWithdrawals] = useState<Array<{
    id: string;
    amount: number;
    accountInfo: string;
    status: string;
    createdAt: string;
  }>>([]);

  const creatorShare = Math.round(link.estimatedEarnings * 0.7);

  // 출금 내역 불러오기
  const loadWithdrawals = async () => {
    try {
      const res = await fetch(`/api/withdrawals?creator=${encodeURIComponent(link.creatorId)}`);
      const data = await res.json();
      if (data.success && data.withdrawals) {
        setRecentWithdrawals(data.withdrawals);
      }
    } catch {
      // 무시
    }
  };

  React.useEffect(() => {
    loadWithdrawals();
  }, [link.creatorId]);

  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/p/${link.slug}?ref=${link.creatorId}`;
    }
    return `https://inchsales.vercel.app/p/${link.slug}?ref=${link.creatorId}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getChannelUrl = (channelId: string) => {
    const base = typeof window !== 'undefined'
      ? `${window.location.origin}/p/${encodeURIComponent(link.slug)}?ref=${encodeURIComponent(link.creatorId)}`
      : `https://inchsales.vercel.app/p/${encodeURIComponent(link.slug)}?ref=${encodeURIComponent(link.creatorId)}`;
    return channelId && channelId !== 'general' ? `${base}&ch=${channelId}` : base;
  };

  const handleCopyChannel = (channelId: string) => {
    navigator.clipboard.writeText(getChannelUrl(channelId));
    setCopiedChannel(channelId);
    setTimeout(() => setCopiedChannel(null), 2000);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tossIdOrAccount.trim()) {
      alert('정산받으실 토스 아이디 또는 계좌번호를 입력해주세요.');
      return;
    }
    if (creatorShare < 100) {
      alert('최소 100원 이상 적립되어야 출금 신청이 가능합니다.');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: link.creatorId,
          slug: link.slug,
          productName: link.productName,
          amount: creatorShare,
          accountInfo: tossIdOrAccount.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWithdrawnSuccess(true);
        loadWithdrawals();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        alert(data.error || '출금 신청에 실패했습니다.');
      }
    } catch {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>메인으로 돌아가기</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">실시간 연동 상태: 정상</span>
          </div>
        </div>

        {/* Header Title Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  @{link.creatorId}
                </span>
                <span className="text-xs text-slate-400">전용 파트너스 대시보드</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {link.productName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                고유 식별코드: <span className="font-mono font-medium text-slate-700">{link.subId}</span>
              </p>
            </div>

            {/* Quick Link Share Box */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
              <input
                type="text"
                readOnly
                value={getFullUrl()}
                className="text-xs text-slate-600 font-mono px-2 bg-transparent outline-none select-all w-44 sm:w-56"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>
              <Link
                href={`/p/${link.slug}`}
                target="_blank"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                title="구매자 페이지 미리보기"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          
          {/* Card 1: Clicks */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">누적 링크 클릭</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {link.clicks.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400 ml-1">회</span>
              <p className="text-[11px] text-slate-400 mt-1">팔로워 유입 카운트</p>
            </div>
          </div>

          {/* Card 2: Estimated Total Revenue */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">총 발생 커미션 (쿠팡 3%)</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {link.estimatedEarnings.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400 ml-1">원</span>
              <p className="text-[11px] text-slate-400 mt-1">구매 전환 추정치</p>
            </div>
          </div>

          {/* Card 3: Creator Payout (Hero Card) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-blue-300">내 실정산금 (70%)</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                  즉시 출금 가능
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                {creatorShare.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-300 ml-1">원</span>
              
              <div className="mt-3">
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>100원 이상 출금 신청</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Channel Performance Breakdown Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  채널별 유입 &amp; 정산 성과 분리 분석
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                인스타그램, 틱톡, 유튜브 등 공유 채널별 클릭수와 예상 정산금을 실시간으로 분리 추적합니다.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold w-fit">
              실시간 파라미터 연동
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'insta', name: '인스타그램', desc: '릴스 / 스토리 / 프로필', icon: '📸', color: 'from-pink-500 to-rose-500' },
              { id: 'tiktok', name: '틱톡', desc: '숏폼 영상 / 바이오 링크', icon: '🎵', color: 'from-slate-900 to-zinc-700' },
              { id: 'youtube', name: '유튜브', desc: '쇼츠 고정댓글 / 영상 본문', icon: '🎬', color: 'from-red-600 to-rose-600' },
              { id: 'threads', name: '스레드 / X', desc: '실시간 피드 포스팅', icon: '🧵', color: 'from-indigo-600 to-blue-700' },
              { id: 'blog', name: '블로그 / 카페', desc: '리뷰 글 / 오픈채팅', icon: '📝', color: 'from-emerald-600 to-teal-700' },
              { id: 'general', name: '공통 / 직접 유입', desc: '통합 기본 파라미터', icon: '🌐', color: 'from-blue-600 to-cyan-600' },
            ].map((ch) => {
              const chStat = link.channelStats?.[ch.id] || { clicks: 0, estimatedEarnings: 0 };
              const chShare = Math.round(chStat.estimatedEarnings * 0.7);
              const isCopied = copiedChannel === ch.id;

              return (
                <div key={ch.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ch.icon}</span>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block leading-tight">{ch.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{ch.desc}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">유입 클릭</span>
                      <span className="text-lg font-black text-slate-900">
                        {chStat.clicks.toLocaleString()}
                        <span className="text-xs font-normal text-slate-500 ml-0.5">회</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">예상 정산 (70%)</span>
                      <span className="text-sm font-black text-emerald-600">
                        {chShare.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyChannel(ch.id)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? '전용 링크 복사됨!' : `${ch.name} 전용 링크 복사`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Withdrawal History Card */}
        {recentWithdrawals.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>출금 신청 내역</span>
              </h2>
              <span className="text-xs text-slate-400">총 {recentWithdrawals.length}건</span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentWithdrawals.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{w.amount.toLocaleString()}원</span>
                    <span className="text-slate-400 font-mono text-[11px]">{w.accountInfo}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      w.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {w.status === 'COMPLETED' ? '입금 완료' : '정산 대기중'}
                    </span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promotion Guide / How to share */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-black text-slate-900 tracking-tight mb-2">
            💡 팔로워 구매 전환율을 3배 높이는 팁
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 mt-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">1. 인스타 스토리 링크 스티커 활용</span>
              <p className="leading-relaxed">
                영상 업로드 후 스토리에서 '링크 스티커'를 누르고 <span className="font-mono text-blue-600 font-semibold">{getFullUrl()}</span>를 등록하세요. "영상 속 그 템 최저가" 텍스트를 적어두면 클릭률이 40% 이상 상승합니다.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">2. 릴스 고정 댓글 & 프로필 바이오</span>
              <p className="leading-relaxed">
                댓글 상단에 "제품 좌표는 프로필 링크에 걸어뒀어요!"를 고정해두면 릴스 알고리즘 제재 없이 안전하게 구매 트래픽을 흡수할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Payout Withdrawal Modal */}
        {withdrawModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
              
              {!withdrawnSuccess ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">정산금 출금 신청</h3>
                      <p className="text-xs text-slate-500 mt-0.5">최소 100원부터 토스/계좌로 즉시 신청 가능합니다.</p>
                    </div>
                    <button
                      onClick={() => setWithdrawModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleWithdrawSubmit} className="mt-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">출금 가능 금액</span>
                      <span className="text-xl font-black text-emerald-600">
                        {creatorShare.toLocaleString()}원
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        토스 아이디 또는 입금 계좌번호 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={tossIdOrAccount}
                        onChange={(e) => setTossIdOrAccount(e.target.value)}
                        placeholder="예: toss.me/내아이디 또는 카카오뱅크 3333-..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWithdrawModalOpen(false)}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={withdrawSubmitting}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-colors"
                      >
                        {withdrawSubmitting ? '처리 중...' : '출금 신청 완료'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">정산 신청이 접수되었습니다!</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    입력하신 <span className="font-bold text-slate-800">{tossIdOrAccount}</span>(으)로 <br />
                    <span className="font-extrabold text-emerald-600 text-sm">{creatorShare.toLocaleString()}원</span>이 영업일 기준 순차 입금됩니다.
                  </p>
                  <button
                    onClick={() => {
                      setWithdrawnSuccess(false);
                      setWithdrawModalOpen(false);
                    }}
                    className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    확인
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
