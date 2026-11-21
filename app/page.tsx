"use client";
import { radioShow, radioStation } from "@/lib/radio-brand";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { emptyAnswers } from "@/lib/questions";
import { connectRealtimeCall, handOffRealtimeCall } from "@/lib/realtime-call";
import { isRadioName, radioNamePattern } from "@/lib/radio-name";
import { playStudioJingle } from "@/lib/studio-jingle";
import type { RunMode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { ready, reset, update } = useSession();
  const [demo, setDemo] = useState(true);
  const [nickname, setNickname] = useState("");
  const [entering, setEntering] = useState(false);
  const [fading, setFading] = useState(false);
  const [error, setError] = useState("");
  const attempt = useRef<AbortController | null>(null);
  const mode: RunMode = demo ? "demo" : "live";
  const validNickname = isRadioName(nickname);

  async function enterStudio() {
    if (!validNickname || attempt.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]);
    setEntering(true);
    setError("");
    const fadeDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400;
    let connected = mode === "demo";
    let fadeStarted: number | undefined;
    let navigating = false;
    const beginFade = () => {
      if (fadeStarted !== undefined) return;
      fadeStarted = performance.now();
      setFading(true);
    };
    const jingle = playStudioJingle(signal, () => {
      if (connected) beginFade();
    });
    let call;
    try {
      if (mode === "live") call = await connectRealtimeCall({ style: "male_cheer_squad", phase: "interview", nickname }, signal);
      connected = true;
      await jingle;
      signal.throwIfAborted();
      beginFade();
      const remainingFade = Math.max(0, fadeDuration - (performance.now() - (fadeStarted ?? 0)));
      if (remainingFade > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, remainingFade));
      signal.throwIfAborted();
      if (call && call.channel.readyState !== "open") throw new Error("スタジオとの接続が切れました。");
      reset();
      update({ mode, consent: true, style: "male_cheer_squad", answers: { ...emptyAnswers, nickname } });
      if (call) handOffRealtimeCall(call);
      setNickname("");
      navigating = true;
      router.push("/talk");
    } catch {
      call?.close();
      if (!controller.signal.aborted) setError("スタジオに入れませんでした。マイクの許可を確認して、もう一度お試しください。");
    } finally {
      if (attempt.current === controller) {
        attempt.current = null;
        if (!navigating) {
          setEntering(false);
          setFading(false);
        }
      }
      controller.abort();
    }
  }

  useEffect(() => {
    // The App Router can restore this screen with its previous state on Back.
    const restoreEntrance = () => {
      if (attempt.current) return;
      setEntering(false);
      setFading(false);
    };
    const timer = window.setTimeout(restoreEntrance, 0);
    window.addEventListener("popstate", restoreEntrance);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", restoreEntrance);
      attempt.current?.abort();
      attempt.current = null;
    };
  }, []);

  return <Stage minimal><section className={`radio-home radio-call ${entering ? "dialing" : "entry"}${fading ? " is-entering-fade" : ""}`}><div className="radio-home-signal" aria-hidden="true" /><div className="dj-bird-placeholder radio-home-bird" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div><div className="radio-home-content"><p>{radioStation} · {radioShow}</p>
    {!entering && <><h1>DJ YOSHIと、<br />スタジオで話そう。</h1><label className="radio-name-entry"><b>ラジオネーム</b><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="呼ばれたい名前を入力" maxLength={24} disabled={!ready} pattern={radioNamePattern} aria-invalid={nickname !== "" && !validNickname} autoComplete="nickname" autoFocus /><small>ひらがな・カタカナで入力してください</small></label><label className="mode-toggle"><span>デモモード</span><input type="checkbox" disabled={!ready} checked={demo} onChange={(event) => setDemo(event.target.checked)} /><i aria-hidden="true" /></label><button className="button radio-start" disabled={!ready || !validNickname} onClick={() => void enterStudio()}>スタジオに入る　→</button></>}
    {entering && <div className="call-status" role="status"><span className="call-pulse" aria-hidden="true" /><h1>スタジオへ…</h1></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </div></section></Stage>;
}
