# Equipes, competidor e campanha

Desenho travado antes do código. Os números saem de funções determinísticas. O modelo de linguagem, quando há chave, só reescreve ou extrai o que o texto já diz. “O rola” é masculino.

## Telas

A barra de baixo continua com no máximo cinco itens.

- Sem o modo competidor: Painel, Treinos, Anotar, Perfil.
- Com “Sou competidor” ligado: Painel, Treinos, Anotar, Competidor, Perfil.

A equipe não ganha aba. O caminho é Perfil → Equipe.

### Equipe

Nome, código de convite, membros (iniciais, faixa e, se a pessoa permitir, nível, título e presença da semana), barras dessa presença e a missão semanal. Dono renomeia e remove. Qualquer membro sai. Busca por nome de usuário ou nome de exibição, convite pendente, e entrada imediata por código.

### Competidor

1. Hero da próxima competição, com a contagem D-xx.
2. Quadro de medalhas.
3. Linha do tempo.
4. Evolução: taxa de vitória por competição, percentual de vitórias por finalização, como vence e como perde, desempenho por fase da chave, pontos feitos e levados. Amostra mínima igual à do painel (`MIN_BASELINE = 4` em `src/lib/metrics.ts`). Abaixo disso o app mostra a contagem e esconde o percentual.
5. Treino contra competição: taxa de finalização nos rolas e nas lutas, com a mesma regra de amostra dos dois lados.

O registro aceita um título histórico (nome, ano, colocação, sem lutas) ou a ficha com lutas. Texto e áudio passam pelo mesmo encadeamento do treino: DeepSeek no texto, Groq `whisper-large-v3` no áudio. A leitura local continua se não houver chave. Nenhum número que não esteja no texto sobrevive.

### Campanha

Uma competição `planned` com data futura vira campanha. O painel mostra a fase, a adesão, o índice de prontidão e as missões da fase. O Painel ganha uma faixa com D-xx e a fase, ligando para a campanha.

No rola, dois atalhos: “Simulação” (conta se houver placar ou resultado decidido) e “Começou em pé”.

## Modelo

Colunas novas em `profiles`:

| Coluna | Regra |
| --- | --- |
| `username` | único, opcional, minúsculo |
| `discoverable` | padrão `false`. A busca só devolve quem ligou |
| `is_competitor` | padrão `false`. Abre a aba |
| `primary_team_id` | uma equipe principal, entre as ativas. Nulo se não houver |

`academy` já existia e continua sendo a academia, opcional.

`teams`: `id`, `name`, `slug`, `owner_id`, `invite_code`, `created_at`.

`team_members`: `team_id`, `user_id`, `role` (`owner`, `admin`, `member`), `status` (`invited`, `requested`, `active`), `joined_at`. Uma pessoa pode estar em várias equipes. O status `requested` existe para um pedido sem código; a interface desta versão usa convite e código.

`competitions`: `id`, `user_id`, `name`, `organization` (`ibjjf`, `cbjj`, `adcc`, `ajp`, `outro`), `event_date`, `city`, `modality`, `belt`, `age_division` (`juvenil`, `adulto`, `master`), `weight_class`, `absolute`, `absolute_placement`, `status` (`planned`, `done`), `placement` (`ouro`, `prata`, `bronze`, `participacao` ou nulo), `notes`.

`competition_matches`: `id`, `competition_id`, `sort_order`, `stage` (`oitavas`, `quartas`, `semi`, `final`, `absoluto`, `outro`), `opponent_name`, `result` (`vitoria`, `derrota`, `empate`), `method` (`finalizacao`, `pontos`, `vantagens`, `punicao`, `decisao`, `dq`, `wo`), `technique_id` opcional, pontos, vantagens, punições, `duration_seconds`, `notes`.

`prep_plans`: `id`, `competition_id`, `user_id`, `start_date`, `weekly_training_target`, `weekly_rola_target`, `focus_attributes` (até 3 dos 9 atributos), `target_weight_kg`, `current_weight_kg`, `active`.

No rola: `simulation` e `started_standing`, ambos padrão `false`.

O modo demonstração guarda as mesmas formas em `localStorage` (`tatame.demo.v1`).

## Privacidade e RLS

`search_profiles(q)` é `security definer`. Exige sessão, texto de 2 a 40 caracteres, no máximo 8 linhas, e só `id`, `username`, `display_name`, `belt`, `academy` de quem está `discoverable`. Não lê e-mail, rola, ponto ou finalização. `%` e `_` são removidos da consulta.

Quem não tem linha em `team_members` não lê `teams` nem `team_members`. Convidado e quem pediu entrada leem o básico para aceitar. `team_board` e `team_week_total` levantam `Equipe não encontrada` para quem está fora, antes de contar treino.

Membro vê nome e faixa de todo mundo. Nível, título equipado e a contagem de treinos da semana só saem se a pessoa ligou o mesmo interruptor já usado com o parceiro (`share_progress`), ou se for ela mesma. O total da missão semanal é visível para membro ativo, porque a missão é da equipe. O conteúdo do rola não entra nesse total: a conta é de sessões, não de placar.

Competições, lutas e planos são só do dono.

O dono renomeia, remove membro e não pode ser removido. Sair sendo dono, com mais gente na equipe, é recusado. Sozinho, sair apaga a equipe. Convite fica `invited` até o aceite. Código entra direto como `active`.

## Fases

`days` é a distância de hoje até a data da competição.

| Fase | Dias |
| --- | --- |
| Base | mais de 56 (mais de 8 semanas) |
| Específico | 21 a 56 (de 8 semanas até 3 semanas) |
| Polimento | 8 a 20 |
| Semana da luta | 0 a 7 |
| Encerrada | data passada |

“8 a 3 semanas” fica em 21–56. A semana da luta fica com os últimos 7 dias. O polimento ocupa o intervalo entre esses dois cortes (dias 8 a 20), para não sobrar um vão. A meta semanal não muda sozinha. O texto da fase é que pede menos volume, e a missão da fase pede um número menor.

## Prontidão, de 0 a 100

Pesos: adesão 30, rolas no tempo de luta 20, simulações 15, início em pé ou queda 10, ganho dos atributos de foco 15, peso 10.

- Adesão: treinos feitos no intervalo ÷ (meta semanal × semanas decorridas), teto 1. Semana parcial conta como semana.
- Tempo de luta: duração ≥ tempo oficial da faixa e da idade. Adulto: branca 5, azul 6, roxa 7, marrom 8, preta/coral/vermelha 10. Master: 5. Juvenil: branca e azul 4, demais 5. A nota é a contagem ÷ `max(4, metade da meta de rolas no período)`, teto 1.
- Simulação: rola marcado e com placar ou resultado decidido, ÷ 4, teto 1.
- Em pé: fração dos rolas da campanha que começaram em pé ou têm queda.
- Foco: média, entre os atributos escolhidos, de `min(1, ganho de nível ÷ 2)` desde o início da campanha.
- Peso: omitido se não houver meta ou pesagem. Com os dois, 1 até 0,5 kg acima da meta e 0 a partir de 3 kg acima. Abaixo da meta vale 1.

O índice é a média ponderada dos pesos que existem, em 0–100. Sem peso, os outros pesos são renormalizados.

## Gamificação

Fora do teto diário de 150 XP e fora do teto semanal das missões de treino.

Competição concluída, no máximo uma por dia (fica a de maior XP):

- Com lutas: 100, mais 20 por vitória (teto de 6), mais medalha: ouro 80, prata 50, bronze 30, participação 0.
- Título histórico, sem lutas: 40. Sem bônus de vitória nem de medalha.

Missão semanal da equipe: 20 treinos somados. Ao bater, 25 XP e um aviso `[SISTEMA]`, uma vez por equipe por semana.

Missão da fase da campanha: 20 XP, uma vez por fase. Base: bater a meta de treinos da semana. Específico: rolas no tempo de luta na semana, até 4. Polimento: 2 simulações com placar em 14 dias. Semana da luta: 1 treino.

Títulos, todos com aviso e linha no Registro do Sistema:

| Título | Critério |
| --- | --- |
| Fundador | criar uma equipe que chegue a 3 membros ativos |
| Estreante | 1ª competição concluída |
| Medalhista | 3 medalhas (ouro, prata ou bronze) |
| Campeão | 1º ouro |
| Duplo ouro | ouro da divisão e do absoluto no mesmo evento |
| Veterano de chave | 10 competições concluídas |
| Campanha completa | campanha encerrada com adesão ≥ 80% |

Estreante, Medalhista e Campeão são a linha de três estágios. Os outros são títulos soltos. Podem ser equipados como os demais.

Avisos de campanha, cada um uma vez: `Campanha iniciada: {nome} em {n} dias`, `Fase Polimento` ao entrar nessa fase ou numa posterior, `Dia da luta` no dia do evento.

## Demonstração

Equipe Tatame Central, quatro membros ativos (Roberto dono, Ana, Lucas, Marina). Pedro está descobrible e fora da equipe, para a busca e o convite. Três competições passadas com lutas, uma delas ouro duplo. Campanha ativa para a Copa Verão em 30/01/2027. Roberto já entra como competidor.
