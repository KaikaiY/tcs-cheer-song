"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters, playbackFrame } from "@/lib/themes";
export default function ResultPage() { return <Guard level="result"><Player /></Guard>; }
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
function Player() {
  const { data, reset } = useSession(); const router = useRouter(); const audio = useRef<HTMLAudioElement>(null); const [time, setTime] = useState(0); const [playing, setPlaying] = useState(false); const [volume, setVolume] = useState(0.9); const [showLyrics, setShowLyrics] = useState(false); const result = data.result!; const { song, music } = result; const frame = playbackFrame(song, time); const character = characters[song.style];
  useEffect(() => { const element = audio.current; return () => element?.pause(); }, []);
  function toggle() { if (!audio.current) return; if (audio.current.paused) void audio.current.play(); else audio.current.pause(); }
  function finish() { audio.current?.pause(); reset(); router.replace("/"); }
  return <Stage progress={100}><section className={`player-slide ${song.style} ${frame.chorus ? "is-chorus" : ""}`}><div className="player-character"><img src={character.image} alt={character.name} /></div><div className="player-center"><p className="section-name">{frame.section}</p><h1>{song.title}</h1><p className="active-lyric">{frame.line}</p><p className="player-message">{character.name}が、あなたにエールを送っています</p></div><aside className="player-side"><span>{character.vocalType}ボーカル・{character.musicStyle}</span><button className="lyrics-toggle" onClick={() => setShowLyrics(!showLyrics)}>{showLyrics ? "歌詞を閉じる" : "歌詞を表示"}</button>{showLyrics && <div className="lyrics-list">{song.sections.map((section) => <div key={section.id}><b>{section.label}</b>{section.lines.map((line) => <p key={line}>{line}</p>)}</div>)}</div>}</aside><div className="player-bar"><audio ref={audio} src={music.audioUrl} preload="metadata" onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} /><button className="play-control" onClick={toggle}>{playing ? "Ⅱ" : "▶"}<span>{playing ? "一時停止" : "再生"}</span></button><button className="restart-control" onClick={() => { if (audio.current) { audio.current.currentTime = 0; void audio.current.play(); } }}>↻ 最初から</button><span className="time-display">{clock(time)} / {clock(song.durationSeconds)}</span><label className="volume-control">音量<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audio.current) audio.current.volume = next; }} /></label><button className="button warm top-button" onClick={finish}>トップ画面へ</button></div></section></Stage>;
}
