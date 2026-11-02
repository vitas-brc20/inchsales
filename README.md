# ⚡️ inchsales (인치세일즈)

> **"크리에이터를 위한 1초 쿠팡 파트너스 쇼핑 링크 & 서브 어필리에이트 네트워크"**

인스타그램 릴스, 틱톡, 유튜브 숏츠에서 유행하는 핫딜 상품을 누구나 1초 만에 자신만의 추천인 식별코드(`?id=uuid`)가 담긴 감성 쇼핑 링크로 변환하고, 판매 발생 시 쿠팡 공식 수수료의 70%를 매주 자동 정산받는 플랫폼입니다.

---

## ✨ 핵심 기능

1. **인플루언서별 고유 추천 URL 발급**:
   - 쿼리형: `https://inch.sale?q=두쫀쿠&id=jisu_vlog`
   - 슬러그형: `https://inch.sale/p/ddu-zon-cookie?ref=jisu_vlog`
   - 동일한 상품이어도 추천인 ID에 따라 완전히 독립적으로 트래킹 및 정산.

2. **쿠팡 파트너스 공식 리디렉션 게이트웨이 연동**:
   - `link.coupang.com/re/AFFSRCH?lptag={AF코드}&subid=inch_{creator}_{slug}&keyword={상품명}`
   - 쿠팡 공식 규격 `subId`로 어떤 인플루언서가 얼마를 팔았는지 100% 식별.

3. **피그마 기반 모바일 퍼스트 디자인 시스템**:
   - 토스(Toss), 29CM, 리틀리 감성의 클린 미니멀 UI.
   - 인스타/틱톡에서 열었을 때 신뢰도를 극대화하는 모바일 랜딩 카드.

4. **100원부터 가능한 마이크로 실시간 출금 신청**:
   - 100원 이상 적립 시 토스 아이디 또는 계좌번호로 즉시 출금 신청.
   - Supabase DB 연동으로 출금 내역 영구 보존.

---

## 🛠 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend / Database**: Next.js Route Handlers, Supabase (PostgreSQL), Local JSON fallback
- **Affiliate Integration**: Coupang Partners Official Gateway (`link.coupang.com`)

---

## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
pnpm install

# 2. 환경변수 설정
cp .env.example .env.local

# 3. 개발 서버 실행
pnpm dev

# 4. 프로덕션 빌드 및 실행
pnpm build
pnpm start -p 3456
```

---

## 🗄 데이터베이스 (Supabase)

Supabase 대시보드의 **SQL Editor**에서 루트 경로의 [`supabase-schema.sql`](./supabase-schema.sql)을 실행하면 상품 카탈로그, 추천 실적, 출금 신청 테이블이 자동 생성됩니다.
