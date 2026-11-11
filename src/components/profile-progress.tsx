"use client";

import { useApp } from "@/components/providers";
import { todayIso } from "@/lib/dates";
import { factsHold } from "@/lib/insights";
import { buildProgress, titleFor, type ProgressRola, type ProgressView, type SystemEvent } from "@/lib/progression";
import type { PerspectiveRola } from "@/lib/types";
import { useEffect, useState } from "react";
import { SystemToast } from "@/components/system-toast";

export function ProfileProgress() {
  const app = useApp();
  const [view, setView] = useState<ProgressView | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const [share, setShare] = useState(Boolean(app.profile?.shareProgress));
  const [titleId, setTitleId] = useState<string | null>(app.profile?.equippedTitleId ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(new URLSearchParams(window.location.search).get("sistema")), 0);
    let alive = true;
    void app.rolas().then((rolas) => {
      if (!alive) return;
      setView(buildProgress(rolas.map(asProgress), todayIso()));
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

  if (!view) return <div className="skeleton" />;
  const equipped = titleFor(view, titleId);
  const previewEvents = previewEventsFor(preview, view);

  async function savePost() {
    setNote(null);
    try {
      await app.saveProgress({
        shareProgress: share,
        equippedTitleId: titleId,
        publicLevel: view!.level,
        publicTitle: titleFor(view!, titleId) ?? "",
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
        {equipped ? <p className="equipped">{equipped}</p> : null}
      </article>

      <Radar items={view.attributes.map((item) => ({ label: item.label, level: item.level }))} />

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
          {view.skills.map((skill) => (
            <article key={skill.id} className={skill.unlocked ? "skill-on" : "skill-off"}>
              <span className="skill-mark" aria-hidden="true">{skill.unlocked ? "▲" : ""}</span>
              <strong>{skill.unlocked ? skill.name : "???"}</strong>
              <span>{skill.unlocked ? skill.title : skill.hint}</span>
            </article>
          ))}
        </div>
      </section>

      <label className="field">
        <span>Título equipado</span>
        <select value={titleId ?? ""} onChange={(event) => setTitleId(event.target.value || null)}>
          <option value="">Automático</option>
          {view.titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
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
  if (preview === "nivel") return [{ id: "preview-nivel", kind: "nivel", title: `Nível ${view.level}`, text: view.rank }];
  if (preview === "habilidade") {
    const skill = view.skills.find((item) => item.unlocked);
    if (!skill) return undefined;
    return [{ id: skill.id, kind: "habilidade", title: skill.title, text: skill.name }];
  }
  if (preview === "missao") {
    const quest = view.quests.find((item) => item.done) ?? view.quests[0];
    if (!quest) return undefined;
    return [{ id: quest.id, kind: "missao", title: "Missão", text: quest.text }];
  }
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
