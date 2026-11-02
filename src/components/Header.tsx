'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';

export default function Header() {
  return (
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

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="/#simulator" className="hover:text-slate-900 transition-colors">
            수익 계산기
          </a>
          <a href="/#how-it-works" className="hover:text-slate-900 transition-colors">
            정산 방식
          </a>
          <a href="/#trending" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            화제의 템
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
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
  );
}
