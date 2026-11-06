"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
export default function Home() { const router = useRouter(); const { reset, update } = useSession(); function choose(style: keyof typeof characters) { reset(); update({ style }); router.push("/consent"); } return <Stage><section className="character-intro"><div className="character-intro-copy"><p className="kicker">TCS FES 2026 · AI CHEER SONG</p><h1>今日は、<em>誰</em>から<br />エールを受け取る？</h1><p>パートナーを選ぶと、質問の言葉、音楽の方向性、画面の世界観があなた専用に切り替わります。</p></div><div className="character-entry-grid" aria-label="応援キャラクターを選択">{Object.values(characters).map((character, index) => <button key={character.id} className={`character-entry ${character.id}`} onClick={() => choose(character.id)}><span className="entry-index">0{index + 1}</span><img src={character.image} alt="" /><span className="entry-copy"><small>{character.vocalType} VOCAL · {character.musicStyle}</small><strong>{character.name}</strong><b>{character.description}</b><i>このキャラクターを選ぶ <span>→</span></i></span></button>)}</div><p className="character-intro-note">入力内容は楽曲生成にのみ使われます。文字入力でもご参加いただけます。</p></section></Stage>; }
