import "server-only";
import type { MusicProvider } from "./music";
import type { MusicGenerationInput, MusicGenerationResult } from "../types";
// TODO: 公式仕様と利用権を確認してから実装する。推測したエンドポイントへ送信しない。
// 入力: 歌詞、positive/negativeStyles、希望尺、AbortSignal。
// 出力: 検証済み配信URL、実際の尺、mode: live。
// TODO: 認証、生成ジョブ/ポーリング、タイムアウト、音源保管・配信、URL許可リスト、歌詞タイムスタンプ。
export class ElevenMusicProvider implements MusicProvider {
  async generate(
    _input: MusicGenerationInput,
    _signal?: AbortSignal,
  ): Promise<MusicGenerationResult> {
    void _input;
    void _signal;
    throw new Error("Eleven Music adapter is not configured");
  }
}
