import { readBody, privateHeaders, safeOrigin } from "@/lib/api";
import { addMandatorySpec } from "@/lib/prompt-format";
import { parseCreativeBrief, parseSubmission } from "@/lib/validation";
import { mockCreativeBrief } from "@/lib/providers/mock-brief";
import { openaiCreativeBrief } from "@/lib/providers/openai";

export async function POST(request: Request) {
  if (!safeOrigin(request)) {
    return Response.json(
      { error: "この操作は許可されていません。" },
      { status: 403, headers: privateHeaders },
    );
  }
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
    const mock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
    const brief = addMandatorySpec(parseCreativeBrief(
      mock ? mockCreativeBrief(input) : await openaiCreativeBrief(input, signal),
    ));
    return Response.json(
      { brief, mode: mock ? "mock" : "live" },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "楽曲設計書を作成できませんでした。時間をおいて再試行してください。" },
      { status: 502, headers: privateHeaders },
    );
  }
}
