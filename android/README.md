# Aprumo para Android (TWA)

Projeto Android do Aprumo como Trusted Web Activity: o app da Play Store abre `https://app.useaprumo.com.br` em tela cheia, sem barra de endereço. Não há código nativo; tudo vem do site.

- Pacote: `br.com.useaprumo.app`
- Configuração do Bubblewrap: `android/twa-manifest.json` (versionado)
- Verificação de domínio: `frontend/public/.well-known/assetlinks.json` (servido em `https://app.useaprumo.com.br/.well-known/assetlinks.json`)

## Pré-requisitos

- Node 20 ou superior
- `@bubblewrap/cli` 1.27: `npm install -g @bubblewrap/cli@1.27`
- JDK 17 e Android SDK: na primeira execução o próprio Bubblewrap oferece baixar e instalar os dois. Aceite.

## Como gerar o `.aab`

1. Confira `android/twa-manifest.json`. O `appVersionCode` precisa subir a cada envio para a Play (e `appVersionName`/`appVersion` acompanham).
2. Deixe a keystore de upload ao lado do manifesto, com o nome `aprumo-upload.jks` (veja a seção abaixo). Ela está no `.gitignore`.
3. Rode, dentro de `android/`:

   ```bash
   bubblewrap build
   ```

   O Bubblewrap pergunta a senha da keystore e da chave. Digite no terminal; nunca grave em arquivo do repo.
4. O resultado é `app-release-bundle.aab` (para a Play) e `app-release-signed.apk` (para teste direto no aparelho). Ambos estão no `.gitignore`.

`minSdkVersion` deve ficar em 24. Com 21 o build quebra, porque a biblioteca de TWA exige 24. Um teste (`frontend/src/assetlinks.test.ts`) falha se alguém baixar esse valor.

## Keystore de produção

- A keystore de produção fica FORA do repositório, por exemplo em `~/Documentos/aprumo-chaves/`, com backup em outro local seguro (perder a chave de upload obriga a pedir reset à Play).
- A senha da keystore e da chave nunca vai ao repositório, a este README, a issues nem a PRs.
- Para gerar o `.aab`, copie ou aponte a keystore para `android/aprumo-upload.jks` (alias `aprumo-upload`). O `.gitignore` bloqueia `android/*.jks` e `android/*.keystore`.
- Não use caminho absoluto no `signingKey.path` do manifesto versionado: ele fica `./aprumo-upload.jks`.

## assetlinks.json e fingerprints

O `assetlinks.json` liga o domínio ao app. Sem o fingerprint certo, o Android mostra a barra de endereço (modo "custom tab") em vez da tela cheia.

Hoje o arquivo tem só o fingerprint SHA-256 da chave de upload. Isso basta para instalar o APK assinado com ela, mas o app instalado pela Play é reassinado pela chave do Play App Signing, que tem outro fingerprint.

Depois do primeiro envio do `.aab` à Play:

1. Abra o Play Console, escolha o app, vá em Testar e lançar → Configuração → Integridade do app (Assinatura do app).
2. Copie o "Certificado da chave de assinatura do app", campo SHA-256.
3. Acrescente-o à lista `sha256_cert_fingerprints` em `frontend/public/.well-known/assetlinks.json`, mantendo o da chave de upload. Formato: 32 pares hexadecimais em maiúsculas separados por `:`.
4. Faça o deploy e confira:

   ```bash
   curl -sI https://app.useaprumo.com.br/.well-known/assetlinks.json
   ```

   Esperado: `200` e `content-type: application/json`.

O teste `frontend/src/assetlinks.test.ts` aceita 1 ou mais fingerprints; cada um precisa casar com o formato acima.

## Notificações e atalhos

O app não usa notificações (`enableNotifications` é `false`). Atalhos ficam vazios por ora: o Bubblewrap os descarta quando falta ícone próprio para cada um.
