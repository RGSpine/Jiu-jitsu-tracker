"use client";

import { useApp } from "@/components/providers";
import { audioFileName, isIosUserAgent, preferredAudioMime } from "@/lib/audio-file";
import { buildProgress, diffProgress, type ProgressRola } from "@/lib/progression";
import { rememberProgress } from "@/components/system-toast";
import { AUDIO_AI_UNAVAILABLE_MESSAGE, TEXT_AI_UNAVAILABLE_MESSAGE } from "@/lib/config";
import { suggestPoints } from "@/lib/scoring";
import { draftFromParsed, type ParsedSession } from "@/lib/parse-draft";
import { emptyDraft, emptyRola, createId } from "@/lib/drafts";
import { todayIso } from "@/lib/dates";
import { modalityLabel, RESULT_OPTIONS } from "@/lib/labels";
import { validateDraft } from "@/lib/validate";
import type { PartnerHit, RolaDraft, SessionDraft, Technique } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Field = "techniquesUsed" | "submissionsApplied" | "submissionsSuffered";

const FIELD_LABEL: Record<Field, string> = {
  techniquesUsed: "Técnicas que usei",
  submissionsApplied: "Finalizações que apliquei",
  submissionsSuffered: "Finalizações que sofri",
};

export function SessionForm({ sessionId }: { sessionId?: string }) {
  const app = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [catalog, setCatalog] = useState<Technique[]>([]);
  const [rules, setRules] = useState<Awaited<ReturnType<typeof app.reference>>["rules"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [missing, setMissing] = useState(false);
  const [picker, setPicker] = useState<{ rolaId: string; field: Field } | null>(null);
  const [pendingDraft, setPendingDraft] = useState<{ draft: SessionDraft; warnings: string[] } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [recentTech, setRecentTech] = useState<string[]>([]);
  const [details, setDetails] = useState(false);
  const [capture, setCapture] = useState<"off" | "texto" | "audio">("off");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const reference = await app.reference();
      if (!alive) return;
      setCatalog(reference.techniques);
      setRules(reference.rules);
      const history = await app.rolas().catch(() => []);
      const names: string[] = [];
      const techCount = new Map<string, number>();
      for (const item of history) {
        if (item.opponentName && !names.includes(item.opponentName) && names.length < 6) names.push(item.opponentName);
        for (const tech of item.techniquesUsed) techCount.set(tech.id, (techCount.get(tech.id) ?? 0) + 1);
      }
      if (!alive) return;
      setRecentNames(names);
      setRecentTech([...techCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id));
      if (!sessionId) {
        const modality = app.profile?.preferredModality ?? "nogi";
        setDraft(emptyDraft(todayIso(), modality));
        return;
      }
      const existing = await app.session(sessionId);
      if (!alive) return;
      if (!existing) setMissing(true);
      else setDraft(existing);
    })().catch((caught: unknown) => {
      if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível abrir o treino.");
    });
    return () => {
      alive = false;
    };
  }, [app, sessionId]);

  const federationName = useMemo(() => {
    const id = draft?.federationId ?? "ibjjf";
    return id === "ibjjf" ? "IBJJF" : id.toUpperCase();
  }, [draft?.federationId]);

  if (missing) return <div className="pad mt"><div className="banner banner-bad"><p>Treino não encontrado.</p></div></div>;
  if (error) return <div className="pad mt"><div className="banner banner-bad"><p>{error}</p></div></div>;
  if (!draft) return <div className="pad mt stack"><div className="skeleton" /><div className="skeleton" /></div>;

  function updateRola(localId: string, patch: Partial<RolaDraft>) {
    setDraft((current) => current && ({
      ...current,
      rolas: current.rolas.map((rola) => (rola.localId === localId ? { ...rola, ...patch } : rola)),
    }));
  }

  function applyParsed(next: SessionDraft, nextWarnings: string[]) {
    setDraft(next);
    setWarnings(nextWarnings);
    setPendingDraft(null);
  }

  function offerParsed(parsed: ParsedSession) {
    if (!draft) return;
    const result = draftFromParsed(parsed, catalog, draft, createId);
    const dirty = draft.rolas.some((rola) => rola.partnerName.trim());
    if (dirty) setPendingDraft(result);
    else applyParsed(result.draft, result.warnings);
  }

  async function save() {
    const problems = validateDraft(draft!);
    if (problems.length) {
      setError(problems[0] ?? "Revise o treino.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const beforeRolas = await app.rolas().catch(() => []);
      const today = draft!.date;
      const id = await app.saveSession(draft!);
      const afterRolas = await app.rolas().catch(() => beforeRolas);
      rememberProgress(diffProgress(buildProgress(beforeRolas.map(asProgress), today), buildProgress(afterRolas.map(asProgress), today)));
      router.push(`/treinos/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  const activeRules = rules.filter((rule) => rule.federationId === draft.federationId);

  return (
    <div>
      <header className="mast">
        <p className="eyebrow">{sessionId ? "Editar treino" : "Novo treino"}</p>
        <h1>{sessionId ? "Ajustar" : "Anotar"}</h1>
      </header>
      <div className="pad stack">
        {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
        {warnings.length ? (
          <div className="banner">
            {warnings.slice(0, 4).map((warning) => <p key={warning}>{warning}</p>)}
            <p>Confira os campos antes de salvar.</p>
          </div>
        ) : null}
        {pendingDraft ? (
          <div className="banner">
            <p>A leitura encontrou {pendingDraft.draft.rolas.length} rolas e substitui o rascunho atual.</p>
            <div className="row mt">
              <button className="btn btn-primary" type="button" onClick={() => applyParsed(pendingDraft.draft, pendingDraft.warnings)}>Aplicar</button>
              <button className="btn btn-ghost" type="button" onClick={() => setPendingDraft(null)}>Descartar</button>
            </div>
          </div>
        ) : null}

        <div className="voice-row">
          <button className={`record${capture === "audio" ? " record-on" : ""}`} type="button" onClick={() => setCapture(capture === "audio" ? "off" : "audio")}>Falar</button>
          <button className="btn btn-ghost" type="button" onClick={() => setCapture(capture === "texto" ? "off" : "texto")}>Escrever</button>
        </div>
        {capture !== "off" ? <Capture mode={capture} onParsed={offerParsed} /> : null}

        <label className="field">
          <span>Data</span>
          <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        </label>
        <div className="choice-row" role="group" aria-label="Modalidade">
          {(["nogi", "gi"] as const).map((item) => (
            <button key={item} type="button" className={`mode${draft.modality === item ? " mode-on" : ""}`} onClick={() => setDraft({ ...draft, modality: item })}>
              {modalityLabel(item)}
            </button>
          ))}
        </div>
        {recentNames.length > 0 ? (
          <div className="quick-chips" aria-label="Parceiros recentes">
            {recentNames.map((name) => (
              <button key={name} type="button" className="chip" onClick={() => updateRola(draft.rolas.at(-1)?.localId ?? "", { partnerName: name, partnerUserId: null })}>{name.split(" ")[0]}</button>
            ))}
          </div>
        ) : null}

        {draft.rolas.map((rola, index) => {
          const suggested = suggestPoints(rola.techniquesUsed, catalog, activeRules);
          return (
            <article className="card stack" key={rola.localId}>
              <div className="rola-head">
                <h2>Rola {index + 1}</h2>
                {draft.rolas.length > 1 ? (
                  <button className="linkish" type="button" onClick={() => setDraft({ ...draft, rolas: draft.rolas.filter((item) => item.localId !== rola.localId) })}>Remover</button>
                ) : null}
              </div>
              <div className="choice-row" aria-label="Duração">
                {[5, 6, 8, 10].map((minutes) => (
                  <button key={minutes} type="button" className={`preset${rola.durationMinutes === minutes ? " preset-on" : ""}`} onClick={() => updateRola(rola.localId, { durationMinutes: minutes })}>
                    {minutes} min
                  </button>
                ))}
              </div>
              {recentTech.length > 0 ? (
                <div className="quick-chips" aria-label="Técnicas recentes">
                  {recentTech.map((id) => (
                    <button key={id} type="button" className={`chip${rola.techniquesUsed.includes(id) ? " chip-on" : ""}`} onClick={() => updateRola(rola.localId, { techniquesUsed: rola.techniquesUsed.includes(id) ? rola.techniquesUsed.filter((item) => item !== id) : [...rola.techniquesUsed, id] })}>
                      {catalog.find((item) => item.id === id)?.name ?? id}
                    </button>
                  ))}
                </div>
              ) : null}
              <PartnerField
                name={rola.partnerName}
                linked={Boolean(rola.partnerUserId)}
                onName={(partnerName) => updateRola(rola.localId, { partnerName, partnerUserId: null })}
                onPick={(hit) => updateRola(rola.localId, { partnerName: hit.displayName, partnerUserId: hit.id })}
                onUnlink={() => updateRola(rola.localId, { partnerUserId: null })}
              />
              <div className="choice-row" role="group" aria-label="Resultado">
                {RESULT_OPTIONS.map((item) => (
                  <button key={item.id} type="button" className={`result result-${item.id}${rola.result === item.id ? " result-on" : ""}`} aria-pressed={rola.result === item.id} onClick={() => updateRola(rola.localId, { result: item.id })}>
                    {item.label}
                  </button>
                ))}
              </div>
              <Stepper label="Meus pontos" value={rola.pointsFor} onChange={(pointsFor) => updateRola(rola.localId, { pointsFor })} />
              <Stepper label="Pontos do parceiro" value={rola.pointsAgainst} onChange={(pointsAgainst) => updateRola(rola.localId, { pointsAgainst })} />
              <div className="spread">
                <span className="sub">Sugestão {federationName}: {suggested}</span>
                <button className="linkish" type="button" onClick={() => updateRola(rola.localId, { pointsFor: suggested })}>Aplicar</button>
              </div>
              {details ? (
                <>
                  <label className="field">
                    <span>Minutos</span>
                    <input inputMode="numeric" value={rola.durationMinutes} onChange={(event) => updateRola(rola.localId, { durationMinutes: Number(event.target.value) || 0 })} />
                  </label>
                  <Stepper label="Minhas vantagens" value={rola.advantagesFor} onChange={(advantagesFor) => updateRola(rola.localId, { advantagesFor })} />
                  <Stepper label="Vantagens do parceiro" value={rola.advantagesAgainst} onChange={(advantagesAgainst) => updateRola(rola.localId, { advantagesAgainst })} />
                  <Stepper label="Minhas punições" value={rola.penaltiesFor} onChange={(penaltiesFor) => updateRola(rola.localId, { penaltiesFor })} />
                  <Stepper label="Punições do parceiro" value={rola.penaltiesAgainst} onChange={(penaltiesAgainst) => updateRola(rola.localId, { penaltiesAgainst })} />
                </>
              ) : null}
              {(["submissionsApplied", "submissionsSuffered", "techniquesUsed"] as const).map((field) => (
                <div key={field}>
                  <div className="spread">
                    <span className="label">{FIELD_LABEL[field]}</span>
                    <button className="linkish" type="button" onClick={() => setPicker({ rolaId: rola.localId, field })}>Escolher</button>
                  </div>
                  <div className="chips mt">
                    {rola[field].length === 0 ? <span className="sub">Nenhuma</span> : rola[field].map((id, chipIndex) => (
                      <button key={`${id}-${chipIndex}`} className="mini-chip" type="button" onClick={() => updateRola(rola.localId, { [field]: rola[field].filter((_, index) => index !== chipIndex) })}>
                        {catalog.find((item) => item.id === id)?.name ?? id} ×
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </article>
          );
        })}

        <button className="btn btn-ghost" type="button" onClick={() => setDraft({ ...draft, rolas: [...draft.rolas, emptyRola()] })}>+ Rola</button>
        <button className="linkish" type="button" onClick={() => setDetails((value) => !value)}>{details ? "Menos" : "Vantagem, punição e nota"}</button>
        {details ? (
          <label className="field">
            <span>Nota</span>
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
        ) : null}
        <p className="sub">Sugestão {federationName}: {activeRules.map((rule) => `${rule.label} ${rule.points}`).join(" · ")}</p>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={() => void save()}>{pending ? "Salvando..." : "Salvar treino"}</button>
        {sessionId ? <DeleteSession sessionId={sessionId} /> : null}
      </div>
      {picker ? (
        <TechniqueSheet
          title={FIELD_LABEL[picker.field]}
          modality={draft.modality}
          catalog={catalog}
          field={picker.field}
          selected={draft.rolas.find((rola) => rola.localId === picker.rolaId)?.[picker.field] ?? []}
          onClose={() => setPicker(null)}
          onToggle={(id) => {
            const rola = draft.rolas.find((item) => item.localId === picker.rolaId);
            if (!rola) return;
            const current = rola[picker.field];
            updateRola(picker.rolaId, { [picker.field]: [...current, id] });
          }}
        />
      ) : null}
    </div>
  );
}

function asProgress(rola: { occurredOn: string; modality: ProgressRola["modality"]; durationMinutes: number; sessionId: string; pointsFor: number; submissionsApplied: { id: string }[]; submissionsSuffered: { id: string }[]; techniquesUsed: { id: string; category?: ProgressRola["techniquesUsed"][number]["category"] }[] }): ProgressRola {
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

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div className="stepper-controls">
        <button type="button" aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(0, value - 1))}>–</button>
        <strong>{value}</strong>
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.min(100, value + 1))}>+</button>
      </div>
    </div>
  );
}

function PartnerField({
  name,
  linked,
  onName,
  onPick,
  onUnlink,
}: {
  name: string;
  linked: boolean;
  onName: (name: string) => void;
  onPick: (hit: PartnerHit) => void;
  onUnlink: () => void;
}) {
  const app = useApp();
  const [hits, setHits] = useState<PartnerHit[]>([]);
  useEffect(() => {
    if (linked || name.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      void app.searchPartners(name).then(setHits).catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [app, linked, name]);

  if (linked) {
    return (
      <div className="spread card">
        <div>
          <strong>{name}</strong>
          <div className="sub">Parceiro vinculado. O resultado aparece invertido para essa pessoa.</div>
        </div>
        <button className="linkish" type="button" onClick={onUnlink}>Desvincular</button>
      </div>
    );
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Parceiro</span>
        <input value={name} onChange={(event) => { setHits([]); onName(event.target.value); }} placeholder="Nome" />
      </label>
      {hits.length ? (
        <div className="hits">
          {hits.map((hit) => (
            <button key={hit.id} className="hit" type="button" onClick={() => { setHits([]); onPick(hit); }}>
              <strong>{hit.displayName}</strong>
              <div className="sub">{hit.academy || "Sem academia"}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TechniqueSheet({
  title,
  catalog,
  modality,
  field,
  selected,
  onClose,
  onToggle,
}: {
  title: string;
  catalog: Technique[];
  modality: SessionDraft["modality"];
  field: Field;
  selected: string[];
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const items = catalog.filter((item) => {
    if (field === "techniquesUsed" && item.category === "finalizacao") return false;
    if (field !== "techniquesUsed" && item.category !== "finalizacao") return false;
    if (!showAll && item.modality !== "both" && item.modality !== modality) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return item.name.toLowerCase().includes(needle) || item.aliases.some((alias) => alias.toLowerCase().includes(needle));
  });

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <header className="mast">
        <div className="spread">
          <h2>{title}</h2>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Fechar</button>
        </div>
        <input ref={inputRef} className="mt" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar técnica" />
        <button className="linkish mt" type="button" onClick={() => setShowAll((value) => !value)}>
          {showAll ? `Mostrar só ${modalityLabel(modality)}` : "Mostrar gi e no-gi"}
        </button>
      </header>
      <div className="sheet-body">
        {items.map((item) => (
          <button key={item.id} type="button" className={`option${selected.includes(item.id) ? " option-on" : ""}`} onClick={() => onToggle(item.id)}>
            <strong>{item.name}</strong>
            <div className="sub">{item.modality === "gi" ? "Kimono" : item.modality === "nogi" ? "No-gi" : "Kimono e no-gi"} · já escolhida {selected.filter((id) => id === item.id).length}×</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Capture({ mode, onParsed }: { mode: "texto" | "audio"; onParsed: (parsed: ParsedSession) => void }) {
  return (
    <section className="card stack">
      {mode === "texto" ? <TextCapture onParsed={onParsed} /> : <AudioCapture onParsed={onParsed} />}
    </section>
  );
}

function TextCapture({ onParsed }: { onParsed: (parsed: ParsedSession) => void }) {
  const configured = useConfigured("/api/interpretar");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function interpret(source: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/interpretar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      const body = (await response.json()) as { error?: string; session?: ParsedSession };
      if (!response.ok || !body.session) throw new Error(body.error || "Não foi possível ler o relato.");
      onParsed(body.session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível ler o relato.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      {configured === false ? <div className="banner"><p>{TEXT_AI_UNAVAILABLE_MESSAGE}</p></div> : null}
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Fiz 5 rolas de 6 min no no-gi. Finalizei o João no triângulo. Perdi pra Maria por 4 a 2, ela passou a guarda duas vezes."
      />
      {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
      <button className="btn" type="button" disabled={pending || configured === false} onClick={() => void interpret(text)}>
        {pending ? "Lendo..." : "Interpretar texto"}
      </button>
    </div>
  );
}

function AudioCapture({ onParsed }: { onParsed: (parsed: ParsedSession) => void }) {
  const configured = useConfigured("/api/transcrever");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function toggle() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não grava áudio. Use o texto ou o formulário.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ios = isIosUserAgent(navigator.userAgent);
      const mime = typeof MediaRecorder.isTypeSupported === "function"
        ? preferredAudioMime((type) => MediaRecorder.isTypeSupported(type), ios)
        : (ios ? "audio/mp4" : undefined);
      let media: MediaRecorder;
      try {
        media = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      } catch {
        media = new MediaRecorder(stream);
      }
      const chunks: Blob[] = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = media.mimeType || mime || (ios ? "audio/mp4" : "audio/webm");
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setError("Não captei áudio. Tente de novo.");
          return;
        }
        void transcribe(blob);
      };
      media.start();
      recorder.current = media;
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Não consegui acessar o microfone.");
    }
  }

  useEffect(() => {
    if (recording && seconds >= 90) recorder.current?.stop();
  }, [recording, seconds]);

  async function transcribe(blob: Blob) {
    setPending(true);
    setRecording(false);
    try {
      const form = new FormData();
      form.append("audio", blob, audioFileName(blob.type));
      const response = await fetch("/api/transcrever", { method: "POST", body: form });
      const body = (await response.json()) as { error?: string; text?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível transcrever.");
      setText(body.text ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível transcrever.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      {configured === false ? <div className="banner"><p>{AUDIO_AI_UNAVAILABLE_MESSAGE}</p></div> : null}
      <div className="spread">
        <button className={`record${recording ? " record-on" : ""}`} type="button" onClick={() => void toggle()} disabled={configured === false || pending}>
          {recording ? "Parar" : "Gravar"}
        </button>
        <div>
          <strong>{recording ? `${seconds}s` : pending ? "Transcrevendo..." : "Até 90 segundos"}</strong>
          <p className="sub">Fale os rolas. Depois você revisa o texto e o formulário.</p>
        </div>
      </div>
      <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="A transcrição aparece aqui." />
      {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
      <button
        className="btn"
        type="button"
        disabled={!text.trim() || pending}
        onClick={() => {
          setPending(true);
          void fetch("/api/interpretar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          })
            .then(async (response) => {
              const body = (await response.json()) as { error?: string; session?: ParsedSession };
              if (!response.ok || !body.session) throw new Error(body.error || "Não foi possível ler o relato.");
              onParsed(body.session);
            })
            .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível ler o relato."))
            .finally(() => setPending(false));
        }}
      >
        Interpretar transcrição
      </button>
    </div>
  );
}

function useConfigured(path: string): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void fetch(path)
      .then(async (response) => (await response.json()) as { configured?: boolean })
      .then((body) => {
        if (alive) setConfigured(Boolean(body.configured));
      })
      .catch(() => {
        if (alive) setConfigured(false);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return configured;
}

function DeleteSession({ sessionId }: { sessionId: string }) {
  const app = useApp();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-danger"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setPending(true);
        void app.deleteSession(sessionId).then(() => router.push("/treinos")).catch(() => setPending(false));
      }}
    >
      {confirming ? "Confirmar exclusão" : "Excluir treino"}
    </button>
  );
}
