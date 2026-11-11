import { sttConfigured, transcribeAudio } from "@/lib/ai/providers";
import { AUDIO_AI_UNAVAILABLE_MESSAGE, supabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ configured: sttConfigured() });
}

export async function POST(request: Request) {
  if (!sttConfigured()) {
    return NextResponse.json({ error: AUDIO_AI_UNAVAILABLE_MESSAGE, configured: false }, { status: 503 });
  }
  if (supabaseConfigured) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Entre na sua conta para usar a transcrição." }, { status: 401 });
    }
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Não recebi o áudio." }, { status: 400 });
  }
  if (audio.size > 12_000_000) {
    return NextResponse.json({ error: "O áudio passou de 12 MB. Grave um relato mais curto." }, { status: 400 });
  }

  try {
    const text = await transcribeAudio(audio);
    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não consegui transcrever o áudio. Tente de novo ou escreva o relato." },
      { status: 502 },
    );
  }
}
