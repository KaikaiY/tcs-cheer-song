import type { ConversationMessage } from "./types";
import { isRecord } from "./validation";

export type SongMaterial = { topic: string; scene: string; sceneDetails?: string[]; musicPreference?: string };

export function parseSongMaterial(value: unknown): SongMaterial | undefined {
  if (!isRecord(value) || typeof value.topic !== "string" || typeof value.scene !== "string") return;
  const topic = value.topic.trim();
  const scene = value.scene.trim();
  if (!topic || !scene || topic.length > 160 || scene.length > 250) return;
  const sceneDetails = Array.isArray(value.sceneDetails) ? value.sceneDetails
    .filter((detail): detail is string => typeof detail === "string" && detail.trim().length > 0 && detail.length <= 100)
    .map((detail) => detail.trim()).slice(0, 3) : [];
  const story = { topic, scene, ...(sceneDetails.length ? { sceneDetails } : {}) };
  if (!("musicPreference" in value)) return story;
  if (typeof value.musicPreference !== "string") return;
  const musicPreference = value.musicPreference.trim();
  if (musicPreference && musicPreference.length <= 100) return { ...story, musicPreference };
}

export function isSongWithdrawal(text: string) {
  return /(?:歌|曲|歌詞)(?:に|には|へ).{0,12}(?:入れない|入れなくて|使わない|使わなくて|しない|しなくて|入れたくない|したくない)|(?:その|さっきの|今の).{0,8}(?:話|こと).{0,8}(?:なしで|なしに|使わない|やめて)|(?:歌|曲)(?:は|を|づくりは).{0,8}(?:いらない|やめて|やめたい|やめます|不要)|(?:それ|そこ|この部分)(?:は|を).{0,6}(?:入れない|使わない|カットして)|(?:ここ|この話|今の話)(?:は|を)(?:オフレコ|内緒に)/u.test(text);
}

export const songTopicQuestion = "曲にしてみたい場面って、何かある？";

export function songTopicConversation(conversation: ConversationMessage[]) {
  for (const [index, turn] of conversation.entries()) {
    if (turn.role !== "assistant") continue;
    const question = turn.text.match(/(?:(?:(?:何か|なにか)[、\s]*)?(?:一曲|曲|歌)に(?:してみたい|したい|残したい)[、\s]*(?:場面|シーン|瞬間)(?:って|は|が)?[、\s]*(?:何か|なにか)?[、\s]*(?:ある|あった|あります)|どんな話を(?:一曲|曲|歌)にしたい|(?:一曲|曲|歌)に(?:したい|残したい|してほしい)話(?:って|は|が)?[、\s]*(?:ある|あった|どんな|聞かせて)|(?:曲の題材|曲にする話)(?:は|、)?[\s]*(?:何|どんな))/u);
    if (question?.index === undefined) continue;
    // Acknowledge the icebreaker in the same turn without passing it to material selection.
    return [{ ...turn, text: turn.text.slice(question.index) }, ...conversation.slice(index + 1)];
  }
  return undefined;
}

export function materialConversation(conversation: ConversationMessage[], draft?: SongMaterial) {
  const retained = new Set<number>();
  if (draft) {
    for (const excerpt of [draft.topic, draft.scene, ...(draft.sceneDetails ?? [])]) {
      const index = conversation.findLastIndex(({ role, text }) => role === "user" && text.includes(excerpt));
      if (index >= 0) retained.add(index);
    }
  }
  for (let index = conversation.length - 1; index >= 0 && retained.size < 9; index -= 1) retained.add(index);
  return conversation.filter((_, index) => retained.has(index));
}
