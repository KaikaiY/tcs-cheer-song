"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import type { Style } from "@/lib/types";
export default function CharacterPage() { return <Guard level="character"><CharacterPicker /></Guard>; }
function CharacterPicker() { const { update } = useSession(); const router = useRouter(); function select(style: Style) { update({ style, result: undefined }); router.push("/generating"); } return <Stage progress={72}><section className="character-slide"><div className="character-heading"><p className="kicker">仕上げの選択</p><h1>あなたを応援するのは、どちら？</h1><p>選んだキャラクターが、歌声と基本の音楽スタイルを決めます。</p></div><div className="character-choice">{Object.values(characters).map((character) => <button key={character.id} className={`character-card ${character.id}`} onClick={() => select(character.id)}>{/* Character paths are centralized in lib/themes.ts for asset replacement. */}<img src={character.image} alt="" /><span className="character-vocal">{character.vocalType}ボーカル</span><h2>{character.name}</h2><b>{character.musicStyle}</b><p>{character.description}</p><span>このキャラクターを選ぶ　→</span></button>)}</div><button className="button ghost back-inline" onClick={() => router.push("/confirm")}>← 回答を確認する</button></section></Stage>; }
