"use client";

import { useApp } from "@/components/providers";
import { rulesFor } from "@/data/rules";
import { formatNumber, todayIso } from "@/lib/dates";
import { categoryLabel, modalityLabel, resultLabel } from "@/lib/labels";
import {
  categoryBreakdown,
  chartTitle,
  filterRolas,
  periodWindow,
  summarize,
  techniqueRanking,
  trends,
  volumeBuckets,
  type Trend,
} from "@/lib/stats";
import type { ModalityFilter, PeriodKey, PerspectiveRola } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "semestre", label: "Semestre" },
  { id: "ano", label: "Ano" },
  { id: "tudo", label: "Tudo" },
];

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function percent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function TrendPill({ trend }: { trend: Trend }) {
  if (trend.change === null) return <span className="trend na">sem base</span>;
  const rounded = Math.round(trend.change);
  const improved = trend.higherIsBetter ? rounded > 0 : rounded < 0;
  const worsened = trend.higherIsBetter ? rounded < 0 : rounded > 0;
  const tone = improved ? "up" : worsened ? "down" : "flat";
  const sign = rounded > 0 ? "+" : "";
  return <span className={`trend ${tone}`}>{sign}{rounded}%</span>;
}

export function Dashboard() {
  const app = useApp();
  const [rolas, setRolas] = useState<PerspectiveRola[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [modality, setModality] = useState<ModalityFilter>("todas");
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void app.rolas()
      .then((data) => {
        if (!alive) return;
        setRolas(data);
        setToday(todayIso());
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o painel.");
      });
    return () => {
      alive = false;
    };
  }, [app]);

  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (!rolas || !today || !app.profile) {
    return <div className="pad mt stack"><div className="skeleton" /><div className="skeleton" /></div>;
  }

  const window = periodWindow(period, today);
  const currentRolas = filterRolas(rolas, window, modality);
  const previousRolas = window.previousStart && window.previousEnd
    ? filterRolas(rolas, { start: window.previousStart, end: window.previousEnd }, modality)
    : null;
  const summary = summarize(currentRolas);
  const comparison = trends(summary, previousRolas ? summarize(previousRolas) : null);
  const buckets = volumeBuckets(period, currentRolas, today);
  const categories = categoryBreakdown(currentRolas);
  const ranking = techniqueRanking(currentRolas);
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  const rules = rulesFor("ibjjf");
  const monthOpen = period === "mes" && today < window.end;

  return (
    <div>
      <header className="mast">
        <p className="eyebrow">{app.mode === "demo" ? "Demonstração" : "Tatame"}</p>
        <h1>E aí, {app.profile.displayName.split(" ")[0]}</h1>
        <p className="lede">
          {summary.rolas === 0
            ? "Nenhuma rola neste recorte."
            : `${summary.rolas} rolas ${period === "semana" ? "nesta semana" : period === "mes" ? "neste mês" : period === "semestre" ? "neste semestre" : period === "ano" ? "neste ano" : "no histórico"}.`}
        </p>
      </header>
      <div className="pad stack">
        <div className="filters" role="group" aria-label="Período">
          {PERIODS.map((item) => (
            <button key={item.id} type="button" className={`chip${period === item.id ? " chip-on" : ""}`} onClick={() => setPeriod(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="filters" role="group" aria-label="Modalidade">
          {(["todas", "nogi", "gi"] as const).map((item) => (
            <button key={item} type="button" className={`chip${modality === item ? " chip-on" : ""}`} onClick={() => setModality(item)}>
              {item === "todas" ? "Todas" : modalityLabel(item)}
            </button>
          ))}
        </div>

        {rolas.length === 0 ? (
          <div className="card empty">
            <h2>O tatame ainda está em branco</h2>
            <p className="lede">Registre um treino ou carregue um histórico de exemplo para ver o painel.</p>
            <div className="stack mt">
              <Link className="btn btn-primary" href="/treinos/novo" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>Anotar treino</Link>
              <SampleButton />
            </div>
          </div>
        ) : (
          <>
            <div className="grid-2">
              <article className="card"><div className="stat-value">{summary.rolas}</div><div className="stat-label">Rolas</div></article>
              <article className="card"><div className="stat-value">{percent(summary.winRate)}</div><div className="stat-label">Taxa de vitória</div><div className="sub">{countLabel(summary.wins, "vitória", "vitórias")} · {countLabel(summary.losses, "derrota", "derrotas")} · {countLabel(summary.draws, "empate", "empates")}</div></article>
              <article className="card"><div className="stat-value">{summary.submissionsPerRola === null ? "—" : formatNumber(summary.submissionsPerRola, 2)}</div><div className="stat-label">Finalizações por rola</div></article>
              <article className="card"><div className="stat-value">{percent(summary.finishRate)}</div><div className="stat-label">Rolas finalizadas</div><div className="sub">{summary.submissionsSuffered} finalizações sofridas</div></article>
            </div>

            {period !== "tudo" ? (
              <section className="card">
                <div className="spread"><h2>Comparado</h2><span className="sub">{window.comparisonLabel}</span></div>
                <div className="stack mt">
                  {comparison.map((trend) => (
                    <div className="spread" key={trend.label}>
                      <span>{trend.label}</span>
                      <TrendPill trend={trend} />
                    </div>
                  ))}
                </div>
                {monthOpen ? <p className="sub mt">O mês ainda não fechou, então o volume pode ficar abaixo do mês anterior.</p> : null}
              </section>
            ) : null}

            <section className="card">
              <h2>{chartTitle(period)}</h2>
              <div className="bars" role="img" aria-label={chartTitle(period)}>
                {buckets.map((bucket) => (
                  <div className="bar-col" key={bucket.label}>
                    <span className="bar-value">{bucket.value}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${Math.max(4, (bucket.value / Math.max(1, ...buckets.map((item) => item.value))) * 100)}%` }} />
                    </div>
                    <span className="bar-label">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>Por categoria</h2>
              <div className="cat mt">
                {categories.map((item) => (
                  <div className="cat-row" key={item.category}>
                    <span>{categoryLabel(item.category)}</span>
                    <div className="cat-track"><div className="cat-fill" style={{ width: `${(item.count / maxCategory) * 100}%` }} /></div>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <h2>Técnicas</h2>
              {ranking.length === 0 ? <p className="sub mt">Nenhuma técnica anotada neste recorte.</p> : (
                <div className="grid-2 mt">
                  <div>
                    <p className="label">Mais usadas</p>
                    <div className="tech-list mt">
                      {ranking.slice(0, 5).map((item) => (
                        <div className="tech-line" key={item.id}><span>{item.name}</span><strong>{item.count}</strong></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="label">Menos usadas</p>
                    {ranking.length < 6 ? <p className="sub">Registre mais técnicas para comparar o que quase não aparece.</p> : (
                      <div className="tech-list mt">
                        {[...ranking].reverse().slice(0, 5).map((item) => (
                          <div className="tech-line" key={item.id}><span>{item.name}</span><strong>{item.count}</strong></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="card">
              <h2>Pontuação IBJJF</h2>
              <p className="sub mt">{rules.map((rule) => `${rule.label} ${rule.points}`).join(" · ")}. Os pontos sugeridos saem das técnicas, e você pode editar.</p>
            </section>

            <section>
              <div className="spread mb"><h2>Últimas rolas</h2><Link href="/treinos">Ver treinos</Link></div>
              <div className="list">
                {rolas.slice(0, 4).map((rola) => (
                  <Link key={rola.id} href={rola.ownedByMe ? `/treinos/${rola.sessionId}` : `/rolas/${rola.id}`} className="card">
                    <div className="spread">
                      <strong>{rola.opponentName}</strong>
                      <span className="score">{rola.pointsFor}×{rola.pointsAgainst}</span>
                    </div>
                    <div className="sub">{modalityLabel(rola.modality)} · {resultLabel(rola.result)} · {rola.durationMinutes} min</div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SampleButton() {
  const app = useApp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
      <button
        className="btn btn-ghost"
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void app.loadSample().catch((caught: unknown) => {
            setError(caught instanceof Error ? caught.message : "Não foi possível carregar o exemplo.");
            setPending(false);
          });
        }}
      >
        {pending ? "Carregando..." : "Carregar treinos de exemplo"}
      </button>
    </>
  );
}
