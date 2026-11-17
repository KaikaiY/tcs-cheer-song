import { privateHeaders, safeOrigin } from "@/lib/api";
import { getMusicAudio, getMusicJob } from "@/lib/music-jobs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const { id } = await params; const job = getMusicJob(id);
  if (!job) return Response.json({ error: "制作情報が見つかりません。ページを再読み込みした場合は、もう一度作成してください。" }, { status: 404, headers: privateHeaders });
  return Response.json({ ...job, audio: undefined }, { headers: privateHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const { id } = await params; const audio = await getMusicAudio(id);
  if (!audio) return Response.json({ error: "音源がまだ準備できていません。" }, { status: 404, headers: privateHeaders });
  const bytes = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
  return new Response(bytes, { headers: { ...privateHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
