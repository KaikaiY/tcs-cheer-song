"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { emptyAnswers, questions } from "@/lib/questions";
import { isRecord, isStyle, parseCreativeBrief, parseSongProfile } from "@/lib/validation";
import { parseSongMaterial } from "@/lib/song-material";
import type { MockScenario, Session } from "@/lib/types";
const KEY = "tcs-cheer-v1";
const fresh = (): Session => ({
  consent: false,
  mode: "live",
  answers: { ...emptyAnswers },
  style: "",
  questionIndex: 0,
  conversation: [],
});
const Context = createContext<{
  data: Session;
  ready: boolean;
  storageWarning: boolean;
  update: (patch: Partial<Session>) => void;
  reset: () => void;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<Session>(fresh);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      try {
        const raw = sessionStorage.getItem(KEY);
        if (raw) {
          const value: unknown = JSON.parse(raw);
          if (
            isRecord(value) &&
            value.consent === true &&
            isRecord(value.answers)
          ) {
            const answers = { ...emptyAnswers };
            for (const k of Object.keys(answers) as (keyof typeof answers)[]) {
              if (typeof value.answers[k] === "string")
                answers[k] = (value.answers[k] as string).slice(0, 500);
            }
            const next: Session = {
              consent: true,
              mode: value.mode === "demo" ? "demo" : "live",
              answers,
              style: isStyle(value.style) ? value.style : "",
              questionIndex:
                typeof value.questionIndex === "number" &&
                value.questionIndex >= 0 &&
                value.questionIndex < questions.length
                  ? value.questionIndex
                  : 0,
              songMaterial: parseSongMaterial(value.songMaterial),
              completedPlaybackId: typeof value.completedPlaybackId === "string" ? value.completedPlaybackId : undefined,
              conversation: Array.isArray(value.conversation)
                ? value.conversation.flatMap((message) => isRecord(message) && (message.role === "user" || message.role === "assistant") && typeof message.text === "string" && message.text.length <= 500 ? [{ role: message.role, text: message.text }] : [])
                : [],
            };
            if (["quick", "wait30", "wait120", "fail", "retry-success", "audio-fail"].includes(value.mockScenario as string)) next.mockScenario = value.mockScenario as MockScenario;
            if (isRecord(value.profile)) {
              try { next.profile = parseSongProfile(value.profile); } catch { /* Invalid profile is discarded. */ }
            }
            if (isRecord(value.result)) {
              try {
                next.result = {
                  brief: parseCreativeBrief(value.result.brief),
                  briefMode: value.result.briefMode === "live" ? "live" : "mock",
                };
              } catch {
                /* Invalid result is discarded. */
              }
            }
            if (isRecord(value.musicJob) && typeof value.musicJob.id === "string" && ["preparing", "generating", "ready", "failed"].includes(value.musicJob.status as string)) {
              next.musicJob = {
                id: value.musicJob.id,
                status: value.musicJob.status as NonNullable<Session["musicJob"]>["status"],
                error: typeof value.musicJob.error === "string" ? value.musicJob.error : undefined,
                title: typeof value.musicJob.title === "string" ? value.musicJob.title.slice(0, 160) : undefined,
                lyrics: typeof value.musicJob.lyrics === "string" ? value.musicJob.lyrics.slice(0, 20_000) : undefined,
                visualSync: typeof value.musicJob.visualSync === "string" ? value.musicJob.visualSync.slice(0, 20_000) : undefined,
                wordTimestamps: typeof value.musicJob.wordTimestamps === "string" ? value.musicJob.wordTimestamps.slice(0, 50_000) : undefined,
              };
              if (isRecord(value.musicJob.profile)) {
                try { next.musicJob.profile = parseSongProfile(value.musicJob.profile); } catch { /* Invalid profile is discarded. */ }
              }
              if (isRecord(value.musicJob.result)) {
                try {
                  next.musicJob.result = {
                    brief: parseCreativeBrief(value.musicJob.result.brief),
                    briefMode: value.musicJob.result.briefMode === "live" ? "live" : "mock",
                  };
                } catch { /* Invalid result is discarded. */ }
              }
            }
            current.current = next;
            setData(next);
          }
        }
      } catch {
        setStorageWarning(true);
      }
      setReady(true);
    });
    return () => {
      disposed = true;
    };
  }, []);
  const update = useCallback((patch: Partial<Session>) => {
    const next = { ...current.current, ...patch };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      setStorageWarning(true);
    }
    current.current = next;
    setData(next);
  }, []);
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      setStorageWarning(true);
    }
    current.current = fresh();
    setData(current.current);
  }, []);
  useEffect(() => {
    if (pathname === "/talk" || pathname === "/generating") return;
    const idleMs = 10 * 60 * 1000;
    let timer = window.setTimeout(() => reset(), idleMs);
    const renew = () => { window.clearTimeout(timer); timer = window.setTimeout(() => reset(), idleMs); };
    window.addEventListener("pointerdown", renew);
    window.addEventListener("keydown", renew);
    return () => { window.clearTimeout(timer); window.removeEventListener("pointerdown", renew); window.removeEventListener("keydown", renew); };
  }, [pathname, reset]);
  return (
    <Context.Provider value={{ data, ready, storageWarning, update, reset }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}
