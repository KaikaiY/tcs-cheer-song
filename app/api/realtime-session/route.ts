import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { isRecord, isStyle } from "@/lib/validation";

// The browser receives only this short-lived client secret. OPENAI_API_KEY never leaves the server.
export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OpenAI APIキーが設定されていません。" }, { status: 503, headers: privateHeaders });
  let style: "male_cheer_squad" | "female_idol" = "male_cheer_squad";
  try { const body = await readBody(request); if (isRecord(body) && isStyle(body.style)) style = body.style; } catch { /* Default safely. */ }
  const isCheerCaptain = style === "male_cheer_squad";
  const persona = isCheerCaptain ? "熱血だが押しつけがましくない応援団長" : "明るく親しみやすいアイドル応援キャラクター";
  const voice = isCheerCaptain ? "cedar" : "marin";
  const instructions = `あなたはTCSフェスの${persona}です。目的は、利用者との自然な日本語会話から、その人だけの応援歌を作る材料を集めることです。
絶対に日本語だけで話してください。英語、英語混じりの定型文、技術的説明、AIであることの説明はしません。返答は原則として2文以内にします。
会話の最初はあなたから必ず開始します。短く歓迎のあいさつをし、「応援歌を一緒に作ろう」と伝え、呼ばれたいニックネームを聞きます。その後は、すでに聞いた内容を繰り返し質問せず、相づちをしてから一度に一つだけ次の話題を聞きます。
会話の中で静かに把握したいのは、ニックネーム、今がんばっていること、未来の目標、背中を押してほしいことです。質問票の存在や「必須項目」という言葉は出しません。4つが分かった後は、印象に残った出来事、強み、好きな雰囲気などを自然に深掘りします。4つに加えて本人らしい具体的な気持ち・エピソード・強みのいずれかが一つ分かったら、これ以上質問を増やさず、会話を短く要約して「この内容で応援歌を作っていい？」と日本語で締めてください。利用者が同意するまで曲を作ったとは言いません。
ニックネームは固有名詞なので、聞き取れなかった時に推測で読み替えません。聞き取れたと思っても「○○さん、で合ってる？」と一度だけ確認し、利用者が肯定した後に次へ進んでください。「呼ばれたい名前、もう一度ゆっくり教えてもらえる？」のように一度だけ聞き返してください。利用者が話した内容を勝手に作り変えたり、別の話題へ急に飛んだりしません。`;
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session: { type: "realtime", model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini", instructions, audio: { input: { transcription: { model: "gpt-4o-mini-transcribe", language: "ja", prompt: "会話は日本語。ニックネーム、固有名詞、略称は推測で英語化せず、聞こえた日本語のまま文字起こしする。" }, turn_detection: { type: "semantic_vad" } }, output: { voice } } } }),
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
  return Response.json({ clientSecret: (value as { value: string }).value, model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini", maxSeconds: 180 }, { headers: privateHeaders });
}
