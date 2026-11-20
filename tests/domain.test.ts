import { test } from "node:test";
import assert from "node:assert/strict";
import { answerErrors, parseCreativeBrief, parseSongProfile, parseSubmission, requiredAnswerErrors } from "../lib/validation.ts";
import { mockCreativeBrief } from "../lib/providers/mock-brief.ts";
import { addMandatorySpec } from "../lib/prompt-format.ts";
import { readBody, safeOrigin } from "../lib/api.ts";
import { isSongWithdrawal, parseSongMaterial } from "../lib/song-material.ts";
import { isMeaningfulRadioTurn, isRadioName } from "../lib/radio-name.ts";
import { fillExpectedAnswer, mergeTalkAnswers, nextQuestionId } from "../lib/talk.ts";

const profile = { version: "v1", summary: "資格の勉強を続けながら、自分に合う仕事を目指している。", personalMotifs: ["積み上げる毎日"], musicalHints: ["明るいポップ"] };
const valid = { consent: true, style: "male_cheer_squad", answers: { nickname: "チームT", futureGoal: "資格の勉強を続けている", encouragementTarget: "一歩を踏み出す勇気", strength: "こつこつ続けられるところ", musicPreference: "元気" }, profile };

test("only three conversation facts are structurally required, while a profile is required for generation", () => { assert.equal(Object.keys(answerErrors(valid.answers)).length, 0); assert.equal(Object.keys(requiredAnswerErrors({ ...valid.answers, nickname: "", strength: "" })).length, 0); assert.ok(requiredAnswerErrors({ ...valid.answers, futureGoal: " " }).futureGoal); assert.ok(answerErrors({ ...valid.answers, strength: "あ".repeat(161) }).strength); assert.throws(() => parseSubmission({ ...valid, consent: false })); assert.throws(() => parseSubmission({ ...valid, style: "other" })); assert.throws(() => parseSubmission({ ...valid, profile: undefined })); });
test("song profile only accepts bounded, structured conversation facts", () => { assert.equal(parseSongProfile(profile).summary, profile.summary); assert.throws(() => parseSongProfile({ ...profile, personalMotifs: ["x", "y", "z", "a", "b"] })); });
test("mock creative brief supports Eleven Music and an exact 90-second guidance timeline", () => { for (const style of ["male_cheer_squad", "female_idol"] as const) { const brief = addMandatorySpec(parseCreativeBrief(mockCreativeBrief(parseSubmission({ ...valid, style })))); assert.equal(brief.style, style); assert.equal(brief.targetDurationSeconds, 90); assert.equal(brief.timeline.length, 6); assert.equal(brief.timeline[0].startSeconds, 0); assert.equal(brief.timeline.at(-1)?.endSeconds, 90); assert.match(brief.elevenMusicPrompt, /曲の長さ：90秒（1分30秒）/); assert.match(brief.elevenMusicPrompt, /\[最後のサビ\] 0:59–1:19/); assert.match(brief.elevenMusicPrompt, /歌詞と歌唱は音楽AI自身が作る/); assert.ok(!brief.elevenMusicPrompt.includes(valid.answers.nickname)); } });
test("invalid creative briefs and cross-origin input are rejected", async () => { const brief = mockCreativeBrief(parseSubmission(valid)); assert.throws(() => parseCreativeBrief({ ...brief, targetDurationSeconds: 60 })); assert.throws(() => parseCreativeBrief({ ...brief, timeline: brief.timeline.map((item, index) => index === 2 ? { ...item, startSeconds: 39 } : item) })); const request = new Request("http://localhost:3000/api", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } }); assert.equal(safeOrigin(request), true); assert.equal(safeOrigin(new Request(request, { headers: { host: "127.0.0.1:3000", origin: "https://evil.example" } })), false); const json = new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"consent":true}' }); assert.deepEqual(await readBody(json), { consent: true }); });
test("talk answers only fill blank fields and advance to the next missing item", () => { const initial = { ...valid.answers, nickname: "" }; const merged = mergeTalkAnswers(initial, { nickname: "かいかい", futureGoal: "書き換えない" }); assert.equal(merged.nickname, "かいかい"); assert.equal(merged.futureGoal, valid.answers.futureGoal); assert.equal(nextQuestionId(merged), null); });
test("talk fallback fills the next required answer, not the optional nickname", () => { const answers = { ...valid.answers, nickname: "", futureGoal: "" }; const next = fillExpectedAnswer(answers, "資格の勉強を続けている"); assert.equal(next.nickname, ""); assert.equal(next.futureGoal, "資格の勉強を続けている"); assert.equal(nextQuestionId(next), null); });

test("radio input accepts kana names and skips filler-only transcripts", () => {
  for (const name of ["かいかい", "ジョー", "いえろーバード"]) assert.equal(isRadioName(name), true);
  for (const name of ["", "太郎", "kai", "カイ1", "かい かい", "ｶｲ", "か".repeat(25)]) assert.equal(isRadioName(name), false);
  for (const text of ["えー、あの。", "ウン、はい。", "そうですね。", "[雑音]", ""]) assert.equal(isMeaningfulRadioTurn(text), false);
  for (const text of ["はい、展示を作っています。", "えーと、パソコンです。", "勉強", "はい、そうしたいです。"]) assert.equal(isMeaningfulRadioTurn(text), true);
});

test("song material requires both a topic and a scene and recognizes explicit withdrawal", () => {
  assert.deepEqual(parseSongMaterial({ topic: " 試験に挑戦したい ", scene: "寝る前に一問解いた" }), { topic: "試験に挑戦したい", scene: "寝る前に一問解いた" });
  assert.equal(parseSongMaterial({ topic: "試験に挑戦したい", scene: "" }), undefined);
  for (const text of ["その話は歌に入れないで", "さっきの話はなしで", "曲づくりはやめて", "それは入れないで", "この話はオフレコで"]) assert.equal(isSongWithdrawal(text), true);
  assert.equal(isSongWithdrawal("友達にアプリを見せたいです"), false);
});
