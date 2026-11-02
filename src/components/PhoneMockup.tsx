'use client';

import React from 'react';
import { ExternalLink, ShieldCheck, ShoppingCart, Zap, Heart } from 'lucide-react';
import ProductVisual from './ProductVisual';

interface PhoneMockupProps {
  productName: string;
  category: string;
  creatorId: string;
  channel?: string;
  tagline: string;
  priceHint: string;
  slug: string;
}

export default function PhoneMockup({
  productName,
  category,
  creatorId,
  channel,
  tagline,
  priceHint,
  slug,
}: PhoneMockupProps) {
  const displayTitle = productName || '두바이 쫀득 쿠키 (두쫀쿠)';
  const displayCategory = category || '간식/디저트';
  const displayCreator = creatorId ? `@${creatorId}` : '@tiktok_sweet';
  const displayTagline = tagline || '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기';
  const displayPrice = priceHint || '16,900원';
  const channelBadge = channel === 'insta' ? '📸 인스타' : channel === 'tiktok' ? '🎵 틱톡' : channel === 'youtube' ? '🎬 유튜브' : channel === 'threads' ? '🧵 스레드' : channel === 'blog' ? '📝 블로그' : '';

  return (
    <div className="w-full max-w-[340px] mx-auto">
      {/* Figma Mobile Device Frame */}
      <div className="relative rounded-[44px] p-3 bg-slate-900 shadow-2xl shadow-slate-900/20 border-4 border-slate-800 ring-1 ring-slate-950/50">
        {/* Dynamic Island / Speaker */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-20 flex items-center justify-end pr-2">
          <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* Inner Screen */}
        <div className="relative rounded-[34px] overflow-hidden bg-slate-50 min-h-[580px] flex flex-col justify-between text-slate-900 text-xs font-sans pb-4">
          
          {/* Top Status Bar Mock */}
          <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-100 bg-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px]">5G</span>
              <div className="w-4 h-2 rounded-sm border border-slate-300 relative flex items-center p-0.5">
                <div className="w-full h-full bg-slate-800 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Screen Content */}
          <div className="p-4 flex-1 flex flex-col gap-3">
            
            {/* Creator Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white shadow-xs border border-slate-100 w-fit">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold">
                {displayCreator.substring(1, 2).toUpperCase()}
              </div>
              <span className="font-semibold text-slate-700 text-[11px]">{displayCreator}</span>
              {channelBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {channelBadge}
                </span>
              )}
              <span className="text-slate-300 text-[9px]">•</span>
              <span className="text-blue-600 font-medium text-[10px]">추천템</span>
            </div>

            {/* Product Card */}
            <div className="rounded-2xl bg-white border border-slate-100 p-3.5 shadow-sm flex flex-col gap-3">
              {/* Category & Tag */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                  {displayCategory}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">
                  <Zap className="w-2.5 h-2.5 fill-rose-500" />
                  실시간 화제
                </span>
              </div>

              {/* Product Visual Mock */}
              <div className="relative">
                <ProductVisual productName={displayTitle} category={displayCategory} className="w-full h-36" />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs p-1 rounded-full text-slate-400 shadow-xs">
                  <Heart className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Title & Tagline */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                  {displayTitle}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {displayTagline}
                </p>
              </div>

              {/* Price & Rocket Delivery Badge */}
              <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 line-through mr-1">정가 대비</span>
                  <span className="font-extrabold text-sm text-slate-900">{displayPrice}</span>
                </div>
                <span className="text-[9px] font-black tracking-tight text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                  🚀 로켓배송
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="w-full py-3 px-4 rounded-xl bg-[#0074E9] hover:bg-blue-600 text-white font-bold text-center text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer">
              <span>쿠팡에서 최저가 확인하기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-2 text-[9px] text-slate-400 text-center">
              <span className="flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> 쿠팡 공식 연동
              </span>
              <span>•</span>
              <span>무료반품 가능</span>
            </div>
          </div>

          {/* Bottom Legal Notice (FTC Guidelines) */}
          <div className="px-4 text-[8px] text-slate-500 text-center leading-tight font-medium">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </div>

        </div>
      </div>
      
      {/* Live Preview Label */}
      <div className="mt-3 text-center">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          팔로워에게 보이는 실제 모바일 화면
        </span>
      </div>
    </div>
  );
}
