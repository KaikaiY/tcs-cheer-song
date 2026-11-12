"use client";
/* eslint-disable @next/next/no-img-element -- interchangeable local character assets */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
import type { Style } from "@/lib/types";

export default function CharacterPage() {
  return <Guard level="character"><CharacterPicker /></Guard>;
}

function CharacterPicker() {
  const { update } = useSession();
  const router = useRouter();
  const [activeStyle, setActiveStyle] = useState<Style | null>(null);
  const activeCharacter = activeStyle ? characters[activeStyle] : null;

  function select(style: Style) {
    update({ style, conversation: [], result: undefined });
    router.push("/talk");
  }

  return <Stage minimal>
    <section className={`character-slide character-picker-scene ${activeStyle ?? "is-neutral"}`}>
      <div aria-hidden="true" className="character-world character-world-neutral" />
      <div aria-hidden="true" className="character-world character-world-cheer" />
      <div aria-hidden="true" className="character-world character-world-idol" />
      <div className="character-picker-content">
        <div className="character-heading">
          <p className="kicker">CHOOSE YOUR CHEER PARTNER</p>
          <h1>誰と、応援歌をつくる？</h1>
          <p>{activeCharacter ? `${activeCharacter.name}の世界で、応援歌をつくります。` : "気になるキャラクターに触れて、世界をのぞいてみよう。"}</p>
        </div>
        <div className="character-choice">
          {Object.values(characters).map((character) => {
            const isActive = activeStyle === character.id;
            return <button
              key={character.id}
              className={`character-card ${character.id}${isActive ? " is-active" : ""}`}
              onMouseEnter={() => setActiveStyle(character.id)}
              onMouseLeave={() => setActiveStyle(null)}
              onFocus={() => setActiveStyle(character.id)}
              onClick={() => select(character.id)}
            >
              <img src={character.image} alt="" />
              <span className="character-vocal">{character.vocalType}ボーカル</span>
              <h2>{character.name}</h2>
              <b>{character.musicStyle}</b>
              <p>{character.description}</p>
              <span>このキャラクターを選ぶ　→</span>
            </button>;
          })}
        </div>
        <button className="button ghost back-inline" onClick={() => router.push("/consent")}>← 同意画面へ戻る</button>
      </div>
    </section>
  </Stage>;
}
