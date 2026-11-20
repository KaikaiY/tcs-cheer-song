import { isRecord } from "./validation";

export type SongMaterial = { topic: string; scene: string };

export function parseSongMaterial(value: unknown): SongMaterial | undefined {
  if (!isRecord(value) || typeof value.topic !== "string" || typeof value.scene !== "string") return;
  const topic = value.topic.trim();
  const scene = value.scene.trim();
  if (topic && scene && topic.length <= 160 && scene.length <= 250) return { topic, scene };
}

export function isSongWithdrawal(text: string) {
  return /(?:歌|曲|歌詞)(?:に|には|へ).{0,12}(?:入れない|入れなくて|使わない|使わなくて|しない|しなくて|入れたくない|したくない)|(?:その|さっきの|今の).{0,8}(?:話|こと).{0,8}(?:なしで|なしに|使わない|やめて)|(?:歌|曲)(?:は|を|づくりは).{0,8}(?:いらない|やめて|やめたい|やめます|不要)|(?:それ|そこ|この部分)(?:は|を).{0,6}(?:入れない|使わない|カットして)|(?:ここ|この話|今の話)(?:は|を)(?:オフレコ|内緒に)/u.test(text);
}
