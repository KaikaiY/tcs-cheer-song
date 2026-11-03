import "server-only";
import { ElevenLabsClient, ElevenLabsError, Music } from "@elevenlabs/elevenlabs-js";
import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { isRecord } from "@/lib/validation";

const DURATION_MS = 120_000;
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS_PER_WINDOW = 2;
const attemptsByClient = new Map<string, number[]>();

function validPrompt(value: unknown) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 4_100
    && value.includes("【必須仕様・最優先】")
    && value.includes("曲の長さ：120秒（2分00秒）");
}

function clientId(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

function canGenerate(request: Request) {
  const now = Date.now();
  const id = clientId(request);
  const recent = (attemptsByClient.get(id) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  attemptsByClient.set(id, recent);
  return true;
}

function providerFailure(error: unknown) {
  const providerError = error instanceof ElevenLabsError ? error : null;
  // composeDetailed currently wraps SDK HTTP errors in a plain Error and keeps
  // only "Status code: NNN" in its message. Recover only that numeric status.
  const wrappedStatus = error instanceof Error
    ? Number(error.message.match(/Status code:\s*(\d{3})/)?.[1]) || undefined
    : undefined;
  const status = providerError?.statusCode || wrappedStatus;
  const requestId = providerError?.requestId;
  const detail = isRecord(providerError?.body) && isRecord(providerError.body.detail)
    ? providerError.body.detail
    : undefined;
  const code = detail && typeof detail.status === "string" ? detail.status.slice(0, 80) : undefined;
  // Do not log the request body, prompt, API key, or the provider's free-form message.
  console.error("Eleven Music generation failed", { status, code, requestId, errorType: error instanceof Error ? error.name : typeof error });
  if (status === 401) return { status: 502, error: "Eleven Musicの認証に失敗しました。APIキーを作り直した場合は開発サーバーを再起動してください。" };
  if (status === 403) return { status: 502, error: "Eleven Music APIの権限または利用プランを確認してください。" };
  if (status === 422) return { status: 502, error: "Eleven Musicが楽曲生成の条件を受け付けませんでした。" };
  if (status === 429) return { status: 502, error: "Eleven Musicの利用上限またはクレジット上限に達しています。" };
  if (providerError?.name === "ElevenLabsTimeoutError") return { status: 504, error: "Eleven Musicの応答が時間内に完了しませんでした。時間をおいて再試行してください。" };
  return { status: 502, error: "Eleven Musicで生成に失敗しました。開発サーバーのログにあるHTTPステータスを確認してください。" };
}

function lyricsFromCompositionPlan(plan: unknown) {
  if (!isRecord(plan)) return [];
  if (Array.isArray(plan.sections)) {
    return plan.sections.flatMap((section) => {
      if (!isRecord(section) || typeof section.sectionName !== "string" || typeof section.durationMs !== "number" || !Array.isArray(section.lines)) return [];
      const lines = section.lines.filter((line): line is string => typeof line === "string");
      return [{ name: section.sectionName, durationMs: section.durationMs, lines }];
    });
  }
  if (Array.isArray(plan.chunks)) {
    return plan.chunks.flatMap((chunk, index) => {
      if (!isRecord(chunk) || typeof chunk.text !== "string" || typeof chunk.durationMs !== "number") return [];
      const rawLines = chunk.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const name = rawLines[0]?.match(/^\[([^\]]+)\]$/)?.[1] || `パート ${index + 1}`;
      const lines = rawLines.slice(rawLines[0]?.startsWith("[") ? 1 : 0).filter((line) => !/^\{.*\}$/.test(line));
      return [{ name, durationMs: chunk.durationMs, lines }];
    });
  }
  return [];
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  let prompt: unknown;
  try {
    const body = await readBody(request);
    if (!isRecord(body) || !validPrompt(body.prompt)) throw new Error("Invalid prompt");
    prompt = body.prompt;
  } catch {
    return Response.json({ error: "楽曲設計書を確認してください。" }, { status: 400, headers: privateHeaders });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return Response.json({ error: "Eleven MusicのAPIキーが設定されていません。" }, { status: 503, headers: privateHeaders });
  if (!canGenerate(request)) {
    return Response.json({ error: "短時間での生成上限に達しました。10分ほど待ってから再試行してください。" }, { status: 429, headers: privateHeaders });
  }
  try {
    const client = new ElevenLabsClient();
    // The SDK runtime exposes the enhanced Music wrapper here, but its client getter
    // is typed as the generated base client (which only describes the raw stream).
    const music = client.music as unknown as Music;
    const result = await music.composeDetailed(
      { prompt: prompt as string, musicLengthMs: DURATION_MS, modelId: "music_v2_5", withTimestamps: true },
      { timeoutInSeconds: 120, abortSignal: request.signal },
    );
    // music_v1 responds with sections; music_v2_5 responds with chunks.
    const lyrics = lyricsFromCompositionPlan(result.json.compositionPlan);
    const response = new FormData();
    response.append("audio", new Blob([new Uint8Array(result.audio)], { type: "audio/mpeg" }), result.filename || "ai-cheer-song.mp3");
    response.append("lyrics", JSON.stringify(lyrics));
    // The wrapper's MultipartResponse type currently omits this optional API field.
    const wordTimestamps = (result.json as typeof result.json & { wordsTimestamps?: unknown[] }).wordsTimestamps || [];
    response.append("wordTimestamps", JSON.stringify(wordTimestamps));
    response.append("title", result.json.songMetadata.title || "AIオリジナル応援ソング");
    return new Response(response, {
      headers: {
        ...privateHeaders,
      },
    });
  } catch (error) {
    const failure = providerFailure(error);
    return Response.json({ error: failure.error }, { status: failure.status, headers: privateHeaders });
  }
}
