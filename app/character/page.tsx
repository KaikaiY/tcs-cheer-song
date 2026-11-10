"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import type { Style } from "@/lib/types";
export default function CharacterPage() { return <Guard level="character"><CharacterPicker /></Guard>; }
function CharacterPicker() { const { update } = useSession(); const router = useRouter(); function select(style: Style) { update({ style, conversation: [], result: undefined }); router.push("/talk"); } return <Stage progress={18}><section className="character-slide"><div className="character-heading"><p className="kicker">まずはパートナー選び</p><h1>あなたを応援するのは、どちら？</h1><p>選んだキャラクターが、会話の口調と応援歌の方向性を決めます。</p></div><div className="character-choice">{Object.values(characters).map((character) => <button key={character.id} className={`character-card ${character.id}`} onClick={() => select(character.id)}>{/* Character paths are centralized in lib/themes.ts for asset replacement. */}<img src={character.image} alt="" /><span className="character-vocal">{character.vocalType}ボーカル</span><h2>{character.name}</h2><b>{character.musicStyle}</b><p>{character.description}</p><span>このキャラクターを選ぶ　→</span></button>)}</div><button className="button ghost back-inline" onClick={() => router.push("/consent")}>← 同意画面へ戻る</button></section></Stage>; }
