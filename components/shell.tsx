"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";

export function Guard({ level, children }: { level: "consent" | "character" | "talk" | "answers" | "result"; children: React.ReactNode }) {
  const { data, ready } = useSession();
  const router = useRouter();
  let destination = "";
  if (ready) {
    if (!data.consent) destination = "/";
    else if (["talk", "answers", "result"].includes(level) && !data.style) destination = "/character";
    // A completed music job already carries the profile together with the result.
    // Requiring a separately rendered `profile` here can race with client navigation
    // just after the job becomes ready, and sends a listener back to the call screen.
    else if (level === "answers" && !data.profile) destination = "/talk";
    else if (level === "result" && !data.result) destination = "/generating";
  }
  useEffect(() => { if (destination) router.replace(destination); }, [destination, router]);
  if (!ready || destination) return <main className="screen loading-screen"><p>読み込み中…</p></main>;
  return children;
}

export function Stage({ children, progress = 0, minimal = false }: { children: React.ReactNode; progress?: number; minimal?: boolean }) {
  return <main className={`screen${minimal ? " landing-screen" : ""}`} style={minimal ? { display: "block", background: "#111" } : undefined}>{!minimal && <header className="stage-header"><div className="title-logo"><span>AI</span><b>オリジナル<br />応援ソング</b></div><div className="progress" aria-label={`進行状況 ${progress}%`}><i style={{ width: `${progress}%` }} /></div><span className="stage-caption">あなたの毎日に、エールを。</span></header>}{children}</main>;
}
