"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { RealtimeVoice } from "@/components/realtime-voice";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import { mergeTalkAnswers, nextQuestionId } from "@/lib/talk";
import type { Answers, ConversationMessage, SongProfile, Style } from "@/lib/types";

export default function TalkPage() { return <Guard level="talk"><TalkInterview /></Guard>; }

function TalkInterview() {
  const { data, update } = useSession();
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [captions, setCaptions] = useState<{ user: string; assistant: string }>({ user: "", assistant: "" });
  const [error, setError] = useState("");
  const style = data.style as Style;
  const character = characters[style];
  const missing = nextQuestionId(data.answers);
  const initial = useMemo<ConversationMessage>(() => ({ role: "assistant", text: data.style === "male_cheer_squad" ? "よし、任せろ！ まずは、応援歌の中で呼んでほしいニックネームを教えてくれ。" : "一緒に最高の応援歌を作ろう！ まず、歌の中で呼んでほしいニックネームを教えてね。" }), [data.style]);
  const messages = useMemo(() => data.conversation.length ? data.conversation : [initial], [data.conversation, initial]);
  const conversationRef = useRef(messages);
  const answersRef = useRef(data.answers);
  useEffect(() => { conversationRef.current = messages; }, [messages]);
  useEffect(() => { answersRef.current = data.answers; }, [data.answers]);
  const userTurns = messages.filter((message) => message.role === "user").length;
  const readyToClose = voiceReady || (!missing && userTurns >= 5);

  async function composeProfile() {
    if (missing || summarizing) return;
    setSummarizing(true); setError("");
    try {
      const response = await fetch("/api/compose-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style: data.style, answers: data.answers, conversation: messages }) });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok || !isProfileResponse(value)) throw new Error(isError(value) ? value.error : "会話内容を整理できませんでした。");
      update({ profile: value.profile, result: undefined });
      router.push("/confirm");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "会話内容を整理できませんでした。");
    } finally { setSummarizing(false); }
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
    if (role === "assistant") { if (/応援歌を作って|作っていい|曲にし/.test(text)) setVoiceReady(true); append(role, text); return; }
    try {
      const response = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style: data.style, answers: answersRef.current, message: text }) });
      const value: unknown = await response.json();
      if (response.ok && isTalkResponse(value)) append(role, text, value.answers);
      else append(role, text);
    } catch { append(role, text); }
  }

  function updateCaption(role: "user" | "assistant", transcript: string, final: boolean) {
    setCaptions((current) => ({ ...current, [role]: transcript }));
    if (final) window.setTimeout(() => setCaptions((current) => current[role] === transcript ? { ...current, [role]: "" } : current), 4000);
  }

  return <Stage progress={missing ? 42 : 58}><section className={`talk-slide ${data.style}`}><aside className="talk-aside"><img src={character.image} alt={character.name} /><div><p className="kicker">YOUR CHEER PARTNER</p><h1>{character.name}</h1><p>{character.description}</p></div></aside><div className="talk-main"><header><p className="kicker">TALK SESSION</p><h2>あなたの話から、応援歌を育てよう</h2><p>思い出でも、今の気持ちでも大丈夫。パートナーが会話の中から曲のヒントを見つけます。</p></header><RealtimeVoice style={style} onTranscript={saveTranscript} onLiveTranscript={updateCaption} /><div className="live-captions" aria-live="polite">{captions.user && <p className="user">あなた：{captions.user}</p>}{captions.assistant && <p className="assistant">{character.name}：{captions.assistant}</p>}</div><div className="talk-log" aria-live="polite">{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role}>{message.text}</p>)}</div>{error && <p className="inline-error" role="alert">{error}</p>}<p className="voice-only-note">マイクで話してください。会話から応援歌の材料を整理します。</p>{readyToClose && <div className="talk-complete"><button className="button warm" onClick={composeProfile} disabled={summarizing}>{summarizing ? "会話を整理中…" : "この会話で応援歌を作る　→"}</button></div>}</div></section></Stage>;
}

function isError(value: unknown): value is { error: string } { return !!value && typeof value === "object" && "error" in value && typeof (value as { error?: unknown }).error === "string"; }
function isTalkResponse(value: unknown): value is { reply: string; answers: Answers; complete: boolean } { return !!value && typeof value === "object" && typeof (value as { reply?: unknown }).reply === "string" && typeof (value as { complete?: unknown }).complete === "boolean" && !!(value as { answers?: unknown }).answers && typeof (value as { answers: unknown }).answers === "object"; }
function isProfileResponse(value: unknown): value is { profile: SongProfile } { return !!value && typeof value === "object" && !!(value as { profile?: unknown }).profile && typeof (value as { profile: unknown }).profile === "object"; }
