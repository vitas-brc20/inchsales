'use client';

import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Laptop, Coffee, Home, Heart, Smartphone } from 'lucide-react';

interface ProductVisualProps {
  productName: string;
  category: string;
  imageUrl?: string;
  className?: string;
}

export default function ProductVisual({ productName, category, imageUrl, className = 'w-full h-44' }: ProductVisualProps) {
  const [imgError, setImgError] = useState(false);

  // 실제 쿠팡 CDN 이미지가 있는 경우 우선 렌더링
  if (imageUrl && !imgError) {
    return (
      <div className={`${className} rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center relative overflow-hidden p-2 group`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={productName}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white">
          쿠팡 실물
        </div>
      </div>
    );
  }

  const name = productName.toLowerCase();
  const cat = category.toLowerCase();

  // 0. 콜라 / 음료
  if (name.includes('콜라') || name.includes('coke') || name.includes('음료') || cat.includes('음료')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-rose-950 via-zinc-900 to-black border border-rose-900/50 flex flex-col items-center justify-center relative overflow-hidden text-white`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/30 shadow-lg flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🥤
        </div>
        <span className="text-[11px] font-black text-rose-300 mt-1">코카콜라 제로 로켓배송</span>
        <span className="text-[9px] text-zinc-400">와우회원 무료배송</span>
      </div>
    );
  }

  // 1. 디저트 / 푸드
  if (name.includes('쿠키') || name.includes('두바이') || name.includes('빵') || cat.includes('간식') || cat.includes('디저트')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 border border-amber-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-amber-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🍪
        </div>
        <span className="text-[11px] font-bold text-amber-900 mt-1">두바이 디저트 특가</span>
        <span className="text-[9px] text-amber-700/80">쿠팡 공식 로켓프레시/배송</span>
      </div>
    );
  }

  // 2. 청소기 / 리빙
  if (name.includes('청소기') || name.includes('리빙') || cat.includes('자취') || cat.includes('리빙') || cat.includes('주방')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50/70 border border-blue-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-blue-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🧹
        </div>
        <span className="text-[11px] font-bold text-slate-800 mt-1">자취/살림 꿀템</span>
        <span className="text-[9px] text-slate-500">실시간 재고 연동</span>
      </div>
    );
  }

  // 3. 거치대 / IT / 데스크테리어
  if (name.includes('거치대') || name.includes('노트북') || cat.includes('데스크') || cat.includes('전자')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-slate-100 via-zinc-100 to-slate-200/80 border border-slate-300/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-slate-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          💻
        </div>
        <span className="text-[11px] font-bold text-slate-900 mt-1">데스크테리어 필수템</span>
        <span className="text-[9px] text-slate-500">로켓배송 가능 상품</span>
      </div>
    );
  }

  // 기본 세련된 쇼핑백 룩
  return (
    <div className={`${className} rounded-2xl bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 border border-slate-200/80 flex flex-col items-center justify-center relative overflow-hidden`}>
      <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-slate-900/5 flex items-center justify-center text-blue-600 mb-1">
        <ShoppingBag className="w-8 h-8" />
      </div>
      <span className="text-[11px] font-bold text-slate-800 mt-1">SNS 화제의 추천템</span>
      <span className="text-[9px] text-slate-400">쿠팡 공식 최저가 연동</span>
    </div>
  );
}
