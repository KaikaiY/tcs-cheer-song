"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { RealtimeVoice } from "@/components/realtime-voice";
import { DemoVoice } from "@/components/demo-voice";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import { mergeTalkAnswers } from "@/lib/talk";
import { demoProfile } from "@/lib/demo";
import type { Answers, ConversationMessage, SongProfile, Style } from "@/lib/types";

export default function TalkPage() {
  return <Guard level="talk"><TalkInterview /></Guard>;
}

function TalkInterview() {
  const { data, update } = useSession();
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);
  const [captions, setCaptions] = useState({ user: "", assistant: "" });
  const [error, setError] = useState("");
  const style = data.style as Style;
  const character = characters[style];
  const isDemo = data.mode === "demo";
  const initial = useMemo<ConversationMessage>(() => ({
    role: "assistant",
    text: style === "male_cheer_squad"
      ? "よし、任せろ！ まずは、応援歌の中で呼んでほしいニックネームを教えてくれ。"
      : "一緒に最高の応援歌を作ろう！ まず、歌の中で呼んでほしいニックネームを教えてね。",
  }), [style]);
  const messages = useMemo(() => data.conversation.length ? data.conversation : [initial], [data.conversation, initial]);
  const conversationRef = useRef(messages);
  const answersRef = useRef(data.answers);
  const latest = messages.at(-1) ?? initial;
  const liveLine = captions.assistant || captions.user;
  const isLiveAssistant = Boolean(captions.assistant);
  const background = style === "male_cheer_squad" ? "/backgrounds/cheer-captain-field-empty.png" : "/backgrounds/idol-stage-empty.png";

  useEffect(() => { conversationRef.current = messages; }, [messages]);
  useEffect(() => { answersRef.current = data.answers; }, [data.answers]);

  async function composeProfile() {
    if (summarizing) return;
    setSummarizing(true); setError("");
    try {
      const response = await fetch("/api/compose-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, answers: data.answers, conversation: messages }) });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok || !isProfileResponse(value)) throw new Error(isError(value) ? value.error : "会話内容を整理できませんでした。");
      update({ profile: value.profile, result: undefined });
      router.push("/generating");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "会話内容を整理できませんでした。");
    } finally { setSummarizing(false); }
  }

  function continueDemo() {
    update({ ...demoProfile(style), result: undefined });
    router.push("/generating");
  }

  async function saveTranscript(role: "user" | "assistant", transcript: string) {
    const text = transcript.trim().slice(0, 500);
    if (!text) return;
    const append = (nextRole: "user" | "assistant", nextText: string, proposedAnswers?: Answers) => {
      const conversation = [...conversationRef.current, { role: nextRole, text: nextText }];
      const answers = proposedAnswers ? mergeTalkAnswers(answersRef.current, proposedAnswers) : answersRef.current;
      conversationRef.current = conversation;
      answersRef.current = answers;
      update({ answers, conversation, profile: undefined, result: undefined });
    };
    if (role === "assistant") { append(role, text); return; }
    try {
      const response = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, answers: answersRef.current, message: text }) });
      const value: unknown = await response.json();
      if (response.ok && isTalkResponse(value)) append(role, text, value.answers);
      else append(role, text);
    } catch { append(role, text); }
  }

  function updateCaption(role: "user" | "assistant", transcript: string, final: boolean) {
    setCaptions((current) => ({ ...current, [role]: transcript }));
    if (final) window.setTimeout(() => setCaptions((current) => current[role] === transcript ? { ...current, [role]: "" } : current), 4000);
  }

  const speaker = liveLine ? (isLiveAssistant ? character.name : "あなた") : (latest.role === "assistant" ? character.name : "あなた");
  const line = liveLine || latest.text;

  return <Stage minimal>
    <section className={`vn-scene ${style}`}>
      <div className="vn-background" style={{ backgroundImage: `linear-gradient(180deg, #07101a42 20%, #070a13b8 100%), url('${background}')` }} />
      <div className="vn-vignette" aria-hidden="true" />
      <img className="vn-character" src={character.image} alt={character.name} />
      <div className="vn-topline"><span>CHEER SONG SESSION</span><span>01 / TALK</span></div>
      <div className="vn-dialogue">
        <div className={`vn-nameplate ${latest.role}`}><span>{speaker}</span><small>{speaker === "あなた" ? "YOU" : "CHEER PARTNER"}</small></div>
        <p className="vn-line" aria-live="polite">{line}</p>
        <div className="vn-controls">
          {isDemo ? <DemoVoice characterName={character.name} onTranscript={saveTranscript} onLiveTranscript={updateCaption} /> : <RealtimeVoice style={style} onTranscript={saveTranscript} onLiveTranscript={updateCaption} />}
          <button className="vn-finish" onClick={isDemo ? continueDemo : composeProfile} disabled={summarizing}>{summarizing ? "会話を整理中…" : "会話を終える　→"}</button>
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <details className="vn-history">
          <summary>会話ログを見る <span>{messages.length}</span></summary>
          <div>{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role}><b>{message.role === "assistant" ? character.name : "あなた"}</b>{message.text}</p>)}</div>
        </details>
      </div>
    </section>
  </Stage>;
}

function isError(value: unknown): value is { error: string } { return !!value && typeof value === "object" && "error" in value && typeof (value as { error?: unknown }).error === "string"; }
function isTalkResponse(value: unknown): value is { reply: string; answers: Answers; complete: boolean } { return !!value && typeof value === "object" && typeof (value as { reply?: unknown }).reply === "string" && typeof (value as { complete?: unknown }).complete === "boolean" && !!(value as { answers?: unknown }).answers && typeof (value as { answers: unknown }).answers === "object"; }
function isProfileResponse(value: unknown): value is { profile: SongProfile } { return !!value && typeof value === "object" && !!(value as { profile?: unknown }).profile && typeof (value as { profile: unknown }).profile === "object"; }
