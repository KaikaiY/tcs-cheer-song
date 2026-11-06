import type { CreativeBrief, Submission, TimelineItem } from "../types";

const baseTimeline: TimelineItem[] = [
  { id: "intro", label: "イントロ", startSeconds: 0, endSeconds: 8, energy: "low", visualCategory: "キャラクター登場" },
  { id: "verse", label: "Aメロ", startSeconds: 8, endSeconds: 25, energy: "medium", visualCategory: "前へ進む日常" },
  { id: "chorus", label: "サビ", startSeconds: 25, endSeconds: 41, energy: "high", visualCategory: "光と応援" },
  { id: "bridge", label: "Bメロ", startSeconds: 41, endSeconds: 59, energy: "medium", visualCategory: "深呼吸と決意" },
  { id: "finalChorus", label: "最後のサビ", startSeconds: 59, endSeconds: 79, energy: "high", visualCategory: "祝福と紙吹雪" },
  { id: "outro", label: "アウトロ", startSeconds: 79, endSeconds: 90, energy: "low", visualCategory: "明るい余韻" },
];

export function mockCreativeBrief(input: Submission): CreativeBrief {
  const a = input.answers;
  const character = input.style === "male_cheer_squad"
    ? "力強い男性応援団のリード、ブラスバンド、太鼓、短いコール&レスポンス"
    : "明るい女性アイドルのボーカル、きらめくシンセ、軽快なビート";
  const shared = `日本語の約90秒のオリジナル応援ソング。聴き手は「${a.nickname}」本人。歌詞と歌唱は音楽AI自身が作る。応援を感情的な軸にしつつ、音楽の表現は自由にする。本人固有の音楽的モチーフ: 今の努力「${a.currentEffort}」から生まれる行動のリズム、未来の目標「${a.futureGoal}」が見せる景色、強み「${a.strength}」から伝わる歩幅、応援してほしいこと「${a.encouragementTarget}」の感情。音楽の好み「${a.musicPreference}」を最優先の音楽的手がかりにし、音色・リズム・ボーカルの届け方・サビの開放感へ反映する。${character}。聞き取りやすい日本語ボーカルと、最後に前を向ける応援の着地を守る。イントロ、Aメロ、覚えやすいサビ、Bメロ、最後のサビ、明るいアウトロを目安にしつつ、音楽的な展開には自由度を残す。実在アーティスト名、曲名、既存歌詞の模倣はしない。`;
  return {
    version: "v1",
    style: input.style,
    targetDurationSeconds: 90,
    elevenMusicPrompt: `${shared} サビは短く、自然な日本語で一度聴いて覚えられる印象にする。`,
    timeline: baseTimeline,
  };
}
