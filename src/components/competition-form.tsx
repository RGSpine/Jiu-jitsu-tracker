"use client";

import { useApp } from "@/components/providers";
import { audioFileName, isIosUserAgent, preferredAudioMime } from "@/lib/audio-file";
import { todayIso } from "@/lib/dates";
import { BELT_OPTIONS, METHOD_OPTIONS, ORG_OPTIONS, PLACEMENT_OPTIONS, STAGE_OPTIONS, modalityLabel } from "@/lib/labels";
import type { ParsedCompetition } from "@/lib/competition-parse";
import type { AgeDivision, Belt, CompetitionMatch, MatchMethod, MatchResult, MatchStage, Modality, Organization, Placement } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DraftMatch = Omit<CompetitionMatch, "id" | "competitionId">;

export function CompetitionForm() {
  const app = useApp();
  const router = useRouter();
  const [historical, setHistorical] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState<Organization>("ibjjf");
  const [date, setDate] = useState(todayIso());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [city, setCity] = useState("");
  const [modality, setModality] = useState<Modality>("gi");
  const [belt, setBelt] = useState<Belt | "">(app.profile?.belt ?? "");
  const [age, setAge] = useState<AgeDivision>("adulto");
  const [weight, setWeight] = useState("");
  const [absolute, setAbsolute] = useState(false);
  const [placement, setPlacement] = useState<Placement | "">("");
  const [absolutePlacement, setAbsolutePlacement] = useState<Placement | "">("");
  const [notes, setNotes] = useState("");
  const [matches, setMatches] = useState<DraftMatch[]>([]);
  const [text, setText] = useState("");
  const [campaign, setCampaign] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function applyParsed(parsed: ParsedCompetition) {
    if (parsed.name) setName(parsed.name);
    setOrganization(parsed.organization);
    if (parsed.date) setDate(parsed.date);
    if (parsed.year) setYear(String(parsed.year));
    if (parsed.modality) setModality(parsed.modality);
    if (parsed.belt) setBelt(parsed.belt);
    setAge(parsed.ageDivision);
    if (parsed.weightClass) setWeight(parsed.weightClass);
    setAbsolute(parsed.absolute);
    if (parsed.placement) setPlacement(parsed.placement);
    if (parsed.absolutePlacement) setAbsolutePlacement(parsed.absolutePlacement);
    if (parsed.matches.length) {
      setHistorical(false);
      setMatches(parsed.matches);
    }
  }

  async function readText() {
    setError(null);
    const response = await fetch("/api/competicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await response.json() as { draft?: ParsedCompetition; error?: string };
    if (!response.ok || !body.draft) throw new Error(body.error || "Não foi possível ler.");
    applyParsed(body.draft);
  }

  async function readAudio(file: File) {
    const form = new FormData();
    form.set("audio", file, audioFileName(file.type));
    const response = await fetch("/api/transcrever", { method: "POST", body: form });
    const body = await response.json() as { text?: string; error?: string };
    if (!response.ok || !body.text) throw new Error(body.error || "Não foi possível transcrever.");
    setText(body.text);
    const parsed = await fetch("/api/competicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body.text }),
    });
    const draft = await parsed.json() as { draft?: ParsedCompetition };
    if (draft.draft) applyParsed(draft.draft);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const eventDate = historical ? `${year}-01-01` : date;
      const id = await app.saveCompetition({
        name: name || "Competição",
        organization,
        date: eventDate,
        city,
        modality,
        belt: belt || null,
        ageDivision: age,
        weightClass: weight,
        absolute,
        absolutePlacement: absolute && absolutePlacement ? absolutePlacement : null,
        status: historical || placement ? "done" : "planned",
        placement: placement || null,
        notes,
        matches: historical ? [] : matches,
      });
      if (campaign && !historical && eventDate > todayIso()) {
        await app.savePlan({
          competitionId: id,
          startDate: todayIso(),
          weeklyTrainingTarget: 4,
          weeklyRolaTarget: 8,
          focusAttributes: ["passagem", "guarda", "defesa"],
          targetWeightKg: null,
          currentWeightKg: null,
          active: true,
        });
      }
      router.push("/competidor");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  return (
    <form className="pad stack" data-screen="registro" onSubmit={save}>
      <header className="mast">
        <p className="eyebrow">Competidor</p>
        <h1>Registrar</h1>
      </header>
      {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
      <div className="choice-row">
        <button type="button" className={`mode${historical ? "" : " mode-on"}`} onClick={() => setHistorical(false)}>Com lutas</button>
        <button type="button" className={`mode${historical ? " mode-on" : ""}`} onClick={() => setHistorical(true)}>Só o título</button>
      </div>
      <label className="field"><span>Relato</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} /></label>
      <div className="row">
        <button className="btn btn-ghost" type="button" onClick={() => void readText().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível ler."))}>Ler texto</button>
        <AudioButton onFile={(file) => void readAudio(file).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível transcrever."))} />
      </div>
      <label className="field"><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="field">
        <span>Organização</span>
        <select value={organization} onChange={(event) => setOrganization(event.target.value as Organization)}>
          {ORG_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {historical ? (
        <label className="field"><span>Ano</span><input value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" /></label>
      ) : (
        <label className="field"><span>Data</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      )}
      <label className="field"><span>Cidade</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label>
      <div className="choice-row">
        {(["gi", "nogi"] as const).map((item) => (
          <button key={item} type="button" className={`mode${modality === item ? " mode-on" : ""}`} onClick={() => setModality(item)}>{modalityLabel(item)}</button>
        ))}
      </div>
      <label className="field">
        <span>Faixa</span>
        <select value={belt} onChange={(event) => setBelt(event.target.value as Belt | "")}>
          <option value="">Sem faixa</option>
          {BELT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="choice-row">
        {(["adulto", "master", "juvenil"] as const).map((item) => (
          <button key={item} type="button" className={`mode${age === item ? " mode-on" : ""}`} onClick={() => setAge(item)}>{item}</button>
        ))}
      </div>
      <label className="field"><span>Categoria</span><input value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
      <label className="field"><span>Notas</span><input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <label className="field">
        <span>Colocação</span>
        <select value={placement} onChange={(event) => setPlacement(event.target.value as Placement | "")}>
          <option value="">Ainda não</option>
          {PLACEMENT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="share-row">
        <input type="checkbox" checked={absolute} onChange={(event) => setAbsolute(event.target.checked)} />
        <span>Absoluto</span>
      </label>
      {absolute ? (
        <label className="field">
          <span>Absoluto</span>
          <select value={absolutePlacement} onChange={(event) => setAbsolutePlacement(event.target.value as Placement | "")}>
            <option value="">Sem colocação</option>
            {PLACEMENT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      ) : null}
      {historical ? null : matches.map((match, index) => (
        <article key={`${match.opponentName}-${index}`} className="card stack">
          <div className="spread"><h2>Luta {index + 1}</h2><button className="linkish" type="button" onClick={() => setMatches(matches.filter((_, item) => item !== index))}>Remover</button></div>
          <label className="field"><span>Adversário</span><input value={match.opponentName} onChange={(event) => updateMatch(index, { opponentName: event.target.value })} /></label>
          <div className="choice-row">
            {(["vitoria", "derrota", "empate"] as const).map((result) => (
              <button key={result} type="button" className={`mode${match.result === result ? " mode-on" : ""}`} onClick={() => updateMatch(index, { result })}>{result === "vitoria" ? "Vitória" : result === "derrota" ? "Derrota" : "Empate"}</button>
            ))}
          </div>
          <label className="field">
            <span>Fase</span>
            <select value={match.stage} onChange={(event) => updateMatch(index, { stage: event.target.value as MatchStage })}>
              {STAGE_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Como</span>
            <select value={match.method} onChange={(event) => updateMatch(index, { method: event.target.value as MatchMethod })}>
              {METHOD_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <div className="row">
            <label className="field"><span>Meus pontos</span><input inputMode="numeric" value={match.pointsFor} onChange={(event) => updateMatch(index, { pointsFor: Number(event.target.value) || 0 })} /></label>
            <label className="field"><span>Pontos dele</span><input inputMode="numeric" value={match.pointsAgainst} onChange={(event) => updateMatch(index, { pointsAgainst: Number(event.target.value) || 0 })} /></label>
          </div>
        </article>
      ))}
      {historical ? null : (
        <button className="btn btn-ghost" type="button" onClick={() => setMatches([...matches, emptyMatch(matches.length + 1)])}>Adicionar luta</button>
      )}
      {!historical ? (
        <label className="share-row">
          <input type="checkbox" checked={campaign} onChange={(event) => setCampaign(event.target.checked)} />
          <span>Abrir campanha se a data for futura</span>
        </label>
      ) : null}
      <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando..." : "Salvar"}</button>
    </form>
  );

  function updateMatch(index: number, patch: Partial<DraftMatch>) {
    setMatches((current) => current.map((match, item) => item === index ? { ...match, ...patch } : match));
  }
}

function emptyMatch(order: number): DraftMatch {
  return {
    order,
    stage: "outro",
    opponentName: "",
    result: "vitoria" as MatchResult,
    method: "pontos",
    techniqueId: null,
    pointsFor: 0,
    pointsAgainst: 0,
    advantagesFor: 0,
    advantagesAgainst: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    durationSeconds: 0,
    notes: "",
  };
}

function AudioButton({ onFile }: { onFile: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  async function toggle() {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = preferredAudioMime((type) => MediaRecorder.isTypeSupported(type), isIosUserAgent(navigator.userAgent));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      onFile(new File(chunks, audioFileName(recorder.mimeType), { type: recorder.mimeType || "audio/webm" }));
    };
    recorder.start();
    setRecording(true);
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 8000);
  }
  return <button className={`btn btn-ghost${recording ? " mode-on" : ""}`} type="button" onClick={() => void toggle().catch(() => undefined)}>{recording ? "Ouvindo" : "Falar"}</button>;
}
