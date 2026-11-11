"use client";

import { queueProgressPush, type SystemEvent } from "@/lib/progression";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tatame.system";

export function SystemToast({ events }: { events?: SystemEvent[] }) {
  const [visible, setVisible] = useState<SystemEvent[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      window.sessionStorage.removeItem(STORAGE_KEY);
      const parsed = JSON.parse(stored) as SystemEvent[];
      if (parsed.length) setVisible(parsed.slice(0, 2));
    }, 0);
    function onPush(event: Event) {
      const detail = (event as CustomEvent<SystemEvent[]>).detail ?? [];
      if (detail.length) setVisible(detail.slice(0, 2));
    }
    window.addEventListener("tatame-progress", onPush);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("tatame-progress", onPush);
    };
  }, []);

  const shown = hidden ? [] : (events?.length ? events.slice(0, 2) : visible);
  if (!shown.length) return null;
  return (
    <div className="system-layer" role="status">
      {shown.map((event) => (
        <article key={event.id} className={`system-toast system-${event.kind}`}>
          <span className="system-kicker">{event.kind === "nivel" ? "Nível" : event.kind === "missao" ? "Missão" : "Título"}</span>
          <strong>{event.title}</strong>
          <p>{event.text}</p>
          <button type="button" className="btn btn-primary" onClick={() => { setVisible([]); setHidden(true); }}>Seguir</button>
        </article>
      ))}
    </div>
  );
}

export function rememberProgress(events: SystemEvent[]): void {
  if (!events.length || typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 2)));
  queueProgressPush(events);
}
