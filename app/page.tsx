"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { emptyAnswers } from "@/lib/questions";
import type { RunMode } from "@/lib/types";

type CallState = "entry" | "dialing" | "incoming";

export default function Home() {
  const router = useRouter();
  const { reset, update } = useSession();
  const [demo, setDemo] = useState(true);
  const [nickname, setNickname] = useState("");
  const [callState, setCallState] = useState<CallState>("entry");
  const audioContext = useRef<AudioContext | null>(null);
  const ringTimer = useRef<number | null>(null);
  const dialTimer = useRef<number | null>(null);
  const mode: RunMode = demo ? "demo" : "live";

  function stopRingtone() { if (ringTimer.current) window.clearInterval(ringTimer.current); ringTimer.current = null; }
  function tone(frequency: number, duration: number, gain = 0.045) {
    try {
      const context = audioContext.current ?? new AudioContext(); audioContext.current = context; void context.resume();
      const oscillator = context.createOscillator(); const volume = context.createGain();
      oscillator.frequency.value = frequency; volume.gain.setValueAtTime(gain, context.currentTime); volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(volume).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch { /* The call flow stays usable when a browser blocks sound. */ }
  }
  function ring() { tone(440, 0.16); window.setTimeout(() => tone(480, 0.16), 190); }
  function dial() {
    if (!nickname.trim()) return;
    setCallState("dialing"); tone(350, 0.12, 0.03);
    dialTimer.current = window.setTimeout(() => { setCallState("incoming"); ring(); ringTimer.current = window.setInterval(ring, 1500); }, 900);
  }
  function answer() {
    stopRingtone(); if (dialTimer.current) window.clearTimeout(dialTimer.current);
    // Keep the privacy guidance unobtrusive on the entry screen; do not interrupt the call with a separate consent page.
    reset();
    update({
      mode,
      consent: true,
      questionIndex: 0,
      style: "male_cheer_squad",
      conversation: [],
      result: undefined,
      answers: { ...emptyAnswers, nickname: nickname.trim() },
    });
    router.push("/talk");
  }
  useEffect(() => () => { stopRingtone(); if (dialTimer.current) window.clearTimeout(dialTimer.current); void audioContext.current?.close(); }, []);

  return <Stage minimal><section className={`radio-home radio-call ${callState}`}><div className="radio-home-signal" aria-hidden="true" /><div className="dj-bird-placeholder radio-home-bird" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div><div className="radio-home-content"><p>TCS RADIO</p>
    {callState === "entry" && <><h1>DJに、<br />電話をかけよう。</h1><span>LIVE CALL · 90 SECOND ANTHEM</span><label className="radio-name-entry"><b>ラジオネーム</b><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="呼ばれたい名前を入力" maxLength={24} autoComplete="nickname" autoFocus /><small>本名でなくて大丈夫です</small></label><label className="mode-toggle"><span>デモモード</span><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} /><i aria-hidden="true" /></label><button className="button radio-start" disabled={!nickname.trim()} onClick={dial}>TCS RADIOへ電話をかける　→</button></>}
    {callState === "dialing" && <div className="call-status" role="status"><span className="call-pulse" aria-hidden="true" /><h1>呼び出し中…</h1><p>TCS RADIOにつないでいます</p></div>}
    {callState === "incoming" && <div className="call-status incoming" role="status"><span className="call-pulse" aria-hidden="true" /><p>TCS RADIO から着信中</p><h1>{nickname}さん、<br />電話がつながりました。</h1><button className="button radio-start" onClick={answer}>電話に出る　→</button><small>音が聞こえない場合も、そのまま電話に出られます</small></div>}
  </div></section></Stage>;
}
