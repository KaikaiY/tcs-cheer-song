"use client";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
export default function Consent() { const { update, reset } = useSession(); const router = useRouter(); return <Stage progress={8}><section className="information-slide"><div><p className="kicker">はじめる前に</p><h1>安心して体験するために</h1><ul><li>回答は、あなた自身を応援する歌詞と音楽の生成に使います。</li><li>本名、住所、電話番号などの個人情報は入力しないでください。</li><li>入力内容は外部AIサービスへ送信される場合があります。</li><li>音声は保存せず、認識に必要な一時データとして扱います。</li></ul><p className="consent-note">回答と生成結果は、このブラウザの一時セッションにのみ保存します。終了操作または一定時間の無操作後に削除します。</p></div><nav className="slide-actions"><button className="button ghost" onClick={() => { reset(); router.push("/"); }}>同意せずトップへ戻る</button><button className="button warm" onClick={() => { update({ consent: true, questionIndex: 0, style: "", result: undefined }); router.push("/questions"); }}>同意して質問をはじめる　→</button></nav></section></Stage>; }
