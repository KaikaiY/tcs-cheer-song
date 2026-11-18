import type { Answers } from "./types";

export const questions: { id: keyof Answers; label: string; shortLabel: string; hint: string; max: number }[] = [
  { id: "nickname", label: "応援歌の中で呼んでほしいニックネームを教えてください", shortLabel: "ニックネーム", hint: "本名ではなく、呼ばれたい名前で大丈夫です", max: 24 },
  { id: "currentEffort", label: "今日の応援歌は、誰に届けましょうか？", shortLabel: "届ける相手", hint: "例：自分、家族、友人", max: 160 },
  { id: "futureGoal", label: "その人は今、どんなことをがんばっているんですか？", shortLabel: "エピソード", hint: "例：資格の勉強を続けている", max: 160 },
  { id: "encouragementTarget", label: "その人に一番伝えたいひと言って、何ですか？", shortLabel: "届けたい言葉", hint: "例：焦らなくていいよ", max: 160 },
  { id: "strength", label: "あなたの好きなところや、自分の強みだと思うところを教えてください", shortLabel: "あなたの強み", hint: "例：こつこつ続けられるところ", max: 160 },
  { id: "musicPreference", label: "曲の雰囲気は、元気・しっとり・かっこいいのどれが近いですか？", shortLabel: "曲の雰囲気", hint: "元気・しっとり・かっこいいのいずれか", max: 100 },
];

export const emptyAnswers: Answers = { nickname: "", currentEffort: "", futureGoal: "", encouragementTarget: "", strength: "", musicPreference: "" };

// These are the only facts needed before the conversation becomes an open-ended etude.
export const requiredAnswerIds: (keyof Answers)[] = [
  "currentEffort",
  "futureGoal",
  "encouragementTarget",
  "musicPreference",
];
