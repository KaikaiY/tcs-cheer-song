"use client";
import { useEffect, useRef, useState } from "react";
import type { Style } from "@/lib/types";

type Props = { style: Style; onTranscript: (role: "user" | "assistant", text: string) => void; onLiveTranscript: (role: "user" | "assistant", text: string, final: boolean) => void };

export function RealtimeVoice({ style, onTranscript, onLiveTranscript }: Props) {
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [message, setMessage] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const assistantTranscript = useRef("");
  const userTranscript = useRef("");
  const stop = () => { if (timer.current) window.clearTimeout(timer.current); pc.current?.close(); stream.current?.getTracks().forEach((track) => track.stop()); pc.current = null; stream.current = null; setState("idle"); setMessage("会話を終了しました。"); };
  useEffect(() => () => stop(), []);
  async function start() {
    setState("connecting"); setMessage("");
    try {
      const session = await fetch("/api/realtime-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style }) }).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error || "接続準備に失敗しました。"); return value as { clientSecret: string; model: string; maxSeconds: number }; });
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const connection = new RTCPeerConnection(); pc.current = connection;
      connection.ontrack = (event) => { if (!audio.current) { audio.current = document.createElement("audio"); audio.current.autoplay = true; } audio.current.srcObject = event.streams[0]; };
      stream.current.getTracks().forEach((track) => connection.addTrack(track, stream.current!));
      const channel = connection.createDataChannel("oai-events");
      channel.onopen = () => channel.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio", "text"] } }));
      channel.onmessage = (event) => {
        try {
          const value = JSON.parse(event.data) as { type?: string; transcript?: string; delta?: string; response?: { output?: Array<{ content?: Array<{ transcript?: string }> }> } };
          if (value.type === "conversation.item.input_audio_transcription.delta" && value.delta) { userTranscript.current += value.delta; onLiveTranscript("user", userTranscript.current, false); }
          if (value.type === "conversation.item.input_audio_transcription.completed" && value.transcript) { userTranscript.current = ""; onLiveTranscript("user", value.transcript, true); onTranscript("user", value.transcript); }
          if (value.type === "response.output_audio_transcript.delta" && value.delta) { assistantTranscript.current += value.delta; onLiveTranscript("assistant", assistantTranscript.current, false); }
          if (value.type === "response.output_audio_transcript.done") {
            const text = value.transcript || assistantTranscript.current;
            assistantTranscript.current = "";
            if (text) { onLiveTranscript("assistant", text, true); onTranscript("assistant", text); }
          }
          if (value.type === "response.done" && !assistantTranscript.current) {
            const text = value.response?.output?.flatMap((item) => item.content || []).map((item) => item.transcript || "").join("").trim();
            if (text) { onLiveTranscript("assistant", text, true); onTranscript("assistant", text); }
          }
        } catch { /* Ignore non-JSON events. */ }
      };
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${session.clientSecret}`, "Content-Type": "application/sdp" }, body: offer.sdp }).then(async (response) => { if (!response.ok) throw new Error("Realtime接続に失敗しました。"); return response.text(); });
      await connection.setRemoteDescription({ type: "answer", sdp: answer });
      setState("live"); setMessage(`会話中です。最大${session.maxSeconds}秒で終了します。`); timer.current = window.setTimeout(stop, session.maxSeconds * 1000);
    } catch (error) { stop(); setState("error"); setMessage(error instanceof Error ? error.message : "マイクを開始できませんでした。"); }
  }
  return <div className="talk-complete"><button className="button warm" onClick={state === "live" ? stop : start} disabled={state === "connecting"}>{state === "live" ? "会話を終了する" : state === "connecting" ? "接続中…" : "音声で会話を始める"}</button>{message && <small role="status">{message}</small>}</div>;
}
