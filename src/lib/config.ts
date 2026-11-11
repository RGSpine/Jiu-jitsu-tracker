export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const AI_UNAVAILABLE_MESSAGE =
  "A leitura automática não está configurada. Dá para anotar o treino no formulário. Quem administra o app pode definir OPENAI_API_KEY para liberar texto e áudio.";
