"use client";

import { useState } from "react";

type BackgroundVersion = "2d" | "3d";
export function BackgroundPreview() {
  const [version, setVersion] = useState<BackgroundVersion>("2d");

  function select(next: BackgroundVersion) {
    document.documentElement.dataset.radioBackground = next;
    setVersion(next);
  }

  if (process.env.NODE_ENV !== "development") return null;
  return <aside className="background-preview" aria-label="開発用 背景プレビュー">
    <span>BG</span>
    <button className={version === "2d" ? "selected" : ""} onClick={() => select("2d")}>2D</button>
    <button className={version === "3d" ? "selected" : ""} onClick={() => select("3d")}>3D</button>
  </aside>;
}
