export type LyricSection = { name: string; lines: string[] };
export type LyricCue = { section: string; text: string; startSeconds: number; endSeconds: number; synced: boolean };
type WordTimestamp = { word: string; startMs: number; endMs: number };

const normalize = (value: string) => value.normalize("NFKC").replace(/[\s　、。！!？?・…ー\-]/g, "");

function parseWords(value: string | null) {
  if (!value) return [] as WordTimestamp[];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): WordTimestamp[] => {
      if (!item || typeof item !== "object") return [];
      const word = (item as { word?: unknown }).word;
      const startMs = (item as { startMs?: unknown }).startMs;
      const endMs = (item as { endMs?: unknown }).endMs;
      return typeof word === "string" && typeof startMs === "number" && typeof endMs === "number" && endMs >= startMs ? [{ word, startMs, endMs }] : [];
    });
  } catch { return []; }
}

export function buildLyricCues(sections: LyricSection[], wordTimestamps: string | null, durationSeconds: number): LyricCue[] {
  const lines = sections.flatMap((section) => section.lines.map((text) => ({ section: section.name, text })));
  const words = parseWords(wordTimestamps);
  const fallback = () => lines.map((line, index) => ({ ...line, startSeconds: (durationSeconds / Math.max(lines.length, 1)) * index, endSeconds: (durationSeconds / Math.max(lines.length, 1)) * (index + 1), synced: false }));
  if (!lines.length || !words.length) return fallback();

  // The sung words are more reliable than the composition plan: the music model
  // can alter line breaks or add ad-libs. Break captions on natural pauses or a
  // readable length, but retain the actual word timestamps for every cue.
  const cues: LyricCue[] = [];
  let group: WordTimestamp[] = [];
  const push = () => {
    if (!group.length) return;
    const first = group[0]; const last = group.at(-1)!;
    cues.push({ section: "LIVE LYRICS", text: group.map((word) => word.word).join(""), startSeconds: first.startMs / 1000, endSeconds: last.endMs / 1000, synced: true });
    group = [];
  };
  for (const word of words) {
    const previous = group.at(-1);
    const characters = group.reduce((total, item) => total + normalize(item.word).length, 0);
    if (previous && (word.startMs - previous.endMs >= 420 || characters >= 18)) push();
    group.push(word);
  }
  push();
  return cues.length ? cues : fallback();
}
