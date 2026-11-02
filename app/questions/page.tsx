"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { questions } from "@/lib/questions";
import { VoiceAnswer } from "@/components/voice-answer";
export default function Questions() { return <Guard level="consent"><QuestionFlow /></Guard>; }
function QuestionFlow() {
  const { data, update } = useSession(); const router = useRouter(); const question = questions[data.questionIndex]; const [error, setError] = useState("");
  const value = data.answers[question.id]; const change = (next: string) => update({ answers: { ...data.answers, [question.id]: next.slice(0, question.max) }, result: undefined });
  function next() { if (!value.trim()) { setError("回答を入力または音声で話してください。"); return; } if (data.questionIndex === questions.length - 1) { router.push("/confirm"); return; } setError(""); update({ questionIndex: data.questionIndex + 1 }); }
  function back() { if (data.questionIndex === 0) { router.push("/consent"); return; } setError(""); update({ questionIndex: data.questionIndex - 1 }); }
  return <Stage progress={16 + ((data.questionIndex + 1) / questions.length) * 45}><section className="question-slide"><div className="question-meta"><span>QUESTION {data.questionIndex + 1} / {questions.length}</span><div className="question-progress"><i style={{ width: `${((data.questionIndex + 1) / questions.length) * 100}%` }} /></div></div><div className="question-copy"><p>あなた自身のための応援歌をつくります</p><h1>{question.label}</h1><span className="question-hint">{question.hint}</span></div><VoiceAnswer key={question.id} question={question.label} value={value} onChange={change} />{error && <p className="inline-error" role="alert">{error}</p>}<nav className="slide-actions"><button className="button ghost" onClick={back}>← 戻る</button><button className="button warm" onClick={next} disabled={!value.trim()}>{data.questionIndex === questions.length - 1 ? "回答を確認する" : "次の質問へ"} →</button></nav></section></Stage>;
}
