import type { CreativeBrief, TimelineItem } from "./types";

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function mandatorySpec(timeline: TimelineItem[]) {
  const structure = timeline
    .map((item) => `- [${item.label}] ${clock(item.startSeconds)}–${clock(item.endSeconds)}：${item.energy}、${item.visualCategory}`)
    .join("\n");
  return `【必須仕様・最優先】
- 曲の長さ：120秒（2分00秒）の完成曲。短い試聴版や一部だけの生成にしない。
- 日本語の歌詞と歌唱は音楽AI自身が作る。
- 曲の展開と目安時間：
${structure}
- 実在アーティスト名、曲名、既存歌詞を模倣しない。

【楽曲の方向性】`;
}

export function addMandatorySpec(brief: CreativeBrief): CreativeBrief {
  const header = mandatorySpec(brief.timeline);
  return {
    ...brief,
    elevenMusicPrompt: `${header}\n${brief.elevenMusicPrompt}`,
    flowMusicPrompt: `${header}\n${brief.flowMusicPrompt}`,
  };
}
