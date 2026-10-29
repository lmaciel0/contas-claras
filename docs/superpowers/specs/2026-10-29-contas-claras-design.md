# Contas Claras — design

Data: 2026-10-29
Repositório: `lmaciel0/contas-claras` — **será público** (portfólio). Nenhum dado financeiro real entra no repositório.

## 1. Intenção

O dono do projeto controla as finanças numa planilha Excel, uma aba por ano. A planilha só é prática no computador: pelo celular não dá para ver nem lançar nada, e mesmo no computador é difícil enxergar as contas.

O app substitui a planilha. Ao abrir, ele precisa responder duas perguntas na hora:

1. **Quanto sobra no mês** (receitas − despesas).
2. **Onde estou gastando mais** (categorias ordenadas por valor).

Precisa funcionar bem no computador e no celular, tanto para ver quanto para lançar. Algumas pessoas convidadas poderão ter conta própria; cada usuário vê só os próprios dados.

O dono busca vaga de backend Java júnior: o repositório é peça de portfólio (código, testes, README).

## 2. Objetivos

- Ver, para qualquer mês: sobra, receitas, despesas, comparação com o mês anterior, ranking de categorias e próximas contas a pagar.
- Lançar uma despesa ou receita pelo celular em poucos toques: categoria → item → valor (→ pago/previsto).
- Marcar cada lançamento como **pago** (receita: **recebido**) ou **previsto**.
- Registrar o dia de vencimento de cada item de despesa.
- Repetir automaticamente valores fixos (ex.: um financiamento) nos meses seguintes.
- Cadastrar o limite de cada cartão de crédito e ver quanto da fatura do mês ocupa o limite.
- Ver o ano inteiro no formato da planilha (itens × meses).
- Começar a conta do dono com os dados de 2024–2027 importados da planilha (troca única).
- Login por e-mail/senha e por Google, **só para e-mails liberados**.
- No ar: front na Vercel, API no Render, banco no Neon.
- README de portfólio: o que é, prints com dados fictícios, stack, arquitetura, como rodar, como testar.

## 3. Não-objetivos (v1)

- Integração com bancos / Open Finance, leitura de extrato, OFX ou fatura.
- Lançar compras individuais do cartão ou controlar parcelas por compra. O cartão entra como **um valor de fatura por mês**, igual à planilha.
- Notificações de vencimento (push, e-mail, WhatsApp).
- Compartilhar dados entre usuários.
- Botão de importar planilha para qualquer usuário. A importação é única, para a conta do dono.
- Reimportar a planilha depois que o app estiver em uso.
- Recuperação de senha por e-mail. Quem esquecer usa o login Google. *Decisão minha.*
- Tela de administração. A lista de e-mails liberados é mantida por configuração (seção 9). *Decisão minha.*
- App nativo de loja. É web responsivo, com manifest PWA para adicionar à tela inicial do celular, sem modo offline.
- Tema escuro. *Decisão minha; pode entrar depois.*
- Outras moedas. Tudo em BRL.

## 4. Anti-objetivos (o que faria o app fracassar mesmo funcionando)

- Lançar pelo celular ser tão chato quanto a planilha.
- Os números importados não baterem com os da planilha.
- Um usuário conseguir ver ou alterar dados de outro.
- Dados financeiros reais do dono aparecerem no repositório público, inclusive no histórico do git.
- Primeira abertura parecer travada sem aviso (ver cold start do Render, seção 9).

## 5. Modelo de dados (conceitual)

Estrutura igual à planilha: **categoria → item → valor por mês**.

- **Usuário**: nome, e-mail (único), senha (hash BCrypt; vazio se só Google), identificador Google (se vinculado).
- **Categoria**: pertence a um usuário; nome; tipo `RECEITA` ou `DESPESA`; ordem de exibição. Receitas também são categorias: a planilha tem um bloco "RECEITAS" cujos itens são as fontes de renda.
- **Item**: pertence a uma categoria; nome; dia de vencimento (1–31, opcional, só despesas); marcador "é cartão de crédito" + limite do cartão (opcional); arquivado (sim/não). Item arquivado some das listas de lançamento mas mantém o histórico.
- **Lançamento**: pertence a um item; ano; mês; valor (decimal, 2 casas, nunca ponto flutuante); status `PREVISTO` ou `PAGO`; data de vencimento (preenchida com o dia padrão do item, editável; em meses curtos, dia 31 vira o último dia do mês). **No máximo um lançamento por item por mês** (como uma célula da planilha). Lançar de novo no mesmo item/mês edita o existente.

Isolamento: toda consulta e alteração é filtrada pelo usuário autenticado. Acessar id de outro usuário retorna 404.

Usuário novo começa com estas categorias vazias (sem itens), que pode renomear/apagar: Receitas, Doméstica, Transporte, Entretenimento, Saúde, Dívidas/Empréstimos, Cartões de crédito, Bancos, Obrigações financeiras, Pagamentos diversos, Pessoais. *Decisão minha.*

## 6. Regras de cálculo

- **Receitas do mês** = soma dos lançamentos das categorias `RECEITA` no mês (pago + previsto).
- **Despesas do mês** = soma dos lançamentos das categorias `DESPESA` no mês (pago + previsto).
- **Sobra do mês** = receitas − despesas. Pode ser negativa; negativo em vermelho.
- **Sobra do ano** = soma das sobras dos 12 meses.
- Totais contam pago e previsto juntos, como a planilha. A parte prevista aparece diferenciada: listrada no gráfico, etiqueta "previsto" nas listas. *Decisão minha.*
- **Comparação com mês anterior**: variação percentual de receitas e despesas e diferença em R$ da sobra. Sem mês anterior com dados, a comparação não aparece.
- **Uso do cartão** = valor do lançamento do mês no item-cartão ÷ limite do cartão. Faixas: verde até 50%, amarelo até 80%, vermelho acima. A tela avisa que o limite do banco também desconta parcelas futuras, que o app não conhece.
- **Repetição de valor fixo**: ao lançar, opção "repetir até [mês/ano]". Cria lançamentos `PREVISTO` com o mesmo valor nos meses seguintes até o mês escolhido, sem sobrescrever meses que já têm lançamento. *A mecânica é decisão minha; o dono pediu que valores fixos se repitam sozinhos.*
- **Próximas contas**: despesas `PREVISTO` com vencimento de hoje em diante, ordenadas por vencimento. Também aparecem, destacadas como **atrasadas**, as `PREVISTO` com vencimento já passado. *Decisão minha.*

## 7. Telas

Referência visual: mockups aprovados no brainstorming, guardados só na máquina do dono, em `.local/mockups/` (ignorado pelo git, porque contém números reais): `dashboard-indigo.html` (Início) e `cartoes-lancar.html` (Cartões + lançamento no celular). O estilo vem de um print de dashboard de referência: cards brancos com cantos bem arredondados, abas em pílula no topo e números grandes.

**Paleta** (escolhida pelo dono): fundo Ghost White `#F7F7FF`; cor principal Persian Indigo `#27187E` (abas ativas, botões, card de destaque, barras de receita); índigo claro `#A49DDB` (barras de despesa); verde `#2E9E5B` para pago/positivo; vermelho `#D64545` para negativo/atrasado. **Sem laranja**, porque o dono não gosta de laranja em destaque.

Navegação:
- **Computador**: abas no topo (Início · Lançamentos · Cartões · Categorias · Relatórios), seletor de mês "‹ Outubro 2026 ›", botão "+ Lançar" e menu do usuário (sair).
- **Celular**: **navbar fixa embaixo** com Início · Lançamentos · (+) · Cartões · Relatórios; o "+" central fica em destaque. Categorias e sair ficam no menu do perfil.

Telas:
1. **Login**: e-mail + senha, ou "Entrar com Google". Link "Criar conta" (só aceita e-mail liberado).
2. **Início** (mês selecionado; padrão = mês atual):
   - Card de destaque com a sobra do mês, a diferença para o mês anterior e a sobra do ano.
   - Cards de receitas e despesas com variação vs mês anterior.
   - Gráfico de barras do ano com receitas × despesas por mês; parte prevista listrada.
   - "Onde você mais gastou": categorias de despesa ordenadas por valor, com barra, R$ e %.
   - "Próximas contas" (regra na seção 6).
3. **Lançamentos**: lista do mês agrupada por categoria (item, valor, vencimento, status). Tocar abre a edição. Tem atalho para alternar previsto ↔ pago e opção de excluir.
4. **Novo/editar lançamento** (tela cheia no celular, modal no computador), na ordem: Despesa | Receita → categoria → item (com "+ novo item" ali mesmo) → mês → valor → vencimento (pré-preenchido pelo item) → Previsto | Pago → "repetir até" → Salvar.
5. **Cartões**: resumo (soma das faturas do mês, limite total, uso geral) e um card por cartão com fatura, limite, % e dia de vencimento.
6. **Categorias**:
   - Criar, renomear, reordenar e apagar categorias. Só apaga categoria sem lançamentos; se houver, o caminho é arquivar os itens.
   - Criar, editar e arquivar itens (nome, dia de vencimento, é cartão + limite).
7. **Relatórios**: visão anual tipo planilha, com seletor de ano.
   - Itens agrupados por categoria × 12 meses, com total por linha, por categoria e por mês.
   - Linhas finais "Despesas totais" e "Diferença de caixa".
   - Células pagas em verde.
   - *O conteúdo desta tela é decisão minha.*

Formatação: pt-BR (`R$ 1.234,56`, meses em português), fuso `America/Sao_Paulo`.

## 8. Importação da planilha (troca única, conta do dono)

A planilha real fica fora do repositório, e a ferramenta recebe o caminho do `.xlsx` como argumento. Fatos específicos da planilha real e os totais esperados estão em `.local/conferencia-importacao.md`, só na máquina do dono.

Estrutura das abas de ano (verificada na planilha real):
- Só são lidas abas cujo nome é um ano (4 dígitos). As demais são ignoradas. Aba de ano vazia não gera nada.
- Coluna B = nome; colunas C..N = JAN..DEZ; coluna O = total do ano (ignorar).
- Um bloco começa numa linha cuja coluna C = `JAN`, e a coluna B dessa linha é o nome da categoria. O bloco `RECEITAS` vira categoria de receita; os demais, de despesa.
- As linhas seguintes são itens, até a linha com B = `TOTAL` (que é ignorada).
- O bloco `TOTAIS` encerra a leitura da aba. Tudo abaixo dele (anotações soltas) é ignorado.
- Usar o valor calculado da célula, não a fórmula. Célula vazia ou zero não vira lançamento.

Regras:
- **Status**: texto da célula na cor verde do tema (accent6, `#70AD47`) vira `PAGO`. Qualquer outra cor (preto, vermelho…) vira `PREVISTO`.
- **Dia de vencimento**: nome terminando em `(NN)` numérico, como `CARTÃO X (05)`, grava NN como dia no item e tira o sufixo do nome. Parênteses não numéricos ficam no nome, como `LICENCIAMENTO (JUNHO)`.
- **Mesma categoria entre anos**: casar por nome normalizado (maiúsculas, sem acento, espaços colapsados). Existe um alias: `DIVIDAS` = `DIVIDAS/EMPRESTIMOS`.
- **Mesmo item entre anos**: casar por nome normalizado dentro da categoria, depois de remover o `(NN)`.
- **Nome repetido no mesmo bloco e no mesmo ano**: vira itens distintos, com sufixo ` 2`, ` 3`. *Decisão minha.*
- Nomes mantidos como estão na planilha, maiúsculas incluídas.
- **Cartões**: itens de categorias cujo nome normalizado começa com `CARTOES DE CREDITO` entram marcados como cartão, sem limite. O dono preenche os limites depois. *Decisão minha.*
- **Troca única**: a importação só roda numa conta sem nenhum lançamento; se houver algum, recusa com mensagem clara. Antes de importar, apaga as categorias padrão vazias da conta para não duplicar. *Decisão minha.*

Testes:
- Testes automatizados usam uma planilha **fictícia**, gerada por código de teste (Apache POI) com a mesma estrutura: blocos, `(NN)`, verde/preto/vermelho, nomes repetidos, alias de categoria, anotação abaixo de TOTAIS e aba não-ano.
- **Critério de aceite com a planilha real** (passo manual, na máquina do dono): as somas importadas por ano batem com as linhas TOTAL de cada aba, com diferença ≤ R$ 0,05. Arredondar célula a célula para centavos já gera até R$ 0,03 de diferença num ano. Os valores esperados estão em `.local/conferencia-importacao.md`.

## 9. Arquitetura e stack (decidido)

- **Backend**: Java 21 e Spring Boot (versão estável atual), com Spring Web, Spring Security, Spring Data JPA, Bean Validation, Flyway e PostgreSQL. Build Maven com wrapper no repo. Testes com JUnit 5 + Mockito; integração com Testcontainers (Docker disponível na máquina).
- **Frontend**: React + TypeScript (Vite), responsivo e mobile-first.
- **Banco**: Neon Postgres (plano grátis).
- **Hospedagem**: front na **Vercel**; API no **Render** (plano grátis, via Docker).
  - O dono aceitou o cold start do Render grátis: depois de ~15 min parada, a primeira abertura leva ~30–60 s.
  - Durante esse tempo, o front mostra o aviso "acordando o servidor…".
  - Trocar por Railway (~US$5/mês) é opção futura.
- **Monorepo**: `backend/` e `frontend/` no mesmo repositório.
- **Cadastro restrito**: variável de ambiente `ALLOWED_EMAILS` (lista separada por vírgula) na API. Cadastro por senha e primeiro login Google só funcionam para e-mail da lista; fora dela, a resposta é uma mensagem genérica. *Decisão minha.*
- **Autenticação**:
  - A API emite a própria sessão/token depois do login por senha ou Google. O Google é validado pelo ID token no backend, exigindo `email_verified`.
  - Sessão em cookie `HttpOnly` + `Secure`; nada de token em `localStorage`.
  - Para o cookie ser de primeira parte, o front chama a API pelo próprio domínio da Vercel (rewrite `/api/*` → Render). *Decisão minha.*
- **Google + conta com senha do mesmo e-mail**: o login Google vincula as contas e **apaga a senha existente**. Como o app não confirma e-mail, isso impede que alguém que cadastrou o e-mail antes mantenha acesso. Depois, o usuário pode definir nova senha logado. *Decisão minha.*
- **Segredos** (URL do banco, segredo de assinatura, client ID do Google, `ALLOWED_EMAILS`) ficam só em variáveis de ambiente da Vercel/Render, nunca no repositório. O repo tem `.env.example` sem valores reais.
- **Repositório público**:
  - `.local/`, `*.xlsx` (fora de `src/test/resources`) e `.superpowers/` ficam no `.gitignore`.
  - Prints do README usam conta com dados fictícios.
  - Antes de mudar a visibilidade para público, conferir o histórico do git em busca de dados pessoais.

**Ações que dependem do dono** (contas/credenciais): criar o projeto no Neon, o serviço no Render e o OAuth Client no Google Cloud Console; vincular o repo na Vercel; definir `ALLOWED_EMAILS`. O builder prepara tudo e indica o passo exato.

## 10. Deixado para o builder

- Esquema físico (tabelas, índices, constraints) e endpoints REST, respeitando o modelo e as regras acima.
- Biblioteca de UI/CSS e de gráficos.
- Formato do token/sessão e duração, dentro das restrições da seção 9.
- Empacotamento da ferramenta de importação (comando do próprio backend, profile Spring etc.), desde que leia o `.xlsx` localmente e grave no banco da conta indicada.
- Ícones e microcopy.
