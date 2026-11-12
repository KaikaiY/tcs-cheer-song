"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import { clearGeneratedMusic, readGeneratedMusic } from "@/lib/music-runtime";

export default function ResultPage() { return <Guard level="result"><BriefResult /></Guard>; }
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
type LyricSection = { name: string; lines: string[] };
function parseLyrics(value: string | null): LyricSection[] { if (!value) return []; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is LyricSection => !!item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && Array.isArray((item as { lines?: unknown }).lines)) : []; } catch { return []; } }
async function copyText(text: string) { await navigator.clipboard?.writeText(text); }

function BriefResult() {
  const { data, reset } = useSession(); const router = useRouter(); const [copied, setCopied] = useState(""); const audio = useRef<HTMLAudioElement>(null);
  const music = readGeneratedMusic(); const { brief } = data.result!; const character = characters[brief.style]; const lyrics = parseLyrics(music?.lyrics ?? null);
  async function copy(label: string, text: string) { try { await copyText(text); setCopied(`${label}をコピーしました`); } catch { setCopied("コピーできませんでした。"); } }
  function finish() { clearGeneratedMusic(); reset(); router.replace("/"); }
  return <Stage minimal><section className={`result-scene ${brief.style}`}><div className="result-background" style={{ backgroundImage: `linear-gradient(120deg,#060b15dc,#17102799),url('${brief.style === "male_cheer_squad" ? "/backgrounds/cheer-captain-field-empty.png" : "/backgrounds/idol-stage-empty.png"}')` }} /><img className="result-character" src={character.image} alt="" /><main className="result-panel"><p className="kicker">YOUR PERSONAL ANTHEM</p><h1>{music?.title || "応援歌の設計が完成"}</h1><p className="result-lead">{music ? `${character.name}から、あなたへ。90秒の応援歌です。` : "デモ用の楽曲設計と映像タイムラインを表示しています。"}</p>{music?.audioUrl ? <div className="result-player"><audio ref={audio} src={music.audioUrl} controls preload="metadata" /><small>生成済み音源</small></div> : <div className="result-demo-audio">♪ デモモードでは音源を再生しません</div>}{lyrics.length > 0 && <details className="result-details"><summary>歌詞を見る</summary>{lyrics.map((section, index) => <section key={`${section.name}-${index}`}><b>{section.name}</b><p>{section.lines.join("\n")}</p></section>)}</details>}<details className="result-details"><summary>音楽AIへのプロンプトを見る</summary><textarea readOnly value={brief.elevenMusicPrompt} aria-label="Eleven Music用プロンプト" /><button onClick={() => copy("プロンプト", brief.elevenMusicPrompt)}>コピー</button></details><details className="result-details"><summary>仮の映像タイムラインを見る</summary><ol>{brief.timeline.map((item) => <li key={item.id}><time>{clock(item.startSeconds)}–{clock(item.endSeconds)}</time><b>{item.label}</b><span>{item.visualCategory}</span></li>)}</ol></details><p className="copy-notice" role="status">{copied}</p><button className="result-finish" onClick={finish}>最初に戻る</button></main></section></Stage>;
}
