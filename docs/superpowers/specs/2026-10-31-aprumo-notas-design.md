# Aprumo, módulo 3: Notas

Data: 2026-10-31. Terceiro módulo do Aprumo (depois da base, PR #3, e das tarefas, PR #4).

## Intenção e porquê

O dono guarda hoje anotações soltas no Obsidian (por exemplo, a lista de remédios). Lá é "apenas anotação": nada se conecta ao resto da vida dele. O Aprumo existe para dar **visão de tudo num lugar só**. Então a nota aqui não é um caderno novo: é uma peça que convive com tarefas e finanças, e a nota que importa agora fica na tela inicial. A página própria deve ser rápida para anotar, achar e organizar.

## Objetivos

1. Criar uma nota em segundos e escrever com formatação simples (negrito, itálico, riscado, título, listas e caixinhas de marcar), por uma barra de ferramentas acima do texto.
2. Organizar por **categoria** (uma por nota, com nome e cor, criada pelo dono) e achar por busca e por filtro de categoria.
3. **Fixar uma única nota** para aparecer num card da tela inicial, com as caixinhas de marcar funcionando ali mesmo.
4. Dados por usuário, isolados como no resto do app.

## Não objetivos

Pastas aninhadas, mais de uma categoria por nota, marcações livres (tags), imagens, anexos, tabelas, links entre notas, links clicáveis, compartilhar nota, lixeira ou histórico de versões, edição simultânea em dois lugares, exportar ou importar do Obsidian, lembretes, ordenação manual.

## Anti-objetivos (seria falha mesmo funcionando)

- Perder texto digitado: a nota salva sozinha enquanto o dono escreve; fechar a aba logo depois não pode perder o que já apareceu na tela.
- O card da home atrasar ou bloquear a tela inicial. Saudação, resumo financeiro e tarefas continuam aparecendo sem esperar a nota.
- Poluir a home: nunca mais de uma nota fixada.
- Executar ou exibir HTML ou script vindo do conteúdo salvo (ver Segurança).
- Virar um Obsidian: sem recursos de gestão de conhecimento.

## Comportamento

### Modelo de uma nota
Título (1 a 200 caracteres, sem espaços nas pontas), conteúdo formatado (pode ficar vazio), categoria opcional, indicação de fixada, momento de criação e de última alteração.

### Modelo de uma categoria de nota
Nome (1 a 40 caracteres, único por usuário, ignorando maiúsculas) e cor, escolhida de uma paleta fixa de cerca de 8 cores que funcionem nos temas claro e escuro. *(Minha escolha: paleta fixa em vez de cor livre, para garantir contraste.)* O nome interno é `categoria_nota` (ou equivalente) para não colidir com as categorias financeiras que já existem.

### Formatação
Barra com: negrito, itálico, riscado, título, lista com marcadores, lista numerada e lista com caixinhas de marcar. Nada além disso. *(Escolha técnica minha: usar um editor pronto para React, Tiptap, em vez de montar um do zero. Se a biblioteca atual estiver incompatível com React 19, o construtor pode trocar por outra equivalente, mantendo os mesmos recursos.)*

### Salvamento
Automático, sem botão salvar, ligeiramente atrasado após cada pausa na digitação *(minha escolha: cerca de 1 segundo)*. A tela mostra discretamente o estado: "Salvando..." e "Salvo". Se o salvamento falhar, a tela avisa e mantém o texto para tentar de novo. Se a nota for alterada em dois lugares, vale a última gravação (sem aviso de conflito).

### Página Notas (`/notas`)
- Topo: campo de busca (filtra por título e texto) e botão "Nova nota".
- Faixa de categorias como filtro: "Todas", cada categoria com sua cor, "Sem categoria" e "+ Categoria". Renomear, trocar a cor e excluir categoria ficam disponíveis na própria faixa *(a critério do construtor onde exatamente)*.
- Notas em cards (grade), com título, prévia curta do texto, categoria e data da última alteração, e o alfinete para fixar. Mais recentes primeiro.
- Abrir uma nota mostra o editor com a barra de ferramentas, título editável, seletor de categoria, alfinete e excluir. *(Tela própria ou painel sobre a página: a critério do construtor.)*
- Excluir nota pede confirmação. Apagar categoria não apaga notas: elas ficam "Sem categoria", e a confirmação diz quantas notas serão afetadas.
- Lista vazia: mensagem curta convidando a criar a primeira nota. Busca sem resultado: mensagem própria.

### Fixar e o card da home
- Só uma nota fica fixada por usuário. Fixar outra tira a anterior (a troca acontece de uma vez, sem estado intermediário com duas nem com nenhuma por falha). Clicar no alfinete da nota fixada desfixa.
- Card "Nota fixada" na tela inicial, irmão do card "Hoje": título da nota com a cor da categoria, o conteúdo renderizado e link para abrir a nota. Conteúdo longo é cortado com rolagem interna ou "Ver nota completa" *(a critério do construtor)*.
- **As caixinhas de marcar funcionam no card**: clicar marca ou desmarca e grava. O resto do conteúdo é só leitura ali; para editar o texto, abre-se a nota.
- Sem nota fixada: o card mostra um convite curto para fixar uma nota, com link para `/notas`. *(Minha escolha: convite em vez de sumir.)*
- Erro de API: mensagem dentro do card, sem derrubar a tela.

### Menu e paleta
Item "Notas" entra em `layout/itensMenu.ts` (aparece no menu lateral e na paleta Ctrl K automaticamente). Rota `/notas` dentro da moldura do usuário, protegida. Atualizar o comentário que cita "Notas, projetos e calendário" no mesmo arquivo.

## Segurança

O conteúdo é texto formatado vindo do navegador, ou seja, entrada externa. Regras:
- O backend **valida o conteúdo contra uma lista permitida** dos tipos de bloco e de marca que a barra de ferramentas produz (parágrafo, título, listas, item de lista, caixinha, negrito, itálico, riscado, texto). Qualquer outra coisa é recusada com 400. *(Minha escolha: guardar o conteúdo como JSON do próprio editor, validado por lista permitida, em vez de guardar HTML e sanitizar. Assim nenhuma biblioteca nova de sanitização entra no backend e nenhum HTML bruto precisa ser renderizado.)*
- O frontend nunca insere o conteúdo salvo com `dangerouslySetInnerHTML` nem equivalente; renderiza só pelo editor ou por componentes próprios.
- Limite de tamanho do conteúdo *(minha escolha: 100 mil caracteres)*, recusado com 400 acima disso, e limite de profundidade de aninhamento da estrutura.
- Id de nota ou de categoria alheio ou inexistente devolve 404. Associar uma nota a uma categoria de outro usuário também devolve 404.
- Título e nome de categoria rejeitam caracteres de controle e de direção de texto (RLO e semelhantes), e espaço não separável nas pontas conta como espaço. *(Aprendizado dos pontos baixos anotados no módulo de tarefas.)*

## Restrições e padrões a seguir

- Backend segue o padrão dos módulos existentes: pacote `nota/` em `dev.lmaciel.contasclaras` com controller, service, repository, entidade e DTOs como records; mensagens de erro em português como constantes; id alheio ou inexistente devolve 404; usuário via `UsuarioLogado`; hora via `Clock` injetado.
- Migration `V6__nota.sql`, sem prefixo de schema, com `usuario_id` referenciando `usuario` com `on delete cascade`, índice por usuário, `check` nos tamanhos, `categoria_id` da nota com `on delete set null`, e **índice único parcial** garantindo no máximo uma nota fixada por usuário. Hibernate em `validate`. Além do conteúdo estruturado, a nota guarda o texto simples extraído, para busca e prévia *(forma a critério do construtor)*.
- Frontend segue o padrão: `useQuery` e `useMutation` do TanStack Query, endpoints em `api/endpoints.ts`, tipos em `api/tipos.ts`, `invalidar.ts` por módulo, página em `paginas/notas/`, card como componente irmão de `FinancasDoMes` em `paginas/painel/`, com seu próprio `useQuery` e estados de carregamento e erro dentro do bloco.
- Estilo respeita os tokens de tema claro e escuro do módulo 1. As cores das categorias precisam ter contraste legível nos dois temas.
- Dependência nova só a do editor (Tiptap e suas extensões). Nenhuma outra sem justificar.

## Fica a cargo de quem for construir

Formato exato dos endpoints e do JSON, nomes de classes e colunas, texto das mensagens, a paleta exata de cores, onde ficam as ações de categoria, tela própria ou painel para editar, detalhes visuais dentro dos tokens existentes, estratégia de invalidação de cache, forma de extrair o texto simples.

Pontos menores que decidi (marcados como minha escolha): "Nova nota" cria a nota na hora com o título "Sem título" e já abre o editor; a caixinha marcada no card da home grava por uma chamada própria, com o mesmo atraso curto do salvamento automático; ao fechar ou sair da página com gravação pendente, o editor grava o que faltar antes de sair (melhor esforço); a busca roda no servidor, sobre título e texto simples.

## Testes esperados

Backend: integração com Testcontainers cobrindo criar, listar com filtro de categoria e busca, editar, fixar (troca da fixada anterior e desfixar), excluir, apagar categoria deixando as notas sem categoria, conteúdo recusado fora da lista permitida e acima do limite, validação de título e nome, e isolamento entre dois usuários (404 para nota ou categoria alheia, inclusive associar nota a categoria alheia). Frontend: teste da página (criar, filtrar, buscar, fixar) e do card (conteúdo, marcar caixinha, convite sem nota fixada, erro) com msw; teste do salvamento automático (estado salvando e salvo, falha preserva o texto).

## Fora deste módulo

Deploy segue o procedimento existente depois do merge. Módulos seguintes (projetos, calendário e contas a pagar) têm design próprio.

## Referências visuais

Mockup aprovado em conversa: página Notas (busca, faixa de categorias coloridas, cards com alfinete) e card de nota fixada na tela inicial ao lado do card "Hoje". Estrutura apenas; cores e tipografia vêm dos tokens do app. O mockup mostrava várias notas fixadas; o design final é uma só. Arquivo do rascunho: `.superpowers/brainstorm/` (git-ignored).
