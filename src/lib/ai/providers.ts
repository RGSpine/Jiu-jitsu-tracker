import { glossaryPrompt, sttVocabularyPrompt } from "@/lib/glossary-match";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash";
export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_OPENAI_TRANSCRIBE_MODEL = "whisper-1";
export const DEFAULT_GROQ_TRANSCRIBE_MODEL = "whisper-large-v3-turbo";

export const TEXT_AI_UNAVAILABLE_MESSAGE =
  "A leitura de texto não está configurada. Dá para anotar o treino no formulário. Quem administra o app pode definir DEEPSEEK_API_KEY.";

export const AUDIO_AI_UNAVAILABLE_MESSAGE =
  "A transcrição não está configurada. A DeepSeek não transcreve áudio; é preciso OPENAI_API_KEY ou GROQ_API_KEY. Dá para escrever o relato ou preencher o formulário.";

export type SttProviderName = "openai" | "groq";

export function extractionConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function sttProviderName(): SttProviderName {
  return process.env.STT_PROVIDER?.toLowerCase() === "groq" ? "groq" : "openai";
}

export function sttConfigured(): boolean {
  return sttProviderName() === "groq" ? Boolean(process.env.GROQ_API_KEY) : Boolean(process.env.OPENAI_API_KEY);
}

export function extractionSystemPrompt(): string {
  return `Você converte relatos de treino de jiu-jitsu, em português do Brasil, para JSON.
Rola é masculino: o rola, os rolas. O relato mistura português, inglês, japonês e gíria, e a transcrição erra nomes.
${glossaryPrompt()}
Responda só JSON neste formato:
{
  "date": "AAAA-MM-DD ou null",
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
      "submissionsApplied": ["id canônico"],
      "submissionsSuffered": ["id canônico"],
      "techniquesUsed": ["id canônico"]
    }
  ]
}
Regras:
- Um rola por round. "5 rolas de 6 min" vira 5 itens; os que não tiverem nome ficam com partnerName vazio.
- "perdi de 4 a 2" significa pointsAgainst 4 e pointsFor 2. Sem derrota, o primeiro número é pointsFor.
- Kimono = gi. No-gi, sem kimono ou nogi = nogi.
- Não invente finalização. Use só ids do glossário.`;
}

export async function extractWithDeepSeek(text: string): Promise<unknown> {
  const base = (process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
      temperature: 0.1,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: extractionSystemPrompt() },
        { role: "user", content: text },
      ],
    }),
  });
  if (!response.ok) {
    console.error(await response.text());
    throw new Error("deepseek");
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content) as unknown;
}

export async function transcribeAudio(audio: File): Promise<string> {
  const provider = sttProviderName();
  const prompt = sttVocabularyPrompt();
  if (provider === "groq") {
    const outbound = new FormData();
    outbound.append("file", audio, audio.name || "rola.webm");
    outbound.append("model", process.env.GROQ_TRANSCRIBE_MODEL || DEFAULT_GROQ_TRANSCRIBE_MODEL);
    outbound.append("language", "pt");
    outbound.append("prompt", prompt);
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: outbound,
    });
    if (!response.ok) {
      console.error(await response.text());
      throw new Error("groq");
    }
    const payload = (await response.json()) as { text?: string };
    return payload.text ?? "";
  }

  const outbound = new FormData();
  outbound.append("file", audio, audio.name || "rola.webm");
  outbound.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || DEFAULT_OPENAI_TRANSCRIBE_MODEL);
  outbound.append("language", "pt");
  outbound.append("prompt", prompt);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: outbound,
  });
  if (!response.ok) {
    console.error(await response.text());
    throw new Error("openai");
  }
  const payload = (await response.json()) as { text?: string };
  return payload.text ?? "";
}
