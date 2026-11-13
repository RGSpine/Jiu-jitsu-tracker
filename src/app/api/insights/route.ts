import { completeJson, extractionConfigured } from "@/lib/ai/providers";
import { acceptRephrases, factsHold, type Insight } from "@/lib/insights";
import { NextResponse } from "next/server";
import { z } from "zod";

const insightSchema = z.object({
  id: z.string(),
  text: z.string(),
  tone: z.enum(["up", "down", "neutral"]),
  score: z.number(),
  numbers: z.array(z.number()),
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { insights?: Insight[] } | null;
  const parsed = z.array(insightSchema).safeParse(body?.insights ?? []);
  if (!parsed.success || parsed.data.length === 0) {
    return NextResponse.json({ lines: [] });
  }
  const insights = parsed.data;
  if (!extractionConfigured()) return NextResponse.json({ lines: insights.map((item) => item.text) });

  try {
    const raw = await completeJson(
      "Você reescreve frases de treino. Não altere nem invente números. Responda só JSON.",
      `Reescreva cada frase em uma linha, tom de coach. Devolva {"lines": string[]} com ${insights.length} itens, na mesma ordem.\n${insights.map((item, index) => `${index + 1}. ${item.text}`).join("\n")}`,
    );
    const lines = z.object({ lines: z.array(z.string()) }).safeParse(raw);
    if (!lines.success) return NextResponse.json({ lines: insights.map((item) => item.text) });
    const checked = lines.data.lines.map((line, index) => (
      factsHold(line, insights[index]?.numbers ?? []) ? line : insights[index]?.text ?? line
    ));
    return NextResponse.json({ lines: acceptRephrases(insights, checked).map((item) => item.text) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ lines: insights.map((item) => item.text) });
  }
}
