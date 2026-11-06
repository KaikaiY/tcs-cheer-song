"use client";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { questions } from "@/lib/questions";
export default function Confirm() { return <Guard level="answers"><Content /></Guard>; }
function Content() { const { data, update } = useSession(); const router = useRouter(); return <Stage theme={data.style} progress={64}><section className="confirm-slide"><div><p className="kicker">回答の確認</p><h1>あなたの言葉を確認してください</h1><dl>{questions.map((question, index) => <div key={question.id}><dt>{index + 1}. {question.shortLabel}</dt><dd>{data.answers[question.id]}</dd><button onClick={() => { update({ questionIndex: index }); router.push("/questions"); }}>修正する</button></div>)}</dl></div><nav className="slide-actions"><button className="button ghost" onClick={() => router.push("/questions")}>質問に戻る</button><button className="button warm" onClick={() => router.push("/generating")}>{data.style === "female_idol" ? "エールちゃんに託す" : "エールくんに託す"}　→</button></nav></section></Stage>; }
