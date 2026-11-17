import { privateHeaders, safeOrigin } from "@/lib/api";
import { retryMusicJob } from "@/lib/music-jobs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!safeOrigin(request)) return Response.json({ error: "この操作は許可されていません。" }, { status: 403, headers: privateHeaders }); const { id } = await params; const job = retryMusicJob(id); return job ? Response.json({ id: job.id, status: job.status }, { headers: privateHeaders }) : Response.json({ error: "再試行できる楽曲ジョブが見つかりません。" }, { status: 404, headers: privateHeaders }); }
