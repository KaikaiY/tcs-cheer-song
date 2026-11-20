"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { emptyAnswers } from "@/lib/questions";
import { connectRealtimeCall, handOffRealtimeCall } from "@/lib/realtime-call";
import { isRadioName, radioNamePattern } from "@/lib/radio-name";
import type { RunMode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { ready, reset, update } = useSession();
  const [demo, setDemo] = useState(true);
  const [nickname, setNickname] = useState("");
  const [dialing, setDialing] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<AbortController | null>(null);
  const mode: RunMode = demo ? "demo" : "live";
  const validNickname = isRadioName(nickname);

  async function dial() {
    if (!validNickname || attempt.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]);
    setDialing(true);
    setError("");
    // "landline phone (90's)" by Anonio82, CC0. https://freesound.org/s/716988/
    const ringtone = new Audio("/sounds/ringtone.mp3");
    ringtone.loop = true;
    ringtone.volume = 0.35;
    void ringtone.play().catch(() => { /* The call can continue without sound. */ });
    signal.addEventListener("abort", () => ringtone.pause(), { once: true });
    const ringing = new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 6_000);
      signal.addEventListener("abort", () => { window.clearTimeout(timer); resolve(); }, { once: true });
    });

    let call;
    try {
      if (mode === "live") call = await connectRealtimeCall({ style: "male_cheer_squad", phase: "interview", nickname }, signal);
      await ringing;
      signal.throwIfAborted();
      if (call && call.channel.readyState !== "open") throw new Error("通話が切れました。");
      reset();
      update({ mode, consent: true, style: "male_cheer_squad", answers: { ...emptyAnswers, nickname } });
      if (call) handOffRealtimeCall(call);
      setNickname("");
      router.push("/talk");
    } catch {
      call?.close();
      if (!controller.signal.aborted) setError("つながりませんでした。マイクの許可を確認して、もう一度かけてください。");
    } finally {
      ringtone.pause();
      if (attempt.current === controller) {
        attempt.current = null;
        setDialing(false);
      }
      controller.abort();
    }
  }

  useEffect(() => () => {
    attempt.current?.abort();
    attempt.current = null;
  }, []);

  return <Stage minimal><section className={`radio-home radio-call ${dialing ? "dialing" : "entry"}`}><div className="radio-home-signal" aria-hidden="true" /><div className="dj-bird-placeholder radio-home-bird" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div><div className="radio-home-content"><p>TCS RADIO</p>
    {!dialing && <><h1>DJに、<br />電話をかけよう。</h1><label className="radio-name-entry"><b>ラジオネーム</b><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="呼ばれたい名前を入力" maxLength={24} disabled={!ready} pattern={radioNamePattern} aria-invalid={nickname !== "" && !validNickname} autoComplete="nickname" autoFocus /><small>ひらがな・カタカナで入力してください</small></label><label className="mode-toggle"><span>デモモード</span><input type="checkbox" disabled={!ready} checked={demo} onChange={(event) => setDemo(event.target.checked)} /><i aria-hidden="true" /></label><button className="button radio-start" disabled={!ready || !validNickname} onClick={() => void dial()}>TCS RADIOへ電話をかける　→</button></>}
    {dialing && <div className="call-status" role="status"><span className="call-pulse" aria-hidden="true" /><h1>呼び出し中…</h1><p>TCS RADIOにつないでいます</p></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </div></section></Stage>;
}
