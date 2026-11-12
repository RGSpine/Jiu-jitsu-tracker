"use client";

import { useApp } from "@/components/providers";
import type { TeamCard } from "@/lib/demo-social";
import { beltLabel } from "@/lib/labels";
import { TEAM_WEEK_GOAL } from "@/lib/teams";
import type { DiscoverHit } from "@/lib/types";
import { useEffect, useState } from "react";

export function TeamScreen() {
  const app = useApp();
  const [cards, setCards] = useState<TeamCard[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<DiscoverHit[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setCards(await app.teams());
  }

  useEffect(() => {
    let alive = true;
    void app.teams().then((next) => {
      if (alive) setCards(next);
    }).catch((caught: unknown) => {
      if (alive) setError(caught instanceof Error ? caught.message : "Não foi possível abrir a equipe.");
    });
    return () => {
      alive = false;
    };
  }, [app]);

  const team = cards?.find((item) => item.primary) ?? cards?.[0] ?? null;
  const maxWeek = Math.max(1, ...(team?.members.map((member) => member.weeklyTrainings ?? 0) ?? [1]));

  async function run(action: () => Promise<void>, ok: string) {
    setError(null);
    setNote(null);
    try {
      await action();
      await reload();
      setNote(ok);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir.");
    }
  }

  return (
    <div data-screen="equipe">
      <header className="mast">
        <p className="eyebrow">Equipe</p>
        <h1>{team?.name ?? "Sem equipe"}</h1>
      </header>
      <div className="pad stack">
        {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
        {note ? <div className="banner banner-ok"><p>{note}</p></div> : null}
        {!cards ? <div className="skeleton" /> : null}
        {cards && !team ? (
          <form className="card stack" onSubmit={(event) => { event.preventDefault(); void run(() => app.createTeam(name), "Equipe criada."); }}>
            <label className="field"><span>Nome</span><input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <button className="btn btn-primary" type="submit">Criar equipe</button>
          </form>
        ) : null}
        {team ? (
          <>
            <section className="card stack">
              <div className="spread">
                <span className="sub">Missão da semana</span>
                <strong>{team.questTotal}/{TEAM_WEEK_GOAL}</strong>
              </div>
              <div className="xp-track"><span style={{ width: `${Math.min(100, (team.questTotal / TEAM_WEEK_GOAL) * 100)}%` }} /></div>
              {team.role === "owner" ? (
                <form className="row" onSubmit={(event) => { event.preventDefault(); const next = name || team.name; void run(() => app.renameTeam(team.id, next), "Nome salvo."); }}>
                  <input value={name} placeholder={team.name} onChange={(event) => setName(event.target.value)} aria-label="Novo nome" />
                  <button className="btn btn-ghost" type="submit">Renomear</button>
                </form>
              ) : null}
              {team.inviteCode ? <p className="sub">Código {team.inviteCode}</p> : null}
            </section>
            <section className="stack" aria-label="Membros">
              {team.members.map((member) => (
                <article key={member.userId} className="member">
                  <span className="avatar" aria-hidden="true">{initials(member.displayName)}</span>
                  <div>
                    <strong>{member.displayName}</strong>
                    <p className="sub">{beltLabel(member.belt as never)}{member.title ? ` · ${member.title}` : ""}{member.level ? ` · nv ${member.level}` : ""}</p>
                  </div>
                  <div className="presence" aria-label={member.weeklyTrainings === null ? "Presença oculta" : `${member.weeklyTrainings} treinos`}>
                    <span style={{ height: `${member.weeklyTrainings === null ? 8 : Math.max(8, (member.weeklyTrainings / maxWeek) * 48)}px` }} />
                    <em>{member.weeklyTrainings === null ? "–" : member.weeklyTrainings}</em>
                  </div>
                  {team.role === "owner" && member.role !== "owner" ? (
                    <button className="linkish" type="button" onClick={() => void run(() => app.removeMember(team.id, member.userId), "Membro removido.")}>Remover</button>
                  ) : null}
                  {member.userId === app.user?.id && member.status === "invited" ? (
                    <button className="btn btn-primary" type="button" onClick={() => void run(() => app.acceptInvite(team.id), "Você entrou.")}>Aceitar</button>
                  ) : null}
                </article>
              ))}
            </section>
            <section id="convidar" className="card stack" data-screen="convite">
              <h2>Convidar</h2>
              <form className="row" onSubmit={(event) => {
                event.preventDefault();
                void app.searchAthletes(query).then(setHits).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível buscar."));
              }}>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome" aria-label="Buscar atleta" />
                <button className="btn btn-ghost" type="submit">Buscar</button>
              </form>
              {hits.map((hit) => (
                <div key={hit.id} className="spread">
                  <span>{hit.displayName}<br /><em className="sub">{hit.username} · {beltLabel(hit.belt)}</em></span>
                  <button className="btn btn-primary" type="button" onClick={() => void run(async () => { await app.inviteMember(team.id, hit.id); setHits([]); }, "Convite enviado.")}>Convidar</button>
                </div>
              ))}
            </section>
            {team.role !== "owner" ? <button className="btn btn-ghost" type="button" onClick={() => void run(() => app.leaveTeam(team.id), "Você saiu.")}>Sair da equipe</button> : null}
          </>
        ) : null}
        <form className="card stack" onSubmit={(event) => { event.preventDefault(); void run(() => app.joinTeam(code), "Você entrou na equipe."); }}>
          <label className="field"><span>Código</span><input value={code} onChange={(event) => setCode(event.target.value)} /></label>
          <button className="btn btn-ghost" type="submit">Entrar com código</button>
        </form>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}
