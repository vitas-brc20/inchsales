import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'inchsales - 크리에이터를 위한 1초 쇼핑 링크 & 정산 네트워크',
  description: '인스타 릴스, 틱톡 영상 속 그 아이템! 링크 하나로 팔로워에게 공유하고 쿠팡 파트너스 수수료를 매주 정산받으세요.',
  keywords: ['크리에이터 쇼핑 링크', '쿠팡 파트너스', '인스타 릴스 공구', '틱톡 추천템', '서브 어필리에이트'],
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
