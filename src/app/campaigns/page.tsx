'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ExternalLink, RefreshCw, Sparkles, MessageCircle, Share2, ShieldCheck, Zap } from 'lucide-react';
import Header from '@/components/Header';

interface CampaignItem {
  campaignId: string;
  generatedAt: string;
  targetProduct: string;
  targetSlug: string;
  trackingId: string;
  localLandingUrl: string;
  directCoupangUrl: string;
  socialPosts: {
    threads: string;
    twitterX: string;
    instagramCaption: string;
    kakaoTalkShare: string;
  };
  systemStats: {
    totalClicks: number;
    totalWithdrawals: number;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                로컬 30분 무인 마케팅 봇 가동 중
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              로컬 바이럴 마케팅 런처
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              30분마다 자동 발굴되는 타깃 핫딜과 플랫폼별 바이럴 홍보 텍스트를 원클릭으로 복사해 바로 고객을 유치하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCampaigns}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Campaign List */}
        {campaigns.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-500">생성된 마케팅 캠페인이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {campaigns.map((camp, idx) => (
              <div
                key={camp.campaignId}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8"
              >
                {/* Campaign Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{camp.targetProduct}</h2>
                      <span className="text-[11px] text-slate-400">
                        생성 시각: {new Date(camp.generatedAt).toLocaleTimeString()} • 쿠팡 ID: {camp.trackingId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={camp.localLandingUrl}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>로컬 랜딩페이지 열기</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Social Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {/* Threads Post */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>🧵 스레드 (Threads) 추천 포스팅</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          공정위 문구 포함
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts.threads}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleCopy(camp.socialPosts.threads, `${camp.campaignId}_threads`)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `${camp.campaignId}_threads` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_threads` ? '복사 완료!' : '스레드 본문 1초 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Twitter / X Post */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>🐦 X (트위터) 숏폼 카피</span>
                        </span>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                          후킹 문구
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts.twitterX}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleCopy(camp.socialPosts.twitterX, `${camp.campaignId}_x`)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `${camp.campaignId}_x` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_x` ? '복사 완료!' : '트위터 본문 1초 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Instagram Story / Reels Caption */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>📸 인스타 릴스 캡션 & 스토리</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts.instagramCaption}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleCopy(camp.socialPosts.instagramCaption, `${camp.campaignId}_insta`)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `${camp.campaignId}_insta` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_insta` ? '복사 완료!' : '인스타 캡션 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* KakaoTalk Share */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>💬 카카오톡 단톡방 공유용</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts.kakaoTalkShare}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleCopy(camp.socialPosts.kakaoTalkShare, `${camp.campaignId}_kakao`)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `${camp.campaignId}_kakao` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_kakao` ? '복사 완료!' : '카톡 공유문구 복사'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Warning */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 공정위 심사지침 준수 문구 포함
                  </span>
                  <span>단독 링크: {camp.localLandingUrl}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
