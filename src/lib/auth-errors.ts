export function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Já existe uma conta com esse e-mail.";
  }
  if (lower.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Muitas tentativas seguidas. Espere um pouco e tente de novo.";
  }
  if (lower.includes("email")) return "Confira o e-mail informado.";
  return "Não foi possível concluir agora. Tente de novo.";
}
