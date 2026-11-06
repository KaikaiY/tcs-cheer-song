"use client";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import { characters } from "@/lib/themes";
export default function Consent() { const { data, update, reset } = useSession(); const router = useRouter(); const character = data.style ? characters[data.style] : null; return <Stage progress={8} theme={data.style}><section className="information-slide"><div><p className="kicker">{character ? `${character.name.toUpperCase()} と、はじめる前に` : "はじめる前に"}</p><h1>安心して体験するために</h1><ul><li>回答は、あなた自身のための楽曲設計書づくりに使います。</li><li>本名、住所、電話番号などの個人情報は入力しないでください。</li><li>入力内容はOpenAIへ送信される場合があります。</li><li>曲を生成すると、楽曲設計書の内容がEleven Musicへ送信されます。</li><li>音声は保存せず、認識に必要な一時データとして扱います。</li></ul><p className="consent-note">回答と設計書は、このブラウザの一時セッションにのみ保存します。音源はブラウザのメモリだけで再生し、終了操作または一定時間の無操作後に削除します。</p></div><nav className="slide-actions"><button className="button ghost" onClick={() => { reset(); router.push("/"); }}>選び直す</button><button className="button warm" onClick={() => { update({ consent: true, questionIndex: 0, result: undefined }); router.push("/questions"); }}>同意して質問をはじめる　→</button></nav></section></Stage>; }
