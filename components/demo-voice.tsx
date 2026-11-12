"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  characterName: string;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onLiveTranscript: (role: "user" | "assistant", text: string, final: boolean) => void;
};

export function DemoVoice({ characterName, onTranscript, onLiveTranscript }: Props) {
  const [state, setState] = useState<"idle" | "talking" | "done">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function start() {
    if (state !== "idle") return;
    setState("talking");
    const line = `${characterName}だよ。デモでは、会話と楽曲完成までの流れを体験できます。`;
    onLiveTranscript("assistant", line, false);
    timer.current = window.setTimeout(() => { onLiveTranscript("assistant", line, true); onTranscript("assistant", line); setState("done"); }, 1100);
  }
  return <div className="talk-complete"><button className="button warm" onClick={start} disabled={state === "talking"}>{state === "idle" ? "音声で会話を始める" : state === "talking" ? "会話中…" : "会話を体験済み"}</button><small>{state === "idle" ? "デモ会話を再生します" : state === "talking" ? "キャラクターが話しています…" : "会話を終えて、応援歌を作れます"}</small></div>;
}
