import { radioShow } from "./radio-brand";

export function djSignoff(nickname: string, title: string) {
  const listener = nickname.trim().slice(0, 24);
  const song = title.trim().slice(0, 120) || "あなたのための一曲";
  return `今お届けしたのは、${listener ? `${listener}さん` : "あなた"}のための一曲、『${song}』でした。今日の${radioShow}は、ここまで。話してくれてありがとう。またスタジオでね。`;
}
