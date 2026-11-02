import type { Character, Song, Style } from "./types";

export const characters: Record<Style, Character> = {
  male_cheer_squad: { id: "male_cheer_squad", name: "エールくん", vocalType: "男性", musicStyle: "熱い応援団風", description: "太鼓と掛け声で、まっすぐ背中を押す。", image: "/characters/cheer.svg", accent: "#e9573f" },
  female_idol: { id: "female_idol", name: "エールちゃん", vocalType: "女性", musicStyle: "明るいアイドル風", description: "笑顔とポップな歌で、軽やかに励ます。", image: "/characters/idol.svg", accent: "#c04b92" },
};
export const themes = characters;
export const animationConfig = { duration: 120 };
export function playbackFrame(song: Song, time: number) {
  const section = song.sections.find((item) => time >= item.startSeconds && time < item.endSeconds) ?? song.sections.at(-1)!;
  const span = Math.max(1, section.endSeconds - section.startSeconds);
  const index = Math.min(section.lines.length - 1, Math.floor(((time - section.startSeconds) / span) * section.lines.length));
  return { section: section.label, line: section.lines[index] || "", chorus: ["chorus", "finalChorus"].includes(section.id) };
}
