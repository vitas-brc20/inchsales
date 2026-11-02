export type ChannelType = 'insta' | 'tiktok' | 'youtube' | 'threads' | 'blog' | 'kakao' | 'general';

export interface ChannelStat {
  clicks: number;
  estimatedEarnings: number;
  lastClickAt: string;
}

export interface ProductItem {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  queryOrUrl: string;
  priceHint?: string;
  imageUrl?: string;
  iframeUrl?: string;
  totalClicks: number;
  createdAt: string;
}

export interface CreatorStat {
  creatorId: string;
  slug: string;
  productName: string;
  clicks: number;
  estimatedEarnings: number;
  lastClickAt: string;
  channelStats?: Record<string, ChannelStat>;
}

export interface WithdrawalRequest {
  id: string;
  creatorId: string;
  slug: string;
  productName: string;
  amount: number;
  accountInfo: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: string;
  processedAt?: string;
}

export interface ProductLink {
  slug: string;
  productName: string;
  category: string;
  creatorId: string;
  channel?: ChannelType | string;
  tagline: string;
  originalQueryOrUrl: string;
  coupangUrl: string;
  subId: string;
  clicks: number;
  estimatedEarnings: number;
  priceHint?: string;
  imageUrl?: string;
  iframeUrl?: string;
  channelStats?: Record<string, ChannelStat>;
  createdAt: string;
}

export interface CreateLinkPayload {
  productName: string;
  category?: string;
  creatorId: string;
  channel?: ChannelType | string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  imageUrl?: string;
  iframeUrl?: string;
  customSlug?: string;
}
