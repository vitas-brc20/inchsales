'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, TrendingUp, CheckCircle2, Settings, ExternalLink, ShieldCheck } from 'lucide-react';
import { getCoupangTrackingId } from '@/lib/coupang';

export default function Header() {
  const [modalOpen, setModalOpen] = useState(false);
  const [trackingId, setTrackingId] = useState(getCoupangTrackingId());

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm group-hover:bg-blue-600 transition-colors">
              1"
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                inch<span className="text-blue-600">sales</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">크리에이터 쇼핑 링크</span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#simulator" className="hover:text-slate-900 transition-colors">
              수익 계산기
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              정산 방식
            </a>
            <a href="#trending" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              화제의 템
            </a>
          </nav>

          {/* Action Button & Coupang Status */}
          <div className="flex items-center gap-3">
            {/* Coupang Partners Status Badge */}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E1251B] text-xs font-semibold border border-rose-200/80 transition-colors cursor-pointer"
              title="쿠팡 파트너스 연동 정보"
            >
              <span className="w-2 h-2 rounded-full bg-[#E1251B] animate-ping" />
              <span className="font-bold">쿠팡 파트너스 연동됨</span>
            </button>

            <a
              href="#generator"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              링크 만들기
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Coupang Partners Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E1251B] flex items-center justify-center font-black text-sm">
                  C
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">쿠팡 파트너스 공식 연동 상태</h3>
                  <span className="text-[10px] text-slate-400">Coupang Partners Official Gateway</span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">공식 트래킹 ID (AF코드)</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {trackingId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">연동 방식</span>
                  <span className="font-semibold text-emerald-600">공식 파트너스 리디렉션 게이트웨이</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">하위 추천인 식별 (subId)</span>
                  <span className="font-semibold text-blue-600">실시간 동적 주입</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900 mb-1">🔗 공식 딥링크 게이트웨이 규격 작동 원리:</p>
                <p className="text-[11px] text-blue-800">
                  구매자가 버튼을 누르면 <br />
                  <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded text-blue-950 block my-1">
                    https://link.coupang.com/re/AFFSRCH?lptag={trackingId}&subid=inch_...
                  </code>
                  공식 도메인을 경유하여 쿠팡 앱/웹으로 이동하므로 쿠팡 파트너스 시스템에 매출이 100% 정상 집계됩니다.
                </p>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                <p className="font-bold text-amber-900 mb-1">⚖️ 공정거래위원회 필수 표기 안내:</p>
                <p className="text-[11px] text-amber-900 leading-tight">
                  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
                </p>
                <p className="text-[10px] text-amber-800/80 mt-1">
                  모든 구매자 페이지 및 랜딩 화면에 위 법적 고지 문구가 자동으로 필수 표기됩니다.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
