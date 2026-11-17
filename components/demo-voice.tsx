"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  characterName?: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onLiveTranscript: (role: "user" | "assistant", text: string, final: boolean) => void;
};

export function DemoVoice({ autoStart = false, onComplete, onTranscript, onLiveTranscript }: Props) {
  const [state, setState] = useState<"idle" | "talking" | "done">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function start() {
    if (state !== "idle") return;
    setState("talking");
    const line = "TCS RADIO、ただいま生放送中。今夜はデモ用の一曲をお届けします。";
    onLiveTranscript("assistant", line, false);
    timer.current = window.setTimeout(() => { onLiveTranscript("assistant", line, true); onTranscript("assistant", line); setState("done"); onComplete?.(); }, 1100);
  }
  useEffect(() => {
    if (!autoStart) return;
    const startTimer = window.setTimeout(start, 250);
    return () => window.clearTimeout(startTimer);
    // `start` deliberately runs once when the talk scene appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  return <div className="talk-complete"><button className="button warm" onClick={start} disabled={state === "talking"}>{state === "idle" ? "放送をつなぐ" : state === "talking" ? "ON AIR…" : "デモをもう一度聞く"}</button><small>{state === "idle" ? "DJが通話を始めます" : state === "talking" ? "DJが話しています…" : "曲を選んでいます…"}</small></div>;
}
