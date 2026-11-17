"use client";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";

export default function Consent() {
  const { data, update, reset } = useSession();
  const router = useRouter();
  const isDemo = data.mode === "demo";
  const background = { position: "absolute" as const, inset: 0, background: "radial-gradient(circle at 50% 20%,#7b2a584d,transparent 34%),linear-gradient(145deg,#070810,#201127 58%,#080b16)" };
  function begin() {
    // The legacy style remains an internal, temporary music-direction value only.
    update({ consent: true, questionIndex: 0, style: "male_cheer_squad", conversation: [], result: undefined });
    router.push("/talk");
  }
  return <Stage minimal><section style={{ position: "relative", width: "100%", height: "100%", display: "grid", placeItems: "center", overflow: "hidden" }}><div style={background} /><div style={{ position: "relative", width: "min(590px, 90vw)", padding: "clamp(28px,5vw,54px)", border: "1px solid #ffffff44", borderRadius: 28, color: "#fff", background: "#10151ad9", boxShadow: "0 28px 70px #000a", backdropFilter: "blur(14px)" }}><p style={{ margin: 0, color: "#ffd66d", fontWeight: 800, fontSize: 12, letterSpacing: ".15em" }}>{isDemo ? "DEMO EXPERIENCE" : "BEFORE WE BEGIN"}</p><h1 style={{ fontSize: "clamp(30px,4vw,48px)", letterSpacing: "-.05em", lineHeight: 1.15, margin: "14px 0 24px" }}>応援歌をつくるために</h1><div style={{ display: "grid", gap: 14, color: "#ffffffcc", lineHeight: 1.7 }}><p style={{ margin: 0 }}>{isDemo ? "デモ用の会話と応援歌を使って、完成までの体験をお楽しみください。" : "会話から受け取った想いをもとに、オリジナル応援歌を生成します。"}</p><p style={{ margin: 0 }}>{isDemo ? "デモモードでは、OpenAI・Eleven Music・マイクへ接続しません。" : "本名・住所・連絡先などの個人情報は話さないでください。"}</p><p style={{ margin: 0 }}>DJとの通話がつながったら、今のあなたの話を聞かせてください。</p></div><div style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap" }}><button className="button" style={{ color: "#fff", background: "transparent", border: "1px solid #ffffff66", minHeight: 48, padding: "11px 16px" }} onClick={() => { reset(); router.push("/"); }}>戻る</button><button className="button" style={{ color: "#fff", background: "#ffffff18", border: "1px solid #fff", boxShadow: "0 10px 26px #0008", minHeight: 48, padding: "11px 20px" }} onClick={begin}>{isDemo ? "通話をはじめる　→" : "通話につなぐ　→"}</button></div></div></section></Stage>;
}
