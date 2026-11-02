import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://inch.sale'),
  title: 'inchsales - 크리에이터를 위한 1초 쇼핑 링크 & 정산 네트워크',
  description: '인스타 릴스, 틱톡 영상 속 그 아이템! 링크 하나로 팔로워에게 공유하고 쿠팡 파트너스 수수료를 매주 정산받으세요.',
  keywords: ['크리에이터 쇼핑 링크', '쿠팡 파트너스', '인스타 릴스 공구', '틱톡 추천템', '서브 어필리에이트'],
  verification: {
    google: 'LBW5pnmqvikg5Xl2m0_EVeYRqSm735Bfh_VFml3dvYM',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'inchsales - 크리에이터를 위한 1초 쇼핑 링크 & 정산 네트워크',
    description: '인스타 릴스, 틱톡 영상 속 그 아이템! 링크 하나로 팔로워에게 공유하고 쿠팡 파트너스 수수료를 매주 정산받으세요.',
    url: 'https://inch.sale',
    siteName: 'inchsales',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full bg-[#F8FAFC]">
      <body className="min-h-full flex flex-col font-sans antialiased text-slate-900 bg-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
