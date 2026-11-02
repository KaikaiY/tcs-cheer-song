import type { Song, Submission } from "../types";
import { characters } from "../themes";

export function mockLyrics({ answers: a, style }: Submission): Song {
  const character = characters[style];
  const verse = [`${a.nickname}　今日まで積み重ねた`, a.currentEffort, "その強さを　胸に抱いて", a.strength];
  const chorus = [`フレー！ フレー！ ${a.nickname}！`, a.encouragementTarget, "夢の先へ　手を伸ばそう", `${a.nickname}なら　きっと行ける`];
  return {
    title: `${a.nickname}の応援歌`, style, durationSeconds: 120, lyrics: { verse, chorus },
    sections: [
      { id: "intro", label: "イントロ", startSeconds: 0, endSeconds: 12, lines: [`${a.nickname}へ、エールを送ろう`] },
      { id: "verse", label: "Aメロ", startSeconds: 12, endSeconds: 42, lines: verse },
      { id: "chorus", label: "サビ", startSeconds: 42, endSeconds: 66, lines: chorus },
      { id: "bridge", label: "Bメロ", startSeconds: 66, endSeconds: 90, lines: [a.futureGoal, "あなたらしく　進んでいこう", a.strength] },
      { id: "finalChorus", label: "最後のサビ", startSeconds: 90, endSeconds: 112, lines: chorus },
      { id: "outro", label: "アウトロ", startSeconds: 112, endSeconds: 120, lines: [`${a.nickname}、あなたを応援しているよ`] },
    ],
    musicPrompt: { positiveStyles: [character.musicStyle, `${character.vocalType} vocal`, a.musicPreference, "uplifting Japanese original song", "about 2 minutes"], negativeStyles: ["imitating existing artists", "sad", "aggressive"] },
    visualKeywords: [a.currentEffort, a.futureGoal, a.strength].map((item) => item.slice(0, 16)),
  };
}
