import { privateHeaders, safeOrigin } from "@/lib/api";
import { getMusicAudio } from "@/lib/music-jobs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders });
  const { id } = await params; const audio = await getMusicAudio(id);
  if (!audio) return Response.json({ error: "音源がまだ準備できていません。" }, { status: 404, headers: privateHeaders });
  const range = request.headers.get("range");
  const commonHeaders = { ...privateHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "Accept-Ranges": "bytes" };
  if (!range) {
    const body = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
    return new Response(body, { headers: { ...commonHeaders, "Content-Length": String(audio.byteLength) } });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416, headers: { ...commonHeaders, "Content-Range": `bytes */${audio.byteLength}` } });
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), audio.byteLength - 1) : audio.byteLength - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= audio.byteLength)
    return new Response(null, { status: 416, headers: { ...commonHeaders, "Content-Range": `bytes */${audio.byteLength}` } });
  const chunk = audio.slice(start, end + 1);
  const body = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
  return new Response(body, { status: 206, headers: { ...commonHeaders, "Content-Length": String(chunk.byteLength), "Content-Range": `bytes ${start}-${end}/${audio.byteLength}` } });
}
