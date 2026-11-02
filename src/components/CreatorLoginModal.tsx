'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle2,
  ExternalLink,
  Copy,
  LogOut,
  Sparkles,
} from 'lucide-react';

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

interface CreatorLinkItem {
  slug: string;
  productName: string;
  clicks: number;
  estimatedEarnings: number;
  lastClickAt?: string;
}

interface CreatorOverviewData {
  creatorId: string;
  totalClicks: number;
  totalEarnings: number;
  withdrawableEarnings: number;
  withdrawnAmount: number;
  links: CreatorLinkItem[];
}

interface CreatorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHandle?: string;
}

export default function CreatorLoginModal({ isOpen, onClose, initialHandle }: CreatorLoginModalProps) {
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const [handleInput, setHandleInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loggedInHandle, setLoggedInHandle] = useState<string | null>(null);
  const [overview, setOverview] = useState<CreatorOverviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // 출금 신청 폼 상태
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountInfo, setAccountInfo] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에 저장된 이전 로그인 정보 복구
    const saved = localStorage.getItem('inch_creator_login');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.handle) {
          setLoggedInHandle(parsed.handle);
          setPlatform(parsed.platform || 'youtube');
          fetchOverview(parsed.handle);
        }
      } catch {
        // ignore
      }
    } else if (initialHandle) {
      setHandleInput(initialHandle);
    }
  }, [initialHandle]);

  const fetchOverview = async (rawHandle: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const cleanHandle = rawHandle.trim();
      const res = await fetch(`/api/creators/overview?handle=${encodeURIComponent(cleanHandle)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOverview(data.overview);
        setLoggedInHandle(data.handle);
        localStorage.setItem(
          'inch_creator_login',
          JSON.stringify({ handle: data.handle, platform })
        );
      } else {
        setErrorMsg(data.error || '수익 정보를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) {
      setErrorMsg('아이디 또는 채널 핸들을 입력해주세요.');
      return;
    }
    fetchOverview(handleInput);
  };

  const handleLogout = () => {
    localStorage.removeItem('inch_creator_login');
    setLoggedInHandle(null);
    setOverview(null);
    setHandleInput('');
    setWithdrawSuccess(false);
  };

  const handleCopyLink = (slug: string) => {
    const url = `https://inch.sale/p/${encodeURIComponent(slug)}?ref=${encodeURIComponent(loggedInHandle || '')}&ch=${platform}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInHandle || !overview) return;
    const amount = Number(withdrawAmount) || overview.withdrawableEarnings;

    if (amount < 100) {
      alert('최소 출금 가능 금액은 100원입니다.');
      return;
    }
    if (amount > overview.withdrawableEarnings) {
      alert('출금 가능 금액을 초과했습니다.');
      return;
    }
    if (!accountInfo.trim()) {
      alert('토스 아이디 또는 입금받으실 계좌번호를 입력해주세요.');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: loggedInHandle,
          slug: overview.links[0]?.slug || 'general',
          productName: '크리에이터 누적 수익금 출금',
          amount,
          accountInfo: accountInfo.trim(),
        }),
      });

      if (res.ok) {
        setWithdrawSuccess(true);
        setWithdrawAmount('');
        setAccountInfo('');
        // 스탯 새로고침
        await fetchOverview(loggedInHandle);
      } else {
        const err = await res.json();
        alert(err.error || '출금 신청 중 오류가 발생했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              1"
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                크리에이터 수익 대시보드
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  실시간 연동
                </span>
              </h3>
              <p className="text-xs text-slate-300">유튜브 · 틱톡 · 인스타 활동으로 모인 수익을 100원부터 즉시 출금하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!loggedInHandle ? (
            /* 로그인 / 핸들 입력 폼 */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. 활동 중인 SNS 플랫폼 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatform('youtube')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      platform === 'youtube'
                        ? 'border-red-500 bg-red-50 text-red-600 shadow-sm ring-2 ring-red-100'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <YoutubeIcon className="w-4 h-4 text-red-500" />
                    유튜브
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('tiktok')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      platform === 'tiktok'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-200'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    틱톡
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('instagram')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                      platform === 'instagram'
                        ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-sm ring-2 ring-pink-100'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <InstagramIcon className="w-4 h-4 text-pink-500" />
                    인스타그램
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. 채널 핸들 / 아이디 입력 (@ 포함 가능)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="예: @미소학개론 또는 @Twentyninebilly"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <div className="absolute right-3 top-3 px-2 py-1 bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                    @특수문자 지원
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  * 유튜브 댓글, 릴스 링크 등에 사용된 본인의 채널 아이디를 입력하시면 실시간 누적 클릭과 정산액을 즉시 불러옵니다.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  '실적 집계 중...'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />내 수익 및 실적 바로 확인하기
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 로그인 완료 후 대시보드 뷰 */
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {loggedInHandle.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-base">
                        @{loggedInHandle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {platform.toUpperCase()} 파트너
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">채널 전용 고유 식별코드로 수익이 100% 안전하게 누적 중입니다</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  로그아웃
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>누적 유입 클릭</span>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {(overview?.totalClicks || 0).toLocaleString()}
                    <span className="text-xs font-semibold text-slate-500 ml-1">회</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>총 발생 수익</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-600">
                    {(overview?.totalEarnings || 0).toLocaleString()}
                    <span className="text-xs font-semibold text-slate-500 ml-1">원</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
                    <span>즉시 출금 가능</span>
                    <Wallet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-blue-700">
                    {(overview?.withdrawableEarnings || 0).toLocaleString()}
                    <span className="text-xs font-semibold text-blue-500 ml-1">원</span>
                  </div>
                </div>
              </div>

              {/* 출금 신청 섹션 */}
              <div className="p-5 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-slate-50 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    100원부터 토스/계좌로 즉시 출금
                  </h4>
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    수수료 0원
                  </span>
                </div>

                {withdrawSuccess ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    출금 신청이 정상 접수되었습니다! 담당자 확인 후 1영업일 내 토스/계좌로 입금됩니다.
                  </div>
                ) : (
                  <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="100"
                        max={overview?.withdrawableEarnings || 0}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder={`출금액 (최대 ${overview?.withdrawableEarnings || 0}원)`}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={accountInfo}
                        onChange={(e) => setAccountInfo(e.target.value)}
                        placeholder="토스아이디 or 은행명 계좌번호"
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingWithdraw || (overview?.withdrawableEarnings || 0) < 100}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40"
                    >
                      {isSubmittingWithdraw ? '신청 중...' : '출금 신청하기'}
                    </button>
                  </form>
                )}
              </div>

              {/* 발급된 상품 링크 리스트 */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  내 채널 전용 상품 링크 ({overview?.links.length || 0}개)
                </h4>
                {overview?.links && overview.links.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {overview.links.map((link) => (
                      <div
                        key={link.slug}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {link.productName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            클릭 <strong className="text-blue-600">{link.clicks}회</strong> · 수익{' '}
                            <strong className="text-emerald-600">{link.estimatedEarnings.toLocaleString()}원</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopyLink(link.slug)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedSlug === link.slug ? '복사됨!' : '링크 복사'}
                          </button>
                          <a
                            href={`https://inch.sale/p/${encodeURIComponent(link.slug)}?ref=${encodeURIComponent(loggedInHandle)}&ch=${platform}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-xs text-slate-500">아직 등록된 전용 링크가 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      메인 화면의 링크 만들기에서 상품 링크를 생성하시면 자동으로 여기에 등록됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
