import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { emptyAnswers } from "@/lib/questions";
import { mockSongProfile } from "@/lib/providers/mock-profile";
import { openaiSongProfile } from "@/lib/providers/openai";
import { isRecord, isStyle } from "@/lib/validation";
import type { Answers, ConversationMessage } from "@/lib/types";

function parseInput(value: unknown) {
  if (!isRecord(value) || !isStyle(value.style) || !isRecord(value.answers)) throw new Error("Invalid input");
  const answers = { ...emptyAnswers } as Answers;
  for (const key of Object.keys(answers) as (keyof Answers)[]) if (typeof value.answers[key] === "string") answers[key] = value.answers[key].slice(0, 160).trim();
  const conversation: ConversationMessage[] = Array.isArray(value.conversation)
    ? value.conversation.flatMap((message): ConversationMessage[] => isRecord(message) && (message.role === "user" || message.role === "assistant") && typeof message.text === "string" ? [{ role: message.role, text: message.text.slice(0, 500) } as ConversationMessage] : []).slice(-24)
    : [];
  return { style: value.style, answers, conversation };
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  let input;
  try { input = parseInput(await readBody(request)); } catch { return Response.json({ error: "会話内容を確認してください。" }, { status: 400, headers: privateHeaders }); }
  try {
    const mock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
    const profile = mock ? mockSongProfile(input) : await openaiSongProfile(input, AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]));
    return Response.json({ profile, mode: mock ? "mock" : "live" }, { headers: privateHeaders });
  } catch { return Response.json({ error: "会話内容を楽曲プロフィールに整理できませんでした。" }, { status: 502, headers: privateHeaders }); }
}
