"use client";

import { useApp } from "@/components/providers";
import { todayIso } from "@/lib/dates";
import { factsHold } from "@/lib/insights";
import { buildProgress, epithetFor, presentation, titleFor, type ProgressRola, type ProgressView, type SystemEvent, type SystemLogEntry } from "@/lib/progression";
import type { PerspectiveRola } from "@/lib/types";
import { useEffect, useState } from "react";
import { rememberProgress, SystemToast } from "@/components/system-toast";

export function ProfileProgress() {
  const app = useApp();
  const [view, setView] = useState<ProgressView | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [share, setShare] = useState(Boolean(app.profile?.shareProgress));
  const [titleId, setTitleId] = useState<string | null>(app.profile?.equippedTitleId ?? null);
  const [epithetId, setEpithetId] = useState<string | null>(app.profile?.equippedEpithetId ?? null);
  const [log, setLog] = useState<SystemLogEntry[]>([]);
  const [unread, setUnread] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(new URLSearchParams(window.location.search).get("sistema")), 0);
    let alive = true;
    void app.rolas().then(async (rolas) => {
      if (!alive) return;
      const next = buildProgress(rolas.map(asProgress), todayIso());
      setView(next);
      const announced = await app.syncLog(next.log);
      if (!alive) return;
      if (announced.length) rememberProgress(announced.map((entry) => ({ id: entry.id, kind: entry.kind, body: entry.body })));
      const stored = await app.loadLog();
      if (!alive) return;
      setLog(stored);
      setUnread(stored.filter((entry) => !entry.read).length);
    }).catch(() => undefined);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [app]);

  useEffect(() => {
    if (!view) return;
    const payload = JSON.stringify(view.quests.map((quest) => ({ id: quest.id, text: quest.text, numbers: quest.numbers })));
    let alive = true;
    void fetch("/api/missoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quests: JSON.parse(payload) }),
    })
      .then(async (response) => response.ok ? (await response.json()) as { lines?: string[] } : null)
      .then((body) => {
        if (!alive || !body?.lines) return;
        setLines(body.lines.map((line, index) => factsHold(line, view.quests[index]?.numbers ?? []) ? line : view.quests[index]?.text ?? line));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [view]);

  if (!view || !app.profile) return <div className="skeleton" />;
  const equipped = titleFor(view, titleId);
  const epithet = epithetFor(view, epithetId);
  const previewEvents = previewEventsFor(preview, view);

  async function savePost() {
    setNote(null);
    try {
      await app.saveProgress({
        shareProgress: share,
        equippedTitleId: titleId,
        publicLevel: view!.level,
        publicTitle: titleFor(view!, titleId) ?? "",
        equippedEpithetId: epithetId,
        publicEpithet: epithetFor(view!, epithetId) ?? "",
        seenUnlocks: [],
      });
      setNote("Posto salvo.");
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Não foi possível salvar o posto.");
    }
  }

  return (
    <section className="stack">
      {previewEvents ? <SystemToast events={previewEvents} /> : null}
      <article className="card rank-card">
        <div className="spread">
          <div>
            <span className="stat-label">Nível</span>
            <div className="stat-value">{view.level}</div>
          </div>
          <div className="rank-badge">{view.rank}</div>
        </div>
        <div className="xp-track" aria-label={`${view.into} de ${view.need} XP`}>
          <span style={{ width: `${Math.min(100, (view.into / view.need) * 100)}%` }} />
        </div>
        <p className="sub">{view.into}/{view.need} XP · posto de jogo, não é a faixa</p>
        <p className="equipped">{presentation(app.profile.displayName, epithet)}</p>
        {equipped ? <p className="sub">{equipped}</p> : null}
      </article>

      <Radar items={view.attributes.map((item) => ({ label: item.short, level: item.level }))} />

      <section className="stack" aria-label="Missões">
        <h2>Missões</h2>
        {view.quests.map((quest, index) => (
          <article key={quest.id} className="quest">
            <div className="spread">
              <strong>{lines?.[index] ?? quest.text}</strong>
              <span className="sub">{quest.done ? "feita" : `${quest.current}/${quest.goal}`}</span>
            </div>
            <div className="xp-track"><span style={{ width: `${Math.min(100, (quest.current / quest.goal) * 100)}%` }} /></div>
          </article>
        ))}
      </section>

      <section aria-label="Habilidades">
        <h2>Habilidades</h2>
        <div className="skill-grid">
          {view.lines.map((line) => (
            <article key={line.id} className={line.unlocked ? "skill-on" : "skill-off"}>
              <span className="skill-mark" aria-hidden="true">{line.unlocked ? "▲".repeat(Math.max(1, line.tier)) : ""}</span>
              <strong>{line.name}</strong>
              <span>{line.unlocked ? line.hint : line.hidden ? "???" : line.hint}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="registro" className="stack" aria-label="Registro do Sistema">
        <h2>Registro {unread > 0 ? <span className="unread">{unread}</span> : null}</h2>
        {log.length === 0 ? <p className="sub">Sem avisos ainda.</p> : log.slice().reverse().slice(0, 8).map((entry) => (
          <article key={entry.id} className={`log-row${entry.read ? "" : " log-new"}`}>
            <span>{entry.occurredOn.slice(8)}/{entry.occurredOn.slice(5, 7)}</span>
            <p>{entry.body.replace("[SISTEMA] ", "")}</p>
          </article>
        ))}
        {unread > 0 ? <button className="linkish" type="button" onClick={() => void app.markLogRead().then(() => { setUnread(0); setLog(log.map((entry) => ({ ...entry, read: true }))); })}>Marcar lido</button> : null}
      </section>

      <label className="field">
        <span>Título equipado</span>
        <select value={titleId ?? ""} onChange={(event) => setTitleId(event.target.value || null)}>
          <option value="">Automático</option>
          {view.titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Epíteto</span>
        <select value={epithetId ?? ""} onChange={(event) => setEpithetId(event.target.value || null)}>
          <option value="">Automático</option>
          {view.epithets.filter((item) => item.unlocked).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="share-row">
        <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
        <span>Parceiro vê nível e título</span>
      </label>
      <button className="btn btn-primary" type="button" onClick={() => void savePost()}>Salvar posto</button>
      {note ? <p className="sub">{note}</p> : null}
    </section>
  );
}

function asProgress(rola: PerspectiveRola): ProgressRola {
  return {
    occurredOn: rola.occurredOn,
    modality: rola.modality,
    durationMinutes: rola.durationMinutes,
    sessionId: rola.sessionId,
    pointsFor: rola.pointsFor,
    submissionsApplied: rola.submissionsApplied,
    submissionsSuffered: rola.submissionsSuffered,
    techniquesUsed: rola.techniquesUsed,
  };
}

function previewEventsFor(preview: string | null, view: ProgressView): SystemEvent[] | undefined {
  if (!preview) return undefined;
  const title = view.titles.find((item) => item.title === "Trator Humano") ?? view.titles.at(-1);
  const epithet = view.epithets.find((item) => item.unlocked);
  if (preview === "fila") {
    return [
      title ? { id: "preview-titulo", kind: "titulo", body: `[SISTEMA] Novo título adquirido: ${title.title}` } : { id: "preview-posto", kind: "posto", body: `[SISTEMA] Novo posto: ${view.rank}` },
      epithet ? { id: "preview-epiteto", kind: "epiteto", body: `[SISTEMA] Novo epíteto: ${epithet.label}` } : { id: "preview-nivel", kind: "posto", body: `[SISTEMA] Novo posto: ${view.rank}` },
    ];
  }
  if (preview === "titulo" && title) return [{ id: title.id, kind: "titulo", body: `[SISTEMA] Novo título adquirido: ${title.title}` }];
  if (preview === "nivel") return [{ id: "preview-posto", kind: "posto", body: `[SISTEMA] Novo posto: ${view.rank}` }];
  return undefined;
}

function Radar({ items }: { items: { label: string; level: number }[] }) {
  const cx = 120;
  const cy = 120;
  const radius = 58;
  const point = (index: number, level: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / items.length;
    const span = (Math.max(0, level) / 20) * radius;
    return [cx + Math.cos(angle) * span, cy + Math.sin(angle) * span];
  };
  const polygon = items.map((item, index) => point(index, item.level).join(",")).join(" ");
  const ring = items.map((_, index) => point(index, 20).join(",")).join(" ");
  return (
    <figure className="radar">
      <svg viewBox="0 0 240 240" role="img" aria-label="Atributos">
        <polygon points={ring} className="radar-ring" />
        <polygon points={polygon} className="radar-fill" />
        {items.map((item, index) => {
          const [x, y] = point(index, 23);
          return <text key={item.label} x={x} y={y} textAnchor="middle">{item.label}</text>;
        })}
      </svg>
    </figure>
  );
}
