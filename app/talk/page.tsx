"use client";
import { formatRadioCaption, radioDj, radioShow, radioStation } from "@/lib/radio-brand";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { RealtimeVoice } from "@/components/realtime-voice";
import { DemoVoice } from "@/components/demo-voice";
import { useSession } from "@/components/session";
import { isSongWithdrawal, parseSongMaterial, type SongMaterial } from "@/lib/song-material";
import { demoResult } from "@/lib/demo";
import { saveGeneratedMusic } from "@/lib/music-runtime";
import { isRecord } from "@/lib/validation";
import type { MockScenario, Style } from "@/lib/types";

const mockDelays: Record<MockScenario, number> = { quick: 2300, wait30: 30_000, wait120: 120_000, fail: 2300, "retry-success": 2300, "audio-fail": 2300 };
const mockLabels: Record<MockScenario, string> = { quick: "短時間で成功", wait30: "30秒待って成功", wait120: "120秒待って成功", fail: "失敗", "retry-success": "一度失敗して再試行", "audio-fail": "再生失敗" };

export default function TalkPage() {
  return <Guard level="talk"><TalkInterview /></Guard>;
}

function TalkInterview() {
  const { data, update } = useSession();
  const router = useRouter();
  const [summarizing, setSummarizing] = useState(false);
  const [materialCheck, setMaterialCheck] = useState("発言待ち");
  const [pollFailure, setPollFailure] = useState(false);
  const [introductionProgress, setIntroductionProgress] = useState<"requested" | "speaking" | "interrupted">();
  const introductionLabel = introductionProgress === "speaking" ? "DJが紹介中" : introductionProgress === "requested" ? "DJの発話開始待ち" : introductionProgress === "interrupted" ? "中断後の会話の区切り待ち" : "会話の区切り待ち";
  const [caption, setCaption] = useState<{ role: "user" | "assistant"; text: string } | null>(null);
  const [error, setError] = useState("");
  const [jobConnectionLost, setJobConnectionLost] = useState(false);
  const [job, setJob] = useState(data.musicJob);
  const jobStartLock = useRef(Boolean(data.musicJob));
  const selection = useRef<AbortController | null>(null);
  const jobRequest = useRef<AbortController | null>(null);
  const abandonedJob = useRef<string | undefined>(undefined);
  const [preparedAudio, setPreparedAudio] = useState<{ id: string; url: string }>();
  const [voiceFallback, setVoiceFallback] = useState(false);
  const showVoiceFallback = useCallback(() => setVoiceFallback(true), []);
  const [audioAttempt, setAudioAttempt] = useState(0);
  const transferredAudio = useRef<string | undefined>(undefined);
  useEffect(() => () => {
    selection.current?.abort();
    jobRequest.current?.abort();
  }, []);
  const style = data.style as Style;
  const isDemo = data.mode === "demo";
  const nickname = data.answers.nickname.trim();
  const messages = data.conversation;
  const conversationRef = useRef(messages);
  const answersRef = useRef(data.answers);
  const getWaitingContext = useCallback(() => {
    const turns = conversationRef.current;
    const lastWithdrawal = turns.findLastIndex(({ role, text }) => role === "user" && isSongWithdrawal(text));
    return JSON.stringify(turns.slice(lastWithdrawal + 1).slice(-4).map(({ role, text }) => ({ role, text: text.slice(0, 200) })));
  }, []);
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  useEffect(() => { conversationRef.current = messages; }, [messages]);
  useEffect(() => { answersRef.current = data.answers; }, [data.answers]);

  async function composeProfile(material: SongMaterial) {
    if (jobStartLock.current) return;
    jobStartLock.current = true;
    const controller = new AbortController();
    jobRequest.current = controller;
    setSummarizing(true); setError("");
    try {
      const id = crypto.randomUUID();
      const response = await fetch("/api/music-jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, style, material }), signal: controller.signal,
      });
      const value: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !isRecord(value) || value.id !== id) throw new Error(isError(value) ? value.error : "楽曲制作を開始できませんでした。");
      const pending = { id, status: "preparing" as const };
      setJob(pending);
      setVoiceFallback(false);
      setIntroductionProgress(undefined);
      setPollFailure(false);
      update({ musicJob: pending, songMaterial: material, result: undefined });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "楽曲制作を開始できませんでした。");
      jobStartLock.current = false;
      update({ songMaterial: material });
    } finally {
      if (jobRequest.current === controller) {
        jobRequest.current = null;
        setSummarizing(false);
      }
    }
  }

  function continueDemo() {
    if (summarizing || (jobStartLock.current && job?.status !== "failed")) return;
    jobStartLock.current = true;
    setSummarizing(true);
    const attempt = job?.status === "failed" ? "retry" : "first";
    const pending = { id: `demo-${attempt}-${Date.now()}`, status: "generating" as const };
    setJob(pending);
    update({ musicJob: pending });
  }

  useEffect(() => {
    if (!isDemo || job?.status !== "generating") return;
    const scenario = data.mockScenario || "quick";
    const startedAt = Number(job.id.split("-").at(-1));
    const remaining = Number.isFinite(startedAt)
      ? Math.max(0, startedAt + mockDelays[scenario] - Date.now())
      : mockDelays[scenario];
    const timer = window.setTimeout(() => {
      if (scenario === "fail" || (scenario === "retry-success" && !job.id.startsWith("demo-retry-"))) {
        const failed = { ...job, status: "failed" as const, error: "ただいま回線が混み合っています。少し時間をおいて、もう一度お試しください。" };
        setJob(failed);
        update({ musicJob: failed });
        jobStartLock.current = false;
      } else {
        const complete = { ...job, status: "ready" as const, ...demoResult(style) };
        setJob(complete);
        update({ musicJob: complete, profile: complete.profile, result: complete.result });
      }
      setSummarizing(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [data.mockScenario, isDemo, job, style, update]);

  useEffect(() => {
    if (!job || !["preparing", "generating"].includes(job.status) || isDemo) return;
    const controller = new AbortController();
    let polling = false;
    const timer = window.setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(`/api/music-jobs/${job.id}`, { signal: controller.signal });
        const next: unknown = await response.json();
        if (controller.signal.aborted || abandonedJob.current === job.id) return;
        setPollFailure(!response.ok);
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
        if (!controller.signal.aborted) setPollFailure(true);
      } finally {
        polling = false;
      }
    }, 1200);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [isDemo, job, update]);

  const readyJob = job?.status === "ready" ? job : undefined;
  const audioPath = readyJob && (isDemo
    ? data.mockScenario === "audio-fail" ? "/audio/radio-unavailable.wav" : style === "female_idol" ? "/audio/idol-demo.wav" : "/audio/cheer-demo.wav"
    : `/api/music-jobs/${readyJob.id}/audio`);

  useEffect(() => {
    if (!readyJob || !audioPath) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    let url: string | undefined;
    async function preload(path: string, id: string) {
      try {
        const response = await fetch(path, { signal });
        if (!response.ok) throw new Error("Audio not available");
        const blob = await response.blob();
        signal.throwIfAborted();
        url = URL.createObjectURL(blob);
        const audio = new Audio();
        try {
          await new Promise<void>((resolve, reject) => {
            audio.addEventListener("canplay", () => resolve(), { once: true, signal });
            audio.addEventListener("error", () => reject(new Error("Audio not playable")), { once: true, signal });
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
            audio.preload = "auto";
            audio.src = url!;
          });
        } finally {
          audio.removeAttribute("src");
          audio.load();
        }
        signal.throwIfAborted();
        setError("");
        setPreparedAudio({ id, url });
      } catch {
        if (url) URL.revokeObjectURL(url);
        if (!controller.signal.aborted) setError("音源を読み込めませんでした。");
      }
    }
    void preload(audioPath, readyJob.id);
    return () => {
      controller.abort();
      if (url && transferredAudio.current !== url) URL.revokeObjectURL(url);
    };
  }, [audioAttempt, audioPath, readyJob]);

  const playable = Boolean(readyJob && preparedAudio?.id === readyJob.id);
  const openResult = useCallback(() => {
    if (!readyJob?.result || !preparedAudio || preparedAudio.id !== readyJob.id || abandonedJob.current === readyJob.id || transferredAudio.current) return;
    transferredAudio.current = preparedAudio.url;
    saveGeneratedMusic({ audioUrl: preparedAudio.url, title: readyJob.title || (isDemo ? "TCS フルスロットル！" : "AIオリジナル応援ソング"), lyrics: readyJob.lyrics || null, visualSync: readyJob.visualSync || null, wordTimestamps: readyJob.wordTimestamps || null });
    update({ profile: readyJob.profile, result: readyJob.result, musicJob: readyJob });
    router.replace("/result?play=1");
  }, [isDemo, preparedAudio, readyJob, router, update]);

  useEffect(() => {
    if (!isDemo || !playable) return;
    const timer = window.setTimeout(openResult, 2400);
    return () => window.clearTimeout(timer);
  }, [isDemo, openResult, playable]);

  async function retryMusic() {
    if (!job) return;
    if (isDemo) { continueDemo(); return; }
    try {
      const response = await fetch(`/api/music-jobs/${job.id}/retry`, { method: "POST" });
      if (abandonedJob.current === job.id) return;
      if (response.status === 404) {
        setJobConnectionLost(true);
        setError("制作ジョブが見つかりません。会話内容からもう一度準備できます。");
        return;
      }
      if (!response.ok) throw new Error("Retry failed");
      const value = await response.json() as typeof job;
      if (abandonedJob.current === job.id) return;
      setJob(value);
      update({ musicJob: value, profile: value.profile, result: value.result });
      setJobConnectionLost(false);
      setError("");
    } catch {
      setError("もう一度つなげませんでした。スタッフにお知らせください。");
    }
  }

  function restartLostJob() {
    if (!data.songMaterial) return;
    jobStartLock.current = false;
    setJobConnectionLost(false);
    void composeProfile(data.songMaterial);
  }

  async function saveTranscript(role: "user" | "assistant", transcript: string) {
    const text = transcript.trim().slice(0, 500);
    if (!text) return;
    const conversation = [...conversationRef.current, { role, text }];
    conversationRef.current = conversation;
    update({ conversation });
    if (role === "assistant" || isDemo) return;
    if (isSongWithdrawal(text)) {
      abandonedJob.current = job?.id;
      selection.current?.abort();
      jobRequest.current?.abort();
      setMaterialCheck("題材を取り消しました");
      jobStartLock.current = false;
      setSummarizing(false);
      setJob(undefined);
      setError("");
      setJobConnectionLost(false);
      setVoiceFallback(false);
      update({ musicJob: undefined, songMaterial: undefined, profile: undefined, result: undefined });
      return;
    }
    if (jobStartLock.current) return;
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setMaterialCheck("本人の発言を判定中");
    try {
      const withdrawal = conversation.findLastIndex((message) => message.role === "user" && isSongWithdrawal(message.text));
      const response = await fetch("/api/talk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songConversation: conversation.slice(withdrawal + 1).slice(-10) }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(22_000)]),
      });
      const value: unknown = await response.json();
      if (controller.signal.aborted || jobStartLock.current) return;
      if (!response.ok || !isRecord(value) || !("material" in value)) {
        setMaterialCheck(`題材判定の応答エラー（HTTP ${response.status}）`);
        return;
      }
      const material = parseSongMaterial(value.material);
      setMaterialCheck(material ? "題材が揃いました" : "題材または具体的な場面を聞き取り中");
      if (material) void composeProfile(material);
    } catch {
      if (!controller.signal.aborted) setMaterialCheck("題材判定の通信エラーまたはタイムアウト");
    }
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
  const readyLine = `${nickname ? nickname + "さん。" : ""}あなたのための一曲をお届けします。`;
  const line = assistantIsSpeaking ? caption.text : isDemo && playable ? `さて、${nickname || "リスナー"}さん。ここで一曲。${readyLine}` : formatRadioCaption(latestAssistant?.text ?? "");

  return <Stage minimal>
    <section className={`vn-scene radio-dj ${style}`}>
      <div className="radio-dj-background" aria-hidden="true" />
      <div className="vn-vignette" aria-hidden="true" />
      <div className="radio-console" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="dj-bird-placeholder" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div>
      <div className="radio-on-air" aria-hidden="true"><b>ON AIR</b><span>STUDIO</span></div>
      <div className="vn-topline"><span>{radioStation} · {radioShow}</span><span>90 SECOND ANTHEM</span></div>
      <div className="vn-dialogue">
        <div className="vn-nameplate assistant"><span>{radioDj}</span><small>{radioShow} · ON AIR</small></div>
        <p className="vn-line" aria-live="polite">{line}</p>
        {userIsSpeaking && <p className="vn-listening" role="status"><b>IN STUDIO</b><span>あなたの声を聞いています</span></p>}
        <div className="vn-controls">
          {isDemo ? <DemoVoice autoStart={!job} nickname={nickname} onComplete={continueDemo} onTranscript={saveTranscript} onLiveTranscript={updateCaption} /> : <RealtimeVoice style={style} nickname={nickname} phase={job ? "waiting" : "interview"} autoStart guidance={playable ? "ready" : job && job.status !== "failed" ? "create" : undefined} material={data.songMaterial} getWaitingContext={getWaitingContext} onIntroductionEnded={openResult} onIntroductionProgress={process.env.NODE_ENV === "development" ? setIntroductionProgress : undefined} onIntroductionUnavailable={showVoiceFallback} onTranscript={saveTranscript} onLiveTranscript={updateCaption} />}
          {playable && voiceFallback && <button className="vn-finish" onClick={openResult}>今夜の一曲を聴く　→</button>}
        </div>
        {!job && !nickname && <label className="nickname-check">呼び名の聞き取り確認・修正<input value={data.answers.nickname} onChange={(event) => correctNickname(event.target.value)} placeholder="例：かいかい" maxLength={24} /></label>}
        {isDemo && !job && <label className="mock-control">モック検証用<select value={data.mockScenario || "quick"} onChange={(event) => update({ mockScenario: event.target.value as MockScenario })}>{(Object.keys(mockLabels) as MockScenario[]).map((scenario) => <option key={scenario} value={scenario}>{mockLabels[scenario]}</option>)}</select></label>}
        {error && <p className="inline-error" role="alert">{error}
          {readyJob && !playable && <button className="vn-finish" onClick={() => setAudioAttempt((value) => value + 1)}>もう一度読み込む</button>}
          {!job && data.songMaterial && <button className="vn-finish" onClick={restartLostJob}>もう一度つなぐ</button>}
        </p>}
        {job?.status === "failed" && <p className="inline-error" role="alert">{job.error || "曲の準備がうまくいきませんでした。"}<button className="vn-finish" onClick={retryMusic}>もう一度つなぐ</button>{jobConnectionLost && data.songMaterial && <button className="vn-finish" onClick={restartLostJob}>会話内容からもう一度準備する</button>}</p>}
        {process.env.NODE_ENV === "development" && (
          <details className="radio-diagnostics">
            <summary>進行状況（開発用）</summary>
            <ul>
              <li>題材判定 {materialCheck}</li>
              <li>楽曲制作 {job?.status ?? (summarizing ? "開始リクエスト中" : error && data.songMaterial ? "開始失敗" : "未開始")}{pollFailure && "（状態の取得に失敗）"}</li>
              <li>音源 {playable ? "再生可能" : readyJob ? error ? "読み込み失敗" : "読み込み中" : "未取得"}</li>
              <li>曲紹介 {playable ? voiceFallback ? "音声案内なし・手動で再生へ" : introductionLabel : "待機"}</li>
            </ul>
          </details>
        )}
        <details className="vn-history">
          <summary>会話ログを見る <span>{messages.length}</span></summary>
          <div>{messages.map((message, index) => <p key={`${message.role}-${index}`} className={message.role}><b>{message.role === "assistant" ? radioDj : "あなた"}</b>{message.role === "assistant" ? formatRadioCaption(message.text) : message.text}</p>)}</div>
        </details>
      </div>
    </section>
  </Stage>;
}

function isError(value: unknown): value is { error: string } { return !!value && typeof value === "object" && "error" in value && typeof (value as { error?: unknown }).error === "string"; }
