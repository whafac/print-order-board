import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제작 의뢰 관리",
  description: "초경량 제작의뢰 앱 (PIN 인증)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
