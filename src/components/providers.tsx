"use client";

import { techniques } from "@/data/catalog";
import { federations, scoringRules } from "@/data/rules";
import { authErrorMessage } from "@/lib/auth-errors";
import { supabaseConfigured } from "@/lib/config";
import {
  demoDeleteSession,
  demoLoadSample,
  demoPerspectives,
  demoProfile,
  demoSaveSession,
  demoSearch,
  demoSessionDraft,
  demoSessions,
  demoSharedRola,
  demoSignIn,
  demoSignUp,
  demoUpdateProfile,
  loadDemoDb,
  saveDemoDb,
} from "@/lib/demo-db";
import { browserRepository } from "@/lib/supabase/repository";
import type {
  Belt,
  Federation,
  Modality,
  PartnerHit,
  PerspectiveRola,
  Profile,
  ScoringRule,
  SessionDraft,
  SessionSummary,
  Technique,
} from "@/lib/types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SessionUser = { id: string; email: string };

type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  belt: Belt | null;
  stripes: number;
  academy: string;
  preferredModality: Modality;
};

type AppContextValue = {
  ready: boolean;
  mode: "demo" | "supabase";
  user: SessionUser | null;
  profile: Profile | null;
  revision: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  updateProfile: (patch: Pick<Profile, "displayName" | "belt" | "stripes" | "academy" | "preferredModality">) => Promise<void>;
  searchPartners: (query: string) => Promise<PartnerHit[]>;
  reference: () => Promise<{ techniques: Technique[]; rules: ScoringRule[]; federations: Federation[] }>;
  rolas: () => Promise<PerspectiveRola[]>;
  sessions: () => Promise<SessionSummary[]>;
  session: (id: string) => Promise<SessionDraft | null>;
  sharedRola: (id: string) => Promise<PerspectiveRola | null>;
  saveSession: (draft: SessionDraft) => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  loadSample: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp fora do provedor");
  return value;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mode = supabaseConfigured ? "supabase" : "demo";
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      if (mode === "demo") {
        const db = loadDemoDb();
        saveDemoDb(db);
        if (!alive) return;
        const current = demoProfile(db);
        setUser(current ? { id: current.id, email: current.email } : null);
        setProfile(current);
        return;
      }
      const repo = browserRepository();
      const current = await repo.user();
      const nextProfile = current ? await repo.loadProfile() : null;
      if (!alive) return;
      setUser(current);
      setProfile(nextProfile);
    };
    void boot()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  const value = useMemo<AppContextValue>(() => {
    const bump = (next: Profile | null, nextUser: SessionUser | null) => {
      setProfile(next);
      setUser(nextUser);
      setRevision((current) => current + 1);
    };

    return {
      ready,
      mode,
      user,
      profile,
      revision,
      async signIn(email, password) {
        if (mode === "demo") {
          if (password.length < 1) throw new Error("Informe uma senha.");
          const db = demoSignIn(loadDemoDb(), email);
          saveDemoDb(db);
          const current = demoProfile(db);
          bump(current, current ? { id: current.id, email: current.email } : null);
          return;
        }
        const repo = browserRepository();
        try {
          await repo.signIn(email, password);
        } catch (error) {
          throw new Error(authErrorMessage(error instanceof Error ? error.message : ""));
        }
        const current = await repo.user();
        const nextProfile = current ? await repo.loadProfile() : null;
        bump(nextProfile, current);
      },
      async signUp(input) {
        if (mode === "demo") {
          const db = demoSignUp(loadDemoDb(), input);
          saveDemoDb(db);
          const current = demoProfile(db);
          bump(current, current ? { id: current.id, email: current.email } : null);
          return { needsEmailConfirmation: false };
        }
        const repo = browserRepository();
        try {
          const result = await repo.signUp(input);
          if (!result.needsEmailConfirmation) {
            const current = await repo.user();
            const nextProfile = current ? await repo.loadProfile() : null;
            bump(nextProfile, current);
          }
          return result;
        } catch (error) {
          throw new Error(authErrorMessage(error instanceof Error ? error.message : ""));
        }
      },
      async sendMagicLink(email) {
        if (mode === "demo") {
          throw new Error("O link mágico precisa do Supabase. Na demonstração, entre com e-mail e senha.");
        }
        const repo = browserRepository();
        try {
          await repo.sendMagicLink(email);
        } catch (error) {
          throw new Error(authErrorMessage(error instanceof Error ? error.message : ""));
        }
      },
      async signOut() {
        if (mode === "supabase") await browserRepository().signOut();
        else {
          const db = loadDemoDb();
          saveDemoDb({ ...db, currentUserId: null });
        }
        bump(null, null);
      },
      enterDemo() {
        const db = demoSignIn(loadDemoDb(), "roberto@tatame.dev");
        saveDemoDb(db);
        const current = demoProfile(db);
        bump(current, current ? { id: current.id, email: current.email } : null);
      },
      async updateProfile(patch) {
        if (!profile) throw new Error("Entre na sua conta para continuar.");
        if (mode === "demo") {
          const db = demoUpdateProfile(loadDemoDb(), patch);
          saveDemoDb(db);
          bump(demoProfile(db), user);
          return;
        }
        await browserRepository().updateProfile(patch);
        const next = await browserRepository().loadProfile();
        bump(next, user);
      },
      async searchPartners(query) {
        if (mode === "demo") return demoSearch(loadDemoDb(), query);
        return browserRepository().searchPartners(query);
      },
      async reference() {
        if (mode === "demo") return { techniques, rules: scoringRules, federations };
        return browserRepository().loadCatalog();
      },
      async rolas() {
        if (mode === "demo") return demoPerspectives(loadDemoDb());
        const catalog = await browserRepository().loadCatalog();
        return browserRepository().loadRolas(catalog.techniques);
      },
      async sessions() {
        if (mode === "demo") return demoSessions(loadDemoDb());
        const catalog = await browserRepository().loadCatalog();
        return browserRepository().loadSessions(catalog.techniques);
      },
      async session(id) {
        if (mode === "demo") return demoSessionDraft(loadDemoDb(), id);
        return browserRepository().loadSession(id);
      },
      async sharedRola(id) {
        if (mode === "demo") return demoSharedRola(loadDemoDb(), id);
        const catalog = await browserRepository().loadCatalog();
        return browserRepository().loadSharedRola(id, catalog.techniques);
      },
      async saveSession(draft) {
        if (mode === "demo") {
          const result = demoSaveSession(loadDemoDb(), draft);
          saveDemoDb(result.db);
          bump(demoProfile(result.db), user);
          return result.id;
        }
        const id = await browserRepository().saveSession(draft);
        setRevision((current) => current + 1);
        return id;
      },
      async deleteSession(id) {
        if (mode === "demo") {
          const db = demoDeleteSession(loadDemoDb(), id);
          saveDemoDb(db);
          bump(demoProfile(db), user);
          return;
        }
        await browserRepository().deleteSession(id);
        setRevision((current) => current + 1);
      },
      async loadSample() {
        if (!profile) throw new Error("Entre na sua conta para continuar.");
        if (mode === "demo") {
          const db = demoLoadSample(loadDemoDb());
          saveDemoDb(db);
          bump(demoProfile(db), user);
          return;
        }
        await browserRepository().loadSample(profile);
        setRevision((current) => current + 1);
      },
    };
  }, [mode, profile, ready, revision, user]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
