"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Guard, Stage } from "@/components/shell";

export default function Generating() {
  return <Guard level="character"><ReturnToRadio /></Guard>;
}

function ReturnToRadio() {
  const router = useRouter();
  useEffect(() => { router.replace("/talk"); }, [router]);
  return <Stage minimal><main className="screen loading-screen"><p>DJブースへ戻っています…</p></main></Stage>;
}
