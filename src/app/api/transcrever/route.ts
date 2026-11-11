import { AI_UNAVAILABLE_MESSAGE, supabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAccess(): Promise<NextResponse | null> {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE, configured: false }, { status: 503 });
  }
  if (supabaseConfigured) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json(
        { error: "Entre na sua conta para usar a transcrição." },
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

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Não recebi o áudio." }, { status: 400 });
  }
  if (audio.size > 12_000_000) {
    return NextResponse.json({ error: "O áudio passou de 12 MB. Grave um relato mais curto." }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("file", audio, audio.name || "rola.webm");
  outbound.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  outbound.append("language", "pt");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outbound,
    });
    if (!response.ok) {
      console.error(await response.text());
      return NextResponse.json(
        { error: "Não consegui transcrever o áudio. Tente de novo ou escreva o relato." },
        { status: 502 },
      );
    }
    const payload = (await response.json()) as { text?: string };
    return NextResponse.json({ text: payload.text ?? "" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não consegui transcrever o áudio. Tente de novo ou escreva o relato." },
      { status: 502 },
    );
  }
}
