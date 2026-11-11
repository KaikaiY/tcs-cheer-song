import type { Answers, ConversationMessage, SongProfile, Style } from "../types";

export function mockSongProfile(input: { style: Style; answers: Answers; conversation: ConversationMessage[] }): SongProfile {
  const extras = input.conversation.filter((message) => message.role === "user").map((message) => message.text).filter(Boolean).slice(-4);
  const summary = extras.length ? `${input.answers.nickname || "あなた"}さんとの会話から、前へ進もうとする気持ちと、その人らしい挑戦の姿を受け取りました。会話で語られた想いを応援歌にします。` : "会話から受け取った前向きな想いを、あなただけの応援歌にします。";
  return {
    version: "v1",
    summary,
    personalMotifs: extras,
    musicalHints: [input.answers.musicPreference, input.answers.strength].filter(Boolean).slice(0, 4),
  };
}
