import { emptyAnswers, questions, requiredAnswerIds } from "./questions";
import type { Answers, Style } from "./types";

export type TalkRequest = { style: Style; answers: Answers; message: string };
export type TalkReply = { reply: string; answers: Answers; complete: boolean; nextQuestionId: keyof Answers | null };

export function mergeTalkAnswers(current: Answers, proposed: Partial<Answers>): Answers {
  const next = { ...current };
  for (const question of questions) {
    const candidate = proposed[question.id];
    if (!next[question.id] && typeof candidate === "string" && candidate.trim() && candidate.length <= question.max) next[question.id] = candidate.trim();
  }
  return next;
}

export function nextQuestionId(answers: Answers): keyof Answers | null {
  const missing = requiredAnswerIds.find((id) => !answers[id].trim());
  if (missing) return missing;
  if (!isSpecificAnswer(answers.futureGoal, 4)) return "futureGoal";
  if (!isSpecificAnswer(answers.encouragementTarget, 3)) return "encouragementTarget";
  if (!isSupportedMood(answers.musicPreference)) return "musicPreference";
  return null;
}

export function isComplete(answers: Answers) {
  return nextQuestionId(answers) === null;
}

export function fillExpectedAnswer(answers: Answers, message: string): Answers {
  const expected = nextQuestionId(answers);
  if (!expected) return answers;
  const question = questions.find((item) => item.id === expected)!;
  const text = message.trim().slice(0, question.max);
  return text ? { ...answers, [expected]: text } : answers;
}

export function emptyTalkAnswers() {
  return { ...emptyAnswers };
}

const vagueAnswer = /^(特にない|ない|わからない|分からない|おまかせ|任せます|なんでも|特になし)$/;
function isSpecificAnswer(value: string, minLength: number) {
  const text = value.trim();
  return text.length >= minLength && !vagueAnswer.test(text);
}
function isSupportedMood(value: string) {
  return /(元気|しっとり|かっこいい|カッコいい|かっこよい|カッコよい)/.test(value.trim());
}
