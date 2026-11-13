import { extractWithDeepSeek, extractionConfigured } from "@/lib/ai/providers";
import { TEXT_AI_UNAVAILABLE_MESSAGE, supabaseConfigured } from "@/lib/config";
import { canonicalizeNames } from "@/lib/normalize-report";
import { normalizeReport } from "@/lib/normalize-report";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ParsedSession } from "@/lib/parse-draft";
import { NextResponse } from "next/server";
import { z } from "zod";

const resultSchema = z.enum(["vitoria", "derrota", "empate", "sem_resultado"]);

const parsedSchema = z.object({
  date: z.string().nullable().optional(),
  modality: z.enum(["gi", "nogi"]).nullable().optional(),
  notes: z.string().optional(),
  rolas: z
    .array(
      z.object({
        durationMinutes: z.coerce.number().optional(),
        partnerName: z.string().optional(),
        result: resultSchema.optional(),
        pointsFor: z.coerce.number().optional(),
        pointsAgainst: z.coerce.number().optional(),
        advantagesFor: z.coerce.number().optional(),
        advantagesAgainst: z.coerce.number().optional(),
        penaltiesFor: z.coerce.number().optional(),
        penaltiesAgainst: z.coerce.number().optional(),
        submissionsApplied: z.array(z.string()).optional(),
        submissionsSuffered: z.array(z.string()).optional(),
        techniquesUsed: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

function withCanonicalTechniques(session: ParsedSession, source: string): ParsedSession {
  const fallback = normalizeReport(source);
  const rolas = (session.rolas ?? []).map((rola, index) => {
    const submissionsApplied = canonicalizeNames(rola.submissionsApplied);
    const submissionsSuffered = canonicalizeNames(rola.submissionsSuffered);
    const techniquesUsed = canonicalizeNames(rola.techniquesUsed);
    const backup = fallback.rolas?.[index];
    const empty = submissionsApplied.length + submissionsSuffered.length + techniquesUsed.length === 0;
    return {
      ...rola,
      submissionsApplied: empty ? backup?.submissionsApplied ?? [] : submissionsApplied,
      submissionsSuffered: empty ? backup?.submissionsSuffered ?? [] : submissionsSuffered,
      techniquesUsed: empty ? backup?.techniquesUsed ?? [] : techniquesUsed,
    };
  });
  return {
    ...session,
    modality: session.modality ?? fallback.modality,
    rolas: rolas.length > 0 ? rolas : fallback.rolas,
  };
}

async function requireUser(): Promise<NextResponse | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Entre na sua conta para usar a leitura automática." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ configured: extractionConfigured() });
}

export async function POST(request: Request) {
  if (!extractionConfigured()) {
    return NextResponse.json({ error: TEXT_AI_UNAVAILABLE_MESSAGE, configured: false }, { status: 503 });
  }
  const denied = await requireUser();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < 8) {
    return NextResponse.json({ error: "Escreva um pouco mais sobre o treino." }, { status: 400 });
  }
  if (text.length > 6000) {
    return NextResponse.json({ error: "O relato passou de 6000 caracteres." }, { status: 400 });
  }

  try {
    const raw = await extractWithDeepSeek(text);
    const parsed = parsedSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ session: normalizeReport(text), normalized: true });
    }
    return NextResponse.json({ session: withCanonicalTechniques(parsed.data, text) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "A leitura automática falhou. Você pode preencher o formulário na mão." },
      { status: 502 },
    );
  }
}
