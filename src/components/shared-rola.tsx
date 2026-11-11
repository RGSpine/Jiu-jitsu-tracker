"use client";

import { useApp } from "@/components/providers";
import { formatDate } from "@/lib/dates";
import { categoryLabel, modalityLabel, resultLabel } from "@/lib/labels";
import type { PerspectiveRola } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SharedRola({ rolaId }: { rolaId: string }) {
  const app = useApp();
  const [rola, setRola] = useState<PerspectiveRola | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [badge, setBadge] = useState<{ level: number; title: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void app.sharedRola(rolaId)
      .then((data) => {
        if (!alive) return;
        setRola(data);
        if (data?.opponentUserId) {
          void app.publicBadge(data.opponentUserId).then((value) => {
            if (alive) setBadge(value);
          }).catch(() => undefined);
        }
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível abrir o rola.");
      });
    return () => {
      alive = false;
    };
  }, [app, rolaId]);

  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (rola === undefined) return <div className="pad mt"><div className="skeleton" /></div>;
  if (!rola) return <div className="pad mt"><div className="banner banner-bad"><p>Rola não encontrado.</p></div></div>;

  return (
    <div>
      <header className="mast">
        <p className="eyebrow">{formatDate(rola.occurredOn)}</p>
        <h1>{rola.opponentName}</h1>
        <p className="lede">{modalityLabel(rola.modality)} · {rola.durationMinutes} min</p>
        {badge ? <p className="equipped">Nível {badge.level}{badge.title ? ` · ${badge.title}` : ""}</p> : null}
      </header>
      <div className="pad stack">
        {rola.ownedByMe ? (
          <div className="banner banner-ok"><p>Você registrou este rola. <Link href={`/treinos/${rola.sessionId}`}>Abrir o treino para editar.</Link></p></div>
        ) : (
          <div className="banner">
            <p>Registrado por {rola.athleteName}. Aqui o resultado está do seu lado: vitória e derrota trocam, pontos e finalizações também.</p>
          </div>
        )}
        <article className="card">
          <div className="spread">
            <h2>{resultLabel(rola.result)}</h2>
            <div className="score">{rola.pointsFor}×{rola.pointsAgainst}</div>
          </div>
          <p className="sub">Vantagens {rola.advantagesFor} a {rola.advantagesAgainst} · Punições {rola.penaltiesFor} a {rola.penaltiesAgainst}</p>
        </article>
        <TechniqueBlock title="Finalizações que apliquei" items={rola.submissionsApplied.map((item) => item.name)} />
        <TechniqueBlock title="Finalizações que sofri" items={rola.submissionsSuffered.map((item) => item.name)} />
        <TechniqueBlock title="Minhas técnicas" items={rola.techniquesUsed.map((item) => `${item.name} · ${categoryLabel(item.category)}`)} />
      </div>
    </div>
  );
}

function TechniqueBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {items.length === 0 ? <p className="sub mt">Nenhuma anotada.</p> : (
        <div className="tech-list mt">{items.map((item) => <div key={item}>{item}</div>)}</div>
      )}
    </section>
  );
}
