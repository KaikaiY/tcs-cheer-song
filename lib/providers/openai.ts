import "server-only";
import OpenAI from "openai";
import { creativeBriefInstructions, creativeBriefSchema } from "../prompts/creative-brief";
import { talkInstructions, talkSchema } from "../prompts/talk";
import { songProfileInstructions, songProfileSchema } from "../prompts/song-profile";
import { parseCreativeBrief, parseSongProfile } from "../validation";
import { isComplete, mergeTalkAnswers, nextQuestionId } from "../talk";
import type { Submission, Answers, ConversationMessage, SongProfile, Style } from "../types";
import type { TalkReply, TalkRequest } from "../talk";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export async function openaiCreativeBrief(input: Submission, signal: AbortSignal) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45_000,
    maxRetries: 0,
  });
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      store: false,
      instructions: creativeBriefInstructions,
      input: JSON.stringify(input),
      max_output_tokens: 1800,
      text: {
        format: {
          type: "json_schema",
          name: "creative_brief",
          strict: true,
          schema: creativeBriefSchema,
        },
      },
    },
    { signal },
  );
  if (response.status !== "completed") throw new Error("Incomplete response");
  const brief = parseCreativeBrief(JSON.parse(response.output_text));
  if (brief.style !== input.style) throw new Error("Style mismatch");
  return brief;
}

export async function openaiTalk(input: TalkRequest, signal: AbortSignal): Promise<TalkReply> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 20_000,
    maxRetries: 0,
  });
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      store: false,
      instructions: talkInstructions,
      input: JSON.stringify(input),
      max_output_tokens: 360,
      text: { format: { type: "json_schema", name: "talk_reply", strict: true, schema: talkSchema } },
    },
    { signal },
  );
  if (response.status !== "completed") throw new Error("Incomplete response");
  const value: unknown = JSON.parse(response.output_text);
  if (!value || typeof value !== "object" || typeof (value as { reply?: unknown }).reply !== "string" || !(value as { reply: string }).reply.trim() || !(value as { reply: string }).reply.length || !(value as { answers?: unknown }).answers || typeof (value as { answers: unknown }).answers !== "object") throw new Error("Invalid talk response");
  const proposed = (value as { answers: Partial<Answers> }).answers;
  const answers = mergeTalkAnswers(input.answers, proposed);
  const next = nextQuestionId(answers);
  return { reply: (value as { reply: string }).reply.trim().slice(0, 120), answers, complete: isComplete(answers), nextQuestionId: next };
}

export async function openaiSongProfile(input: { style: Style; answers: Answers; conversation: ConversationMessage[] }, signal: AbortSignal): Promise<SongProfile> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 0 });
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      store: false,
      instructions: songProfileInstructions,
      input: JSON.stringify(input),
      max_output_tokens: 700,
      text: { format: { type: "json_schema", name: "song_profile", strict: true, schema: songProfileSchema } },
    },
    { signal },
  );
  if (response.status !== "completed") throw new Error("Incomplete response");
  return parseSongProfile(JSON.parse(response.output_text));
}
