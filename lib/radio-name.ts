export const radioNamePattern = "[ぁ-ゖァ-ヺー]{1,24}";
const radioName = new RegExp(`^(?:${radioNamePattern})$`, "u");

export const isRadioName = (value: string) => radioName.test(value);

const filler = /^(?:[ぁあぇえぉおうんふむー]+|ええと|えーと|えっと|あのー?|はい|はーい|そう(?:です(?:ね)?)?|なるほど)$/u;

export function isMeaningfulRadioTurn(text: string) {
  const normalized = text.normalize("NFKC")
    .replace(/[ァ-ヶ]/gu, (letter) => String.fromCharCode(letter.charCodeAt(0) - 96))
    .replace(/[\[（(【](?:雑音|環境音|無音|聞き取り不能)[\]）)】]/gu, "");
  return normalized.split(/[\s、。！？!?…,.]+/u).some((token) => token && !filler.test(token));
}
