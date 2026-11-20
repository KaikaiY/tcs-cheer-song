import { mockCreativeBrief } from "./providers/mock-brief";
import { mockSongProfile } from "./providers/mock-profile";
import type { Answers, ConversationMessage, SongProfile, Style } from "./types";

const answers: Answers = {
  nickname: "かいかい",
  futureGoal: "会場のみんなが前を向けるフェスを成功させること",
  encouragementTarget: "自信を持って、最後まで開発を進めること",
  strength: "小さな改善をコツコツ続けられること",
  musicPreference: "熱く、聴いた人が口ずさめる応援ロック",
};

const conversation: ConversationMessage[] = [
  { role: "assistant", text: "今日はどんな応援歌を作ろうか？" },
  { role: "user", text: "TCSフェスを成功させるために、開発をがんばっています。" },
  { role: "assistant", text: "その積み重ねが伝わる、熱い一曲にしよう！" },
];

export function demoProfile(style: Style): { answers: Answers; conversation: ConversationMessage[]; profile: SongProfile } {
  return { answers, conversation, profile: mockSongProfile({ style, answers, conversation }) };
}

export function demoResult(style: Style) {
  const draft = demoProfile(style);
  return { ...draft, result: { brief: mockCreativeBrief({ consent: true, style, ...draft }), briefMode: "mock" as const } };
}
