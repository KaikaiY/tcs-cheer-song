export const radioStation = "TCS RADIO";
export const radioStationReading = "ティーシーエスレディオ";
export const radioShow = "エールステーション";
export const radioDj = "DJ YOSHI";
export const radioDjReading = "ディージェイ ヨシ";

export function formatRadioCaption(text: string) {
  return text.replace(
    /(?:ＴＣＳ|TCS|[てテ][ぃィ][ー－]?[しシ][ー－]?[えエ][すス])[\s・]*(?:RADIO|ＲＡＤＩＯ|[れレ][でデ][ぃィ][おオ]|[らラ][じジ][おオ])/giu,
    radioStation,
  );
}
