export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const TEXT_AI_UNAVAILABLE_MESSAGE =
  "A leitura de texto não está configurada. Dá para anotar o treino no formulário. Quem administra o app pode definir DEEPSEEK_API_KEY.";

export const AUDIO_AI_UNAVAILABLE_MESSAGE =
  "A transcrição não está configurada. A DeepSeek não transcreve áudio; o padrão é GROQ_API_KEY. Dá para escrever o relato ou preencher o formulário.";

export const AI_UNAVAILABLE_MESSAGE = TEXT_AI_UNAVAILABLE_MESSAGE;
