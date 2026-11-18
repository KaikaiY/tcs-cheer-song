import "server-only";
import { ElevenLabsClient, Music } from "@elevenlabs/elevenlabs-js";
import { addMandatorySpec } from "./prompt-format";
import { mockCreativeBrief } from "./providers/mock-brief";
import { mockSongProfile } from "./providers/mock-profile";
import { openaiCreativeBrief, openaiSongProfile } from "./providers/openai";
import { parseCreativeBrief, parseSongProfile } from "./validation";
import { readMusicFile, saveMusicFile } from "./music-storage";
import type { Answers, ConversationMessage, MusicJob, Style } from "./types";

type InternalJob = MusicJob & { audio?: Uint8Array };
const jobs = new Map<string, InternalJob>();

function lyricsFromPlan(plan: unknown) {
  if (!plan || typeof plan !== "object" || !Array.isArray((plan as { chunks?: unknown }).chunks)) return [];
  return (plan as { chunks: Array<{ text?: unknown; durationMs?: unknown }> }).chunks.flatMap((chunk, index) => typeof chunk.text === "string" && typeof chunk.durationMs === "number" ? [{ name: `パート ${index + 1}`, durationMs: chunk.durationMs, lines: chunk.text.split(/\r?\n/).filter(Boolean) }] : []);
}

export function getMusicJob(id: string) { return jobs.get(id); }
export async function getMusicAudio(id: string) { return jobs.get(id)?.audio || await readMusicFile(id); }
export function retryMusicJob(id: string) { const job = jobs.get(id); if (!job || !job.result || job.status !== "failed") return undefined; job.status = "generating"; job.error = undefined; void finishMusic(job).catch(() => { job.status = "failed"; job.error = "楽曲の生成に失敗しました。音楽生成だけ再試行できます。"; }); return job; }

export function startMusicJob(input: { id: string; style: Style; answers: Answers; conversation: ConversationMessage[] }) {
  const existing = jobs.get(input.id);
  if (existing) return existing;
  const job: InternalJob = { id: input.id, status: "preparing" };
  jobs.set(input.id, job);
  void run(job, input);
  return job;
}

async function run(job: InternalJob, input: { style: Style; answers: Answers; conversation: ConversationMessage[] }) {
  const signal = AbortSignal.timeout(120_000);
  const mock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
  let profile;
  try {
    profile = parseSongProfile(mock ? mockSongProfile(input) : await openaiSongProfile(input, signal));
  } catch { failJob(job, "会話内容を楽曲プロフィールに整理できませんでした。会話を続けてから、もう一度お試しください。"); return; }
  job.profile = profile;
  try {
    const submission = { consent: true as const, style: input.style, answers: input.answers, profile };
    const brief = addMandatorySpec(parseCreativeBrief(mock ? mockCreativeBrief(submission) : await openaiCreativeBrief(submission, signal)));
    job.result = { brief, briefMode: mock ? "mock" : "live" };
  } catch { failJob(job, "楽曲の設計書を作成できませんでした。時間をおいて、音楽生成をもう一度お試しください。"); return; }
  job.status = "generating";
  try { await finishMusic(job); } catch (error) {
    const detail = error instanceof Error && error.message.includes("Eleven Music") ? error.message : "Eleven Musicで楽曲を作成できませんでした。音楽生成だけ再試行できます。";
    failJob(job, detail);
  }
}

function failJob(job: InternalJob, error: string) { job.status = "failed"; job.error = error; }

async function finishMusic(job: InternalJob) {
    if (!job.result) throw new Error("楽曲設計書が見つかりません。");
    const signal = AbortSignal.timeout(120_000);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Eleven MusicのAPIキーが設定されていません。");
    const music = new ElevenLabsClient().music as unknown as Music;
    const output = await music.composeDetailed({ prompt: job.result.brief.elevenMusicPrompt, musicLengthMs: 90_000, modelId: "music_v2_5", withTimestamps: true }, { timeoutInSeconds: 120, abortSignal: signal });
    const lyrics = lyricsFromPlan(output.json.compositionPlan);
    let startMs = 0;
    const sections = lyrics.map((item, index) => { const endMs = startMs + item.durationMs; const section = { id: `part-${index + 1}`, name: item.name, startMs, endMs, energy: "medium" }; startMs = endMs; return section; });
    job.audio = new Uint8Array(output.audio);
    await saveMusicFile(job.id, job.audio);
    job.title = output.json.songMetadata.title || "AIオリジナル応援ソング";
    job.lyrics = JSON.stringify(lyrics);
    job.visualSync = JSON.stringify({ version: "v1", durationMs: startMs || 90_000, sections });
    job.wordTimestamps = JSON.stringify((output.json as typeof output.json & { wordsTimestamps?: unknown[] }).wordsTimestamps || []);
    job.status = "ready";
}
