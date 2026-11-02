import { readBody, privateHeaders, safeOrigin } from "@/lib/api";
import { parseSong, parseMusic, isRecord } from "@/lib/validation";
import { MockMusicProvider } from "@/lib/providers/music";
export async function POST(request: Request) {
  if (!safeOrigin(request))
    return Response.json(
      { error: "この操作は許可されていません。" },
      { status: 403, headers: privateHeaders },
    );
  let song;
  try {
    const body = await readBody(request);
    if (!isRecord(body) || body.consent !== true) throw new Error();
    song = parseSong(body.song);
  } catch {
    return Response.json(
      { error: "同意と歌詞データを確認してください。" },
      { status: 400, headers: privateHeaders },
    );
  }
  try {
    if (
      process.env.USE_MOCK_MUSIC === "false" &&
      process.env.ELEVENLABS_API_KEY
    )
      return Response.json(
        { error: "音楽サービスの接続準備中です。スタッフへお知らせください。" },
        { status: 503, headers: privateHeaders },
      );
    const provider = new MockMusicProvider();
    return Response.json(parseMusic(await provider.generate(song)), {
      headers: privateHeaders,
    });
  } catch {
    return Response.json(
      { error: "音楽を作成できませんでした。再試行してください。" },
      { status: 502, headers: privateHeaders },
    );
  }
}
