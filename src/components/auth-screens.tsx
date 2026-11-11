"use client";

import { Frame } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { BELT_OPTIONS } from "@/lib/labels";
import type { Belt, Modality } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LandingScreen() {
  const app = useApp();
  const router = useRouter();

  useEffect(() => {
    if (app.ready && app.user) router.replace("/painel");
  }, [app.ready, app.user, router]);

  return (
    <Frame>
      <div className="hero">
        <h1>Anote o rola antes de esfriar.</h1>
        <p className="lede">
          Kimono ou no-gi, parceiro, pontuação e finalização. O painel mostra se o seu jogo está andando.
        </p>
        <div className="stack">
          <div className="feature"><span className="dot" /><span>Rolas com vitória, pontos, vantagem, punição e finalização.</span></div>
          <div className="feature"><span className="dot" /><span>Texto ou áudio viram um formulário para você corrigir antes de salvar.</span></div>
          <div className="feature"><span className="dot" /><span>Quedas, raspagens, passagens e o resto do catálogo, no seu histórico.</span></div>
        </div>
        <Link className="btn btn-primary btn-block" href="/login" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>Entrar</Link>
        <Link className="btn btn-ghost btn-block" href="/cadastro" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>Criar conta</Link>
        {app.mode === "demo" ? (
          <div className="banner">
            <p>Sem Supabase neste ambiente. A demonstração fica só neste aparelho, com treinos de exemplo do Roberto.</p>
            <button
              className="btn btn-block mt"
              type="button"
              onClick={() => {
                app.enterDemo();
                router.push("/painel");
              }}
            >
              Abrir demonstração
            </button>
          </div>
        ) : null}
      </div>
    </Frame>
  );
}

export function LoginScreen({ linkError = false }: { linkError?: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkError ? "Esse link expirou ou já foi usado." : null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (app.ready && app.user) router.replace("/painel");
  }, [app.ready, app.user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await app.signIn(email, password);
      router.push("/painel");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Frame>
      <form className="hero" onSubmit={submit}>
        <h1>Entrar</h1>
        {app.mode === "demo" ? (
          <div className="banner">
            <p>Demonstração local. Use roberto@tatame.dev ou ana@tatame.dev e qualquer senha. A Ana vê os mesmos rolas do outro lado.</p>
          </div>
        ) : null}
        {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
        {info ? <div className="banner banner-ok"><p>{info}</p></div> : null}
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
        {app.mode === "supabase" ? (
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setError(null);
              void app.sendMagicLink(email).then(() => setInfo("Enviamos um link de acesso para o seu e-mail.")).catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "Não foi possível enviar o link.");
              });
            }}
          >
            Receber link mágico
          </button>
        ) : null}
        <p className="footer-note">Ainda não tem conta? <Link href="/cadastro">Criar conta</Link></p>
      </form>
    </Frame>
  );
}

export function SignupScreen() {
  const app = useApp();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [belt, setBelt] = useState<Belt | "">("branca");
  const [stripes, setStripes] = useState(0);
  const [academy, setAcademy] = useState("");
  const [modality, setModality] = useState<Modality>("nogi");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setPending(true);
    try {
      const result = await app.signUp({
        email,
        password,
        displayName,
        belt: belt || null,
        stripes,
        academy,
        preferredModality: modality,
      });
      if (result.needsEmailConfirmation) {
        setInfo("Conta criada. Confirme o e-mail para entrar.");
      } else {
        router.push("/painel");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar a conta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Frame>
      <form className="hero" onSubmit={submit}>
        <h1>Criar conta</h1>
        {error ? <div className="banner banner-bad"><p>{error}</p></div> : null}
        {info ? <div className="banner banner-ok"><p>{info}</p></div> : null}
        <label className="field"><span>Nome</span><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label>
        <label className="field"><span>E-mail</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label className="field"><span>Senha</span><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
        <label className="field">
          <span>Faixa</span>
          <select value={belt} onChange={(event) => setBelt(event.target.value as Belt | "")}>
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
        <div className="choice-row" role="group" aria-label="Modalidade preferida">
          <button type="button" className={`mode${modality === "nogi" ? " mode-on" : ""}`} onClick={() => setModality("nogi")}>No-gi</button>
          <button type="button" className={`mode${modality === "gi" ? " mode-on" : ""}`} onClick={() => setModality("gi")}>Kimono</button>
        </div>
        <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Criando..." : "Criar conta"}</button>
        <p className="footer-note">Já treina por aqui? <Link href="/login">Entrar</Link></p>
      </form>
    </Frame>
  );
}
