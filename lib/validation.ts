import { questions } from "./questions";
import type {
  Answers,
  Song,
  Style,
  Submission,
  MusicGenerationResult,
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
const lines = (v: unknown, maxItems = 12) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= maxItems &&
  v.every((x) => safeText(x, 180) && (x as string).trim().length > 0);
export function parseSong(v: unknown): Song {
  if (
    !isRecord(v) ||
    !safeText(v.title, 80) ||
    !(v.title as string).trim() ||
    !isStyle(v.style) ||
    v.durationSeconds !== 120 ||
    !isRecord(v.lyrics) ||
    !lines(v.lyrics.verse) ||
    !lines(v.lyrics.chorus) ||
    !isRecord(v.musicPrompt) ||
    !lines(v.musicPrompt.positiveStyles) ||
    !lines(v.musicPrompt.negativeStyles) ||
    !lines(v.visualKeywords, 6) ||
    !Array.isArray(v.sections) ||
    v.sections.length < 4 ||
    !v.sections.every((section) => isRecord(section) && typeof section.id === "string" && safeText(section.label, 20) && typeof section.startSeconds === "number" && typeof section.endSeconds === "number" && section.startSeconds >= 0 && section.endSeconds > section.startSeconds && lines(section.lines, 8))
  )
    throw new Error("生成データの形式が正しくありません。");
  return {
    title: v.title as string,
    style: v.style,
    durationSeconds: 120,
    lyrics: {
      verse: v.lyrics.verse as string[],
      chorus: v.lyrics.chorus as string[],
    },
    musicPrompt: {
      positiveStyles: v.musicPrompt.positiveStyles as string[],
      negativeStyles: v.musicPrompt.negativeStyles as string[],
    },
    visualKeywords: v.visualKeywords as string[],
    sections: v.sections as Song["sections"],
  };
}
export function parseMusic(v: unknown): MusicGenerationResult {
  if (
    !isRecord(v) ||
    !["/audio/cheer-demo.wav", "/audio/idol-demo.wav"].includes(
      v.audioUrl as string,
    ) ||
    v.durationSeconds !== 120 ||
    v.mode !== "mock"
  )
    throw new Error("音楽データが正しくありません。");
  return { audioUrl: v.audioUrl as string, durationSeconds: 120, mode: "mock" };
}
