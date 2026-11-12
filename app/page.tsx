"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import type { RunMode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { reset, update } = useSession();
  const [idol, setIdol] = useState(false);
  const [demo, setDemo] = useState(true);
  useEffect(() => { const timer = window.setInterval(() => setIdol((current) => !current), 6500); return () => window.clearInterval(timer); }, []);
  const scene = (url: string, active: boolean) => ({ position: "absolute" as const, inset: 0, backgroundImage: `linear-gradient(180deg,#0000 35%,#000a 100%), url('${url}')`, backgroundSize: "cover", backgroundPosition: "center", opacity: active ? 1 : 0, transform: active ? "scale(1.03)" : "scale(1)", transition: "opacity 1200ms ease, transform 6500ms ease", willChange: "opacity, transform" });
  function start(mode: RunMode) { reset(); update({ mode }); router.push("/consent"); }
  return <Stage minimal><section style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", display: "grid", placeItems: "center", background: "#0b1720" }}><div style={scene("/backgrounds/cheer-captain-field.png", !idol)} /><div style={scene("/backgrounds/idol-stage.png", idol)} /><div style={{ position: "absolute", zIndex: 2, bottom: "6vh", display: "grid", gap: 13, width: "min(280px, 82vw)" }}><label className="mode-toggle"><span>デモモード</span><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} /><i aria-hidden="true" /></label><button className="button" style={{ minHeight: 52, padding: "12px 22px", borderRadius: 999, fontSize: 15, letterSpacing: ".04em", color: "#fff", background: "#10151acc", border: "1px solid #ffffffaa", boxShadow: "0 14px 34px #0009", backdropFilter: "blur(10px)" }} onClick={() => start(demo ? "demo" : "live")}>{demo ? "デモを体験する　→" : "本番生成を始める　→"}</button></div></section></Stage>;
}
