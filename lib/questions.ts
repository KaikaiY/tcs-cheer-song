import type { Answers } from "./types";

export const questions: { id: keyof Answers; label: string; shortLabel: string; hint: string; max: number }[] = [
  { id: "nickname", label: "応援歌の中で呼んでほしいニックネームを教えてください", shortLabel: "ニックネーム", hint: "本名ではなく、呼ばれたい名前で大丈夫です", max: 24 },
  { id: "currentEffort", label: "今、頑張っていることや挑戦していることは何ですか？", shortLabel: "がんばり", hint: "例：資格の勉強を続けている", max: 160 },
  { id: "futureGoal", label: "これから叶えたい目標や夢を教えてください", shortLabel: "目標・夢", hint: "例：自分に合う仕事を見つけたい", max: 160 },
  { id: "encouragementTarget", label: "今、特に応援してほしいことや、背中を押してほしいことは何ですか？", shortLabel: "応援してほしいこと", hint: "例：一歩を踏み出す勇気がほしい", max: 160 },
  { id: "strength", label: "あなたの好きなところや、自分の強みだと思うところを教えてください", shortLabel: "あなたの強み", hint: "例：こつこつ続けられるところ", max: 160 },
  { id: "musicPreference", label: "どんな雰囲気やジャンルの応援歌にしてほしいですか？", shortLabel: "好きな雰囲気", hint: "例：明るいポップ、熱いロック", max: 100 },
];

export const emptyAnswers: Answers = { nickname: "", currentEffort: "", futureGoal: "", encouragementTarget: "", strength: "", musicPreference: "" };
