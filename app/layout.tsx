import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import "./globals.css";
export const metadata: Metadata = { title: "AIオリジナル応援ソング", description: "あなたの頑張りと夢から、あなた自身を応援する歌をつくります。" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ja"><body><SessionProvider>{children}</SessionProvider></body></html>; }
