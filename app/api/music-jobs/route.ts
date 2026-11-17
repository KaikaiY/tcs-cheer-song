import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { emptyAnswers } from "@/lib/questions";
import { startMusicJob } from "@/lib/music-jobs";
import { isRecord, isStyle } from "@/lib/validation";
import type { Answers, ConversationMessage } from "@/lib/types";

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  try {
    const body = await readBody(request);
    if (!isRecord(body) || typeof body.id !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(body.id) || !isStyle(body.style) || !isRecord(body.answers) || !Array.isArray(body.conversation)) throw new Error();
    const answers = { ...emptyAnswers } as Answers;
    for (const key of Object.keys(answers) as (keyof Answers)[]) if (typeof body.answers[key] === "string") answers[key] = body.answers[key].slice(0, 500);
    const conversation = body.conversation.flatMap((item): ConversationMessage[] => isRecord(item) && (item.role === "user" || item.role === "assistant") && typeof item.text === "string" ? [{ role: item.role, text: item.text.slice(0, 500) }] : []).slice(-24);
    const job = startMusicJob({ id: body.id, style: body.style, answers, conversation });
    return Response.json({ id: job.id, status: job.status }, { headers: privateHeaders });
  } catch { return Response.json({ error: "会話内容を確認してください。" }, { status: 400, headers: privateHeaders }); }
}
