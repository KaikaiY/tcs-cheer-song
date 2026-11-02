export type Style = "male_cheer_squad" | "female_idol";

export type Answers = {
  nickname: string;
  currentEffort: string;
  futureGoal: string;
  encouragementTarget: string;
  strength: string;
  musicPreference: string;
};

export type Character = {
  id: Style;
  name: string;
  vocalType: "男性" | "女性";
  musicStyle: string;
  description: string;
  image: string;
  accent: string;
};

export type Submission = { consent: true; answers: Answers; style: Style };
export type LyricSection = {
  id: "intro" | "verse" | "chorus" | "bridge" | "finalChorus" | "outro";
  label: string;
  startSeconds: number;
  endSeconds: number;
  lines: string[];
};
export type Song = {
  title: string;
  style: Style;
  durationSeconds: number;
  lyrics: { verse: string[]; chorus: string[] };
  sections: LyricSection[];
  musicPrompt: { positiveStyles: string[]; negativeStyles: string[] };
  visualKeywords: string[];
};
export type MusicGenerationInput = Song;
export type MusicGenerationResult = {
  audioUrl: string;
  durationSeconds: number;
  mode: "mock" | "live";
};
export type Result = { song: Song; music: MusicGenerationResult; lyricsMode: "mock" | "live" };
export type Session = {
  consent: boolean;
  answers: Answers;
  style: Style | "";
  questionIndex: number;
  result?: Result;
};
