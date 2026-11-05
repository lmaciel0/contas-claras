# Aprumo na Play Store: design

Data: 2026-11-05. Autor do pedido: Lucas. Estado: rascunho para aprovação.

## Intenção e porquê

O Lucas quer o Aprumo disponível, de forma pública, na Play Store. O uso que ele descreveu no celular é rápido, não é trabalho longo: ver como está o projeto, anotar algo na hora, cadastrar uma conta e ver se o mês está positivo ou negativo. Hoje isso já funciona no site, mas com menu lateral pensado para telas grandes.

O resultado esperado é um app instalável que abre o Aprumo já pronto para esses quatro momentos, publicado por uma conta de desenvolvedor pessoa física.

## Objetivos

- App Android publicado na Play Store, público, em português do Brasil.
- Navegação de celular com dock flutuante (decidida com o mockup aprovado em 2026-11-05).
- Passar na revisão da Play na primeira ou segunda tentativa.
- Manter uma única base de código de front-end (o site e o app são o mesmo).

## Não objetivos

- App nativo separado (Kotlin, Flutter ou React Native).
- Versão para iPhone.
- Uso offline e notificações push.
- Reescrever telas. Só muda a moldura de navegação no celular, o resto das páginas continua igual.
- Apex `useaprumo.com.br` com landing page (fica para depois).

## O que não pode acontecer (antiobjetivos)

- O app abrir com a barra de endereço do Chrome visível (sinal de que a verificação do domínio falhou).
- Login com Google falhar dentro do app.
- Qualquer chave de assinatura ou senha de keystore parar no repositório (ele é público).
- A revisão da Play rejeitar por falta de caminho de exclusão de conta ou de credenciais de teste.

## Restrições

- Português do Brasil em tudo, só tokens de cor `--cor-*`, alvo de toque mínimo 44 px, foco visível, `prefers-reduced-motion` respeitado (regras do HANDOFF).
- O repo é público: nada de IDs de infraestrutura nem segredos em arquivos commitados.
- O cookie de sessão é `SameSite=Strict`, `HttpOnly`, `Secure` em `app.useaprumo.com.br`. O app precisa abrir esse mesmo host.
- A CSP de `vercel.json` só libera `accounts.google.com`. Qualquer mudança nela precisa manter o login funcionando.
- Teste com TDD no que tiver lógica; o código de front vai pelo `frontend-developer` e o de Java pelo `java-spring`.

## Decisões do Lucas

1. Distribuição pública, conta de desenvolvedor como pessoa física (ainda não criada).
2. O app é o Aprumo que já existe, empacotado para a loja.
3. Dock flutuante inferior no celular, no estilo do componente "Bottom Nav Bar" do 21st.dev, com 4 destinos: Início, Tarefas, Notas e Finanças. Aprovado no mockup https://claude.ai/artifact/14uh5VYivLS4noTWH8rkNc.
4. Botão "+" para ação rápida (nova nota, nova conta, nova tarefa).

## Decisões minhas (o Lucas pode trocar)

- **Empacotamento: TWA (Trusted Web Activity) com Bubblewrap.** O app é uma casca que abre `https://app.useaprumo.com.br` no Chrome, em tela cheia. Escolhi TWA e não Capacitor porque o Google bloqueia login OAuth em WebView embutida (`disallowed_useragent`), e o TWA usa o Chrome de verdade. Isso é minha crença, não está verificado: o primeiro passo técnico é um teste em aparelho real do login com Google dentro do TWA.
- **Package name:** `br.com.useaprumo.app`. Não dá para mudar depois de publicar.
- **Onde fica o projeto Android:** pasta `android/` na raiz do repo, sem keystore e sem segredos. O `.aab` é gerado na máquina do Lucas.
- **Breakpoint:** a dock inferior aparece abaixo de 768 px. De 768 a 1279 px continua a barra de topo com o menu deslizante de hoje; a partir de 1280 px, a dock lateral.
- **Destino "Mais":** botão no topo da tela, perto do avatar, que abre o menu atual com Projetos, Cartões, Categorias, Relatórios, Preferências, Alterar senha, Política e Sair.
- **Política de privacidade:** usar `https://app.useaprumo.com.br/privacidade`, que já é pública. O apex não é necessário para a Play.
- **Exclusão de conta é definitiva e imediata** (sem carência nem soft-delete). Quem tem senha confirma com a senha; quem entrou só com Google (a coluna `senha_hash` é opcional) confirma com um novo login Google ou com um link enviado por e-mail, à escolha de quem construir. Não há projeto, nota ou lançamento compartilhado entre usuários no sistema (tudo é isolado por usuário), então a exclusão não afeta ninguém além do dono.
- **Plano B se o login Google falhar no TWA:** primeiro tentar abrir o fluxo do Google numa Custom Tab; se não der, voltar ao Lucas com as opções (login só por e-mail e senha no app, ou outro empacotamento). Não escolher sozinho.
- **assetlinks.json com dois fingerprints** (chave de upload e chave do Play App Signing) para não exigir um deploy extra do front depois do primeiro envio.
- **Tablet e dobrável:** o TWA nesses aparelhos mostra o layout de topo (768 a 1279 px). Aceitável; os prints da loja saem do layout de celular.
- **Telas de criação:** já existe rota própria só para lançamento (`/lancamentos/novo`). Para nota e tarefa o construtor confere como se cria hoje; se for modal ou estado da página, o "+" leva à página certa com o formulário aberto, sem reescrever o fluxo.
- **E-mail de contato público: `aprumo.assistente@gmail.com`** (decisão do Lucas, é o e-mail do Aprumo). Vai na ficha da loja, na página de exclusão de conta e na política de privacidade. O Gmail pessoal do Lucas não aparece. Um endereço no domínio (`contato@useaprumo.com.br`, por encaminhamento) fica como melhoria futura.
- **Testadores:** o Lucas pretende reunir pelo menos 5. Pelo que sei, a Play exigia 12 testadores ativos por 14 dias seguidos para contas pessoais novas, então 5 provavelmente não bastam (confirmar o número no painel). Meta: recrutar uns 15 a 20, porque alguns saem no meio do período.
- **Dock é só moldura:** o menu e as páginas atuais não mudam de conteúdo. O "+" abre uma folha com três ações que levam às telas de criação que já existem.

## O que precisa ser feito

### 1. Front-end mobile (frontend-developer)

- Dock inferior flutuante com 4 destinos, só a aba ativa mostra o rótulo, alvos de 44 px, `nav` com `aria-label`, `env(safe-area-inset-bottom)`, e sem cobrir conteúdo (folga embaixo nas páginas).
- Botão "+" com folha de ações rápidas, acessível por teclado, que fecha com Esc e navega para as telas de criação existentes.
- Botão "Mais" no topo, no celular, que abre o menu atual.
- Ajustar o `AppShell` para escolher entre dock inferior (< 768 px), barra de topo (768 a 1279 px) e dock lateral (≥ 1280 px). Atenção: `useEhDesktop` hoje só distingue ≥ 1280 px.
- Atualizar `manifest.webmanifest`: a descrição fala "em breve tarefas e agenda", está desatualizada; o ícone `maskable` reaproveita o PNG normal, sem margem de segurança. Gerar ícone maskable de verdade (o "A" dentro dos 80% centrais), e adicionar `id`, `categories` e atalhos (`shortcuts` para nova nota e nova conta).

### 2. Exclusão de conta (java-spring e frontend-developer)

A Play exige, para apps com criação de conta, uma opção de excluir a conta e os dados dentro do app e também um link web para isso. Procurei no código e **não existe exclusão de conta hoje**. Precisa de:

- Endpoint autenticado que apaga o usuário e todos os dados dele (tarefas, notas, lançamentos, cartões, categorias, projetos), em uma transação, com confirmação por senha ou por reautenticação.
- Tela de confirmação no app (em Preferências ou "Alterar senha") e uma URL pública explicando como excluir, referenciada na ficha da Play.
- Atualizar a política de privacidade (já fala de retenção?) para citar a exclusão.
- Teste de integração garantindo que nada do usuário sobra e que outro usuário não é afetado.

### 3. Empacotamento Android

- Spike primeiro: gerar o TWA com Bubblewrap, instalar num celular Android real e testar login com Google, cadastro com e-mail, cookie de sessão e F5. Se o login com Google falhar no TWA, parar e voltar ao Lucas antes de seguir.
- `frontend/public/.well-known/assetlinks.json` com o fingerprint SHA-256 da chave de assinatura que a Play gerar (Play App Signing). Servido com `Content-Type: application/json` e sem ser engolido pelo rewrite do SPA. Conferir em produção.
- Ícone adaptativo e splash com o roxo `#27187E`.
- Gerar o `.aab` assinado, enviar para teste interno.

### 4. Conta e ficha na Play Console (ações do Lucas, com roteiro meu)

- Criar a conta de desenvolvedor pessoa física: taxa única de US$ 25, verificação de identidade e de telefone. Eu **não confirmei** as regras atuais de contas pessoais novas, mas até onde sei é preciso um teste fechado com um mínimo de testadores por cerca de 14 dias antes de pedir produção. Conferir o número exato no painel ao criar.
- Ficha: nome Aprumo, descrição curta e longa em pt-BR, ícone 512, imagem de destaque 1024x500, pelo menos 2 prints de celular.
- Declarações: Segurança dos dados (coleta e-mail e dados financeiros, tudo criptografado em trânsito, usuário pode pedir exclusão), classificação indicativa, público-alvo adulto, sem anúncios, recursos financeiros (declarar que não é banco nem empréstimo).
- **Acesso ao app:** como o app exige login, a Play precisa de uma conta de teste. Criar uma conta de revisor com e-mail confirmado e dados de exemplo, e dar as credenciais no campo "Acesso ao app". Essa senha nunca vai para o repo.
- Prints: tirar do app em aparelho real ou emulador, com dados de exemplo, nunca com dados reais do Lucas.

## Riscos conhecidos

- Login com Google dentro do TWA (ver spike).
- Prazo do teste fechado, que pode dominar o cronograma.
- Rejeição por exclusão de conta ou por falta de credenciais de revisor.
- O Render Starter está sempre ligado, mas se a API cair o app inteiro fica sem função (não há offline).

## Ordem sugerida

1. Lucas cria a conta de desenvolvedor (o relógio do teste fechado só começa depois de ter um build).
2. Spike do TWA com login Google em aparelho real.
3. Exclusão de conta (backend e front).
4. Dock mobile e ajustes do manifest.
5. Build assinado, assetlinks, teste interno e depois teste fechado.
6. Ficha, declarações, prints e produção.

Cada item acima é uma branch e um PR próprios, com o plano de implementação escrito separadamente (`superpowers:writing-plans`) depois da aprovação deste documento.

## Fica com quem for construir

Detalhes visuais finos da dock e da folha de ações, nomes de componentes e testes, e a forma exata de reautenticar na exclusão de conta.
