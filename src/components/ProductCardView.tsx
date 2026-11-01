'use client';

import React, { useState } from 'react';
import { ExternalLink, ShieldCheck, ShoppingCart, Zap, Heart, Share2, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductLink } from '@/lib/types';
import ProductVisual from './ProductVisual';

interface ProductCardViewProps {
  link: ProductLink;
}

export default function ProductCardView({ link }: ProductCardViewProps) {
  const [clicked, setClicked] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleClickCoupang = async () => {
    setClicked(true);

    try {
      // 추천인(creatorId) 정보를 함께 넘겨 실시간 실적 집계
      fetch(`/api/links/${encodeURIComponent(link.slug)}/click?creator=${encodeURIComponent(link.creatorId)}`, {
        method: 'POST',
      });
    } catch {
      // 무시
    }

    // 쿠팡으로 즉시 이동 (새 탭 또는 현재 창)
    window.location.href = link.coupangUrl;
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-between py-6 px-4">
      {/* Container (Mobile Optimized) */}
      <div className="w-full max-w-[420px] mx-auto">
        
        {/* Top Mini Bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>inchsales</span>
          </Link>

          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white shadow-xs border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors"
            title="링크 공유"
          >
            {shareCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-200/50 overflow-hidden p-6">
          
          {/* Creator Attribution */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black shadow-xs">
                {link.creatorId.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                  @{link.creatorId}
                </span>
                <span className="text-[10px] text-slate-400">영상 추천 큐레이터</span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {link.category}
            </span>
          </div>

          {/* Product Visual Area */}
          <div className="mt-5 relative">
            <ProductVisual productName={link.productName} category={link.category} className="w-full h-52" />
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
              <Zap className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span className="text-[10px] font-bold text-slate-800">화제의 템</span>
            </div>
          </div>

          {/* Product Details */}
          <div className="mt-5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              {link.productName}
            </h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed font-normal">
              {link.tagline}
            </p>

            {/* Price Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">참고 가격</span>
                <span className="text-base font-black text-slate-900">{link.priceHint || '최저가 확인'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                  🚀 로켓배송 가능
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">와우회원 무료배송</span>
              </div>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="mt-6">
            <button
              onClick={handleClickCoupang}
              disabled={clicked}
              className="w-full py-4 px-6 rounded-2xl bg-[#0074E9] hover:bg-blue-600 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>쿠팡에서 최저가 확인하기</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
              클릭 시 쿠팡 공식 앱 또는 웹사이트로 즉시 연결됩니다.
            </p>
          </div>

          {/* Guarantees */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[11px] font-bold text-slate-700">100% 쿠팡 공식 결제</span>
              <span className="text-[9px] text-slate-400">안전한 카드/간편결제</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-4 h-4 text-blue-600 mb-1" />
              <span className="text-[11px] font-bold text-slate-700">내일 아침 도착 보장</span>
              <span className="text-[9px] text-slate-400">로켓배송 상품 기준</span>
            </div>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="mt-4 px-4 py-3 rounded-2xl bg-white/70 border border-slate-200/60 text-center text-[10px] text-slate-500 leading-tight">
          본 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있으며 구매자에게 추가 비용은 일체 발생하지 않습니다.
        </div>

      </div>

      {/* Footer Branding */}
      <div className="text-center mt-6">
        <Link href="/" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
          <span>Powered by</span>
          <span className="font-extrabold text-slate-700">inchsales</span>
        </Link>
      </div>
    </div>
  );
}
