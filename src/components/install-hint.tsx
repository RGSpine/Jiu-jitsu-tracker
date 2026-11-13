"use client";

import { classifyInstall, isStandaloneDisplay, type InstallKind } from "@/lib/install-platform";
import { useEffect, useState } from "react";

const DISMISS_KEY = "tatame.install.dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint() {
  const [kind, setKind] = useState<InstallKind | null>(null);
  const [preview, setPreview] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("instalar");
    const standalone = isStandaloneDisplay() || params.get("modo") === "instalado";
    const timer = window.setTimeout(() => {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1" && !forced;
      if (!dismissed && !standalone) {
        setPreview(Boolean(forced));
        setKind(classifyInstall(window.navigator.userAgent, {
          standalone,
          preview: forced,
          platform: window.navigator.platform,
          touchPoints: window.navigator.maxTouchPoints,
        }));
      }
    }, 0);

    function onPrompt(event: Event) {
      event.preventDefault();
      if (window.localStorage.getItem(DISMISS_KEY) === "1" && !forced) return;
      if (standalone) return;
      setPromptEvent(event as BeforeInstallPromptEvent);
      setKind((current) => current ?? "android");
    }
    function onUpdate() {
      setUpdateReady(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("tatame-update", onUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("tatame-update", onUpdate);
    };
  }, []);

  if (!kind && !updateReady) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setKind(null);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setKind(null);
  }

  async function applyUpdate() {
    const worker = (await navigator.serviceWorker?.getRegistration())?.waiting;
    window.sessionStorage.setItem("tatame.reload", "1");
    worker?.postMessage("skip-waiting");
  }

  return (
    <aside className="install-card" aria-label="Instalar o Tatame">
      <div className="spread">
        <strong>{updateReady ? "Nova versão" : "No celular"}</strong>
        {kind ? <button className="linkish" type="button" onClick={dismiss}>Agora não</button> : null}
      </div>
      {updateReady ? <button className="btn btn-primary" type="button" onClick={() => void applyUpdate()}>Atualizar</button> : null}
      {kind === "android" ? (
        <button className="btn btn-primary" type="button" onClick={() => void install()} disabled={!promptEvent && !preview}>
          Instalar
        </button>
      ) : null}
      {kind && kind !== "android" ? <IosSteps kind={kind} /> : null}
    </aside>
  );
}

function IosSteps({ kind }: { kind: Exclude<InstallKind, "android"> }) {
  const safariOnly = kind === "ios-other";
  const where = kind === "ios-chrome" || kind === "ios-edge" ? "no alto" : kind === "ios-firefox" ? "no menu" : "em baixo";
  return (
    <div className="stack">
      {safariOnly ? (
        <p className="install-line">Abra no Safari para instalar.</p>
      ) : (
        <div className="install-steps">
          <div className="install-step">
            <span className="install-glyph" aria-hidden="true"><ShareIcon /></span>
            <span>Compartilhar {where}</span>
          </div>
          <span className="install-arrow" aria-hidden="true">→</span>
          <div className="install-step">
            <span className="install-glyph" aria-hidden="true"><HomeIcon /></span>
            <span>Adicionar à Tela de Início</span>
          </div>
        </div>
      )}
      {kind !== "safari" && kind !== "ios-other" ? <p className="install-line">Se não achar, abra no Safari.</p> : null}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v10" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 11h-1a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
