import { glossaryPrompt, sttVocabularyPrompt } from "@/lib/glossary-match";

export const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash";
export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_GROQ_TRANSCRIBE_MODEL = "whisper-large-v3";
export const DEFAULT_OPENAI_TRANSCRIBE_MODEL = "gpt-transcribe";

export type SttProviderName = "openai" | "groq";

export function extractionConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function sttProviderName(): SttProviderName {
  return process.env.STT_PROVIDER?.toLowerCase() === "openai" ? "openai" : "groq";
}

export function defaultSttModel(provider: SttProviderName = sttProviderName()): string {
  return provider === "openai" ? DEFAULT_OPENAI_TRANSCRIBE_MODEL : DEFAULT_GROQ_TRANSCRIBE_MODEL;
}

export function sttModel(): string {
  const override = process.env.STT_MODEL?.trim();
  if (override) return override;
  return defaultSttModel();
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

export async function completeJson(system: string, user: string): Promise<unknown> {
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
        { role: "system", content: system },
        { role: "user", content: user },
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

export async function extractWithDeepSeek(text: string): Promise<unknown> {
  return completeJson(extractionSystemPrompt(), text);
}

export async function transcribeAudio(audio: File): Promise<string> {
  const provider = sttProviderName();
  const model = sttModel();
  const prompt = sttVocabularyPrompt();
  const endpoint = provider === "groq"
    ? "https://api.groq.com/openai/v1/audio/transcriptions"
    : "https://api.openai.com/v1/audio/transcriptions";
  const apiKey = provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
  const outbound = new FormData();
  outbound.append("file", audio, audio.name || "rola.webm");
  outbound.append("model", model);
  outbound.append("prompt", prompt);
  outbound.append("response_format", "json");
  if (provider === "openai" && model === "gpt-transcribe") {
    outbound.append("languages", JSON.stringify(["pt"]));
  } else {
    outbound.append("language", "pt");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: outbound,
  });
  if (!response.ok) {
    console.error(await response.text());
    throw new Error(provider);
  }
  const payload = (await response.json()) as { text?: string };
  return payload.text ?? "";
}
