import { completeJson, extractionConfigured } from "@/lib/ai/providers";
import { factsHold, type Insight } from "@/lib/insights";
import { NextResponse } from "next/server";
import { z } from "zod";

const questSchema = z.object({
  id: z.string(),
  text: z.string(),
  numbers: z.array(z.number()),
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { quests?: Insight[] } | null;
  const parsed = z.array(questSchema).safeParse(body?.quests ?? []);
  if (!parsed.success || parsed.data.length === 0) return NextResponse.json({ lines: [] });
  const quests = parsed.data;
  if (!extractionConfigured()) return NextResponse.json({ lines: quests.map((item) => item.text) });
  try {
    const raw = await completeJson(
      "Você reescreve missões de treino. Não altere nem invente números. Responda só JSON.",
      `Devolva {"lines": string[]} com ${quests.length} frases curtas, na mesma ordem, sem números novos.\n${quests.map((item, index) => `${index + 1}. ${item.text}`).join("\n")}`,
    );
    const lines = z.object({ lines: z.array(z.string()) }).safeParse(raw);
    if (!lines.success) return NextResponse.json({ lines: quests.map((item) => item.text) });
    return NextResponse.json({
      lines: lines.data.lines.map((line, index) => (factsHold(line, quests[index]?.numbers ?? []) ? line : quests[index]?.text ?? line)),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ lines: quests.map((item) => item.text) });
  }
}
