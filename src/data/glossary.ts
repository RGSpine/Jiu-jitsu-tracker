/**
 * Glossário versionado de jiu-jitsu para leitura de texto e áudio.
 * Cada id é uma técnica do catálogo. Apelidos cobrem português, inglês,
 * japonês e gíria de tatame. Os erros são formas que a transcrição costuma gerar.
 */
export const GLOSSARY_VERSION = "1.1.0";

export type GlossaryEntry = {
  id: string;
  aliases: string[];
  misspellings: string[];
};

export const glossary: GlossaryEntry[] = [
  { id: "single-leg", aliases: ["single leg", "single", "queda de uma perna", "singleg"], misspellings: ["single lek", "singou leg"] },
  { id: "double-leg", aliases: ["double leg", "double", "dupla", "queda de duas pernas", "morote gari"], misspellings: ["doble leg", "duble leg"] },
  { id: "queda-de-quadril", aliases: ["queda de quadril", "tomoe nage", "tomoe"], misspellings: ["tome nage", "tomoe nagi"] },
  { id: "ankle-pick", aliases: ["ankle pick", "pegada no tornozelo", "kibisu gaeshi"], misspellings: ["anckel pick", "ankle pik"] },
  { id: "rasteira", aliases: ["rasteira", "foot sweep", "de ashi barai", "ashi barai"], misspellings: ["rasteira", "deashi barai"] },
  { id: "knee-tap", aliases: ["knee tap", "toque no joelho"], misspellings: ["ni tap", "knee tep"] },
  { id: "body-lock", aliases: ["body lock", "queda de corpo"], misspellings: ["bodi lock", "body lok"] },
  { id: "snap-down", aliases: ["snap down", "puxada de nuca"], misspellings: ["snapdon", "snep down"] },
  { id: "queda-lateral", aliases: ["queda lateral", "lateral drop"], misspellings: ["queda laterau"] },
  { id: "guarda-puxada", aliases: ["guarda puxada", "pull guard", "puxei a guarda"], misspellings: ["pul guard"] },
  { id: "arm-drag", aliases: ["arm drag", "arrasto de braço"], misspellings: ["arm drag", "arn drag"] },
  { id: "o-soto-gari", aliases: ["o-soto-gari", "o soto gari", "osoto gari", "osoto"], misspellings: ["o soto gari", "osoto gari", "o soto gare"] },
  { id: "uchi-mata", aliases: ["uchi-mata", "uchi mata", "uchimata"], misspellings: ["uchi mata", "utxi mata", "uchi mata"] },

  { id: "raspagem-de-quadril", aliases: ["raspagem de quadril", "hip bump"], misspellings: ["hip banp"] },
  { id: "raspagem-tesoura", aliases: ["raspagem tesoura", "tesoura", "scissor sweep"], misspellings: ["sisor sweep"] },
  { id: "raspagem-de-gancho", aliases: ["raspagem de gancho", "hook sweep", "gancho"], misspellings: ["huk sweep"] },
  { id: "raspagem-meia-guarda", aliases: ["raspagem de meia-guarda", "raspagem de meia guarda", "half guard sweep"], misspellings: ["haf guard sweep"] },
  { id: "raspagem-borboleta", aliases: ["raspagem borboleta", "borboleta", "butterfly sweep", "butterfly"], misspellings: ["baterflai"] },
  { id: "raspagem-guarda-x", aliases: ["raspagem da guarda x", "x guard sweep"], misspellings: ["guarda xis sweep"] },
  { id: "raspagem-de-la-riva", aliases: ["raspagem de de la riva", "de la riva sweep"], misspellings: ["dela riva sweep"] },
  { id: "raspagem-lasso", aliases: ["raspagem de lasso", "lasso sweep", "lasso"], misspellings: ["laço sweep"] },
  { id: "elevacao", aliases: ["elevação", "elevacao", "balloon sweep"], misspellings: ["baloon sweep"] },
  { id: "raspagem-cem-quilos", aliases: ["raspagem do cem quilos", "raspagem do 100kg"], misspellings: ["raspagem do cem quilo"] },

  { id: "passagem-de-joelho", aliases: ["passagem de joelho", "knee cut", "knee slice", "corte de joelho"], misspellings: ["ni slice", "knee slace", "passagem de joelio"] },
  { id: "passagem-toreando", aliases: ["passagem toreando", "toreando", "toreada", "toreio", "bullfighter"], misspellings: ["toreano", "torreando"] },
  { id: "passagem-por-cima", aliases: ["passagem por cima", "stack pass", "empilhada"], misspellings: ["estack pass"] },
  { id: "leg-drag", aliases: ["leg drag", "arrasto de perna"], misspellings: ["leg drague"] },
  { id: "passagem-smash", aliases: ["passagem smash", "smash pass", "smash"], misspellings: ["esmash pass"] },
  { id: "passagem-meia-guarda", aliases: ["passagem de meia-guarda", "passagem de meia guarda"], misspellings: ["passagem de meia guarda"] },
  { id: "long-step", aliases: ["long step"], misspellings: ["long step", "longu step"] },
  { id: "passagem-de-quadril", aliases: ["passagem de quadril"], misspellings: ["passagem de cuadril"] },
  { id: "passagem-body-lock", aliases: ["passagem body lock", "body lock pass"], misspellings: ["body lok pass"] },
  { id: "x-pass", aliases: ["x-pass", "x pass", "xpass"], misspellings: ["xis pass"] },

  { id: "triangulo", aliases: ["triângulo", "triangulo", "triangle", "sankaku", "sankaku-jime"], misspellings: ["triangulo", "tryangle", "sancaku"] },
  { id: "triangulo-invertido", aliases: ["triângulo invertido", "triangulo invertido", "inverted triangle"], misspellings: ["triangulo invertido"] },
  { id: "armlock", aliases: ["armlock", "arm lock", "armbar", "chave de braço", "chave de braco", "juji-gatame", "juji gatame"], misspellings: ["arm lok", "juji gatame", "juji gatami", "chave de braso"] },
  { id: "kimura", aliases: ["kimura", "ude-garami", "ude garami"], misspellings: ["quimura", "ude garami", "udegarami"] },
  { id: "americana", aliases: ["americana", "chave americana", "keylock"], misspellings: ["amerikana", "ki lock"] },
  { id: "mata-leao", aliases: ["mata-leão", "mata leao", "mata-leao", "rnc", "rear naked", "rear naked choke", "hadaka-jime", "hadaka jime", "estrangulamento pelas costas"], misspellings: ["mata leão", "hadaka jime", "hadaka gime", "rear nake"] },
  { id: "guilhotina", aliases: ["guilhotina", "guillotine"], misspellings: ["guilhotinha", "gilhotina", "guilotine"] },
  { id: "heel-hook", aliases: ["heel hook", "chave de calcanhar", "machado de calcanhar"], misspellings: ["hell hook", "heal hook", "heelhook", "hill hook"] },
  { id: "kneebar", aliases: ["kneebar", "chave de joelho", "hiza-hishigi"], misspellings: ["ni bar", "knee bar"] },
  { id: "chave-de-tornozelo", aliases: ["chave de tornozelo", "chave de pé reto", "chave de pe reto", "pé reto", "pe reto", "straight ankle lock", "straight ankle", "botinha"], misspellings: ["botinha", "pe reto", "estreito ankle"] },
  { id: "toe-hold", aliases: ["chave de pé", "chave de pe", "toe hold", "americana de pé"], misspellings: ["tou hold", "toehold"] },
  { id: "omoplata", aliases: ["omoplata", "ashi-sankaku"], misspellings: ["omoplata", "omo plata", "homoplata"] },
  { id: "ezekiel", aliases: ["ezekiel", "ezequiel", "estrangulamento ezekiel", "sode-guruma-jime"], misspellings: ["ezequiel", "ezekial", "ezequiel"] },
  { id: "relogio", aliases: ["relógio", "relogio", "clock choke"], misspellings: ["clock choque", "relogio"] },
  { id: "arco-e-flecha", aliases: ["arco e flecha", "bow and arrow"], misspellings: ["bow and arow"] },
  { id: "estrangulamento-lapela", aliases: ["estrangulamento de lapela", "lapela", "cross collar", "juji-jime"], misspellings: ["cross colar", "estrangulamento de lapela"] },
  { id: "katagatame", aliases: ["katagatame", "kata-gatame", "kata gatame", "arm triangle", "triângulo de mão", "triangulo de mao", "triângulo de mao"], misspellings: ["kata gatame", "cata gatame", "arm triangulo", "triangulo de mao"] },
  { id: "anaconda", aliases: ["anaconda"], misspellings: ["anaconda", "anacanda"] },
  { id: "darce", aliases: ["d'arce", "darce", "brabo", "darse"], misspellings: ["darci", "darse", "brabo choke"] },
  { id: "estrangulamento-canto", aliases: ["estrangulamento do canto", "canto choke"], misspellings: ["canto choque"] },
  { id: "loop-choke", aliases: ["loop choke", "estrangulamento em alça"], misspellings: ["lup choke"] },
  { id: "norte-sul", aliases: ["estrangulamento norte-sul", "north south choke", "norte sul"], misspellings: ["nort sout"] },
  { id: "leg-lock", aliases: ["leg lock", "leglock", "chave de perna"], misspellings: ["leg lok", "legue lock"] },

  { id: "montada", aliases: ["montada", "mount", "tateshi"], misspellings: ["montada", "maunt"] },
  { id: "pegada-nas-costas", aliases: ["pegada nas costas", "costas", "back take", "back control", "peguei as costas"], misspellings: ["back teik", "pegada nas costa"] },
  { id: "joelho-na-barriga", aliases: ["joelho na barriga", "knee on belly"], misspellings: ["ni on belly", "joelho na barriga"] },
  { id: "lateral", aliases: ["lateral", "side control", "controle lateral", "yoko-shiho"], misspellings: ["said control"] },
  { id: "cem-quilos", aliases: ["cem quilos", "north-south", "north south", "100kg"], misspellings: ["cem quilo", "nort south"] },
  { id: "berimbolo", aliases: ["berimbolo"], misspellings: ["berinbolo", "berimbolo", "berinbolo"] },
  { id: "guarda-fechada", aliases: ["guarda fechada", "closed guard"], misspellings: ["clousd guard"] },
  { id: "meia-guarda", aliases: ["meia-guarda", "meia guarda", "half guard"], misspellings: ["haf guard"] },
  { id: "de-la-riva", aliases: ["de la riva", "dlr"], misspellings: ["dela riva", "de la riba"] },
  { id: "guarda-sentada", aliases: ["guarda sentada", "sitting guard"], misspellings: ["siting guard"] },
  { id: "guarda-x", aliases: ["guarda x", "x guard"], misspellings: ["guarda xis"] },
  { id: "guarda-aranha", aliases: ["guarda aranha", "spider guard"], misspellings: ["spider gard"] },
  { id: "cinquenta-cinquenta", aliases: ["50/50", "50 50", "cinquenta cinquenta", "fifty fifty"], misspellings: ["cinquenta cinquenta", "fifty fift"] },
  { id: "ashi-garami", aliases: ["ashi garami", "ashi-garami", "single leg x"], misspellings: ["ashi garami", "ashe garami"] },
  { id: "false-grip", aliases: ["false grip", "pegada falsa"], misspellings: ["fals grip", "falsegrip", "falso grip"] },
  { id: "cross-ashi", aliases: ["cross ashi", "cross-ashi", "outside ashi"], misspellings: ["cross ash", "cros ashi", "crossashi"] },
  { id: "saddle", aliases: ["saddle", "honey hole", "honeyhole", "411", "inside sankaku"], misspellings: ["sadle", "honey hol", "four eleven"] },

  { id: "saida-de-montada", aliases: ["saída de montada", "saida de montada", "upa", "elbow escape", "escape de montada"], misspellings: ["upa", "elbou escape"] },
  { id: "saida-das-costas", aliases: ["saída das costas", "saida das costas", "escape das costas"], misspellings: ["saida das costa"] },
  { id: "saida-da-lateral", aliases: ["saída da lateral", "saida da lateral", "escape da lateral"], misspellings: ["saida da laterau"] },
  { id: "saida-joelho-na-barriga", aliases: ["saída do joelho na barriga", "saida do joelho na barriga"], misspellings: ["saida do joelho"] },
  { id: "saida-cem-quilos", aliases: ["saída do cem quilos", "saida do cem quilos"], misspellings: ["saida do cem quilo"] },
  { id: "reguarda", aliases: ["reguarda", "recuperar a guarda", "recomposição da guarda"], misspellings: ["re guarda"] },
];
