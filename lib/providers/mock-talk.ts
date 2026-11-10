import { questions } from "../questions";
import { mergeTalkAnswers, nextQuestionId } from "../talk";
import type { TalkReply, TalkRequest } from "../talk";

export function mockTalk(input: TalkRequest): TalkReply {
  const current = nextQuestionId(input.answers);
  const answers = current ? mergeTalkAnswers(input.answers, { [current]: input.message }) : input.answers;
  const next = nextQuestionId(answers);
  const name = input.style === "male_cheer_squad" ? "団長" : "アイドル";
  if (!next) return { answers, complete: true, nextQuestionId: null, reply: `${name}だ。話してくれてありがとう！内容を確認して、応援歌を作ろう。` };
  const question = questions.find((item) => item.id === next)!;
  return { answers, complete: false, nextQuestionId: next, reply: `${name}として聞かせて。${question.label}` };
}
