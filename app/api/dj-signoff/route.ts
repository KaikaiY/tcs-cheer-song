import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { djSignoff } from "@/lib/dj-signoff";
import { isRecord } from "@/lib/validation";

export async function POST(request: Request) {
  if (!safeOrigin(request)) return new Response(null, { status: 403, headers: privateHeaders });
  const body = await readBody(request).catch(() => null);
  if (!isRecord(body) || typeof body.nickname !== "string" || typeof body.title !== "string") {
    return new Response(null, { status: 400, headers: privateHeaders });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.USE_MOCK_AI === "true") {
    return new Response(null, { status: 503, headers: privateHeaders });
  }

  try {
    const speech = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: body.style === "female_idol" ? "sage" : "coral",
        input: djSignoff(body.nickname, body.title),
        instructions: "日本語で原稿をそのまま読む。親しみやすいラジオDJの口調で、穏やかに番組を締める。",
        response_format: "mp3",
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    if (speech.ok && speech.body) {
      const headers = new Headers(privateHeaders);
      headers.set("Content-Type", "audio/mpeg");
      return new Response(speech.body, { headers });
    }
  } catch {
    // Keep the on-screen closing line available when speech is unavailable.
  }
  return new Response(null, { status: 502, headers: privateHeaders });
}
