"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stage } from "@/components/shell";
import { useSession } from "@/components/session";
import type { RunMode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { reset, update } = useSession();
  const [demo, setDemo] = useState(true);
  function start(mode: RunMode) { reset(); update({ mode }); router.push("/consent"); }
  return <Stage minimal><section className="radio-home"><div className="radio-home-signal" aria-hidden="true" /><div className="dj-bird-placeholder radio-home-bird" aria-label="仮の鳥型DJシルエット"><i /><b /><em /></div><div className="radio-home-content"><p>TCS RADIO</p><h1>あなたの話が、<br />一曲になる。</h1><span>LIVE CALL · 90 SECOND ANTHEM</span><label className="mode-toggle"><span>デモモード</span><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} /><i aria-hidden="true" /></label><button className="button radio-start" onClick={() => start(demo ? "demo" : "live")}>{demo ? "通話をはじめる　→" : "DJにつなぐ　→"}</button></div></section></Stage>;
}
