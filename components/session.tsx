"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { emptyAnswers } from "@/lib/questions";
import { isRecord, isStyle, parseCreativeBrief } from "@/lib/validation";
import type { Session } from "@/lib/types";
const KEY = "tcs-cheer-v1";
const fresh = (): Session => ({
  consent: false,
  answers: { ...emptyAnswers },
  style: "",
  questionIndex: 0,
});
const Context = createContext<{
  data: Session;
  ready: boolean;
  storageWarning: boolean;
  update: (patch: Partial<Session>) => void;
  reset: () => void;
} | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
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
              answers,
              style: isStyle(value.style) ? value.style : "",
              questionIndex:
                typeof value.questionIndex === "number" &&
                value.questionIndex >= 0 &&
                value.questionIndex < 6
                  ? value.questionIndex
                  : 0,
            };
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
    const idleMs = 10 * 60 * 1000;
    let timer = window.setTimeout(() => reset(), idleMs);
    const renew = () => { window.clearTimeout(timer); timer = window.setTimeout(() => reset(), idleMs); };
    window.addEventListener("pointerdown", renew);
    window.addEventListener("keydown", renew);
    return () => { window.clearTimeout(timer); window.removeEventListener("pointerdown", renew); window.removeEventListener("keydown", renew); };
  }, [reset]);
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
