type GeneratedMusic = {
  audioUrl: string;
  title: string;
  lyrics: string | null;
  visualSync: string | null;
  wordTimestamps: string | null;
};

let music: GeneratedMusic | null = null;

export function saveGeneratedMusic(next: GeneratedMusic) {
  if (music?.audioUrl) URL.revokeObjectURL(music.audioUrl);
  music = next;
}

export function readGeneratedMusic() {
  return music;
}

export function clearGeneratedMusic() {
  if (music?.audioUrl) URL.revokeObjectURL(music.audioUrl);
  music = null;
}
