import { techniques } from "@/data/catalog";
import { AI_UNAVAILABLE_MESSAGE, supabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
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

function catalogPrompt(): string {
  return techniques
    .map((item) => `${item.name} | ${item.category} | ${item.modality}`)
    .join("\n");
}

async function requireAccess(): Promise<NextResponse | null> {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE, configured: false }, { status: 503 });
  }
  if (supabaseConfigured) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json(
        { error: "Entre na sua conta para usar a leitura automática." },
        { status: 401 },
      );
    }
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(request: Request) {
  const denied = await requireAccess();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < 8) {
    return NextResponse.json({ error: "Escreva um pouco mais sobre o treino." }, { status: 400 });
  }
  if (text.length > 6000) {
    return NextResponse.json({ error: "O relato passou de 6000 caracteres." }, { status: 400 });
  }

  const system = `Você converte relatos de treino de jiu-jitsu, em português do Brasil, para JSON.
Use o vocabulário do tatame. Rola é masculino: o rola, os rolas. Também use raspagem, passagem de guarda, queda, finalização, vantagem, punição, montada, pegada nas costas e joelho na barriga.
Responda só JSON neste formato:
{
  "date": "AAAA-MM-DD ou null se não der para saber",
  "modality": "gi, nogi ou null",
  "notes": "resumo curto ou vazio",
  "rolas": [
    {
      "durationMinutes": 6,
      "partnerName": "nome",
      "result": "vitoria | derrota | empate | sem_resultado",
      "pointsFor": 0,
      "pointsAgainst": 0,
      "advantagesFor": 0,
      "advantagesAgainst": 0,
      "penaltiesFor": 0,
      "penaltiesAgainst": 0,
      "submissionsApplied": ["nome da finalização que eu apliquei"],
      "submissionsSuffered": ["nome da finalização que eu sofri"],
      "techniquesUsed": ["quedas, raspagens, passagens e posições que eu fiz"]
    }
  ]
}
Regras:
- Um rola por round. "5 rolas de 6 min" vira 5 itens se os parceiros não forem nomeados; se só alguns nomes aparecerem, crie os rolas nomeados e complete os outros com partnerName vazio.
- "4 a 2" ou "4x2": o primeiro número é pointsFor e o segundo é pointsAgainst, salvo se o texto disser o contrário.
- Kimono = gi. No-gi, sem kimono ou nogi = nogi.
- Não invente finalização que não esteja no texto.
- Nomes de técnica devem sair desta lista, com o mesmo texto:
${catalogPrompt()}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PARSE_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) {
      console.error(await response.text());
      return NextResponse.json(
        { error: "A leitura automática falhou. Você pode preencher o formulário na mão." },
        { status: 502 },
      );
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = parsedSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Não consegui organizar esse relato. Ajuste o texto ou preencha o formulário." },
        { status: 422 },
      );
    }
    return NextResponse.json({ session: parsed.data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "A leitura automática falhou. Você pode preencher o formulário na mão." },
      { status: 502 },
    );
  }
}
