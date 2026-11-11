# Tatame

Diário de treinos de jiu-jitsu para anotar no celular depois do rola. A primeira versão cobre conta, perfil, treino com rolas, três jeitos de preencher (formulário, texto e áudio), parceiro vinculado, pontuação IBJJF e um painel da evolução.

A interface está em português do Brasil e usa o vocabulário do tatame: rola, raspagem, passagem de guarda, queda, finalização, vantagem, punição, montada, pegada nas costas, joelho na barriga.

Sem as chaves do Supabase, o app abre em **modo demonstração**: os dados ficam só neste navegador e já existe um histórico de exemplo. Sem a chave de IA, texto e áudio explicam que a leitura automática não está configurada; o formulário manual segue funcionando.

## O que a v1 faz

- Criar conta e entrar com e-mail e senha, ou com link mágico.
- Perfil com nome, faixa, graus, academia e modalidade preferida (kimono ou no-gi).
- Anotar um treino com data, modalidade e vários rolas.
- Em cada rola: duração, parceiro, resultado, pontos, vantagens, punições, finalizações e técnicas.
- Três entradas que terminam no mesmo formulário, sempre com revisão antes de salvar.
- Parceiro cadastrado: o mesmo rola aparece no histórico dele, com resultado, pontos e finalizações invertidos.
- Busca de parceiro por nome ou e-mail, sem mostrar estatística de ninguém.
- Painel com volume, taxa de vitória, finalizações, categorias, técnicas mais e menos usadas, e comparação com o período anterior.
- Regras da IBJJF em tabela, para outra federação entrar depois como dado.
- Catálogo de técnicas de gi e no-gi, sem vídeo.
- PWA: manifest, ícones e service worker.

## Requisitos

- Node.js 20.9 ou mais recente
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com) para publicar

## 1. Criar o projeto no Supabase

1. Crie um projeto novo.
2. Espere o banco ficar pronto.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

## 2. Rodar a migration

Abra **SQL Editor → New query**, cole o arquivo inteiro `supabase/migrations/20261111000000_init.sql` e execute.

O arquivo cria as tabelas, as políticas de Row Level Security, o gatilho de perfil, as funções de salvar/apagar treino e de buscar parceiro, e carrega a IBJJF e o catálogo de técnicas.

Se você usa a CLI do Supabase no seu computador:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## 3. Configurar o login

Em **Authentication → Providers**, deixe **Email** ligado.

Para testar rápido a senha, em **Authentication → Sign In / Providers → Email**, desligue **Confirm email**. Com a confirmação ligada, o cadastro só entra depois do clique no e-mail, e o link mágico continua válido.

Em **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` no desenvolvimento. Em produção, a URL da Vercel.
- **Redirect URLs:** inclua estas duas, trocando o domínio de produção:
  - `http://localhost:3000/auth/callback`
  - `https://SEU-APP.vercel.app/auth/callback`

## 4. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Para dados reais | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Para dados reais | Chave anon. Pode ir no cliente; a RLS protege os dados |
| `NEXT_PUBLIC_APP_URL` | Não | Documentação e redirect |
| `DEEPSEEK_API_KEY` | Não | Leitura do texto (extração). Sem ela, o formulário manual segue e o texto avisa |
| `DEEPSEEK_MODEL` | Não | Padrão `deepseek-flash` |
| `DEEPSEEK_BASE_URL` | Não | Padrão `https://api.deepseek.com` |
| `STT_PROVIDER` | Não | `openai` (padrão) ou `groq`. A DeepSeek não transcreve áudio |
| `OPENAI_API_KEY` | Não | Transcrição quando `STT_PROVIDER=openai` |
| `OPENAI_TRANSCRIBE_MODEL` | Não | Padrão `whisper-1`. Também aceita `gpt-4o-transcribe` |
| `GROQ_API_KEY` | Não | Transcrição quando `STT_PROVIDER=groq` |
| `GROQ_TRANSCRIBE_MODEL` | Não | Padrão `whisper-large-v3-turbo` |

Não commite `.env.local`. A chave **service_role** não é usada pelo app.

### Texto e áudio

A extração do relato usa a API compatível com OpenAI da DeepSeek, em `https://api.deepseek.com/chat/completions`. O id verificado na documentação oficial ([Your First API Call](https://api-docs.deepseek.com/) e [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)) é `deepseek-flash`, servido pelo DeepSeek-V4.1-Flash-1017. O nome antigo `deepseek-v4-flash` foi aposentado e só é aceito como apelido.

A mesma documentação não oferece transcrição de áudio: os modelos aceitam texto e, no Flash, imagem. O áudio fica num provedor separado.

- Texto: `DEEPSEEK_API_KEY`. Opcional `DEEPSEEK_MODEL` (padrão `deepseek-flash`).
- Áudio com OpenAI: `STT_PROVIDER=openai` e `OPENAI_API_KEY`. O modelo padrão é `whisper-1`; `OPENAI_TRANSCRIBE_MODEL` pode ser `gpt-4o-transcribe`.
- Áudio com Groq: `STT_PROVIDER=groq` e `GROQ_API_KEY`. O padrão é `whisper-large-v3-turbo`.

Os dois caminhos recebem o glossário versionado em `src/data/glossary.ts`: o texto entra no prompt da DeepSeek, a transcrição recebe uma lista curta de termos para enviesar o reconhecimento, e um normalizador local corrige apelidos e erros como "hell hook" e "cross ash" mesmo se o modelo devolver o nome cru. Sem as chaves, texto e áudio mostram um aviso e o formulário manual continua.

## 5. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem Supabase, use **Abrir demonstração**. As contas locais são `roberto@tatame.dev` e `ana@tatame.dev`, com qualquer senha. A Ana vê os rolas do Roberto pelo lado dela.

Com Supabase, crie uma conta de verdade. No perfil, **Carregar treinos de exemplo** grava um histórico fictício na sua conta para o painel não começar vazio. Isso substitui os treinos que você mesmo anotou.

Comandos:

```bash
npm test
npm run lint
npm run build
```

## 6. Publicar na Vercel

1. Envie este repositório para o GitHub.
2. Na Vercel, **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, coloque as mesmas chaves do `.env.local`, com `NEXT_PUBLIC_APP_URL` apontando para o domínio da Vercel.
4. Faça o deploy.
5. Volte no Supabase e acrescente a URL de produção nas Redirect URLs e no Site URL.
6. Abra o app no celular e use **Adicionar à Tela de Início**. O manifest e o service worker já estão no projeto.

O build da Vercel é o padrão do Next.js: `npm run build`.

## Como o rola compartilhado funciona

Existe **um** registro do rola, não duas cópias. Quem anota é o atleta da perspectiva canônica (`athlete_id`). O parceiro, se tiver conta e for escolhido na busca, entra em `partner_user_id`.

A Row Level Security deixa essa linha visível só para os dois. O parceiro não edita e não vê as notas do treino. Na tela dele, o app inverte:

- vitória vira derrota, e o contrário
- pontos, vantagens e punições trocam de lado
- finalização aplicada vira finalização sofrida, e o contrário

Um nome livre, sem conta, fica só no seu histórico.

A busca (`search_partners`) devolve nome, faixa e academia. O e-mail entra no filtro, mas não volta na resposta. Estatística de treino não sai nessa consulta.

## Pontuação

A IBJJF está em `federations` e `scoring_rules`:

| Ação | Pontos |
| --- | --- |
| Queda | 2 |
| Raspagem | 2 |
| Joelho na barriga | 2 |
| Passagem de guarda | 3 |
| Montada | 4 |
| Pegada nas costas | 4 |

O formulário soma os pontos das técnicas que você marcou e deixa o número editável. Vantagem e punição são contadores à parte; punição não vira ponto sozinha.

Para outra federação no futuro, insira uma linha em `federations` e as ações em `scoring_rules`. O app já lê essas tabelas. O exemplo comentado está no fim da migration.

## Catálogo

As técnicas ficam em `src/data/catalog.ts` e são copiadas para o banco pela migration. Grupos: quedas, raspagens, passagens, finalizações, controles e saídas, com técnicas de kimono e de no-gi (heel hook, berimbolo, single leg, triângulo, mata-leão e outras).

Se mudar o catálogo, rode de novo:

```bash
node --experimental-strip-types scripts/render-seed.mjs
```

e reaplique o SQL.

## Privacidade

Cada pessoa vê os próprios treinos e os rolas dos quais participou. As políticas estão na migration. Não use a service role no navegador.

## Estrutura

- `src/app` — telas, manifest e rotas de IA
- `src/components` — formulário, painel e histórico
- `src/lib` — pontuação, estatística, perspectiva do rola e modo demonstração
- `supabase/migrations` — esquema, RLS e sementes
- `public/sw.js` — service worker com página offline simples
