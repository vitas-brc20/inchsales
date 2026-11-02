'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, TrendingUp, CheckCircle2, Settings, ExternalLink, ShieldCheck, Key, Zap } from 'lucide-react';
import { getCoupangTrackingId } from '@/lib/coupang';

export default function Header() {
  const [modalOpen, setModalOpen] = useState(false);
  const [trackingId, setTrackingId] = useState(getCoupangTrackingId());
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [hasKeys, setHasKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetch('/api/coupang/keys')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.trackingId) setTrackingId(d.trackingId);
          setHasKeys(d.hasAccessKey && d.hasSecretKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/coupang/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, secretKey, trackingId }),
      });
      const data = await res.json();
      if (data.success) {
        setHasKeys(Boolean(accessKey && secretKey));
        setSaveMessage('✅ 쿠팡 파트너스 API 자동화가 활성화되었습니다!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch {
      setSaveMessage('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

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
            <Link href="/campaigns" className="hover:text-blue-700 transition-colors flex items-center gap-1.5 font-bold text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>로컬 마케팅 런처</span>
            </Link>
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

          {/* Action Button & Coupang Status */}
          <div className="flex items-center gap-3">
            {/* Coupang Partners Status Badge */}
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E1251B] text-xs font-semibold border border-rose-200/80 transition-colors cursor-pointer"
              title="쿠팡 파트너스 자동화 설정"
            >
              <span className="w-2 h-2 rounded-full bg-[#E1251B] animate-ping" />
              <span className="font-bold">쿠팡 파트너스 {hasKeys ? 'API 자동화 ON' : '연동됨'}</span>
              <Settings className="w-3 h-3 ml-0.5 opacity-60" />
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E1251B] flex items-center justify-center font-black text-sm">
                  C
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">쿠팡 파트너스 100% 자동화 설정</h3>
                  <span className="text-[10px] text-slate-400">Official Coupang Partners Automation Engine</span>
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
              {/* Status Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">연동 ID (AF코드)</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {trackingId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">자동화 상태</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {hasKeys ? 'Open API 공식 단축 링크 실시간 생성' : '공식 파트너스 게이트웨이 자동 생성'}
                  </span>
                </div>
              </div>

              {/* API Key Form for Full Automation */}
              <form onSubmit={handleSaveKeys} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>파트너스 Open API 키 등록 (선택)</span>
                  </span>
                  <a
                    href="https://partners.coupang.com/#affiliate/ws/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    키 발급받기 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  쿠팡 콘솔에서 발급받은 키를 넣으시면, 수작업 복사 없이 <code>link.coupang.com/a/...</code> 공식 단축 링크를 시스템이 0.1초 만에 자동 발급합니다.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Access Key</label>
                  <input
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Secret Key</label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="쿠팡 파트너스 시크릿 키"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-blue-600 bg-white"
                  />
                </div>

                {saveMessage && (
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                    {saveMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {saving ? '저장 중...' : 'API 키 저장 및 자동화 적용'}
                </button>
              </form>

              {/* Legal Notice */}
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
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
