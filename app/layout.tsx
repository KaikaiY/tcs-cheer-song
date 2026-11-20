import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import "./globals.css";
export const metadata: Metadata = { title: "TCS RADIO エールステーション", description: "あなたの話をもとに、あなただけの一曲をつくります。" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ja"><body><SessionProvider>{children}</SessionProvider></body></html>; }
