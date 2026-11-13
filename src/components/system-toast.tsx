"use client";

import { queueProgressPush, type SystemEvent } from "@/lib/progression";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tatame.system";

export function SystemToast({ events }: { events?: SystemEvent[] }) {
  const [queue, setQueue] = useState<SystemEvent[]>([]);
  const [reduced, setReduced] = useState(false);
  const current = queue[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (events?.length) {
        setQueue(events.slice(0, 6));
        return;
      }
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      window.sessionStorage.removeItem(STORAGE_KEY);
      const parsed = JSON.parse(stored) as SystemEvent[];
      if (parsed.length) setQueue(parsed.slice(0, 6));
    }, 0);
    function onPush(event: Event) {
      const detail = (event as CustomEvent<SystemEvent[]>).detail ?? [];
      if (detail.length) setQueue(detail.slice(0, 6));
    }
    window.addEventListener("tatame-progress", onPush);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("tatame-progress", onPush);
    };
  }, [events]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setQueue((items) => items.slice(1)), reduced ? 2600 : 4600);
    return () => window.clearTimeout(timer);
  }, [current, reduced]);

  if (!current) return null;
  return (
    <div className="system-layer" role="status">
      <button type="button" className={`system-panel${reduced ? " system-still" : ""}`} onClick={() => setQueue((items) => items.slice(1))}>
        <span className="system-kicker">[SISTEMA]{queue.length > 1 ? `  +${queue.length - 1}` : ""}</span>
        <strong>{current.body.replace("[SISTEMA] ", "")}</strong>
      </button>
    </div>
  );
}

export function rememberProgress(events: SystemEvent[]): void {
  if (!events.length || typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 6)));
  queueProgressPush(events);
}
