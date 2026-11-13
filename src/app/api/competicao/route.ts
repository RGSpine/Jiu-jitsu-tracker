import { completeJson, extractionConfigured } from "@/lib/ai/providers";
import { groundCompetition, parseCompetitionText } from "@/lib/competition-parse";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < 4) return NextResponse.json({ error: "Conte a competição em uma frase." }, { status: 400 });
  const local = parseCompetitionText(text);
  if (!extractionConfigured()) return NextResponse.json({ draft: local, source: "local" });
  try {
    const raw = await completeJson(
      "Extraia uma competição de jiu-jitsu. Não invente números, nomes nem resultados. Se o texto não disser, use null. Responda só JSON.",
      text,
    );
    const grounded = groundCompetition(raw, text);
    return NextResponse.json({ draft: grounded ?? local, source: "deepseek" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ draft: local, source: "local" });
  }
}
