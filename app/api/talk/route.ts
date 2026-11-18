import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { emptyAnswers } from "@/lib/questions";
import { fillExpectedAnswer, isComplete, mergeTalkAnswers, nextQuestionId } from "@/lib/talk";
import { questions } from "@/lib/questions";
import { isRecord, isStyle } from "@/lib/validation";
import { mockTalk } from "@/lib/providers/mock-talk";
import { openaiTalk } from "@/lib/providers/openai";
import type { Answers } from "@/lib/types";

function parseInput(value: unknown) {
  if (!isRecord(value) || !isStyle(value.style) || typeof value.message !== "string" || !value.message.trim() || value.message.length > 300 || !isRecord(value.answers)) throw new Error("Invalid input");
  const answers = { ...emptyAnswers } as Answers;
  for (const key of Object.keys(answers) as (keyof Answers)[]) {
    const candidate = value.answers[key];
    if (typeof candidate === "string") answers[key] = candidate.slice(0, 160).trim();
  }
  return { style: value.style, message: value.message.trim(), answers, allowFallback: value.allowFallback === true };
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  let input;
  try { input = parseInput(await readBody(request)); } catch { return Response.json({ error: "入力内容を確認してください。" }, { status: 400, headers: privateHeaders }); }
  try {
    const mock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]);
    const result = mock ? mockTalk(input) : await openaiTalk(input, signal);
    const extracted = mergeTalkAnswers(input.answers, result.answers);
    const answers = input.allowFallback && nextQuestionId(extracted) === nextQuestionId(input.answers)
      ? fillExpectedAnswer(extracted, input.message)
      : extracted;
    const next = nextQuestionId(answers);
    const fallbackReply = next
      ? `うんうん、ありがとう。次に、${questions.find((question) => question.id === next)?.label}`
      : "お話、しっかり受け取りました。あなたのための一曲を準備しますね。";
    return Response.json({ reply: answers === extracted ? result.reply : fallbackReply, answers, complete: isComplete(answers), nextQuestionId: next, mode: mock ? "mock" : "live" }, { headers: privateHeaders });
  } catch {
    return Response.json({ error: "会話を続けられませんでした。もう一度お試しください。" }, { status: 502, headers: privateHeaders });
  }
}
