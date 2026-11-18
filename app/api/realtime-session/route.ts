import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { yellowBirdInstructions } from "@/lib/prompts/dj-yellow-bird";
import { isRecord, isStyle } from "@/lib/validation";

// The browser receives only this short-lived client secret. OPENAI_API_KEY never leaves the server.
export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OpenAI APIキーが設定されていません。" }, { status: 503, headers: privateHeaders });
  let style: "male_cheer_squad" | "female_idol" = "male_cheer_squad"; let waiting = false; let nickname = "";
  try { const body = await readBody(request); if (isRecord(body) && isStyle(body.style)) style = body.style; waiting = isRecord(body) && body.phase === "waiting"; if (isRecord(body) && typeof body.nickname === "string") nickname = body.nickname.trim().slice(0, 24); } catch { /* Default safely. */ }
  const voice = style === "female_idol" ? "sage" : "cedar";
  const instructions = yellowBirdInstructions({ nickname, waiting });
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session: { type: "realtime", model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1", instructions, audio: { input: { noise_reduction: { type: "far_field" }, transcription: { model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe", languages: ["ja"], keywords: ["TCS", "TCSフェス", "TCS RADIO", ...(nickname ? [nickname] : [])], prompt: "会話は日本語。ニックネーム、固有名詞、略称は推測で英語化せず、聞こえた日本語のまま文字起こしする。" }, turn_detection: { type: "semantic_vad" } }, output: { voice } } } }),
    cache: "no-store",
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok || !value || typeof value !== "object" || typeof (value as { value?: unknown }).value !== "string") {
    const detail = value && typeof value === "object" && "error" in value && typeof (value as { error?: { type?: unknown } }).error?.type === "string"
      ? (value as { error: { type: string } }).error.type
      : "unknown";
    console.error("OpenAI Realtime session setup failed", { status: response.status, errorType: detail });
    return Response.json({ error: `Realtime接続の準備に失敗しました（OpenAI: ${response.status}）。` }, { status: 502, headers: privateHeaders });
  }
  return Response.json({ clientSecret: (value as { value: string }).value, model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1", maxSeconds: 600 }, { headers: privateHeaders });
}
