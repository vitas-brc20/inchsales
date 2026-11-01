export interface ProductItem {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  queryOrUrl: string;
  priceHint?: string;
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
  tagline: string;
  originalQueryOrUrl: string;
  coupangUrl: string;
  subId: string;
  clicks: number;
  estimatedEarnings: number;
  priceHint?: string;
  createdAt: string;
}

export interface CreateLinkPayload {
  productName: string;
  category?: string;
  creatorId: string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  customSlug?: string;
}
