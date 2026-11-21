import type { ConversationMessage } from "./types";
import { isRecord } from "./validation";

export type SongMaterial = { topic: string; scene: string; musicPreference?: string };

export function parseSongMaterial(value: unknown): SongMaterial | undefined {
  if (!isRecord(value) || typeof value.topic !== "string" || typeof value.scene !== "string") return;
  const topic = value.topic.trim();
  const scene = value.scene.trim();
  if (!topic || !scene || topic.length > 160 || scene.length > 250) return;
  if (!("musicPreference" in value)) return { topic, scene };
  if (typeof value.musicPreference !== "string") return;
  const musicPreference = value.musicPreference.trim();
  if (musicPreference && musicPreference.length <= 100) return { topic, scene, musicPreference };
}

export function isSongWithdrawal(text: string) {
  return /(?:歌|曲|歌詞)(?:に|には|へ).{0,12}(?:入れない|入れなくて|使わない|使わなくて|しない|しなくて|入れたくない|したくない)|(?:その|さっきの|今の).{0,8}(?:話|こと).{0,8}(?:なしで|なしに|使わない|やめて)|(?:歌|曲)(?:は|を|づくりは).{0,8}(?:いらない|やめて|やめたい|やめます|不要)|(?:それ|そこ|この部分)(?:は|を).{0,6}(?:入れない|使わない|カットして)|(?:ここ|この話|今の話)(?:は|を)(?:オフレコ|内緒に)/u.test(text);
}

export function hasMusicDirection(text: string) {
  return /明る|暗め|静か|穏やか|落ち着|しっとり|ゆったり|ゆっくり|速め|遅め|アップテンポ|ミドルテンポ|軽快|元気|力強|激し|優し|やさし|柔らか|やわらか|かっこよ|かっこい|懐かし|切な|グルーヴ|ノリ|疾走感|盛り上が|広が|高い声|低い声|歌詞が聞き|ピアノ|ギター|弦楽器|アコースティック|バラード|ロック|ポップ|ジャズ|ヒップホップ|ラップ|ボサノバ|シティポップ|EDM|J[-‐ー ]?POP/iu.test(text);
}

export function materialConversation(conversation: ConversationMessage[], draft?: SongMaterial) {
  const retained = new Set<number>();
  if (draft) {
    for (const excerpt of [draft.topic, draft.scene]) {
      const index = conversation.findLastIndex(({ role, text }) => role === "user" && text.includes(excerpt));
      if (index >= 0) retained.add(index);
    }
  }
  for (let index = conversation.length - 1; index >= 0 && retained.size < 9; index -= 1) retained.add(index);
  return conversation.filter((_, index) => retained.has(index));
}
