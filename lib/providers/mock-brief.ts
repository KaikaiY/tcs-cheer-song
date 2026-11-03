import type { CreativeBrief, Submission, TimelineItem } from "../types";

const baseTimeline: TimelineItem[] = [
  { id: "intro", label: "イントロ", startSeconds: 0, endSeconds: 12, energy: "low", visualCategory: "キャラクター登場" },
  { id: "verse", label: "Aメロ", startSeconds: 12, endSeconds: 38, energy: "medium", visualCategory: "前へ進む日常" },
  { id: "chorus", label: "サビ", startSeconds: 38, endSeconds: 63, energy: "high", visualCategory: "光と応援" },
  { id: "bridge", label: "Bメロ", startSeconds: 63, endSeconds: 88, energy: "medium", visualCategory: "深呼吸と決意" },
  { id: "finalChorus", label: "最後のサビ", startSeconds: 88, endSeconds: 110, energy: "high", visualCategory: "祝福と紙吹雪" },
  { id: "outro", label: "アウトロ", startSeconds: 110, endSeconds: 120, energy: "low", visualCategory: "明るい余韻" },
];

export function mockCreativeBrief(input: Submission): CreativeBrief {
  const a = input.answers;
  const character = input.style === "male_cheer_squad"
    ? "力強い男性応援団のリード、ブラスバンド、太鼓、短いコール&レスポンス"
    : "明るい女性アイドルのボーカル、きらめくシンセ、軽快なビート";
  const shared = `日本語の約120秒のオリジナル応援ソング。聴き手は「${a.nickname}」本人。歌詞と歌唱は音楽AI自身が作る。必須素材: 今の努力「${a.currentEffort}」、未来の目標「${a.futureGoal}」、欲しい応援「${a.encouragementTarget}」、強み「${a.strength}」、好み「${a.musicPreference}」。${character}。前向きで聞き取りやすい速めのテンポ。イントロ、Aメロ、覚えやすいサビ、Bメロ、最後のサビ、明るいアウトロの展開。実在アーティスト名、曲名、既存歌詞の模倣はしない。`;
  return {
    version: "v1",
    style: input.style,
    targetDurationSeconds: 120,
    elevenMusicPrompt: `${shared} サビは短く、自然な日本語で一度聴いて覚えられる印象にする。`,
    flowMusicPrompt: `${shared} 映像を伴う体験でも主題歌として聞き取りやすく、曲全体に明確な盛り上がりを作る。`,
    timeline: baseTimeline,
  };
}
