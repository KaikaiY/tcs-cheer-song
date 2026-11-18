"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { RealtimeVoice } from "@/components/realtime-voice";
import { DemoVoice } from "@/components/demo-voice";
import { useSession } from "@/components/session";
import { mergeTalkAnswers } from "@/lib/talk";
import { demoResult } from "@/lib/demo";
import { saveGeneratedMusic } from "@/lib/music-runtime";
import { isRecord } from "@/lib/validation";
import type { Answers, ConversationMessage, MockScenario, Style } from "@/lib/types";

const mockDelays: Record<MockScenario, number> = { quick: 2300, wait30: 30_000, wait120: 120_000, fail: 2300, "retry-success": 2300, "audio-fail": 2300 };
const mockLabels: Record<MockScenario, string> = { quick: "短時間で成功", wait30: "30秒待って成功", wait120: "120秒待って成功", fail: "失敗", "retry-success": "一度失敗して再試行", "audio-fail": "再生失敗" };

export default function TalkPage() {
  return <Guard level="talk"><TalkInterview /></Guard>;
}

function TalkInterview() {
  const { data, update } = useSession();
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);
  const [caption, setCaption] = useState<{ role: "user" | "assistant"; text: string } | null>(null);
  const [error, setError] = useState("");
  const [jobConnectionLost, setJobConnectionLost] = useState(false);
  const [job, setJob] = useState(data.musicJob);
  const jobStartLock = useRef(false);
  const demoAttempts = useRef(0);
  const style = data.style as Style;
  const isDemo = data.mode === "demo";
  const nickname = data.answers.nickname.trim();
  const initial = useMemo<ConversationMessage>(() => ({
    role: "assistant",
    text: nickname
      ? `お電話つながりました！こんにちは〜。こちらTCS RADIO、DJ イエローバードです。${nickname}さん、今日の応援歌は、誰に届けましょうか？`
      : "お電話つながりました！こんにちは〜。こちらTCS RADIO、DJ イエローバードです。ラジオネームを教えてもらえますか？",
  }), [nickname]);
  const messages = useMemo(() => data.conversation.length ? data.conversation : [initial], [data.conversation, initial]);
  const conversationRef = useRef(messages);
  const answersRef = useRef(data.answers);
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant") ?? initial;

  useEffect(() => { conversationRef.current = messages; }, [messages]);
  useEffect(() => { answersRef.current = data.answers; }, [data.answers]);

  async function composeProfile(snapshot = { answers: answersRef.current, conversation: conversationRef.current }) {
    if (summarizing || jobStartLock.current) return;
    jobStartLock.current = true;
    setSummarizing(true); setError("");
    try {
      const id = crypto.randomUUID();
      const pending = { id, status: "preparing" as const };
      setJob(pending); update({ musicJob: pending, result: undefined });
      const response = await fetch("/api/music-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, style, answers: snapshot.answers, conversation: snapshot.conversation }) });
      const value: unknown = await response.json();
      if (!response.ok || !isRecord(value) || typeof value.id !== "string") throw new Error(isError(value) ? value.error : "楽曲制作を開始できませんでした。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "会話内容を整理できませんでした。");
      jobStartLock.current = false;
    } finally { setSummarizing(false); }
  }

  function continueDemo() {
    if (summarizing || jobStartLock.current) return;
    jobStartLock.current = true;
    setSummarizing(true);
    demoAttempts.current += 1;
    const scenario = data.mockScenario || "quick";
    const pending = { id: `demo-${Date.now()}`, status: "generating" as const }; setJob(pending); update({ musicJob: pending });
    window.setTimeout(() => {
      const shouldFail = scenario === "fail" || (scenario === "retry-success" && demoAttempts.current === 1);
      if (shouldFail) { const failed = { ...pending, status: "failed" as const, error: "ただいま回線が混み合っています。少し時間をおいて、もう一度お試しください。" }; setJob(failed); update({ musicJob: failed }); jobStartLock.current = false; setSummarizing(false); return; }
      const complete = { ...pending, status: "ready" as const, ...demoResult(style) }; setJob(complete); update({ musicJob: complete, profile: complete.profile, result: complete.result }); setSummarizing(false);
    }, mockDelays[scenario]);
  }

  useEffect(() => {
    if (!job || !["preparing", "generating"].includes(job.status) || isDemo) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/music-jobs/${job.id}`);
        const next: unknown = await response.json();
        if (response.ok && isRecord(next) && typeof next.status === "string") {
          const typed = next as typeof job;
          setJob(typed);
          update({ musicJob: typed, profile: typed.profile, result: typed.result });
          return;
        }
        // The local server keeps jobs in memory.  A dev-server restart therefore
        // cannot be treated as an endless "selecting" state.
        if (response.status === 404) {
          const failed = { ...job, status: "failed" as const, error: "放送スタジオとの接続が切れました。会話内容はこの画面に残っています。" };
          setJob(failed);
          update({ musicJob: failed });
          setJobConnectionLost(true);
        }
      } catch {
        // A temporary polling failure must not stop the server-side music job.
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [isDemo, job, update]);

  function openResult() {
    if (!job?.result || job.status !== "ready") return;
    if (!isDemo) saveGeneratedMusic({ audioUrl: `/api/music-jobs/${job.id}/audio`, title: job.title || "AIオリジナル応援ソング", lyrics: job.lyrics || null, visualSync: job.visualSync || null, wordTimestamps: job.wordTimestamps || null });
    update({ profile: job.profile, result: job.result, musicJob: job });
    router.push("/result");
  }
  async function retryMusic() {
    if (!job) return;
    if (isDemo) { continueDemo(); return; }
    const response = await fetch(`/api/music-jobs/${job.id}/retry`, { method: "POST" });
    if (response.ok) {
      const next = { ...job, status: "generating" as const, error: undefined };
      setJob(next); update({ musicJob: next }); setJobConnectionLost(false);
    } else if (response.status === 404) {
      setJobConnectionLost(true);
      setError("この開発サーバーでは、再起動前の制作ジョブを続きから再開できません。");
    } else setError("もう一度つなげませんでした。スタッフにお知らせください。");
  }

  function restartLostJob() {
    jobStartLock.current = false;
    setJobConnectionLost(false);
    void composeProfile();
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
      return { answers, conversation };
    };
    if (role === "assistant") { append(role, text); return; }
    try {
      const response = await fetch("/api/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style, answers: answersRef.current, message: text }) });
      const value: unknown = await response.json();
      if (response.ok && isTalkResponse(value)) {
        append(role, text, value.answers);
        if (value.complete && !jobStartLock.current) {
          const transition = "ありがとう。今まで聞いた話をもとに、あなたのための一曲を準備します。";
          const frozen = append("assistant", transition);
          updateCaption("assistant", transition, true);
          void composeProfile(frozen);
        }
      }
      else append(role, text);
    } catch { append(role, text); }
  }

  function updateCaption(role: "user" | "assistant", transcript: string, final: boolean) {
    setCaption({ role, text: transcript });
    if (final) window.setTimeout(() => setCaption((current) => current?.role === role && current.text === transcript ? null : current), 4000);
  }

  function correctNickname(nickname: string) {
    const answers = { ...answersRef.current, nickname: nickname.slice(0, 24) };
    answersRef.current = answers;
    update({ answers });
  }

  const assistantIsSpeaking = caption?.role === "assistant";
  const userIsSpeaking = caption?.role === "user";
  const line = job?.status === "ready"
    ? "お待たせしました。今夜のあなたへの一曲、どうぞ。"
    : assistantIsSpeaking ? caption.text : latestAssistant.text;

  return <Stage minimal>
    <section className={`vn-scene radio-dj ${style}`}>
      <div className="radio-dj-background" aria-hidden="true" />
      <div className="vn-vignette" aria-hidden="true" />
      <div className="radio-console" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="dj-bird-placeholder" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div>
      <div className="radio-on-air" aria-hidden="true"><b>ON AIR</b><span>LIVE CALL</span></div>
      <div className="vn-topline"><span>TCS RADIO · LIVE CALL</span><span>90 SECOND ANTHEM</span></div>
      <div className="vn-dialogue">
        <div className="vn-nameplate assistant"><span>DJ イエローバード</span><small>TCS RADIO · LIVE ON AIR</small></div>
        <p className="vn-line" aria-live="polite">{line}</p>
        {userIsSpeaking && <p className="vn-listening" role="status"><b>CALLER ON LINE</b><span>あなたの声を聞いています</span></p>}
        {job && job.status !== "ready" && <p className="talk-phase" role="status"><b>ON AIR · 選曲中</b><span>あなたの話をもとに、一曲を整えています。このままDJとの会話は続けられます。</span></p>}
        <div className="vn-controls">
          {isDemo ? <DemoVoice onComplete={continueDemo} onTranscript={saveTranscript} onLiveTranscript={updateCaption} /> : <RealtimeVoice style={style} nickname={nickname} phase={job ? "waiting" : "interview"} autoStart guidance={job?.status === "ready" ? "ready" : undefined} onTranscript={saveTranscript} onLiveTranscript={updateCaption} />}
          {job?.status === "ready" && <button className="vn-finish" onClick={openResult}>今夜の一曲を聴く　→</button>}
        </div>
        {!job && !nickname && <label className="nickname-check">呼び名の聞き取り確認・修正<input value={data.answers.nickname} onChange={(event) => correctNickname(event.target.value)} placeholder="例：かいかい" maxLength={24} /></label>}
        {isDemo && !job && <label className="mock-control">モック検証用<select value={data.mockScenario || "quick"} onChange={(event) => update({ mockScenario: event.target.value as MockScenario })}>{(Object.keys(mockLabels) as MockScenario[]).map((scenario) => <option key={scenario} value={scenario}>{mockLabels[scenario]}</option>)}</select></label>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        {job?.status === "failed" && <p className="inline-error" role="alert">{job.error || "曲の準備がうまくいきませんでした。"}<button className="vn-finish" onClick={retryMusic}>もう一度つなぐ</button>{jobConnectionLost && <button className="vn-finish" onClick={restartLostJob}>会話内容からもう一度準備する</button>}</p>}
        <details className="vn-history">
          <summary>会話ログを見る <span>{messages.length}</span></summary>
          <div>{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role}><b>{message.role === "assistant" ? "DJ イエローバード" : "あなた"}</b>{message.text}</p>)}</div>
        </details>
      </div>
    </section>
  </Stage>;
}

function isError(value: unknown): value is { error: string } { return !!value && typeof value === "object" && "error" in value && typeof (value as { error?: unknown }).error === "string"; }
function isTalkResponse(value: unknown): value is { reply: string; answers: Answers; complete: boolean } { return !!value && typeof value === "object" && typeof (value as { reply?: unknown }).reply === "string" && typeof (value as { complete?: unknown }).complete === "boolean" && !!(value as { answers?: unknown }).answers && typeof (value as { answers: unknown }).answers === "object"; }
