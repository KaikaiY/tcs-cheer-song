import type { Answers, ConversationMessage, SongProfile, Style } from "../types";

export function mockSongProfile(input: { style: Style; answers: Answers; conversation: ConversationMessage[] }): SongProfile {
  const extras = input.conversation.filter((message) => message.role === "user").map((message) => message.text).filter((text) => !Object.values(input.answers).includes(text)).slice(-2);
  return {
    version: "v1",
    summary: `${input.answers.nickname}さんは、${input.answers.currentEffort}に取り組み、${input.answers.futureGoal}を目指しています。${input.answers.encouragementTarget}を力強く後押しする応援歌にします。`,
    personalMotifs: [input.answers.currentEffort, input.answers.futureGoal, ...extras].filter(Boolean).slice(0, 4),
    musicalHints: [input.answers.musicPreference, input.answers.strength].filter(Boolean).slice(0, 4),
  };
}
