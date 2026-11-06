import { questions } from "./questions";
import type {
  Answers,
  Style,
  Submission,
  CreativeBrief,
} from "./types";
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const isStyle = (v: unknown): v is Style =>
  v === "male_cheer_squad" || v === "female_idol";
const safeText = (v: unknown, max: number) =>
  typeof v === "string" &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v);
export function answerErrors(
  value: unknown,
): Partial<Record<keyof Answers, string>> {
  const a = isRecord(value) ? value : {};
  const errors: Partial<Record<keyof Answers, string>> = {};
  for (const q of questions) {
    if (!safeText(a[q.id], q.max))
      errors[q.id] = `${q.max}文字以内で入力してください。`;
    else if (!(a[q.id] as string).trim())
      errors[q.id] = "この項目を入力してください。";
  }
  return errors;
}
export function parseSubmission(v: unknown): Submission {
  if (
    !isRecord(v) ||
    v.consent !== true ||
    !isStyle(v.style) ||
    Object.keys(answerErrors(v.answers)).length
  )
    throw new Error("入力内容を確認してください。");
  const a = v.answers as Answers;
  return {
    consent: true,
    style: v.style,
    answers: Object.fromEntries(
      questions.map((q) => [q.id, a[q.id].trim()]),
    ) as Answers,
  };
}
const timelineIds = ["intro", "verse", "chorus", "bridge", "finalChorus", "outro"] as const;
export function parseCreativeBrief(v: unknown): CreativeBrief {
  if (
    !isRecord(v) ||
    v.version !== "v1" ||
    !isStyle(v.style) ||
    v.targetDurationSeconds !== 90 ||
    !safeText(v.elevenMusicPrompt, 3000) ||
    !(v.elevenMusicPrompt as string).trim() ||
    !Array.isArray(v.timeline) ||
    v.timeline.length !== timelineIds.length ||
    !v.timeline.every((section, index) => isRecord(section) && section.id === timelineIds[index] && safeText(section.label, 20) && typeof section.startSeconds === "number" && typeof section.endSeconds === "number" && section.startSeconds >= 0 && section.endSeconds > section.startSeconds && ["low", "medium", "high"].includes(section.energy as string) && safeText(section.visualCategory, 40) && (section.visualCategory as string).trim()) ||
    (v.timeline as Record<string, unknown>[])[0]?.startSeconds !== 0 ||
    (v.timeline as Record<string, unknown>[]).at(-1)?.endSeconds !== 90 ||
    !(v.timeline as Record<string, unknown>[]).every((section, index, items) => index === 0 || section.startSeconds === items[index - 1]?.endSeconds)
  )
    throw new Error("生成データの形式が正しくありません。");
  return {
    version: "v1",
    style: v.style,
    targetDurationSeconds: 90,
    elevenMusicPrompt: (v.elevenMusicPrompt as string).trim(),
    timeline: v.timeline as CreativeBrief["timeline"],
  };
}
