"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { Stage } from "./shell";
import { RealtimeVoice } from "./realtime-voice";
import { DemoVoice } from "./demo-voice";
import { characters } from "@/lib/themes";
import { demoResult } from "@/lib/demo";
import { saveGeneratedMusic } from "@/lib/music-runtime";
import { isRecord, parseCreativeBrief, parseSubmission } from "@/lib/validation";

class GenerationError extends Error {}
async function post(url: string, body: unknown, signal: AbortSignal): Promise<unknown> { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }); const value: unknown = await response.json(); if (!response.ok) throw new GenerationError(isRecord(value) && typeof value.error === "string" ? value.error : "生成できませんでした。もう一度お試しください。"); return value; }

export function Generation() {
  const { data, update } = useSession();
  const router = useRouter();
  const { consent, answers, profile, style, mode } = data;
  const [attempt, setAttempt] = useState(0);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const conversationRef = useRef(data.conversation);

  useEffect(() => { conversationRef.current = data.conversation; }, [data.conversation]);
  useEffect(() => {
    const controller = new AbortController(); let disposed = false;
    const timer = window.setTimeout(async () => {
      setError(""); setStage(0);
      try {
        if (mode === "demo") {
          await new Promise((resolve) => window.setTimeout(resolve, 900));
          if (disposed) return;
          setStage(1);
          await new Promise((resolve) => window.setTimeout(resolve, 900));
          if (disposed) return;
          setStage(2);
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
          if (disposed || !style) return;
          setStage(3); update(demoResult(style)); router.replace("/result"); return;
        }
        const input = parseSubmission({ consent, answers, profile, style });
        setStage(1);
        const response = await post("/api/generate-brief", input, controller.signal);
        if (!isRecord(response) || (response.mode !== "mock" && response.mode !== "live")) throw new GenerationError("楽曲設計書のデータを確認できませんでした。");
        const brief = parseCreativeBrief(response.brief);
        if (brief.style !== input.style) throw new GenerationError("スタイルを確認できませんでした。");
        if (disposed) return;
        setStage(2);
        const musicResponse = await fetch("/api/generate-music", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: brief.elevenMusicPrompt }), signal: controller.signal });
        if (!musicResponse.ok) { const value: unknown = await musicResponse.json().catch(() => null); throw new GenerationError(isRecord(value) && typeof value.error === "string" ? value.error : "音楽を生成できませんでした。"); }
        const music = await musicResponse.formData(); const audio = music.get("audio");
        if (!(audio instanceof Blob) || !audio.type.startsWith("audio/")) throw new GenerationError("音源データを確認できませんでした。");
        saveGeneratedMusic({ audioUrl: URL.createObjectURL(audio), title: typeof music.get("title") === "string" ? music.get("title") as string : "AIオリジナル応援ソング", lyrics: typeof music.get("lyrics") === "string" ? music.get("lyrics") as string : null, visualSync: typeof music.get("visualSync") === "string" ? music.get("visualSync") as string : null, wordTimestamps: typeof music.get("wordTimestamps") === "string" ? music.get("wordTimestamps") as string : null });
        if (disposed) return;
        setStage(3); update({ result: { brief, briefMode: response.mode } }); router.replace("/result");
      } catch (exception) {
        if (disposed) return;
        setError(controller.signal.aborted ? "時間がかかりすぎたため、生成を停止しました。" : exception instanceof GenerationError ? exception.message : "通信に失敗しました。接続を確認して再試行してください。");
      }
    }, 0);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
  }, [attempt, answers, consent, mode, profile, router, style, update]);

  const character = style ? characters[style] : characters.male_cheer_squad;
  const steps = ["想いを読み解く", "サウンドを描く", "楽曲を生成する", "再生の準備"];
  const background = style === "female_idol" ? "/backgrounds/idol-stage-empty.png" : "/backgrounds/cheer-captain-field-empty.png";
  const canTalk = stage === 2 && !error;
  function saveWaitingTranscript(role: "user" | "assistant", text: string) { const trimmed = text.trim(); if (!trimmed) return; const conversation = [...conversationRef.current, { role, text: trimmed }]; conversationRef.current = conversation; update({ conversation }); }

  return <Stage minimal><section className={`generation-scene ${style || "male_cheer_squad"}`}><div className="generation-background" style={{ backgroundImage: `linear-gradient(110deg,#050b15dd,#0b102493 56%,#170e1ebf),url('${background}')` }} /><img className="generation-character" src={character.image} alt="" /><div className="generation-panel"><p className="kicker">CREATING YOUR MUSIC</p><h1>{error ? "もう一度、音を紡ごう" : stage < 2 ? "応援歌を設計中" : "音楽を生成中"}</h1><p>{error ? "会話の内容はそのまま残っています。" : stage < 2 ? "会話から受け取った想いを、90秒の一曲へ設計しています。" : "曲を仕上げている間も、キャラと話して待てます。ここでの会話は現在生成中の曲には反映されません。"}</p><ol className="generation-list">{steps.map((label, index) => <li className={index < stage ? "done" : index === stage && !error ? "now" : ""} key={label}><span>{index < stage ? "✓" : index + 1}</span>{label}{index === stage && !error && <i>NOW</i>}</li>)}</ol>{canTalk && <div className="generation-talk">{mode === "demo" ? <DemoVoice characterName={character.name} onTranscript={saveWaitingTranscript} onLiveTranscript={(_, text) => setCaption(text)} /> : <RealtimeVoice style={character.id} onTranscript={saveWaitingTranscript} onLiveTranscript={(_, text) => setCaption(text)} />}{caption && <p>{caption}</p>}</div>}{error && <div className="generation-error" role="alert">{error}<button className="button warm" onClick={() => setAttempt((count) => count + 1)}>もう一度生成する</button></div>}</div><p className="generation-caption">{character.name} が、あなたのための一曲を準備中…</p></section></Stage>;
}
