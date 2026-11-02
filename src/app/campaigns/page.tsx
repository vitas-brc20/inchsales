'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Copy, Check, ExternalLink, RefreshCw, Sparkles, 
  ShieldCheck, Settings, Key, CheckCircle2, Lock, Unlock, LogOut 
} from 'lucide-react';
import Header from '@/components/Header';
import { getCoupangTrackingId } from '@/lib/coupang';

interface CampaignItem {
  campaignId: string;
  generatedAt: string;
  targetProduct: string;
  targetSlug: string;
  trackingId: string;
  localLandingUrl: string;
  directCoupangUrl: string;
  matchedCreator?: {
    name: string;
    handle: string;
    category: string;
  } | null;
  targetedCreatorOutreach?: {
    creatorHandle: string;
    creatorName: string;
    creatorCategory: string;
    targetVideoUrl?: string;
    videoTitle?: string;
    ytUrl: string;
    instaUrl: string;
    tiktokUrl?: string;
    statsUrl: string;
    ytComment: string;
    instaComment: string;
    tiktokComment?: string;
    instaDm: string;
    apiPublishStatus?: {
      youtube?: { status: string; success: boolean };
      instagram?: { status: string; success: boolean };
      tiktok?: { status: string; success: boolean };
    };
  } | null;
  socialPosts: {
    naverBlog?: { title: string; content: string } | string;
    youtubeShorts?: { script: string; pinnedComment: string } | string;
    community?: { title: string; content: string } | string;
    telegramChannel?: string;
    threads?: string;
    twitterX?: string;
    instagramCaption?: string;
    kakaoTalkShare?: string;
  };
  systemStats: {
    totalClicks: number;
    totalWithdrawals: number;
  };
}

export default function CampaignsPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Coupang Partners Settings Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [trackingId, setTrackingId] = useState(getCoupangTrackingId());
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [hasKeys, setHasKeys] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('inch_admin_pin');
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (savedPin === 'qwer1234!' || isLocalhost) {
      setIsAuthorized(true);
      fetchKeys(savedPin || 'qwer1234!');
      fetchCampaigns();
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === 'qwer1234!') {
      localStorage.setItem('inch_admin_pin', 'qwer1234!');
      setIsAuthorized(true);
      setAuthError('');
      fetchKeys('qwer1234!');
      fetchCampaigns();
    } else {
      setAuthError('올바른 관리자 비밀번호를 입력해주세요.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inch_admin_pin');
    setIsAuthorized(false);
    setPinInput('');
  };

  const fetchKeys = (pin: string) => {
    fetch(`/api/coupang/keys?pin=${encodeURIComponent(pin)}`, {
      headers: { 'x-admin-pin': pin }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.trackingId) setTrackingId(d.trackingId);
          setHasKeys(d.hasAccessKey && d.hasSecretKey);
        }
      })
      .catch(() => {});
  };

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

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setSaveMessage('');

    const pin = localStorage.getItem('inch_admin_pin') || 'qwer1234!';

    try {
      const res = await fetch('/api/coupang/keys', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify({ accessKey, secretKey, trackingId }),
      });
      const data = await res.json();
      if (data.success) {
        setHasKeys(Boolean(accessKey && secretKey));
        setSaveMessage('✅ 쿠팡 파트너스 설정이 안전하게 저장되었습니다!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(data.error || '설정 저장에 실패했습니다.');
      }
    } catch {
      setSaveMessage('설정 저장 중 통신 에러가 발생했습니다.');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getBlogText = (post?: { title: string; content: string } | string) => {
    if (!post) return '';
    if (typeof post === 'string') return post;
    return `[제목] ${post.title}\n\n${post.content}`;
  };

  const getYoutubeText = (post?: { script: string; pinnedComment: string } | string) => {
    if (!post) return '';
    if (typeof post === 'string') return post;
    return `🎬 [15초 숏폼 영상 대본]\n${post.script}\n\n📌 [고정 댓글]\n${post.pinnedComment}`;
  };

  const getCommunityText = (post?: { title: string; content: string } | string) => {
    if (!post) return '';
    if (typeof post === 'string') return post;
    return `[제목] ${post.title}\n\n${post.content}`;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admin PIN Gate Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl mx-auto mb-5 border border-rose-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-center text-white tracking-tight">관리자 전용 접근 제한</h2>
          <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
            쿠팡 파트너스 연동 키 설정 및 마케팅 런처는 관리자만 접근할 수 있습니다.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">관리자 인증 비밀번호</label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-white outline-none focus:border-blue-500"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-400 font-medium text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              관리자 로그인
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← 일반 사용자 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authorized Admin View
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
                관리자 모드 · 30분 무인 마케팅 봇 가동 중
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              로컬 바이럴 마케팅 & 파트너스 콘솔
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              쿠팡 파트너스 공식 AF코드와 30분마다 자동 발굴되는 타깃 핫딜 바이럴 홍보 텍스트를 안전하게 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Coupang Partners Modal Trigger Button (Admin Only) */}
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E1251B] border border-rose-200/80 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="쿠팡 파트너스 연동 관리"
            >
              <Settings className="w-4 h-4" />
              <span>쿠팡 파트너스 설정 ({trackingId})</span>
            </button>

            <button
              onClick={fetchCampaigns}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center gap-1 transition-colors"
              title="관리자 로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Channel Distribution Status Banner */}
        <div className="mb-8 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🌐 가동 중인 6대 공식 다채널 홍보 엔진</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  30분 주기 자동 생성 중
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                채널별(블로그, 숏폼, 커뮤니티, 메신저 등) 최적화된 바이럴 카피와 실시간 성과 추적 파라미터(&amp;ch=...)가 자동 발급됩니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
              <span className="text-xl mb-1">📝</span>
              <span className="text-xs font-black text-slate-900">네이버 블로그</span>
              <span className="text-[10px] text-slate-500">SEO 후기 &amp; 정보성 원고</span>
              <span className="text-[9px] font-mono text-emerald-700 font-bold mt-1">&amp;ch=blog</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 flex flex-col justify-between">
              <span className="text-xl mb-1">🎬</span>
              <span className="text-xs font-black text-slate-900">유튜브 쇼츠 &amp; 틱톡</span>
              <span className="text-[10px] text-slate-500">15초 영상 대본 &amp; 고정댓글</span>
              <span className="text-[9px] font-mono text-rose-700 font-bold mt-1">&amp;ch=youtube</span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col justify-between">
              <span className="text-xl mb-1">⚡</span>
              <span className="text-xs font-black text-slate-900">핫딜 커뮤니티</span>
              <span className="text-[10px] text-slate-500">뽐뿌·펨코·당근마켓</span>
              <span className="text-[9px] font-mono text-purple-700 font-bold mt-1">&amp;ch=community</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
              <span className="text-xl mb-1">📢</span>
              <span className="text-xs font-black text-slate-900">카톡 &amp; 텔레그램</span>
              <span className="text-[10px] text-slate-500">오픈채팅 실시간 특가알림</span>
              <span className="text-[9px] font-mono text-amber-700 font-bold mt-1">&amp;ch=kakao</span>
            </div>
            <div className="p-3 rounded-2xl bg-pink-50/50 border border-pink-100 flex flex-col justify-between">
              <span className="text-xl mb-1">📸</span>
              <span className="text-xs font-black text-slate-900">인스타그램</span>
              <span className="text-[10px] text-slate-500">릴스 캡션 &amp; 스토리 스티커</span>
              <span className="text-[9px] font-mono text-pink-700 font-bold mt-1">&amp;ch=insta</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100/70 border border-slate-200 flex flex-col justify-between">
              <span className="text-xl mb-1">🧵</span>
              <span className="text-xs font-black text-slate-900">스레드 &amp; 𝕏</span>
              <span className="text-[10px] text-slate-500">바이럴 썰 &amp; 숏폼 피드</span>
              <span className="text-[9px] font-mono text-slate-800 font-bold mt-1">&amp;ch=threads</span>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        {campaigns.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-500">생성된 마케팅 캠페인이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {campaigns.map((camp) => (
              <div
                key={camp.campaignId}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Campaign Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {camp.campaignId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(camp.generatedAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mt-1">
                      {camp.targetProduct}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={camp.directCoupangUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-[#E1251B] hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1 border border-rose-200"
                    >
                      <span>쿠팡 직행</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={camp.localLandingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>바이어 랜딩 열기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 30-min Target Creator Matched Outreach Section */}
                {camp.targetedCreatorOutreach && (
                  <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200/90 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                        <span>🎯 30분 사이클 타겟 크리에이터 매칭:</span>
                        <span className="text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-purple-200 font-bold">
                          @{camp.targetedCreatorOutreach.creatorHandle} ({camp.targetedCreatorOutreach.creatorName})
                        </span>
                        <span className="text-[10px] text-purple-700 font-semibold bg-purple-100/70 px-1.5 py-0.5 rounded">
                          {camp.targetedCreatorOutreach.creatorCategory} 카테고리 엄격 매칭
                        </span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-600 font-bold">선발급 ref 자동 연동</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      {/* YouTube Comment */}
                      <div className="bg-white p-2.5 rounded-lg border border-red-100 flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[11px] font-bold text-red-900 flex items-center gap-1">
                            <span>🎬</span> 유튜브 댓글
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(camp.targetedCreatorOutreach?.ytComment || '', `yt_out_${camp.campaignId}`)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center gap-1"
                            >
                              {copiedKey === `yt_out_${camp.campaignId}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              <span>{copiedKey === `yt_out_${camp.campaignId}` ? '복사됨' : '복사'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(camp.targetedCreatorOutreach?.ytComment || '', `yt_out_${camp.campaignId}`);
                                const ytUrl = camp.targetedCreatorOutreach?.targetVideoUrl || (camp.targetedCreatorOutreach?.creatorHandle ? `https://www.youtube.com/@${encodeURIComponent(camp.targetedCreatorOutreach.creatorHandle)}/videos` : 'https://www.youtube.com');
                                window.open(ytUrl, '_blank');
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-0.5"
                              title="댓글 복사 + 첫 영상 바로 열기"
                            >
                              <span>🚀 영상 열기</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-600 font-sans line-clamp-2 select-all">
                          {camp.targetedCreatorOutreach.ytComment}
                        </p>
                      </div>

                      {/* Instagram Comment */}
                      <div className="bg-white p-2.5 rounded-lg border border-pink-100 flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[11px] font-bold text-pink-900 flex items-center gap-1">
                            <span>📸</span> 인스타그램 릴스 댓글
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(camp.targetedCreatorOutreach?.instaComment || '', `insta_out_${camp.campaignId}`)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-50 hover:bg-pink-100 text-pink-700 transition-colors flex items-center gap-1"
                            >
                              {copiedKey === `insta_out_${camp.campaignId}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              <span>{copiedKey === `insta_out_${camp.campaignId}` ? '복사됨' : '복사'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(camp.targetedCreatorOutreach?.instaComment || '', `insta_out_${camp.campaignId}`);
                                window.open(`https://www.instagram.com/${encodeURIComponent(camp.targetedCreatorOutreach?.creatorHandle || '')}/`, '_blank');
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity flex items-center gap-0.5"
                              title="댓글 복사 + 인스타그램 새 탭 열기"
                            >
                              <span>🚀 열기</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-600 font-sans line-clamp-2 select-all">
                          {camp.targetedCreatorOutreach.instaComment}
                        </p>
                      </div>

                      {/* TikTok Comment */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                            <span>🎵</span> 틱톡(TikTok) 영상 댓글
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopy(camp.targetedCreatorOutreach?.tiktokComment || '', `tt_out_${camp.campaignId}`)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1"
                            >
                              {copiedKey === `tt_out_${camp.campaignId}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                              <span>{copiedKey === `tt_out_${camp.campaignId}` ? '복사됨' : '복사'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(camp.targetedCreatorOutreach?.tiktokComment || '', `tt_out_${camp.campaignId}`);
                                window.open(`https://www.tiktok.com/@${encodeURIComponent(camp.targetedCreatorOutreach?.creatorHandle || '')}`, '_blank');
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white hover:bg-black transition-colors flex items-center gap-0.5"
                              title="댓글 복사 + 틱톡 새 탭 열기"
                            >
                              <span>🚀 열기</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-600 font-sans line-clamp-2 select-all">
                          {camp.targetedCreatorOutreach.tiktokComment || `@${camp.targetedCreatorOutreach.creatorHandle} 틱톡 영상 보고 구매처 문의 많길래 전용 정산 링크 준비했어요!`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Viral Posts Grid - 6 Major Channels */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {/* 1. Naver Blog / Cafe */}
                  <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                          <span>📝 네이버 블로그/카페 포스팅 원고</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=blog
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {getBlogText(camp.socialPosts?.naverBlog) || '블로그 원고 자동 생성 완료'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-emerald-100">
                      <button
                        onClick={() => handleCopy(getBlogText(camp.socialPosts?.naverBlog), `${camp.campaignId}_blog`)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedKey === `${camp.campaignId}_blog` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_blog` ? '복사 완료!' : '블로그 포스팅 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. YouTube Shorts / TikTok */}
                  <div className="p-4 rounded-2xl bg-rose-50/30 border border-rose-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-rose-950 flex items-center gap-1">
                          <span>🎬 유튜브 쇼츠 / 틱톡 대본 &amp; 댓글</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=youtube
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {getYoutubeText(camp.socialPosts?.youtubeShorts) || '쇼츠 대본 자동 생성 완료'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-rose-100">
                      <button
                        onClick={() => handleCopy(getYoutubeText(camp.socialPosts?.youtubeShorts), `${camp.campaignId}_yt`)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedKey === `${camp.campaignId}_yt` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_yt` ? '복사 완료!' : '쇼츠 대본+댓글 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Hot Deals Community */}
                  <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-purple-950 flex items-center gap-1">
                          <span>⚡ 뽐뿌·펨코·당근 핫딜 포맷</span>
                        </span>
                        <span className="text-[10px] font-mono text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=community
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {getCommunityText(camp.socialPosts?.community) || '커뮤니티 핫딜 자동 생성 완료'}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-purple-100">
                      <button
                        onClick={() => handleCopy(getCommunityText(camp.socialPosts?.community), `${camp.campaignId}_community`)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedKey === `${camp.campaignId}_community` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_community` ? '복사 완료!' : '커뮤니티 핫딜 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. KakaoTalk & Telegram Alert */}
                  <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                          <span>📢 카톡 단톡방 &amp; 텔레그램 알림</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=kakao
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts?.telegramChannel || camp.socialPosts?.kakaoTalkShare || ''}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-amber-100">
                      <button
                        onClick={() => handleCopy(camp.socialPosts?.telegramChannel || camp.socialPosts?.kakaoTalkShare || '', `${camp.campaignId}_kakao`)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `${camp.campaignId}_kakao` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_kakao` ? '복사 완료!' : '실시간 알림톡 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5. Instagram Story / Caption */}
                  <div className="p-4 rounded-2xl bg-pink-50/30 border border-pink-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-pink-950 flex items-center gap-1">
                          <span>📸 인스타그램 릴스/스토리 캡션</span>
                        </span>
                        <span className="text-[10px] font-mono text-pink-700 bg-pink-100/70 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=insta
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts?.instagramCaption || ''}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-pink-100">
                      <button
                        onClick={() => handleCopy(camp.socialPosts?.instagramCaption || '', `${camp.campaignId}_insta`)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-pink-50 border border-pink-200 text-pink-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedKey === `${camp.campaignId}_insta` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_insta` ? '복사 완료!' : '인스타 캡션 복사'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 6. Threads & X */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <span>🧵 Threads &amp; 𝕏 바이럴 피드</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded font-bold">
                          &amp;ch=threads
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {camp.socialPosts?.threads || camp.socialPosts?.twitterX || ''}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleCopy(camp.socialPosts?.threads || camp.socialPosts?.twitterX || '', `${camp.campaignId}_threads`)}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {copiedKey === `${camp.campaignId}_threads` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `${camp.campaignId}_threads` ? '복사 완료!' : '스레드/X 복사'}</span>
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

      {/* Coupang Partners Modal (Restricted to Admin inside Campaigns Console) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E1251B] flex items-center justify-center font-black text-sm">
                  C
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">쿠팡 파트너스 100% 자동화 설정 (관리자)</h3>
                  <span className="text-[10px] text-slate-400">Official Coupang Partners Automation Engine</span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
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
                  disabled={savingKeys}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {savingKeys ? '저장 중...' : 'API 키 저장 및 자동화 적용'}
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
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
