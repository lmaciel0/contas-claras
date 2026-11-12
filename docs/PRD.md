# PRD do Aprumo

Documento de produto resumido. Fontes: `README.md`, specs em `docs/superpowers/specs/` e planos em `docs/superpowers/plans/`. Todo ponto sem fonte no repositório está marcado como "a validar pelo Lucas".

## Visão

Controle financeiro pessoal que substitui uma planilha anual de Excel. Ao abrir, o app responde duas perguntas: quanto sobra no mês e onde estou gastando mais. Funciona no computador e no celular (site, PWA e app Android por TWA), com lançamento rápido.

O produto começou como controle financeiro (`contas-claras`), virou um assistente pessoal com tarefas e notas e, em 2026-11-09, voltou ao foco em finanças pessoais com notas (plano `2026-11-09-foco-financas.md`).

## Problema

Quem acompanha as contas numa planilha anual perde tempo lançando valores no celular, não vê de relance quanto sobra e não acompanha vencimentos, limites de cartão e compromissos futuros num só lugar. Fonte: `README.md` e `docs/superpowers/specs/2026-10-29-contas-claras-design.md`.

## Público

- Quem controla finanças pessoais com planilha mensal ou anual e quer a mesma visão no celular. Fonte: `README.md`.
- Perfil detalhado, faixa de renda e tamanho esperado do público: a validar pelo Lucas.

## Módulos atuais

| Módulo | O que faz |
|---|---|
| Início (painel) | Sobra do mês e do ano, comparação com o mês anterior, gráfico do ano com parte prevista listrada, categorias onde mais gastou, próximas contas e atrasadas |
| Lançamentos | Planilha do mês: categoria, item e valor, status previsto ou pago, vencimento e "repetir até" para valores fixos |
| Cartões | Fatura do mês contra o limite de cada cartão, com faixas verde, amarelo e vermelho; pagar a fatura libera o limite |
| Categorias | Criar, renomear, reordenar, arquivar itens, marcar item como cartão e definir limite |
| Relatórios | Ano inteiro em itens por meses, totais e diferença de caixa |
| Metas | "Caixinhas do Futuro": objetivo, valor alvo, valor guardado e prazo, com ritmo mensal sugerido |
| Notas | Editor de notas, com uma nota fixada por usuário |
| Conta | Login por e-mail e senha ou Google, cadastro aberto com e-mail confirmado, exportação de dados e exclusão de conta |
| Importação | Leitura única da planilha anual (`.xlsx`) para a conta do dono |

Tarefas e projetos existem no backend, mas saíram da interface.

## Fora de escopo (hoje)

- Integração com bancos, Open Finance, leitura de extrato, OFX ou fatura (fonte: `docs/superpowers/specs/2026-10-29-contas-claras-design.md`).
- App nativo: o app Android é uma TWA, sem código nativo (`android/README.md`).
- Modo offline e notificações push (fonte: `docs/superpowers/specs/2026-11-05-app-play-store-design.md`). Se consulta offline entrar no roteiro: a validar pelo Lucas.

## Métricas de sucesso

Nenhuma métrica está definida em documento do repositório. A validar pelo Lucas: número de usuários ativos, retenção semanal, lançamentos por usuário por mês e nota da loja.

## Distribuição

Site em `app.useaprumo.com.br` (cadastro aberto). App na Google Play em preparação, conforme `docs/play-store/`: estado atual a validar pelo Lucas.
