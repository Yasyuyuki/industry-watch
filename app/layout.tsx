import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Industry Watch",
  description: "業界情報の自動収集ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
