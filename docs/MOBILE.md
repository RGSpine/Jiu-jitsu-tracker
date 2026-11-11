# Tatame no celular

O site já é um PWA. As lojas ficam para uma etapa seguinte, quando houver conta de desenvolvedor. Este arquivo é o caminho recomendado e a lista do que ainda depende do Roberto.

## O que cada plataforma exige hoje

Fontes: [WebKit, Safari 26](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/), [WebKit, Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [Chrome, critérios de instalação](https://web.dev/articles/install-criteria), [Chrome no iPhone](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DiOS&hl=en), [diretriz 4.2 da Apple](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

- Android e Chrome de computador instalam sozinhos quando o site é HTTPS, o manifesto tem nome, `start_url`, `display` standalone e ícones de 192 e 512, e a pessoa já interagiu com a página. O evento `beforeinstallprompt` vira o botão Instalar.
- No iPhone não existe `beforeinstallprompt`. A instalação é Compartilhar e depois Adicionar à Tela de Início.
- Desde o iOS 16.4, Chrome, Edge e Firefox também podem oferecer esse item, se o app do navegador implementar a API da Apple. O WebKit abre o atalho como app quando o manifesto pede `display: standalone` ou quando existe `apple-mobile-web-app-capable`. No iOS 26 o padrão passou a ser abrir como app, e a pessoa pode desligar isso na hora de adicionar.
- Se o item não aparecer no Chrome, Edge ou Firefox do iPhone, o caminho que funciona é o Safari. O aviso do app diz isso.
- O Safari grava áudio em `audio/mp4` (AAC), não em WebM. O formulário escolhe esse tipo no iPhone e a rota de transcrição manda o arquivo com a extensão certa (`rola.mp4`).

## Caminho recomendado para as lojas

Não transformar o Next em export estático. O painel, o login e as rotas `/api/interpretar`, `/api/transcrever` e `/api/insights` rodam no servidor. Um `output: "export"` apaga isso.

Não usar o `server.url` do Capacitor como único produto da loja. A própria documentação do Capacitor diz que essa URL é para o live reload e não para produção. Um WebView apontando para o site é o tipo de app que a diretriz 4.2 rejeita: o mesmo site, sem nada que o telefone faça melhor.

O plano, em duas lojas:

1. **Google Play, primeiro, com TWA (Bubblewrap).** É o caminho oficial do Chrome para publicar o PWA. O app abre o site publicado na Vercel, o service worker continua valendo, e o Digital Asset Links (`/.well-known/assetlinks.json`) prova que o pacote `com.rgspine.tatame` é dono do domínio. Dá para gerar o Android App Bundle sem reescrever o Next.
2. **App Store, com Capacitor, só depois de haver função nativa.** A casca iOS também abre a URL publicada (`CAPACITOR_SERVER_URL`), para os cookies do Supabase e as rotas de API continuarem no mesmo domínio. Antes de enviar, ligar o que a web não entrega bem: notificação push, retorno tátil, gravação nativa do microfone e compartilhar um treino. Sem isso, a revisão pode recusar por ser só um site empacotado.

Expo ou React Native ficam de fora. Seria outro aplicativo, e o que já existe é o site em Next.

O `capacitor.config.json` na raiz usa o id `com.rgspine.tatame`. `npm run mobile:config` troca o id e grava `CAPACITOR_SERVER_URL` quando for a hora. Os projetos `android/` e `ios/` não estão no repositório: eles nascem com os comandos abaixo e pedem JDK ou Mac.

## O que a casca nativa não pode quebrar

- O WebView da loja deve abrir a mesma origem do site. Assim o login por cookie funciona. Chamar a API de outra origem (`capacitor://localhost`) exige CORS. O proxy já libera `https://localhost`, `http://localhost`, `capacitor://localhost`, `ionic://localhost` e o que estiver em `CAPACITOR_ORIGINS`.
- Não cachear `/api` nem `/auth` no service worker. Isso já está assim.
- Não depender de `alert` ou de gesto que o WebView bloqueie. O microfone pede permissão no toque em Gravar.

## Checklist para publicar depois

Contas, conferidas nas páginas oficiais:

- Apple Developer Program: 99 USD por ano. Sem isso não há TestFlight nem App Store. [Inscrição](https://developer.apple.com/programs/enroll/).
- Google Play Console: 25 USD uma vez. Conta pessoal nova ainda precisa de teste fechado antes de ir ao ar. [Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).

Mac, só para a Apple:

- Gerar e assinar o iOS, rodar no simulador e enviar à App Store Connect exige Xcode num Mac. O Android Studio e o Bubblewrap rodam em Linux ou Windows.
- Certificado de distribuição, perfil de provisionamento e o Team ID entram no `apple-app-site-association` no lugar de `TEAMID`.

Build:

```bash
npm install
npm run build
# Play, TWA. Troque a URL pela da Vercel e o SHA-256 em public/.well-known/assetlinks.json.
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://SEU-DOMINIO/manifest.webmanifest
bubblewrap build

# Capacitor, quando for ligar push, tátil e áudio nativo.
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
CAPACITOR_SERVER_URL=https://SEU-DOMINIO npm run mobile:config
npx cap add android
npx cap add ios
npx cap open android
npx cap open ios
```

Plugins nativos a adicionar antes da revisão da Apple, não agora:

- `@capacitor/haptics` ao salvar um treino e ao mudar o placar.
- `@capacitor/share` para mandar o resumo de um rola.
- gravação nativa do microfone, no lugar do MediaRecorder quando `Capacitor.isNativePlatform()` for verdadeiro.
- push (APNs e FCM), com a chave da Apple e o `google-services.json`.

Loja:

- Ícone 512 já está em `public/icons/icon-512.png`. A Play pede também o gráfico de 1024 e capturas de telefone. A App Store pede capturas de 6,7 e 6,5 polegadas, ícone de 1024 sem transparência e um texto de privacidade.
- Política de privacidade em URL pública. As duas lojas exigem. O app cria conta e guarda treino, nome, faixa e, se a pessoa gravar, áudio enviado à Groq ou à OpenAI.
- Apagar a conta. A diretriz da Apple e o Data safety da Play exigem um caminho dentro do app para quem criou conta excluir os dados. Ainda não existe essa tela.
- Preencher o questionário de dados (Data safety / Privacy Nutrition Labels): conta, treinos, áudio opcional, sem venda de dado.
- Substituir `SUBSTITUA_PELO_SHA256_DO_CERTIFICADO_DE_ASSINATURA` em `public/.well-known/assetlinks.json` pelo certificado do app de release. Sem isso a TWA não verifica o domínio.
