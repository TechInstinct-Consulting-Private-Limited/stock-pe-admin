import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketPe Admin Console",
  description: "Secure operations console for demo contest management.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
