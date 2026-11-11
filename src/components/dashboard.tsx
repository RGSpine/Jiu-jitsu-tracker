"use client";

import { useApp } from "@/components/providers";
import { todayIso } from "@/lib/dates";
import { acceptRephrases, buildInsights, type Insight } from "@/lib/insights";
import { reportFor, weeklyTrainingAverage, type ComparedMetric, type Delta, type EvolutionPoint } from "@/lib/metrics";
import type { ModalityFilter, PeriodKey, PerspectiveRola } from "@/lib/types";
import { useEffect, useState } from "react";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "semestre", label: "Semestre" },
  { id: "ano", label: "Ano" },
];

const GAMES: { key: ComparedMetric["key"]; label: string; icon: string }[] = [
  { key: "quedas", label: "Quedas", icon: "↘" },
  { key: "passagens", label: "Passagens", icon: "→" },
  { key: "raspagens", label: "Raspagens", icon: "↻" },
  { key: "finalizacoes", label: "Finalizações", icon: "●" },
  { key: "posicoes", label: "Costas", icon: "▣" },
  { key: "escapes", label: "Saídas", icon: "↖" },
];

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

function DeltaMark({ delta }: { delta: Delta }) {
  if (delta.status === "new") return <span className="delta new">novo</span>;
  if (delta.pct === null || delta.status === "low" || delta.status === "flat") return <span className="delta flat">—</span>;
  const good = delta.good === true;
  const arrow = (delta.pct ?? 0) > 0 ? "↑" : "↓";
  return <span className={`delta ${good ? "up" : "down"}`}>{arrow} {Math.abs(delta.pct ?? 0)}%</span>;
}

const CHARTS = [
  { id: "volume", label: "Volume" },
  { id: "tempo", label: "Tempo" },
  { id: "finais", label: "Finais" },
  { id: "pontos", label: "Pontos" },
  { id: "resultado", label: "Placar" },
  { id: "jogo", label: "Jogo" },
] as const;

type ChartId = (typeof CHARTS)[number]["id"];

function chartSeries(id: ChartId, points: EvolutionPoint[]): { name: string; tone: "a" | "b" | "c"; values: number[] }[] {
  if (id === "volume") {
    return [
      { name: "Treinos", tone: "a", values: points.map((point) => point.trainings) },
      { name: "Rolas", tone: "b", values: points.map((point) => point.rolas) },
    ];
  }
  if (id === "tempo") return [{ name: "Minutos", tone: "a", values: points.map((point) => point.matMinutes) }];
  if (id === "finais") {
    return [
      { name: "Feitas", tone: "a", values: points.map((point) => point.submissionsApplied) },
      { name: "Sofridas", tone: "b", values: points.map((point) => point.submissionsSuffered) },
    ];
  }
  if (id === "pontos") {
    return [
      { name: "Feitos", tone: "a", values: points.map((point) => point.pointsFor) },
      { name: "Levados", tone: "b", values: points.map((point) => point.pointsAgainst) },
    ];
  }
  if (id === "resultado") {
    return [
      { name: "Vitórias", tone: "a", values: points.map((point) => point.wins) },
      { name: "Derrotas", tone: "b", values: points.map((point) => point.losses) },
      { name: "Empates", tone: "c", values: points.map((point) => point.draws) },
    ];
  }
  return [
    { name: "Quedas", tone: "a", values: points.map((point) => point.quedas) },
    { name: "Passagens", tone: "b", values: points.map((point) => point.passagens) },
    { name: "Raspagens", tone: "c", values: points.map((point) => point.raspagens) },
  ];
}

function Spark({ values }: { values: number[] }) {
  const width = 132;
  const height = 36;
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - (value / max) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points.join(" ")} />
    </svg>
  );
}

export function Dashboard() {
  const app = useApp();
  const [rolas, setRolas] = useState<PerspectiveRola[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [modality, setModality] = useState<ModalityFilter>("todas");
  const [today, setToday] = useState<string | null>(null);
  const [rephrased, setRephrased] = useState<{ signature: string; lines: string[] } | null>(null);
  const [chart, setChart] = useState<ChartId>("volume");

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

  const ready = rolas && today && app.profile;
  const view = ready ? reportFor(rolas, period, today, modality) : null;
  const templates = view && today && rolas
    ? buildInsights(view.metrics, period, view.current, weeklyTrainingAverage(rolas.filter((rola) => modality === "todas" || rola.modality === modality), today)).slice(0, 3)
    : [];
  const signature = templates.map((item) => item.text).join("\n");
  const payload = JSON.stringify(templates);

  useEffect(() => {
    const current = JSON.parse(payload) as Insight[];
    if (current.length === 0) return;
    let alive = true;
    void fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insights: current }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { lines?: string[] };
      })
      .then((body) => {
        if (!alive || !body?.lines) return;
        setRephrased({ signature, lines: body.lines });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [payload, signature]);

  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (!view || !app.profile) return <div className="pad mt stack"><div className="skeleton" /><div className="skeleton" /></div>;

  const metric = (key: ComparedMetric["key"]) => view.metrics.find((item) => item.key === key)!;
  const shown = rephrased?.signature === signature ? acceptRephrases(templates, rephrased.lines) : templates;

  return (
    <div>
      <header className="mast glance-head">
        <h1>{app.profile.displayName.split(" ")[0]}</h1>
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
              {item === "todas" ? "Tudo" : item === "nogi" ? "No-gi" : "Kimono"}
            </button>
          ))}
        </div>

        <section className="insight-row" aria-label="Destaques">
          {shown.map((insight) => (
            <article key={insight.id} className={`insight ${insight.tone}`}>
              <span className="insight-arrow" aria-hidden="true">{insight.tone === "down" ? "↓" : "↑"}</span>
              <p>{insight.text}</p>
            </article>
          ))}
          {shown.length === 0 ? <article className="insight neutral"><p>Ainda pouco volume para comparar.</p></article> : null}
        </section>

        <section className="hero-grid">
          <Hero metric={metric("trainings")} display={String(view.current.trainings)} series={view.evolution.map((item) => item.trainings)} />
          <Hero metric={metric("rolas")} display={String(view.current.rolas)} series={view.evolution.map((item) => item.rolas)} />
          <Hero metric={metric("matMinutes")} display={formatMinutes(view.current.matMinutes)} series={view.evolution.map((item) => item.matMinutes)} hint={`média ${formatMinutes(view.current.avgRolaMinutes)}`} />
          <Hero metric={metric("winRate")} display={`${Math.round(view.current.winRate * 100)}%`} series={view.evolution.map((item) => item.wins)} hint={`${view.current.wins}V ${view.current.losses}D ${view.current.draws}E`} />
        </section>

        <section className="card">
          <div className="spread">
            <h2>Finalizações</h2>
            <DeltaMark delta={metric("submissionsApplied").delta} />
          </div>
          <div className="split-meter" aria-hidden="true">
            <span style={{ flex: Math.max(view.current.submissionsApplied, 0.2) }} />
            <span style={{ flex: Math.max(view.current.submissionsSuffered, 0.2) }} />
          </div>
          <div className="spread">
            <strong>{view.current.submissionsApplied} feitas</strong>
            <strong>{view.current.submissionsSuffered} sofridas</strong>
          </div>
        </section>

        <section className="card">
          <div className="spread">
            <h2>Pontos</h2>
            <DeltaMark delta={metric("pointsFor").delta} />
          </div>
          <div className="split-meter" aria-hidden="true">
            <span style={{ flex: Math.max(view.current.pointsFor, 0.2) }} />
            <span style={{ flex: Math.max(view.current.pointsAgainst, 0.2) }} />
          </div>
          <div className="spread">
            <strong>{view.current.pointsFor} feitos</strong>
            <strong>{view.current.pointsAgainst} levados</strong>
          </div>
        </section>

        <section className="game-grid" aria-label="Jogo">
          {GAMES.map((game) => {
            const item = metric(game.key);
            return (
              <article key={game.key} className="game-tile">
                <span className="game-icon" aria-hidden="true">{game.icon}</span>
                <strong>{Math.round(view.current[game.key])}</strong>
                <span>{game.label}</span>
                <DeltaMark delta={item.delta} />
              </article>
            );
          })}
        </section>

        <section className="result-row" aria-label="Vitórias, derrotas e empates">
          <Result label="Vitórias" value={view.current.wins} delta={metric("wins").delta} />
          <Result label="Derrotas" value={view.current.losses} delta={metric("losses").delta} />
          <Result label="Empates" value={view.current.draws} delta={metric("draws").delta} />
        </section>

        <section className="card">
          <div className="filters chart-switch" role="group" aria-label="Gráfico">
            {CHARTS.map((item) => (
              <button key={item.id} type="button" className={`chip${chart === item.id ? " chip-on" : ""}`} onClick={() => setChart(item.id)}>{item.label}</button>
            ))}
          </div>
          <Bars points={view.evolution} series={chartSeries(chart, view.evolution)} />
        </section>
      </div>
    </div>
  );
}

function Result({ label, value, delta }: { label: string; value: number; delta: Delta }) {
  return (
    <article className="hero-stat">
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
      <DeltaMark delta={delta} />
    </article>
  );
}

function Bars({ points, series }: { points: EvolutionPoint[]; series: { name: string; tone: "a" | "b" | "c"; values: number[] }[] }) {
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  return (
    <div>
      <div className="legend">
        {series.map((item) => <span key={item.name} className={`legend-${item.tone}`}>{item.name}</span>)}
      </div>
      <div className="bars" role="img" aria-label={series.map((item) => item.name).join(", ")}>
        {points.map((point, index) => (
          <div className="bar-col" key={`${point.label}-${index}`}>
            <div className="bar-stack">
              {series.map((item) => {
                const value = item.values[index] ?? 0;
                if (value <= 0) return <span key={item.name} className="bar bar-empty" />;
                return <span key={item.name} className={`bar bar-${item.tone}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />;
              })}
            </div>
            <em>{point.label}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ metric, display, series, hint }: { metric: ComparedMetric; display: string; series: number[]; hint?: string }) {
  return (
    <article className="hero-stat">
      <div className="spread">
        <span className="stat-label">{metric.label}</span>
        <DeltaMark delta={metric.delta} />
      </div>
      <div className="stat-value">{display}</div>
      {hint ? <span className="sub">{hint}</span> : null}
      <Spark values={series} />
    </article>
  );
}
