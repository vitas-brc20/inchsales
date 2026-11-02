import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { ProductItem, CreatorStat, ProductLink, CreateLinkPayload, WithdrawalRequest } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const STATS_FILE = path.join(DATA_DIR, 'creator_stats.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');

// 기본 공유 상품 카탈로그 (인플루언서들이 공통으로 가져다 쓸 수 있는 상품들)
const INITIAL_PRODUCTS: Record<string, ProductItem> = {
  '제로콜라': {
    slug: '제로콜라',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    tagline: '칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장',
    queryOrUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    priceHint: '19,900원 (캔당 820원)',
    totalClicks: 345,
    createdAt: new Date().toISOString(),
  },
  'coca-cola-zero': {
    slug: 'coca-cola-zero',
    name: '코카콜라 제로 355ml 24캔',
    category: '식음료/음료',
    tagline: '칼로리 걱정 없는 짜릿함! 쿠팡 로켓배송 최저가 보장',
    queryOrUrl: 'https://link.coupang.com/a/ikoqLZW3zg',
    priceHint: '19,900원 (캔당 820원)',
    totalClicks: 345,
    createdAt: new Date().toISOString(),
  },
  'ddu-zon-cookie': {
    slug: 'ddu-zon-cookie',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    tagline: '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기',
    queryOrUrl: 'https://link.coupang.com/a/ik4aZWyRZA',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    iframeUrl: 'https://coupa.ng/cqARSd',
    totalClicks: 231,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  '두쫀쿠': {
    slug: '두쫀쿠',
    name: '두바이 쫀득 쿠키 (두쫀쿠)',
    category: '간식/디저트',
    tagline: '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기',
    queryOrUrl: 'https://link.coupang.com/a/ik4aZWyRZA',
    priceHint: '15,280원 (43% 특가 로켓배송)',
    imageUrl: 'https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/stage/manual/a3f17383-2f59-4de5-a98a-41d0176c9553_1774937117592.jpeg',
    iframeUrl: 'https://coupa.ng/cqARSd',
    totalClicks: 231,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
};

const INITIAL_STATS: Record<string, CreatorStat> = {
  'tiktok_sweet:ddu-zon-cookie': {
    creatorId: 'tiktok_sweet',
    slug: 'ddu-zon-cookie',
    productName: '두바이 쫀득 쿠키 (두쫀쿠)',
    clicks: 142,
    estimatedEarnings: 8900,
    lastClickAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
};

// --- 로컬 파일 백업/캐시 헬퍼 ---
function readProducts(): Record<string, ProductItem> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(INITIAL_PRODUCTS, null, 2), 'utf8');
      return { ...INITIAL_PRODUCTS };
    }
    const content = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return { ...INITIAL_PRODUCTS, ...JSON.parse(content) };
  } catch {
    return { ...INITIAL_PRODUCTS };
  }
}

function writeProducts(data: Record<string, ProductItem>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write products file:', e);
  }
}

function readStats(): Record<string, CreatorStat> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STATS_FILE)) {
      fs.writeFileSync(STATS_FILE, JSON.stringify(INITIAL_STATS, null, 2), 'utf8');
      return { ...INITIAL_STATS };
    }
    const content = fs.readFileSync(STATS_FILE, 'utf8');
    return { ...INITIAL_STATS, ...JSON.parse(content) };
  } catch {
    return { ...INITIAL_STATS };
  }
}

function writeStats(data: Record<string, CreatorStat>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write stats file:', e);
  }
}

function readWithdrawals(): Record<string, WithdrawalRequest> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(WITHDRAWALS_FILE)) {
      fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify({}, null, 2), 'utf8');
      return {};
    }
    const content = fs.readFileSync(WITHDRAWALS_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeWithdrawals(data: Record<string, WithdrawalRequest>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write withdrawals file:', e);
  }
}

import { buildCoupangLinkWithRef } from './coupang';
export { buildCoupangLinkWithRef };

// --- Supabase 비동기 I/O (실패 시 로컬 파일로 자동 Fallback) ---

export async function getAllProductsAsync(): Promise<ProductItem[]> {
  try {
    const { data, error } = await supabase
      .from('inch_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        slug: d.slug,
        name: d.name,
        category: d.category || '트렌드/핫템',
        tagline: d.tagline || '',
        queryOrUrl: d.query_or_url,
        priceHint: d.price_hint,
        totalClicks: d.total_clicks || 0,
        createdAt: d.created_at,
      }));
    }
  } catch {
    // Supabase fallback
  }

  return getAllProducts();
}

export function getAllProducts(): ProductItem[] {
  const products = readProducts();
  return Object.values(products).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProductBySlugOrQueryAsync(slugOrQuery: string): Promise<ProductItem | null> {
  const normalized = slugOrQuery.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('inch_products')
      .select('*')
      .or(`slug.eq.${normalized},name.ilike.%${normalized}%,query_or_url.ilike.%${normalized}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        slug: data.slug,
        name: data.name,
        category: data.category || '트렌드/핫템',
        tagline: data.tagline || '',
        queryOrUrl: data.query_or_url,
        priceHint: data.price_hint,
        totalClicks: data.total_clicks || 0,
        createdAt: data.created_at,
      };
    }
  } catch {
    // Fallback
  }

  return getProductBySlugOrQuery(slugOrQuery);
}

export function getProductBySlugOrQuery(slugOrQuery: string): ProductItem | null {
  const products = readProducts();
  const normalized = slugOrQuery.trim().toLowerCase();

  if (products[normalized]) return products[normalized];

  for (const item of Object.values(products)) {
    if (
      item.slug.toLowerCase() === normalized ||
      item.name.toLowerCase().includes(normalized) ||
      item.queryOrUrl.toLowerCase() === normalized
    ) {
      return item;
    }
  }

  return null;
}

export async function upsertProductAsync(payload: {
  name: string;
  category?: string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  customSlug?: string;
}): Promise<ProductItem> {
  const localItem = upsertProduct(payload);

  try {
    await supabase.from('inch_products').upsert({
      slug: localItem.slug,
      name: localItem.name,
      category: localItem.category,
      tagline: localItem.tagline,
      query_or_url: localItem.queryOrUrl,
      price_hint: localItem.priceHint,
      total_clicks: localItem.totalClicks,
      created_at: localItem.createdAt,
    });
  } catch {
    // ignore
  }

  return localItem;
}

export function upsertProduct(payload: {
  name: string;
  category?: string;
  tagline?: string;
  queryOrUrl?: string;
  priceHint?: string;
  customSlug?: string;
}): ProductItem {
  const products = readProducts();

  let slug = (payload.customSlug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!slug) {
    const matched = getProductBySlugOrQuery(payload.name);
    if (matched) return matched;
    slug = payload.name.trim().toLowerCase().replace(/[^a-z0-9가-힣_-]/g, '-');
    if (!slug) {
      slug = 'item-' + Math.random().toString(36).substring(2, 8);
    }
  }

  if (products[slug]) {
    return products[slug];
  }

  const newProduct: ProductItem = {
    slug,
    name: payload.name.trim(),
    category: payload.category || '트렌드/핫템',
    tagline: payload.tagline?.trim() || `SNS에서 화제된 '${payload.name}' 최저가 구매 좌표`,
    queryOrUrl: payload.queryOrUrl?.trim() || payload.name.trim(),
    priceHint: payload.priceHint?.trim() || '쿠팡 최저가',
    totalClicks: 0,
    createdAt: new Date().toISOString(),
  };

  products[slug] = newProduct;
  writeProducts(products);

  return newProduct;
}

export function normalizeChannel(raw?: string): string {
  if (!raw) return 'general';
  const c = raw.trim().toLowerCase();
  if (['insta', 'instagram', 'ig', 'reels', 'story'].includes(c)) return 'insta';
  if (['tiktok', 'tt', 'tok'].includes(c)) return 'tiktok';
  if (['youtube', 'yt', 'shorts'].includes(c)) return 'youtube';
  if (['threads', 'th', 'twitter', 'x'].includes(c)) return 'threads';
  if (['blog', 'cafe', 'naver'].includes(c)) return 'blog';
  if (['kakao', 'kakaotalk', 'chat'].includes(c)) return 'kakao';
  return 'general';
}

// 클릭 기록 (Supabase + Local 동기화)
export async function recordReferralClickAsync(slugOrQuery: string, creatorId: string, channelInput?: string) {
  const channel = normalizeChannel(channelInput);
  const res = recordReferralClick(slugOrQuery, creatorId, channel);

  try {
    // Supabase inch_products total_clicks 증가
    await supabase
      .from('inch_products')
      .update({ total_clicks: res.product.totalClicks })
      .eq('slug', res.product.slug);

    // Supabase inch_creator_stats upsert
    const statKey = `${res.creatorStat.creatorId}:${res.product.slug}`;
    await supabase.from('inch_creator_stats').upsert({
      id: statKey,
      creator_id: res.creatorStat.creatorId,
      slug: res.product.slug,
      product_name: res.product.name,
      clicks: res.creatorStat.clicks,
      estimated_earnings: res.creatorStat.estimatedEarnings,
      last_click_at: res.creatorStat.lastClickAt,
    });
  } catch {
    // fallback
  }

  return res;
}

export function recordReferralClick(slugOrQuery: string, creatorId: string, channelInput?: string): {
  product: ProductItem;
  creatorStat: CreatorStat;
  redirectUrl: string;
} {
  let product = getProductBySlugOrQuery(slugOrQuery);
  if (!product) {
    product = upsertProduct({ name: slugOrQuery });
  }

  const safeCreator = (creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '') || 'anonymous';
  const channel = normalizeChannel(channelInput);
  const statKey = `${safeCreator}:${product.slug}`;

  const products = readProducts();
  if (products[product.slug]) {
    products[product.slug].totalClicks += 1;
    writeProducts(products);
  }

  const stats = readStats();
  const current = stats[statKey] || {
    creatorId: safeCreator,
    slug: product.slug,
    productName: product.name,
    clicks: 0,
    estimatedEarnings: 0,
    lastClickAt: new Date().toISOString(),
    channelStats: {},
  };

  current.clicks += 1;
  current.estimatedEarnings = Math.round(current.clicks * 35);
  current.lastClickAt = new Date().toISOString();

  if (!current.channelStats) {
    current.channelStats = {};
  }
  const chData = current.channelStats[channel] || {
    clicks: 0,
    estimatedEarnings: 0,
    lastClickAt: new Date().toISOString(),
  };
  chData.clicks += 1;
  chData.estimatedEarnings = Math.round(chData.clicks * 35);
  chData.lastClickAt = new Date().toISOString();
  current.channelStats[channel] = chData;

  stats[statKey] = current;
  writeStats(stats);

  const redirectUrl = buildCoupangLinkWithRef(product.queryOrUrl, safeCreator, product.slug, channel);

  return { product, creatorStat: current, redirectUrl };
}

// 출금 신청 (Supabase + Local)
export async function createWithdrawalRequestAsync(params: {
  creatorId: string;
  slug: string;
  productName: string;
  amount: number;
  accountInfo: string;
}): Promise<WithdrawalRequest> {
  const req = createWithdrawalRequest(params);

  try {
    await supabase.from('inch_withdrawals').insert({
      id: req.id,
      creator_id: req.creatorId,
      slug: req.slug,
      product_name: req.productName,
      amount: req.amount,
      account_info: req.accountInfo,
      status: req.status,
      created_at: req.createdAt,
    });
  } catch {
    // fallback
  }

  return req;
}

export function createWithdrawalRequest(params: {
  creatorId: string;
  slug: string;
  productName: string;
  amount: number;
  accountInfo: string;
}): WithdrawalRequest {
  const withdrawals = readWithdrawals();
  const id = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const request: WithdrawalRequest = {
    id,
    creatorId: params.creatorId,
    slug: params.slug,
    productName: params.productName,
    amount: params.amount,
    accountInfo: params.accountInfo.trim(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  withdrawals[id] = request;
  writeWithdrawals(withdrawals);

  return request;
}

export async function getWithdrawalsByCreatorAsync(creatorId: string): Promise<WithdrawalRequest[]> {
  try {
    const { data, error } = await supabase
      .from('inch_withdrawals')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        creatorId: d.creator_id,
        slug: d.slug,
        productName: d.product_name,
        amount: d.amount,
        accountInfo: d.account_info,
        status: d.status,
        createdAt: d.created_at,
        processedAt: d.processed_at,
      }));
    }
  } catch {
    // fallback
  }

  return getWithdrawalsByCreator(creatorId);
}

export function getWithdrawalsByCreator(creatorId: string): WithdrawalRequest[] {
  const withdrawals = readWithdrawals();
  const safeCreator = (creatorId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return Object.values(withdrawals)
    .filter((w) => w.creatorId === safeCreator)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllWithdrawals(): WithdrawalRequest[] {
  const withdrawals = readWithdrawals();
  return Object.values(withdrawals).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// 인터페이스 호환 래퍼들
export function getAllLinks(): ProductLink[] {
  const products = getAllProducts();
  const stats = readStats();

  return products.map((p) => {
    const stat = Object.values(stats).find((s) => s.slug === p.slug);
    const creatorId = stat?.creatorId || 'official';
    return {
      slug: p.slug,
      productName: p.name,
      category: p.category,
      creatorId,
      tagline: p.tagline,
      originalQueryOrUrl: p.queryOrUrl,
      coupangUrl: buildCoupangLinkWithRef(p.queryOrUrl, creatorId, p.slug),
      subId: `inch_${creatorId}_${p.slug}`,
      clicks: p.totalClicks,
      estimatedEarnings: stat?.estimatedEarnings || Math.round(p.totalClicks * 35),
      priceHint: p.priceHint,
      createdAt: p.createdAt,
    };
  });
}

export function getLinkBySlug(slug: string, refCreator?: string, channelInput?: string): ProductLink | null {
  let product = getProductBySlugOrQuery(slug);
  if (!product) {
    // 요청된 상품명이 카탈로그에 없는 경우, 실시간 온디맨드로 바로 생성
    product = upsertProduct({
      name: slug,
      category: '트렌드/핫템',
      tagline: `${slug} - 쿠팡 최저가 로켓배송 실시간 재고 확인`,
      queryOrUrl: slug,
    });
  }

  const creatorId = refCreator || 'official';
  const channel = normalizeChannel(channelInput);
  const statKey = `${creatorId}:${product.slug}`;
  const stats = readStats();
  const stat = stats[statKey];

  const subId = channel && channel !== 'general'
    ? `inch_${creatorId}_${channel}_${product.slug}`
    : `inch_${creatorId}_${product.slug}`;

  return {
    slug: product.slug,
    productName: product.name,
    category: product.category,
    creatorId,
    channel,
    tagline: product.tagline,
    originalQueryOrUrl: product.queryOrUrl,
    coupangUrl: buildCoupangLinkWithRef(product.queryOrUrl, creatorId, product.slug, channel),
    subId,
    clicks: stat?.clicks || product.totalClicks,
    estimatedEarnings: stat?.estimatedEarnings || Math.round(product.totalClicks * 35),
    priceHint: product.priceHint,
    imageUrl: product.imageUrl,
    iframeUrl: product.iframeUrl,
    channelStats: stat?.channelStats,
    createdAt: product.createdAt,
  };
}

export function createProductLink(payload: CreateLinkPayload): ProductLink {
  const product = upsertProduct({
    name: payload.productName,
    category: payload.category,
    tagline: payload.tagline,
    queryOrUrl: payload.queryOrUrl,
    priceHint: payload.priceHint,
    customSlug: payload.customSlug,
  });

  const creatorId = (payload.creatorId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '') || 'creator';
  const channel = normalizeChannel(payload.channel);

  const subId = channel && channel !== 'general'
    ? `inch_${creatorId}_${channel}_${product.slug}`
    : `inch_${creatorId}_${product.slug}`;

  return {
    slug: product.slug,
    productName: product.name,
    category: product.category,
    creatorId,
    channel,
    tagline: product.tagline,
    originalQueryOrUrl: product.queryOrUrl,
    coupangUrl: buildCoupangLinkWithRef(product.queryOrUrl, creatorId, product.slug, channel),
    subId,
    clicks: 0,
    estimatedEarnings: 0,
    priceHint: product.priceHint,
    createdAt: product.createdAt,
  };
}

export function recordClick(slug: string, creatorId?: string, channelInput?: string): ProductLink | null {
  const channel = normalizeChannel(channelInput);
  const res = recordReferralClick(slug, creatorId || 'official', channel);
  return {
    slug: res.product.slug,
    productName: res.product.name,
    category: res.product.category,
    creatorId: res.creatorStat.creatorId,
    channel,
    tagline: res.product.tagline,
    originalQueryOrUrl: res.product.queryOrUrl,
    coupangUrl: res.redirectUrl,
    subId: channel !== 'general'
      ? `inch_${res.creatorStat.creatorId}_${channel}_${res.product.slug}`
      : `inch_${res.creatorStat.creatorId}_${res.product.slug}`,
    clicks: res.creatorStat.clicks,
    estimatedEarnings: res.creatorStat.estimatedEarnings,
    priceHint: res.product.priceHint,
    channelStats: res.creatorStat.channelStats,
    createdAt: res.product.createdAt,
  };
}
