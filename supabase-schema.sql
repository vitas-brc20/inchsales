-- inchsales Supabase Schema
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. 상품 카탈로그 테이블
CREATE TABLE IF NOT EXISTS inch_products (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '트렌드/핫템',
  tagline TEXT,
  query_or_url TEXT NOT NULL,
  price_hint TEXT,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인플루언서별 추천 실적 테이블
CREATE TABLE IF NOT EXISTS inch_creator_stats (
  id TEXT PRIMARY KEY, -- format: creator_id:slug
  creator_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  product_name TEXT,
  clicks INTEGER DEFAULT 0,
  estimated_earnings INTEGER DEFAULT 0,
  last_click_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 출금(정산) 신청 테이블
CREATE TABLE IF NOT EXISTS inch_withdrawals (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  slug TEXT,
  product_name TEXT,
  amount INTEGER NOT NULL,
  account_info TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- RLS (Row Level Security) 설정: 익명 읽기/쓰기 허용 (또는 필요에 따라 정책 추가)
ALTER TABLE inch_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inch_creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE inch_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on inch_products" ON inch_products FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on inch_products" ON inch_products FOR ALL USING (true);

CREATE POLICY "Allow public read on inch_creator_stats" ON inch_creator_stats FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on inch_creator_stats" ON inch_creator_stats FOR ALL USING (true);

CREATE POLICY "Allow public read on inch_withdrawals" ON inch_withdrawals FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on inch_withdrawals" ON inch_withdrawals FOR ALL USING (true);

-- 기본 샘플 상품 데이터 삽입
INSERT INTO inch_products (slug, name, category, tagline, query_or_url, price_hint, total_clicks)
VALUES 
  ('ddu-zon-cookie', '두바이 쫀득 쿠키 (두쫀쿠)', '간식/디저트', '틱톡 150만뷰 화제의 그 두바이 쿠키! 품절 전 바로가기', '두바이 쫀득 쿠키', '16,900원', 231),
  ('desk-cleaner', '충전식 미니 데스크 무선 청소기', '리빙/자취', '릴스에서 문의 폭주했던 책상 위 지우개똥/먼지 청소기', '미니 데스크 청소기', '12,500원', 142),
  ('laptop-stand', '원목 접이식 각도조절 노트북 거치대', '데스크테리어', '목디스크 탈출! 감성 데스크테리어 필수 아이템', '접이식 노트북 거치대', '24,900원', 88)
ON CONFLICT (slug) DO NOTHING;
