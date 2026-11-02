import { readBody, privateHeaders, safeOrigin } from "@/lib/api";
import { parseSubmission, parseSong } from "@/lib/validation";
import { mockLyrics } from "@/lib/providers/mock-ai";
import { openaiLyrics } from "@/lib/providers/openai";
export async function POST(request: Request) {
  if (!safeOrigin(request))
    return Response.json(
      { error: "この操作は許可されていません。" },
      { status: 403, headers: privateHeaders },
    );
  let input;
  try {
    input = parseSubmission(await readBody(request));
  } catch {
    return Response.json(
      { error: "同意と入力内容を確認してください。" },
      { status: 400, headers: privateHeaders },
    );
  }
  try {
    const mock =
      process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(45_000),
    ]);
    const song = parseSong(
      mock ? mockLyrics(input) : await openaiLyrics(input, signal),
    );
    return Response.json(
      { song, mode: mock ? "mock" : "live" },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "歌詞を作成できませんでした。時間をおいて再試行してください。" },
      { status: 502, headers: privateHeaders },
    );
  }
}
