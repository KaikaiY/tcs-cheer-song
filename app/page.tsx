"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { characters } from "@/lib/themes";
export default function Home() { const router = useRouter(); return <Stage><section className="home-slide"><div className="home-copy"><p className="kicker">あなたの頑張りを、あなたの歌に。</p><h1>AIオリジナル<br /><em>応援ソング</em></h1><p>6つの質問に答えると、あなたの努力や夢をもとに、世界にひとつの応援歌をつくります。</p><button className="button warm start-button" onClick={() => router.push("/consent")}>体験をはじめる　→</button><small>音声を使用する体験です。文字入力でもご参加いただけます。</small></div><div className="character-duo" aria-label="応援団とアイドルの仮キャラクター">{Object.values(characters).map((character) => <figure key={character.id} className={character.id}><img src={character.image} alt={`${character.name}（仮キャラクター）`} /><figcaption>{character.name}</figcaption></figure>)}</div></section></Stage>; }
