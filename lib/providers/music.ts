import type { MusicGenerationInput, MusicGenerationResult } from "../types";
export interface MusicProvider {
  generate(
    input: MusicGenerationInput,
    signal?: AbortSignal,
  ): Promise<MusicGenerationResult>;
}
export class MockMusicProvider implements MusicProvider {
  async generate(input: MusicGenerationInput): Promise<MusicGenerationResult> {
    return {
      audioUrl:
        input.style === "male_cheer_squad"
          ? "/audio/cheer-demo.wav"
          : "/audio/idol-demo.wav",
      durationSeconds: 120,
      mode: "mock",
    };
  }
}
