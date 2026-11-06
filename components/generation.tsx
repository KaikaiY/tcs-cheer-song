"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session";
import { Stage } from "./shell";
import { characters } from "@/lib/themes";
import { isRecord, parseCreativeBrief, parseSubmission } from "@/lib/validation";
class GenerationError extends Error {}
async function post(url: string, body: unknown, signal: AbortSignal): Promise<unknown> { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }); const value: unknown = await response.json(); if (!response.ok) throw new GenerationError(isRecord(value) && typeof value.error === "string" ? value.error : "生成できませんでした。もう一度お試しください。"); return value; }
export function Generation() {
  const { data, update } = useSession(); const router = useRouter(); const { consent, answers, style } = data; const [attempt, setAttempt] = useState(0); const [stage, setStage] = useState(0); const [error, setError] = useState(""); const active = useRef(false);
  useEffect(() => { const controller = new AbortController(); let disposed = false; const timer = setTimeout(async () => { active.current = true; setError(""); setStage(0); try { const input = parseSubmission({ consent, answers, style }); setStage(1); const response = await post("/api/generate-brief", input, controller.signal); if (!isRecord(response) || (response.mode !== "mock" && response.mode !== "live")) throw new GenerationError("楽曲設計書のデータを確認できませんでした。"); const brief = parseCreativeBrief(response.brief); if (brief.style !== input.style) throw new GenerationError("スタイルを確認できませんでした。"); if (disposed) return; setStage(2); update({ result: { brief, briefMode: response.mode } }); active.current = false; router.replace("/result"); } catch (exception) { if (disposed) return; active.current = false; setError(controller.signal.aborted ? "時間がかかりすぎたため、生成を停止しました。" : exception instanceof GenerationError ? exception.message : "通信に失敗しました。接続を確認して再試行してください。"); } }, 0); return () => { disposed = true; clearTimeout(timer); controller.abort(); }; }, [attempt, answers, consent, router, style, update]);
  const character = style ? characters[style] : characters.male_cheer_squad; const steps = ["回答の整理", "楽曲設計書の作成", "コピーの準備"];
  return <Stage progress={86}><section className="generation-slide"><div className={`waiting-character ${style || "male_cheer_squad"}`}><img src={character.image} alt="" /></div><div><p className="kicker">PREPARING YOUR MUSIC BRIEF</p><h1>{error ? "生成をやり直せます" : "楽曲設計書を作っています"}</h1><p>{error ? "回答はそのまま残っています。" : "Eleven Musicで応援歌を作るための指示を準備しています。"}</p><ol className="generation-list">{steps.map((label, index) => <li className={index < stage ? "done" : index === stage && !error ? "now" : ""} key={label}><span>{index < stage ? "✓" : index + 1}</span>{label}{index === stage && !error && <i>処理中</i>}</li>)}</ol>{error && <div className="generation-error" role="alert">{error}<button className="button warm" onClick={() => setAttempt((count) => count + 1)}>もう一度生成する</button></div>}</div></section></Stage>;
}
