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
export type TimelineItem = {
  id: "intro" | "verse" | "chorus" | "bridge" | "finalChorus" | "outro";
  label: string;
  startSeconds: number;
  endSeconds: number;
  energy: "low" | "medium" | "high";
  visualCategory: string;
};
export type MusicSyncSection = {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  energy: "low" | "medium" | "high";
};
export type MusicSyncPlan = {
  version: "v1";
  durationMs: number;
  sections: MusicSyncSection[];
};
export type CreativeBrief = {
  version: "v1";
  style: Style;
  targetDurationSeconds: 90;
  elevenMusicPrompt: string;
  timeline: TimelineItem[];
};
export type Result = { brief: CreativeBrief; briefMode: "mock" | "live" };
export type Session = {
  consent: boolean;
  answers: Answers;
  style: Style | "";
  questionIndex: number;
  result?: Result;
};
