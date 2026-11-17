"use client";
import { useEffect, useRef, useState } from "react";
import type { Style } from "@/lib/types";

type Props = { style: Style; phase?: "interview" | "waiting"; autoStart?: boolean; guidance?: "create" | "ready"; onTranscript: (role: "user" | "assistant", text: string) => void; onLiveTranscript: (role: "user" | "assistant", text: string, final: boolean) => void };

export function RealtimeVoice({ style, phase = "interview", autoStart = false, guidance, onTranscript, onLiveTranscript }: Props) {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [message, setMessage] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const assistantTranscript = useRef("");
  const assistantTurnCompleted = useRef(false);
  const userTranscript = useRef("");
  const spokenGuidance = useRef<string | undefined>(undefined);
  const stop = () => { if (timer.current) window.clearTimeout(timer.current); channelRef.current = null; pc.current?.close(); stream.current?.getTracks().forEach((track) => track.stop()); pc.current = null; stream.current = null; setState("idle"); setMessage("会話を終了しました。"); };
  useEffect(() => () => stop(), []);
  useEffect(() => {
    if (state !== "live" || !channelRef.current || channelRef.current.readyState !== "open" || phase !== "waiting") return;
    channelRef.current.send(JSON.stringify({ type: "session.update", session: { instructions: style === "male_cheer_squad" ? "応援歌の制作は始まりました。ここからは完成までの自由な雑談です。新しい情報を曲に反映すると約束せず、質問や確認を繰り返さずに、熱く短い言葉で自然に会話を続けてください。" : "応援歌の制作は始まりました。ここからは完成までの自由な雑談です。新しい情報を曲に反映すると約束せず、質問や確認を繰り返さずに、明るくやわらかい言葉で自然に会話を続けてください。" } }));
    setMessage("選曲中です。完成を待ちながら、DJと自由に話せます。");
  }, [phase, state, style]);
  useEffect(() => {
    if (!guidance || spokenGuidance.current === guidance || state !== "live" || !channelRef.current || channelRef.current.readyState !== "open") return;
    spokenGuidance.current = guidance;
    const text = guidance === "create"
      ? "応援歌を作る材料がそろったよ。画面の『この内容で応援歌をつくる』を押してね。"
      : "選曲がまとまりました。画面の『DJの曲紹介を聞く』から、今夜の一曲を聴いてください。";
    channelRef.current.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"], instructions: `利用者へ次の案内だけを、キャラクターらしい自然な日本語で伝えてください。${text}` } }));
  }, [guidance, state]);
  async function start() {
    setState("connecting"); setMessage("");
    try {
      const session = await fetch("/api/realtime-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, phase }) }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error || "接続準備に失敗しました。"); return value as { clientSecret: string; model: string; maxSeconds: number }; });
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const connection = new RTCPeerConnection(); pc.current = connection;
      connection.ontrack = (event) => { if (!audio.current) { audio.current = document.createElement("audio"); audio.current.autoplay = true; } audio.current.srcObject = event.streams[0]; audio.current.play().catch(() => undefined); };
      stream.current.getTracks().forEach((track) => connection.addTrack(track, stream.current!));
      const channel = connection.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onopen = () => channel.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"], instructions: phase === "interview" ? "会話をあなたから必ず始めてください。最初に短い歓迎のあいさつをして、『応援歌を一緒に作ろう』と伝えたうえで、呼ばれたいニックネームを聞いてください。" : "応援歌の制作中なので、あなたから明るく自然な雑談を始めてください。" } }));
      channel.onmessage = (event) => {
        try {
          const value = JSON.parse(event.data) as { type?: string; transcript?: string; delta?: string; response?: { output?: Array<{ content?: Array<{ transcript?: string }> }> } };
          if (value.type === "conversation.item.input_audio_transcription.delta" && value.delta) { userTranscript.current += value.delta; onLiveTranscript("user", userTranscript.current, false); }
          if (value.type === "conversation.item.input_audio_transcription.completed" && value.transcript) { userTranscript.current = ""; onLiveTranscript("user", value.transcript, true); onTranscript("user", value.transcript); }
          if (value.type === "response.output_audio_transcript.delta" && value.delta) { assistantTurnCompleted.current = false; assistantTranscript.current += value.delta; onLiveTranscript("assistant", assistantTranscript.current, false); }
          if (value.type === "response.output_audio_transcript.done") {
            const text = value.transcript || assistantTranscript.current;
            assistantTranscript.current = "";
            if (text) { assistantTurnCompleted.current = true; onLiveTranscript("assistant", text, true); onTranscript("assistant", text); }
          }
          if (value.type === "response.done" && !assistantTranscript.current && !assistantTurnCompleted.current) {
            const text = value.response?.output?.flatMap((item) => item.content || []).map((item) => item.transcript || "").join("").trim();
            if (text) { assistantTurnCompleted.current = true; onLiveTranscript("assistant", text, true); onTranscript("assistant", text); }
          }
        } catch { /* Ignore non-JSON events. */ }
      };
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${session.clientSecret}`, "Content-Type": "application/sdp" }, body: offer.sdp }).then(async (response) => { if (!response.ok) throw new Error("Realtime接続に失敗しました。"); return response.text(); });
      await connection.setRemoteDescription({ type: "answer", sdp: answer });
      setState("live"); setMessage(phase === "waiting" ? "選曲を待ちながら、DJと自由に話せます。" : `通話中です。最大${Math.floor(session.maxSeconds / 60)}分です。`); timer.current = window.setTimeout(stop, session.maxSeconds * 1000);
    } catch (error) { stop(); setState("error"); setMessage(error instanceof Error ? error.message : "マイクを開始できませんでした。"); }
  }
  useEffect(() => {
    if (!autoStart) return;
    const startTimer = window.setTimeout(() => { void start(); }, 250);
    return () => window.clearTimeout(startTimer);
    // This must happen once per talk-scene mount; later retries remain user controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);
  return <div className="talk-complete"><button className="button warm" onClick={state === "live" ? stop : start} disabled={state === "connecting"}>{state === "live" ? "通話を終える" : state === "connecting" ? "通話を準備中…" : phase === "waiting" ? "フリートークを続ける" : "通話を始める"}</button>{message && <small role="status">{message}</small>}{state === "idle" && phase === "interview" && <small>マイクを許可すると、DJから話しかけます。</small>}</div>;
}
