'use client';

import React, { useState } from 'react';
import PhoneMockup from './PhoneMockup';
import { Sparkles, Copy, Check, ExternalLink, ArrowRight, DollarSign, BarChart3, Users, Zap, CheckCircle2, Link2, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface StudioProps {
  initialLinks: Array<{
    slug: string;
    productName: string;
    category: string;
    creatorId: string;
    tagline: string;
    originalQueryOrUrl?: string;
    priceHint?: string;
    clicks: number;
    estimatedEarnings: number;
  }>;
}

const CHANNELS = [
  { id: 'insta', name: '인스타그램', shortName: '인스타', icon: '📸', desc: '릴스 / 프로필 링크 / 스토리' },
  { id: 'tiktok', name: '틱톡', shortName: '틱톡', icon: '🎵', desc: '숏폼 영상 / 바이오 링크' },
  { id: 'youtube', name: '유튜브', shortName: '유튜브', icon: '🎬', desc: '쇼츠 고정댓글 / 영상 더보기' },
  { id: 'threads', name: '스레드 / X', shortName: '스레드/X', icon: '🧵', desc: '실시간 피드 포스팅' },
  { id: 'blog', name: '블로그 / 카페', shortName: '블로그', icon: '📝', desc: '리뷰 포스팅 / 커뮤니티' },
  { id: 'general', name: '공통 (통합)', shortName: '공통', icon: '🌐', desc: '기본 통합 링크' },
] as const;

export default function Studio({ initialLinks }: StudioProps) {
  // Form State
  const [productName, setProductName] = useState('코카콜라 제로 355ml 24캔');
  const [category, setCategory] = useState('식음료/음료');
  const [creatorId, setCreatorId] = useState('my_uuid_100');
  const [selectedChannel, setSelectedChannel] = useState<string>('insta');
  const [tagline, setTagline] = useState('칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장');
  const [priceHint, setPriceHint] = useState('19,900원');
  const [queryOrUrl, setQueryOrUrl] = useState('https://link.coupang.com/a/ikoqLZW3zg');

  // UI State
  const [loading, setLoading] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{
    slug: string;
    creatorId: string;
    productName: string;
    channel?: string;
  } | null>({
    slug: '제로콜라',
    creatorId: 'my_uuid_100',
    productName: '코카콜라 제로',
    channel: 'insta',
  });
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [clicksSlider, setClicksSlider] = useState(100);

  const categories = ['간식/디저트', '리빙/자취', '데스크테리어', '뷰티/패션', '주방/생활', '전자기기'];

  const handleSelectPreset = (name: string, cat: string, tag: string, price: string) => {
    setProductName(name);
    setCategory(cat);
    setTagline(tag);
    setPriceHint(price);
    setQueryOrUrl(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('상품명을 입력해주세요!');
      return;
    }

    setLoading(true);

    try {
      const activeCreator = creatorId.trim() || 'creator_' + Math.floor(Math.random() * 8999 + 1000);
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          category,
          creatorId: activeCreator,
          channel: selectedChannel,
          tagline,
          priceHint,
          queryOrUrl: queryOrUrl || productName,
        }),
      });

      const data = await res.json();
      if (data.success && data.link) {
        setCreatedInfo({
          slug: data.link.slug,
          creatorId: activeCreator,
          productName: data.link.productName,
          channel: selectedChannel,
        });
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } else {
        alert(data.error || '링크 생성에 실패했습니다.');
      }
    } catch {
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://inchsales.vercel.app';
  };

  // 포맷 1: ?q=두쫀쿠&id=uuid&ch=insta (사용자 요청 포맷)
  const getQueryUrl = (name: string, id: string, ch?: string) => {
    const base = `${getBaseOrigin()}?q=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`;
    const channel = ch !== undefined ? ch : selectedChannel;
    return channel && channel !== 'general' ? `${base}&ch=${channel}` : base;
  };

  // 포맷 2: /p/slug?ref=uuid&ch=insta (경로형 포맷)
  const getPathUrl = (slug: string, id: string, ch?: string) => {
    const base = `${getBaseOrigin()}/p/${encodeURIComponent(slug)}?ref=${encodeURIComponent(id)}`;
    const channel = ch !== undefined ? ch : selectedChannel;
    return channel && channel !== 'general' ? `${base}&ch=${channel}` : base;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const estimatedTotal = Math.round(clicksSlider * 28);
  const creatorEarnings = Math.round(estimatedTotal * 0.7);
  const platformEarnings = estimatedTotal - creatorEarnings;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="pt-12 pb-14 px-4 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100/80 text-blue-700 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
          <span>하위 레퍼러 네트워크 • 인플루언서별 고유 ID 자동 추적</span>
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
          동일한 핫딜 상품, <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            인플루언서마다 고유 링크(?id=uuid)
          </span>
          로 정산
        </h1>
        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          상품 하나를 등록하면 수백 명의 크리에이터가 각자의 추천인 ID가 담긴 고유 URL을 발급받아 홍보합니다. <br className="hidden sm:inline" />
          누가 추천했는지 쿠팡 subId로 100% 추적되어 수수료의 70%가 자동 정산됩니다.
        </p>

        {/* Feature Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-1.5 font-mono text-[11px]">
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>?q=두쫀쿠&id=uuid</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-1.5 font-mono text-[11px]">
            <Link2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>/p/ddu-zon-cookie?ref=uuid</span>
          </div>
        </div>
      </section>

      {/* Main Studio Workstation (Split View) */}
      <section id="generator" className="py-8 px-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            
            {/* Left Column: Input Form (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      추천인 고유 링크 발급기
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      상품과 인플루언서 ID만 정하면 URL에 추천인 정보가 즉시 담깁니다.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                    실시간 추적 ON
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="my-6">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    🔥 인기 상품 템플릿 선택:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('코카콜라 제로 355ml 24캔', '식음료/음료', '칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장', '19,900원')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors font-bold flex items-center gap-1 shadow-xs"
                    >
                      🥤 코카콜라 제로
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('두바이 쫀득 쿠키 (두쫀쿠)', '간식/디저트', '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기', '16,900원')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors font-medium flex items-center gap-1"
                    >
                      🍪 두바이 쫀득 쿠키
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('충전식 미니 데스크 무선 청소기', '리빙/자취', '릴스에서 문의 폭주했던 책상 위 지우개똥/먼지 청소기', '12,500원')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors font-medium flex items-center gap-1"
                    >
                      🧹 미니 청소기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('원목 접이식 노트북 거치대', '데스크테리어', '목디스크 탈출! 감성 데스크테리어 필수템', '24,900원')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 transition-colors font-medium flex items-center gap-1"
                    >
                      💻 접이식 거치대
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Creator ID / Referrer parameter */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>추천인 / 인플루언서 고유 식별자 (id / ref)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-600 font-semibold">URL에 담기는 값</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">@</span>
                      <input
                        type="text"
                        required
                        value={creatorId}
                        onChange={(e) => setCreatorId(e.target.value)}
                        placeholder="예: jisu_log 또는 uuid_123"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-blue-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-white font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1.5">
                      이 ID로 유입된 모든 클릭과 쿠팡 구매 실적이 개별 인플루언서에게 귀속됩니다.
                    </p>

                    {/* Channel Segmentation Tabs */}
                    <div className="mt-4 pt-3.5 border-t border-blue-100/90">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                          <span>📢 유입 채널별 분기 설정</span>
                          <span className="text-[10px] font-normal text-blue-600">(인스타 / 틱톡 / 유튜브 등)</span>
                        </span>
                        <span className="text-[10px] font-mono text-blue-700 bg-white/90 px-2 py-0.5 rounded border border-blue-200">
                          {selectedChannel === 'general' ? '통합' : `&ch=${selectedChannel}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {CHANNELS.map((ch) => {
                          const isSelected = selectedChannel === ch.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setSelectedChannel(ch.id)}
                              className={`px-2 py-2 rounded-xl text-center flex flex-col items-center justify-center gap-0.5 transition-all text-xs ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30 ring-2 ring-blue-600/20'
                                  : 'bg-white/80 hover:bg-white text-slate-700 border border-blue-100/80 font-medium'
                              }`}
                            >
                              <span className="text-sm">{ch.icon}</span>
                              <span className="text-[11px]">{ch.shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        선택한 채널에 따라 링크에 <code className="text-blue-700 font-mono font-bold bg-white px-1 py-0.5 rounded">&ch={selectedChannel}</code>가 자동 부여되어, 쿠팡 subId에서도 <strong>인스타 vs 틱톡 vs 유튜브</strong> 유입 전환율을 100% 분리 분석합니다.
                      </p>
                    </div>
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      상품명 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="예: 두바이 쫀득 쿠키 (두쫀쿠)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* Category & Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        카테고리
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-sm bg-slate-50/50 focus:bg-white"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        참고 가격 (선택)
                      </label>
                      <input
                        type="text"
                        value={priceHint}
                        onChange={(e) => setPriceHint(e.target.value)}
                        placeholder="예: 16,900원"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      추천 한 줄 코멘트
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="예: 틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <span>링크 생성 중...</span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>인플루언서 고유 추천 링크 발급하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Generated Success Card: Showing BOTH formats */}
                {createdInfo && (
                  <div className="mt-6 p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>추천인 식별코드가 담긴 링크가 준비되었습니다</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        ID: {createdInfo.creatorId}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Format 1: Query String Format (q & id) */}
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1 text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            포맷 1. 쿼리 파라미터 URL (요청하신 형태)
                          </span>
                          <span className="text-[10px] text-blue-600 font-mono">?q=...&id=...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getQueryUrl(createdInfo.productName, createdInfo.creatorId)}
                            className="flex-1 text-xs text-slate-700 font-mono px-2 py-1 bg-slate-50 rounded outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(getQueryUrl(createdInfo.productName, createdInfo.creatorId), 'query')}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
                          >
                            {copiedType === 'query' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedType === 'query' ? '복사됨!' : '복사'}
                          </button>
                        </div>
                      </div>

                      {/* Format 2: Path Format (/p/slug?ref=uuid) */}
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1 text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            포맷 2. 슬러그 단축 URL
                          </span>
                          <span className="text-[10px] text-indigo-600 font-mono">/p/slug?ref=...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getPathUrl(createdInfo.slug, createdInfo.creatorId)}
                            className="flex-1 text-xs text-slate-700 font-mono px-2 py-1 bg-slate-50 rounded outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(getPathUrl(createdInfo.slug, createdInfo.creatorId), 'path')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                          >
                            {copiedType === 'path' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedType === 'path' ? '복사됨!' : '복사'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Platform Tailored Quick Copy Grid */}
                    <div className="mt-3 pt-3 border-t border-emerald-200/70">
                      <span className="text-[11px] font-extrabold text-emerald-950 block mb-2 flex items-center justify-between">
                        <span>🚀 주요 SNS 채널별 즉시 복사 (개별 파라미터 자동 적용)</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">채널별 클릭 분리 추적</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CHANNELS.filter(c => c.id !== 'general').map((ch) => {
                          const chUrl = getPathUrl(createdInfo.slug, createdInfo.creatorId, ch.id);
                          const isCopied = copiedType === `ch_${ch.id}`;
                          return (
                            <div key={ch.id} className="bg-white p-2 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base">{ch.icon}</span>
                                <div className="truncate">
                                  <span className="text-[11px] font-bold text-slate-800 block truncate">{ch.name}</span>
                                  <span className="text-[9.5px] text-slate-400 font-mono block truncate">{ch.desc}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(chUrl, `ch_${ch.id}`)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? '복사됨!' : '링크 복사'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* FTC & Anti-Spam Compliance Guidelines */}
                    <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold flex items-center gap-1.5 text-amber-900">
                          ⚖️ 크리에이터 필수 준수 사항 (공정위 & 스팸방지)
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">필독</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">
                          1. SNS 본문/캡션 필수 기재 문구 (원클릭 복사):
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-slate-800 font-medium text-[11px] select-all leading-tight">
                            "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.', 'ftc')}
                            className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] shrink-0 transition-colors"
                          >
                            {copiedType === 'ftc' ? '복사됨!' : '문구 복사'}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-900/80 leading-relaxed">
                        <strong>2. 불법 스팸 전송 금지:</strong> 수신자의 사전 동의를 얻지 않은 무단 메신저/SNS 스팸 DM 전송은 관련 법령에 따라 과태료 및 형사 처벌 대상이 될 수 있습니다.
                      </p>
                    </div>

                    {/* Action Links */}
                    <div className="mt-3.5 flex items-center justify-between text-xs font-semibold pt-2 border-t border-emerald-200/60">
                      <Link
                        href={getQueryUrl(createdInfo.productName, createdInfo.creatorId)}
                        target="_blank"
                        className="text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                      >
                        구매자 화면 열기 <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/d/${createdInfo.slug}?ref=${createdInfo.creatorId}&ch=${createdInfo.channel || selectedChannel}`}
                        className="text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        내 실시간 수익 대시보드 <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Figma Mobile Mockup (5 cols) */}
            <div className="lg:col-span-5 p-6 sm:p-10 bg-slate-50/60 flex flex-col items-center justify-center">
              <PhoneMockup
                productName={productName}
                category={category}
                creatorId={creatorId}
                channel={selectedChannel}
                tagline={tagline}
                priceHint={priceHint}
                slug={createdInfo?.slug || 'preview'}
              />
            </div>

          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="simulator" className="py-14 px-4 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold mb-4">
              <DollarSign className="w-3.5 h-3.5" />
              <span>실시간 수익 계산기</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              내 릴스 영상으로 얼마를 벌 수 있을까?
            </h3>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              조회수 대비 링크 클릭 수에 따른 예상 정산금을 확인해보세요. (쿠팡 3% 커미션 중 70%를 크리에이터에게 정산)
            </p>

            <div className="mt-8">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-semibold text-slate-300">월간 예상 클릭 수</span>
                <span className="text-xl font-black text-blue-400">{clicksSlider.toLocaleString()}회 클릭</span>
              </div>
              <input
                type="range"
                min="10"
                max="3000"
                step="10"
                value={clicksSlider}
                onChange={(e) => setClicksSlider(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium block">총 발생 매출 추정액</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  약 {(clicksSlider * 18000 * 0.035).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900/60 to-blue-800/40 border border-blue-500/40 relative">
                <span className="text-xs text-blue-200 font-medium block">크리에이터 예상 정산금 (70%)</span>
                <span className="text-2xl sm:text-3xl font-black text-blue-300 mt-1 block">
                  {creatorEarnings.toLocaleString()}원
                </span>
                <span className="text-[11px] text-blue-200/70 mt-1 block">
                  {creatorEarnings >= 100 ? '✅ 100원 이상 즉시 출금 가능' : '100원부터 정산'}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium block">inchsales 플랫폼 수익 (30%)</span>
                <span className="text-2xl font-black text-slate-300 mt-1 block">
                  {platformEarnings.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section id="trending" className="py-14 px-4 max-w-5xl mx-auto border-t border-slate-200/60">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              🔥 공통 큐레이션 상품 둘러보기
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              원하는 상품을 골라 내 ID만 붙여서 바로 홍보할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {initialLinks.map((item) => (
            <div
              key={item.slug}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.slug}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.productName}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.tagline}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">전체 누적 클릭</span>
                  <span className="text-xs font-bold text-slate-900">{item.clicks}회</span>
                </div>
                <button
                  onClick={() => {
                    setProductName(item.productName);
                    setCategory(item.category);
                    setTagline(item.tagline);
                    setPriceHint(item.priceHint || '15,000원');
                    setQueryOrUrl(item.originalQueryOrUrl || item.productName);
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  내 링크로 쓰기
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-slate-200/60 bg-white text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-sm">inchsales</span>
            <span>•</span>
            <span>크리에이터를 위한 마이크로 커머스 서브 어필리에이트</span>
          </div>
          <div className="text-[11px] text-slate-400">
            쿠팡 파트너스 공식 subId 규정에 따라 추천인별 실적이 실시간 집계됩니다.
          </div>
        </div>
      </footer>
    </div>
  );
}
