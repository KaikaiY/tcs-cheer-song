"use client";
import { radioDj, radioShow, radioStation } from "@/lib/radio-brand";
import { useEffect, useRef, useState } from "react";

type Props = {
  characterName?: string;
  nickname?: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onLiveTranscript: (role: "user" | "assistant", text: string, final: boolean) => void;
};

export function DemoVoice({ autoStart = false, characterName, nickname, onComplete, onTranscript, onLiveTranscript }: Props) {
  const [state, setState] = useState<"idle" | "talking" | "done">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function start() {
    if (state !== "idle") return;
    setState("talking");
    const line = characterName
      ? `${characterName}です。あなたへの応援歌を準備しています。`
      : `こんにちは、${nickname ? `${nickname}さん` : "リスナーさん"}！こちら${radioStation}「${radioShow}」、${radioDj}だよ。スタジオへようこそ！ 君の話をもとに、君だけの一曲をつくる番組だよ。`;
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
  return <div className="talk-complete">{state === "idle" && <button className="button warm" onClick={start}>DJと話す</button>}<small>{state === "idle" ? "DJが会話を始めます" : state === "talking" ? "DJが話しています…" : "曲を選んでいます…"}</small></div>;
}
