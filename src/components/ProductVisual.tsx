'use client';

import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

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

  const name = (productName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // 1. 헤어 / 바디 (물미역, 모레모, 트리트먼트, 샴푸 등)
  if (name.includes('미역') || name.includes('트리트먼트') || name.includes('헤어') || name.includes('모레모') || cat.includes('헤어') || cat.includes('바디')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100/70 border border-teal-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-teal-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          💇‍♀️
        </div>
        <span className="text-[11px] font-bold text-teal-950 mt-1">10초 물미역 헤어케어</span>
        <span className="text-[9px] text-teal-700/80">실크 머릿결 쿠팡 로켓배송</span>
      </div>
    );
  }

  // 2. 덴탈 / 미백 (뷰센, 치약 등)
  if (name.includes('치약') || name.includes('뷰센') || name.includes('치아') || cat.includes('덴탈') || cat.includes('미백')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100/70 border border-sky-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-sky-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🦷
        </div>
        <span className="text-[11px] font-bold text-sky-950 mt-1">전문 치아미백 케어</span>
        <span className="text-[9px] text-sky-700/80">오스템임플란트 연구진 개발</span>
      </div>
    );
  }

  // 3. 뷰티 / 스킨케어 / 메이크업 (달바, 톤업크림, 코팩 등)
  if (name.includes('달바') || name.includes('세럼') || name.includes('물광') || name.includes('톤업') || name.includes('코팩') || name.includes('크림') || cat.includes('뷰티') || cat.includes('스킨케어') || cat.includes('메이크업')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50/70 border border-pink-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-pink-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          ✨
        </div>
        <span className="text-[11px] font-bold text-rose-950 mt-1">올리브영 1위 뷰티 솔루션</span>
        <span className="text-[9px] text-rose-700/80">도자기 물광 피부 로켓배송</span>
      </div>
    );
  }

  // 4. 디지털 / 애플
  if (name.includes('아이폰') || name.includes('아이패드') || name.includes('맥북') || name.includes('에어팟') || name.includes('apple') || cat.includes('애플')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden text-white`}>
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 shadow-lg flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🍏
        </div>
        <span className="text-[11px] font-black text-slate-100 mt-1">Apple 공식 브랜드관 정품</span>
        <span className="text-[9px] text-slate-400">와우회원 카드할인 로켓배송</span>
      </div>
    );
  }

  // 5. 헬스 / 단백질
  if (name.includes('닭가슴살') || name.includes('프로틴') || name.includes('단백질') || cat.includes('헬스') || cat.includes('단백질')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 border border-amber-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-amber-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          💪
        </div>
        <span className="text-[11px] font-bold text-amber-950 mt-1">식단관리 고단백 특가</span>
        <span className="text-[9px] text-amber-700/80">팩당 최저가 쿠팡 로켓배송</span>
      </div>
    );
  }

  // 6. 캐릭터 / 완구 (치이카와 등)
  if (name.includes('치이카와') || name.includes('인형') || name.includes('먼작귀') || cat.includes('캐릭터') || cat.includes('완구')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50/70 border border-yellow-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-yellow-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🧸
        </div>
        <span className="text-[11px] font-bold text-yellow-950 mt-1">SNS 품절대란 모찌 인형</span>
        <span className="text-[9px] text-yellow-800/80">심쿵 비주얼 정품 로켓배송</span>
      </div>
    );
  }

  // 7. 콜라 / 음료
  if (name.includes('콜라') || name.includes('coke') || name.includes('음료') || name.includes('펩시') || cat.includes('음료')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-rose-950 via-zinc-900 to-black border border-rose-900/50 flex flex-col items-center justify-center relative overflow-hidden text-white`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500/30 shadow-lg flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🥤
        </div>
        <span className="text-[11px] font-black text-rose-300 mt-1">짜릿한 탄산 최저가</span>
        <span className="text-[9px] text-zinc-400">쿠팡 와우회원 로켓배송</span>
      </div>
    );
  }

  // 8. 디저트 / 푸드 (쿠키, 두쫀쿠 등)
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

  // 9. 홈 / 인테리어 & 텀블러
  if (name.includes('크리스마스') || name.includes('트리') || cat.includes('인테리어')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50/70 border border-green-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-green-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          🎄
        </div>
        <span className="text-[11px] font-bold text-emerald-950 mt-1">감성 홀리데이 에디션</span>
        <span className="text-[9px] text-emerald-700/80">프리미엄 리얼 전나무 트리</span>
      </div>
    );
  }

  if (name.includes('텀블러') || name.includes('스타벅스') || cat.includes('텀블러')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50 to-slate-100 border border-teal-200/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-teal-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          ☕
        </div>
        <span className="text-[11px] font-bold text-teal-950 mt-1">스타벅스 시그니처 텀블러</span>
        <span className="text-[9px] text-teal-700/80">한정판 보온보냉 로켓배송</span>
      </div>
    );
  }

  // 10. IT / 가전 / 데스크테리어
  if (name.includes('이어폰') || name.includes('청소기') || name.includes('노트북') || cat.includes('전자') || cat.includes('가전') || cat.includes('데스크')) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-slate-100 via-zinc-100 to-slate-200/80 border border-slate-300/60 flex flex-col items-center justify-center relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-2xl bg-white shadow-md shadow-slate-900/5 flex items-center justify-center text-3xl mb-1 transform hover:scale-105 transition-transform">
          💻
        </div>
        <span className="text-[11px] font-bold text-slate-900 mt-1">스마트 디지털/가전</span>
        <span className="text-[9px] text-slate-500">쿠팡 공식 로켓배송</span>
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
