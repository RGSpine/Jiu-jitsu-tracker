"use client";

import { useApp } from "@/components/providers";
import { formatDate } from "@/lib/dates";
import { methodLabel, modalityLabel, orgLabel, placementLabel, stageLabel } from "@/lib/labels";
import type { SocialSnapshot } from "@/lib/social";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CompetitorScreen() {
  const app = useApp();
  const [social, setSocial] = useState<SocialSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void app.socialSnapshot().then((next) => {
      if (alive) setSocial(next);
    }).catch((caught: unknown) => {
      if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível abrir.");
    });
    return () => {
      alive = false;
    };
  }, [app]);

  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (!social) return <div className="pad mt"><div className="skeleton" /></div>;
  const report = social.report;
  const assess = social.assessment;

  return (
    <div data-screen="competidor">
      <header className="mast">
        <p className="eyebrow">Competidor</p>
        <h1>{social.next ? social.next.name : "Sem chave marcada"}</h1>
      </header>
      <div className="pad stack">
        <section className="card countdown-card">
          {social.next ? (
            <>
              <strong>D-{social.next.days}</strong>
              <p>{formatDate(social.next.date)} · {social.next.city} · {modalityLabel(social.next.modality)}</p>
            </>
          ) : <p>Nenhuma competição pela frente.</p>}
          <Link className="btn btn-primary" href="/competidor/nova">Registrar</Link>
        </section>

        <section className="medal-row" aria-label="Medalhas">
          <article><strong>{report.medals.ouro}</strong><span>Ouro</span></article>
          <article><strong>{report.medals.prata}</strong><span>Prata</span></article>
          <article><strong>{report.medals.bronze}</strong><span>Bronze</span></article>
        </section>

        <section className="stack" aria-label="Linha do tempo">
          <h2>Chaves</h2>
          {social.competitions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
            <article key={item.id} className="member">
              <div>
                <strong>{item.name}</strong>
                <p className="sub">{formatDate(item.date)} · {orgLabel(item.organization)} · {placementLabel(item.placement)}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="evolucao" className="stack" data-screen="evolucao">
          <h2>Evolução</h2>
          <div className="hero-grid">
            <article className="hero-stat"><span className="stat-label">Vitórias</span><strong>{percent(report.winRate)}</strong></article>
            <article className="hero-stat"><span className="stat-label">Por finalização</span><strong>{percent(report.submissionWinRate)}</strong></article>
            <article className="hero-stat"><span className="stat-label">Pontos feitos</span><strong>{report.pointsSample ? report.pointsFor : "—"}</strong></article>
            <article className="hero-stat"><span className="stat-label">Pontos levados</span><strong>{report.pointsSample ? report.pointsAgainst : "—"}</strong></article>
          </div>
          <section className="card">
            <h2>Por chave</h2>
            {report.byCompetition.map((item) => (
              <div key={item.id} className="spread">
                <span>{item.name}</span>
                <strong>{item.rate === null ? `${item.wins}/${item.matches}` : percent(item.rate)}</strong>
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Como vence</h2>
            <MethodBars items={report.winMethods} />
            <h2>Como perde</h2>
            <MethodBars items={report.lossMethods} />
          </section>
          <section className="card">
            <h2>Fase da chave</h2>
            {report.byStage.map((item) => (
              <div key={item.stage} className="spread">
                <span>{stageLabel(item.stage)}</span>
                <strong>{item.rate === null ? `${item.wins}-${item.losses}` : percent(item.rate)}</strong>
              </div>
            ))}
          </section>
          <section className="card">
            <div className="spread">
              <h2>Treino × luta</h2>
              <span className="sub">{report.versusTraining.status === "low" ? "amostra curta" : report.versusTraining.pct === null ? "—" : `${report.versusTraining.pct}%`}</span>
            </div>
            <div className="split-meter" aria-hidden="true">
              <span style={{ flex: Math.max(report.versusTraining.previous, 0.05) }} />
              <span style={{ flex: Math.max(report.versusTraining.current, 0.05) }} />
            </div>
            <div className="spread"><span>Treino</span><span>Competição</span></div>
          </section>
        </section>

        <section id="campanha" className="card stack" data-screen="campanha">
          <h2>Campanha</h2>
          {assess && social.banner ? (
            <>
              <div className="spread">
                <span className="phase">{social.banner.phaseLabel}</span>
                <strong>D-{assess.days}</strong>
              </div>
              <div className="hero-grid">
                <article className="hero-stat"><span className="stat-label">Prontidão</span><strong>{assess.readiness}</strong></article>
                <article className="hero-stat"><span className="stat-label">Adesão</span><strong>{Math.round(assess.adherence * 100)}%</strong></article>
                <article className="hero-stat"><span className="stat-label">Tempo de luta</span><strong>{assess.fightRolas}</strong></article>
                <article className="hero-stat"><span className="stat-label">Simulações</span><strong>{assess.simulations}</strong></article>
              </div>
              <p>{assess.quest.text}</p>
              <div className="xp-track"><span style={{ width: assess.quest.done ? "100%" : "35%" }} /></div>
            </>
          ) : <p className="sub">Nenhuma campanha aberta.</p>}
        </section>
      </div>
    </div>
  );
}

function percent(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function MethodBars({ items }: { items: { method: Parameters<typeof methodLabel>[0]; count: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (items.length === 0) return <p className="sub">Sem amostra.</p>;
  return (
    <div className="stack">
      {items.map((item) => (
        <div key={item.method}>
          <div className="spread"><span>{methodLabel(item.method)}</span><strong>{item.count}</strong></div>
          <div className="xp-track"><span style={{ width: `${(item.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
