"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { answerErrors } from "@/lib/validation";

export function Guard({ level, children }: { level: "consent" | "answers" | "character" | "result"; children: React.ReactNode }) {
  const { data, ready } = useSession();
  const router = useRouter();
  let destination = "";
  if (ready) {
    if (!data.consent) destination = "/";
    else if (["character", "result"].includes(level) && Object.keys(answerErrors(data.answers)).length) destination = "/questions";
    else if (level === "result" && !data.result) destination = "/character";
  }
  useEffect(() => { if (destination) router.replace(destination); }, [destination, router]);
  if (!ready || destination) return <main className="screen loading-screen"><p>読み込み中…</p></main>;
  return children;
}

export function Stage({ children, progress = 0 }: { children: React.ReactNode; progress?: number }) {
  return <main className="screen"><header className="stage-header"><div className="title-logo"><span>AI</span><b>オリジナル<br />応援ソング</b></div><div className="progress" aria-label={`進行状況 ${progress}%`}><i style={{ width: `${progress}%` }} /></div><span className="stage-caption">あなたの毎日に、エールを。</span></header>{children}</main>;
}
