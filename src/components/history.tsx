"use client";

import { useApp } from "@/components/providers";
import { formatDate, formatMonth } from "@/lib/dates";
import { modalityLabel, resultLabel } from "@/lib/labels";
import type { PerspectiveRola, SessionSummary } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type Entry =
  | { kind: "session"; date: string; session: SessionSummary }
  | { kind: "shared"; date: string; rola: PerspectiveRola };

export function History() {
  const app = useApp();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [rolas, setRolas] = useState<PerspectiveRola[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([app.sessions(), app.rolas()])
      .then(([nextSessions, nextRolas]) => {
        if (!alive) return;
        setSessions(nextSessions);
        setRolas(nextRolas);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os treinos.");
      });
    return () => {
      alive = false;
    };
  }, [app]);

  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (!sessions || !rolas) return <div className="pad mt stack"><div className="skeleton" /><div className="skeleton" /></div>;

  const entries: Entry[] = [
    ...sessions.map((session) => ({ kind: "session" as const, date: session.date, session })),
    ...rolas.filter((rola) => !rola.ownedByMe).map((rola) => ({ kind: "shared" as const, date: rola.occurredOn, rola })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <div>
      <header className="mast">
        <p className="eyebrow">Histórico</p>
        <h1>Treinos</h1>
        <p className="lede">Suas anotações e as rolas que um parceiro vinculado registrou com você.</p>
      </header>
      <div className="pad stack">
        {entries.length === 0 ? (
          <div className="card empty">
            <h2>Nenhum treino ainda</h2>
            <Link className="btn btn-primary mt" href="/treinos/novo" style={{ display: "inline-grid", placeItems: "center", textDecoration: "none" }}>Anotar o primeiro</Link>
          </div>
        ) : (
          [...groups.entries()].map(([month, items]) => (
            <section key={month} className="stack">
              <h2>{formatMonth(`${month}-01`)}</h2>
              {items.map((entry) => entry.kind === "session" ? (
                <Link key={entry.session.id} href={`/treinos/${entry.session.id}`} className="card">
                  <div className="spread">
                    <strong>{formatDate(entry.session.date)}</strong>
                    <span className="tag">{modalityLabel(entry.session.modality)}</span>
                  </div>
                  <p className="sub">{entry.session.rolas.length} rolas · {entry.session.rolas.filter((rola) => rola.result === "vitoria").length} vitórias</p>
                  <p className="sub">{entry.session.rolas.map((rola) => rola.opponentName).filter(Boolean).slice(0, 4).join(", ") || "Sem parceiros"}</p>
                </Link>
              ) : (
                <Link key={entry.rola.id} href={`/rolas/${entry.rola.id}`} className="card">
                  <div className="spread">
                    <strong>{formatDate(entry.rola.occurredOn)}</strong>
                    <span className="tag tag-clay">Pelo parceiro</span>
                  </div>
                  <p className="sub">Registrada por {entry.rola.athleteName}. Do seu lado: {resultLabel(entry.rola.result)} · {entry.rola.pointsFor}×{entry.rola.pointsAgainst}</p>
                </Link>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
