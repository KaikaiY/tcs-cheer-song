"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { clearGeneratedMusic, readGeneratedMusic } from "@/lib/music-runtime";
import { buildLyricCues, type LyricSection } from "@/lib/lyric-sync";

export default function ResultPage() { return <Guard level="result"><MusicVideo /></Guard>; }

type MusicSource = { audioUrl: string; title: string; lyrics: string | null };
const demoLyrics: LyricSection[] = [
  { name: "INTRO", lines: ["さあ行こう　TCSフェスへ", "小さな一歩が　未来を変える"] },
  { name: "VERSE", lines: ["かいかい　積み重ねた日々", "開発の先に　笑顔が待ってる"] },
  { name: "CHORUS", lines: ["がんばれ！　まだ進める", "みんなの想いを　ひとつにして", "がんばれ！　きみならできる", "成功のその瞬間へ"] },
];
function parseLyrics(value: string | null): LyricSection[] { if (!value) return []; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is LyricSection => !!item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && Array.isArray((item as { lines?: unknown }).lines)) : []; } catch { return []; } }

function MusicVideo() {
  const { data, reset } = useSession();
  const router = useRouter();
  const audio = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(90);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [audioError, setAudioError] = useState("");
  const saved = readGeneratedMusic();
  const job = data.musicJob;
  const generated: (MusicSource & { wordTimestamps: string | null }) | null = saved ? { ...saved, wordTimestamps: saved.wordTimestamps } : (job?.status === "ready" && job.result ? { audioUrl: `/api/music-jobs/${job.id}/audio`, title: job.title || "AIオリジナル応援ソング", lyrics: job.lyrics || null, wordTimestamps: job.wordTimestamps || null } : null);
  const isDemo = data.mode === "demo";
  const demoAudioUrl = data.mockScenario === "audio-fail" ? "/audio/radio-unavailable.wav" : data.style === "female_idol" ? "/audio/idol-demo.wav" : "/audio/cheer-demo.wav";
  const source: (MusicSource & { wordTimestamps: string | null }) | null = generated || (isDemo ? { audioUrl: demoAudioUrl, title: data.style === "female_idol" ? "きらめくエール" : "TCS フルスロットル！", lyrics: JSON.stringify(demoLyrics), wordTimestamps: null } : null);
  const result = data.result || job?.result;
  if (!result || !source) return null;
  const style = result.brief.style;
  const sections = parseLyrics(source.lyrics);
  const cues = buildLyricCues(sections, source.wordTimestamps, duration);
  const activeCue = cues.find((cue) => currentTime >= cue.startSeconds && currentTime < cue.endSeconds) || cues.find((cue) => cue.startSeconds > currentTime) || cues.at(-1);
  const activeLine = activeCue?.text || "まもなく歌詞が表示されます";

  function toggle() {
    if (!audio.current) return;
    if (audio.current.paused) {
      audio.current.play().then(() => { setEnded(false); }).catch(() => setAudioError("音源を届けられませんでした。もう一度、放送をつなぎ直してください。"));
    } else audio.current.pause();
  }
  function finish() { clearGeneratedMusic(); reset(); router.replace("/"); }
  function retryAudio() { setAudioError(""); audio.current?.load(); }
  const remaining = Math.max(0, duration - currentTime);

  return <Stage minimal><section className={`mv-scene ${style}`}>
    <div className="mv-video radio-booth-backdrop" aria-hidden="true" />
    <div className="mv-shade" />
    <div className="dj-bird-placeholder dj-bird-result" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div>
    <header className="mv-header radio-mv-header"><span>TCS RADIO 90.0</span><b>ON AIR · YOUR ANTHEM</b><span>{isDemo ? "DEMO BROADCAST" : "LIVE BROADCAST"}</span></header>
    <div className={`radio-play-meter${playing ? " is-playing" : ""}`} aria-label={playing ? "再生中" : "停止中"}><i /><i /><i /><i /><i /></div>
    <main className="mv-center">
      <div className={`mv-title-card${hasStarted ? " is-hidden" : ""}`} aria-hidden={hasStarted}><p>TCS RADIO · NOW PLAYING</p><h1>{source.title}</h1><span>DJから、あなたへの一曲です</span></div>
      <div className="mv-caption" aria-live="polite"><span>{activeCue?.section || "LYRICS"}{activeCue?.synced ? " · SYNCED" : " · DEMO TIMING"}</span><strong>{activeLine}</strong></div>
      {ended && <p className="radio-signoff" role="status">以上、あなたのための一曲でした。今日の一歩を、TCS RADIOは応援しています。</p>}
    </main>
    <footer className="mv-controls">
      <button className="mv-play" onClick={toggle} aria-label={playing ? "一時停止" : "再生"}>{playing ? "Ⅱ" : "▶"}</button>
      <div className="mv-progress"><input aria-label="再生位置" type="range" min="0" max={duration} step="0.1" value={currentTime} onChange={(event) => { const time = Number(event.target.value); if (audio.current) audio.current.currentTime = time; setCurrentTime(time); }} /><span>残り {Math.floor(remaining / 60)}:{String(Math.floor(remaining % 60)).padStart(2, "0")}</span></div>
      <button className="mv-end" onClick={finish}>放送を終える</button>
    </footer>
    <audio ref={audio} src={source.audioUrl} preload="metadata" onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 90)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => { setHasStarted(true); setPlaying(true); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCurrentTime(duration); setEnded(true); }} onError={() => setAudioError("音源を届けられませんでした。もう一度、放送をつなぎ直してください。")} />
    {audioError && <p className="mv-error" role="alert">{audioError}<button onClick={retryAudio}>もう一度つなぐ</button></p>}
    <details className="mv-details"><summary>歌詞・楽曲設計を見る</summary><div>{sections.map((section, index) => <section key={`${section.name}-${index}`}><b>{section.name}</b><p>{section.lines.join("\n")}</p></section>)}</div></details>
  </section></Stage>;
}
