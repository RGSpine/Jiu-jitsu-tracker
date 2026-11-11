"use client";

import { ProfileProgress } from "@/components/profile-progress";
import { useApp } from "@/components/providers";
import { BELT_OPTIONS, beltLabel } from "@/lib/labels";
import type { Belt, Modality } from "@/lib/types";
import { useEffect, useState } from "react";

export function ProfileScreen() {
  const app = useApp();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHydrated(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!hydrated || !app.profile) return <div className="pad mt"><div className="skeleton" /></div>;
  return <ProfileForm key={app.profile.id} />;
}

function ProfileForm() {
  const app = useApp();
  const profile = app.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [belt, setBelt] = useState<Belt | "">(profile?.belt ?? "");
  const [stripes, setStripes] = useState(profile?.stripes ?? 0);
  const [academy, setAcademy] = useState(profile?.academy ?? "");
  const [modality, setModality] = useState<Modality>(profile?.preferredModality ?? "nogi");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  if (!profile) return null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await app.updateProfile({
        displayName,
        belt: belt || null,
        stripes,
        academy,
        preferredModality: modality,
      });
      setMessage("Perfil salvo.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <header className="mast">
        <p className="eyebrow">Perfil</p>
        <h1>{profile.displayName}</h1>
        <p className="lede">Faixa real: {beltLabel(profile.belt)} · {profile.stripes} graus</p>
      </header>
      <div className="pad stack">
        <ProfileProgress />
      </div>
      <form className="pad stack" onSubmit={save}>
        {message ? <div className="banner banner-ok"><p>{message}</p></div> : null}
        {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
        <label className="field"><span>Nome</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label className="field">
          <span>Faixa</span>
          <select value={belt} onChange={(event) => setBelt(event.target.value as Belt | "")}>
            <option value="">Sem faixa</option>
            {BELT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Graus</span>
          <select value={stripes} onChange={(event) => setStripes(Number(event.target.value))}>
            {[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field"><span>Academia</span><input value={academy} onChange={(event) => setAcademy(event.target.value)} /></label>
        <div className="choice-row">
          <button type="button" className={`mode${modality === "nogi" ? " mode-on" : ""}`} onClick={() => setModality("nogi")}>No-gi</button>
          <button type="button" className={`mode${modality === "gi" ? " mode-on" : ""}`} onClick={() => setModality("gi")}>Kimono</button>
        </div>
        <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando..." : "Salvar perfil"}</button>
        <hr className="sep" />
        <p className="footer-note">
          Carregar treinos de exemplo substitui os treinos que você mesmo registrou. Rolas anotadas por outra pessoa continuam no histórico.
        </p>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            if (!confirmSample) {
              setConfirmSample(true);
              return;
            }
            setPending(true);
            void app.loadSample()
              .then(() => setMessage(app.mode === "demo" ? "Demonstração restaurada." : "Treinos de exemplo carregados."))
              .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar."))
              .finally(() => {
                setPending(false);
                setConfirmSample(false);
              });
          }}
        >
          {confirmSample ? "Confirmar exemplo" : "Carregar treinos de exemplo"}
        </button>
        {app.mode === "demo" ? (
          <p className="footer-note">Para ver o rola invertido, saia e entre como ana@tatame.dev. A busca por nome não mostra estatística de ninguém.</p>
        ) : null}
        <p className="footer-note">No celular, use o menu do navegador e escolha Adicionar à Tela de Início para instalar o Tatame.</p>
        <button className="btn btn-danger" type="button" onClick={() => void app.signOut()}>Sair</button>
      </form>
    </div>
  );
}
