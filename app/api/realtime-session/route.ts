import { privateHeaders, readBody, safeOrigin } from "@/lib/api";
import { isRecord, isStyle } from "@/lib/validation";

// The browser receives only this short-lived client secret. OPENAI_API_KEY never leaves the server.
export async function POST(request: Request) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OpenAI APIキーが設定されていません。" }, { status: 503, headers: privateHeaders });
  let style: "male_cheer_squad" | "female_idol" = "male_cheer_squad"; let waiting = false;
  try { const body = await readBody(request); if (isRecord(body) && isStyle(body.style)) style = body.style; waiting = isRecord(body) && body.phase === "waiting"; } catch { /* Default safely. */ }
  const isCheerCaptain = style === "male_cheer_squad";
  const persona = isCheerCaptain ? "落ち着きと熱量を両立するラジオDJ" : "明るく親しみやすいラジオDJ";
  const voice = isCheerCaptain ? "cedar" : "sage";
  const instructions = `あなたはTCSフェスの${persona}です。生電話番組「TCS RADIO」のDJとして、利用者との自然な日本語会話から、その人だけの応援歌を作る材料を集めます。
絶対に日本語だけで話してください。英語、英語混じりの定型文、技術的説明、AIであることの説明はしません。返答は原則として2文以内にします。${isCheerCaptain ? "\n口調は、まっすぐで少し熱量のあるDJです。ただし怒鳴らず、利用者を急かしたり否定したりしません。" : "\n口調は、明るく柔らかいDJです。まず相手の言葉を受け止め、過度な語尾の演技はしません。"}
会話の最初はあなたから必ず開始します。短く「TCS RADIO、生放送中です」と歓迎し、「今のあなたの話から一曲を選曲していく」「うまく話そうとしなくて大丈夫」と伝えます。その後、呼ばれたいニックネームを聞きます。楽曲の出来や感動を予告したり、期待をあおったりはしません。その後は、すでに聞いた内容を繰り返し質問せず、相づちをしてから一度に一つだけ次の話題を聞きます。
会話の中で静かに把握したいのは、ニックネーム、今がんばっていること、未来の目標、背中を押してほしいことです。質問票の存在や「必須項目」という言葉は出しません。4つが分かった後は、印象に残った出来事、強み、好きな雰囲気などを自然に深掘りします。4つに加えて本人らしい具体的な気持ち・エピソード・強みのいずれかが一つ分かったら、これ以上質問を増やさず、「ありがとう。今まで聞いた話をもとに、あなたのための一曲を準備します」と伝えて会話を区切ってください。利用者に同意や操作を求めず、技術的な処理の説明もしません。
ニックネームは固有名詞なので、聞き取れなかった時に推測で読み替えません。聞き取れたと思っても「○○さん、で合ってる？」と一度だけ確認し、利用者が肯定した後に次へ進んでください。「呼ばれたい名前、もう一度ゆっくり教えてもらえる？」のように一度だけ聞き返してください。利用者が話した内容を勝手に作り変えたり、別の話題へ急に飛んだりしません。${waiting ? "\nいま応援歌の制作はすでに始まっています。この会話は待ち時間の楽しい雑談です。新しい情報を曲に反映すると約束せず、質問票や確認を繰り返さず、相手の話に自然に反応してください。曲が完成したかどうかはあなたから断定しません。" : ""}`;
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session: { type: "realtime", model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini", instructions, audio: { input: { transcription: { model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe", language: "ja", prompt: "会話は日本語。ニックネーム、固有名詞、略称は推測で英語化せず、聞こえた日本語のまま文字起こしする。" }, turn_detection: { type: "semantic_vad" } }, output: { voice } } } }),
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
  return Response.json({ clientSecret: (value as { value: string }).value, model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1-mini", maxSeconds: 600 }, { headers: privateHeaders });
}
