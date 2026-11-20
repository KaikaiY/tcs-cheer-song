import type { CreativeBrief, TimelineItem } from "./types";

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function mandatorySpec(timeline: TimelineItem[]) {
  const structure = timeline
    .map((item) => `- [${item.label}] ${clock(item.startSeconds)}–${clock(item.endSeconds)}：${item.energy}、${item.visualCategory}`)
    .join("\n");
  return `【必須仕様・最優先】
- 曲の長さ：90秒（1分30秒）の完成曲。短い試聴版や一部だけの生成にしない。
- 日本語の歌詞と歌唱は音楽AI自身が作る。
- 本人が話した内容を、その人だけの一曲にする。思い出なら場面や言葉を大切に歌う。挑戦や願いには、本人の話に沿う場合にエールを添える。頑張れの連呼や「絶対できる」などの断言に頼らない。
- 音の勢いと励まし方の強さは別々に決める。本人の具体的な好みが分からなければ、聞き取りやすい日本語の歌、中くらいのテンポ、自然に広がるサビを基本にする。シャウト、掛け声の連呼、応援団風の大合唱、極端な速さは、本人がその要素を好むと伝えている場合だけ使う。
- 出来事、行動、気持ち、関係性は提供された事実だけを使う。本人が望む未来は願いとして描く。サビは本人が歌に残したい場面や言葉を軸にする。
- 曲の展開と映像演出の目安時間（楽器・メロディ・歌詞の表現には創造的な幅を残す）：
${structure}
- 実在アーティスト名、曲名、既存歌詞を模倣しない。

【楽曲の方向性】`;
}

export function addMandatorySpec(brief: CreativeBrief): CreativeBrief {
  const header = mandatorySpec(brief.timeline);
  return {
    ...brief,
    elevenMusicPrompt: `${header}\n${brief.elevenMusicPrompt}`,
  };
}
