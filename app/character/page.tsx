"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";

export default function CharacterPage() {
  return <Guard level="character"><LegacyRedirect /></Guard>;
}

function LegacyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/talk"); }, [router]);
  return <Stage minimal><main className="screen loading-screen"><p>DJブースへつないでいます…</p></main></Stage>;
}
