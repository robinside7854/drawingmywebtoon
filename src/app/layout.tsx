import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "드로잉마이카툰 — DrawingMyCartoon",
  description: "당신의 하루가 한 편의 예술이 되는 곳",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-amber-50 min-h-screen">{children}</body>
    </html>
  );
}
