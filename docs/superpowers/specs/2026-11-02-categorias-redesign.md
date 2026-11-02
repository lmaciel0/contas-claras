# Aprumo: Redesign do Módulo de Categorias e Subcategorias

- **Data**: 2026-11-02
- **Status**: Em revisão
- **Autor**: Antigravity + Usuário
- **Objetivo**: Modernizar o Módulo de Categorias do Aprumo migrando do modelo visual em cards para uma **Tabela Hierárquica (Tree Table)** moderna, fiel às telas de referência, com suporte a **Ícone** e **Cor** por categoria, alternador de visão (*Despesas* vs *Receitas*), ações em linha (Relatórios, Edição, Arquivamento, Adição de Subcategoria), modal de cadastro em lote com paleta e catálogo de ícones, e navegação acessível.

---

## 1. Contexto e Motivação

O Aprumo gerenciava categorias e seus itens em um layout de cards distribuídos em grid, separando receitas e despesas verticalmente na mesma página sem recursos visuais como cores personalizadas ou ícones temáticos para cada categoria.

As referências fornecidas apresentam uma experiência mais madura e eficiente para gestão financeira:
1. **Identidade Visual Clara**: Cada categoria possui um ícone representativo (livro, transporte, alimentação, saúde, mercado, etc.) e uma cor característica (bolinha colorida).
2. **Hierarquia em Árvore na Tabela**: Visualização em tabela única com colunas `Nome`, `Ícone`, `Cor` e `Ações`. Subcategorias aparecem aninhadas logo abaixo da categoria pai com recuo e o conector `↳`.
3. **Visão Focada por Tipo**: Alternador em pílula no topo (`Categoria de Despesas ▾` / `Categorias de Receitas ▾`), eliminando a poluição visual de misturar receitas e despesas na mesma lista.
4. **Ações em Linha com Atalho para Relatórios**: Cada linha oferece atalho direto para visualizar relatórios daquela categoria/subcategoria, edição rápida, arquivamento instantâneo e botão `+` para adicionar subcategoria.
5. **Cadastro Ágil**: Modal com seleção rápida de cores e ícones, e a funcionalidade **"SALVAR E CRIAR NOVA"** para cadastros múltiplos sem fechar o diálogo.

---

## 2. Metas e Não-Metas

### Metas (In-Scope)
- **Persistência de Ícone e Cor (Backend)**:
  - Migration Flyway `V11__categoria_icone_cor.sql` adicionando colunas `icone` (VARCHAR 50) e `cor` (VARCHAR 30) na tabela `categoria`.
  - Atualização da entidade JPA `Categoria`, DTOs `CategoriaRequest` e `CategoriaResponse`, e serviços de validação e persistência.
  - Atualização dos padrões iniciais (`CategoriasPadrao.java`) para que novos usuários já comecem com categorias ricas em ícones e cores harmônicas.
- **Frontend React 19 + TypeScript**:
  - Nova rota/página `/categorias` baseada em Tabela Hierárquica (`Tree Table`).
  - Dropdown em pílula no topo: `Categoria de Despesas ▾` (estilo vermelho) e `Categorias de Receitas ▾` (estilo verde).
  - Barra superior de ferramentas: botão `+` (nova categoria pai), campo de busca/filtro em tempo real, alternador de expansão total/recolhimento e menu de opções.
  - Tabela com colunas:
    - `Nome`: Categoria com texto em destaque; subcategorias com recuo `↳` e tipografia secundária.
    - `Ícone`: Exibido na linha da categoria pai.
    - `Cor`: Indicador circular colorido. As subcategorias herdam visualmente a cor da categoria pai.
    - `Ações`:
      - 📄 **Relatórios** (com tooltip "Relatórios" levando para `/relatorios` filtrado).
      - ✏️ **Editar** (abre modal para editar categoria ou subcategoria).
      - 📥 **Arquivar** (alterna o estado arquivado de itens/subcategorias).
      - ➕ **Adicionar Subcategoria** (botão circular colorido `+`, vermelho em despesas e verde em receitas, exclusivo da categoria pai).
  - Paginação na base da tabela: seletor de linhas por página e navegação de páginas.
  - Modal `EditorCategoria` renovado:
    - Campo `Nome`.
    - Seletor de cores: bolinhas de cores frequentes com checkmark ativo + botão "OUTROS" para cor livre/hexadecimal.
    - Seletor de ícones: grade com ícones rápidos + botão "OUTROS" abrindo catálogo categorizado (Lucide Icons).
    - Botões: "SALVAR E CRIAR NOVA" e "SALVAR".
  - Modal `EditorItem` integrado com as subcategorias (nome, vencimento, cartão de crédito com limite, arquivar).
- **Acessibilidade e Usabilidade**:
  - WAI-ARIA em tabelas e modais, foco gerenciado, contraste em conformidade com WCAG AA.
  - Suporte completo aos modos Claro e Escuro (Obsidian) do Aprumo.

### Não-Metas (Out-of-Scope)
- Alterar o esquema relacional de Lançamentos ou Planejamentos (os lançamentos continuam vinculados a `Item` e `Categoria` existentes, garantindo retrocompatibilidade total).
- Múltiplos níveis de aninhamento além de Categoria -> Subcategoria (a referência possui exatamente 2 níveis: Categoria Pai e Subcategoria Filha).

---

## 3. Modelo de Dados e Banco de Dados (PostgreSQL)

### Migration: `backend/src/main/resources/db/migration/V11__categoria_icone_cor.sql`

```sql
-- Adiciona suporte a ícone e cor na tabela categoria
ALTER TABLE categoria
    ADD COLUMN icone VARCHAR(50) NOT NULL DEFAULT 'outros',
    ADD COLUMN cor VARCHAR(30) NOT NULL DEFAULT '#7d7a99';

-- Atualiza categorias padrão existentes com valores padrão elegantes
UPDATE categoria SET icone = 'livro', cor = '#7c3aed' WHERE LOWER(nome) LIKE '%educa%';
UPDATE categoria SET icone = 'computador', cor = '#f59e0b' WHERE LOWER(nome) LIKE '%eletr%';
UPDATE categoria SET icone = 'praia', cor = '#f97316' WHERE LOWER(nome) LIKE '%lazer%';
UPDATE categoria SET icone = 'restaurante', cor = '#ef4444' WHERE LOWER(nome) LIKE '%restaurante%' OR LOWER(nome) LIKE '%alimenta%';
UPDATE categoria SET icone = 'saude', cor = '#84cc16' WHERE LOWER(nome) LIKE '%saude%' OR LOWER(nome) LIKE '%médic%';
UPDATE categoria SET icone = 'servicos', cor = '#15803d' WHERE LOWER(nome) LIKE '%serviço%';
UPDATE categoria SET icone = 'supermercado', cor = '#f43f5e' WHERE LOWER(nome) LIKE '%mercado%';
UPDATE categoria SET icone = 'transporte', cor = '#3b82f6' WHERE LOWER(nome) LIKE '%transporte%';
UPDATE categoria SET icone = 'casa', cor = '#06b6d4' WHERE LOWER(nome) LIKE '%casa%' OR LOWER(nome) LIKE '%moradia%';
UPDATE categoria SET icone = 'salario', cor = '#10b981' WHERE LOWER(nome) LIKE '%salario%' OR LOWER(nome) LIKE '%renda%';
UPDATE categoria SET icone = 'presente', cor = '#a855f7' WHERE LOWER(nome) LIKE '%presente%';
UPDATE categoria SET icone = 'estrela', cor = '#0ea5e9' WHERE LOWER(nome) LIKE '%extra%' OR LOWER(nome) LIKE '%ferias%';
```

---

## 4. Arquitetura de Backend (Spring Boot 3 + Java 21)

### 4.1 Entidade `Categoria`
- Novos atributos privados:
  ```java
  @Column(nullable = false, length = 50)
  private String icone;

  @Column(nullable = false, length = 30)
  private String cor;
  ```
- Atualização dos construtores e métodos de atualização:
  ```java
  public void atualizar(String nome, String icone, String cor) {
      this.nome = nome;
      if (icone != null && !icone.isBlank()) this.icone = icone.trim();
      if (cor != null && !cor.isBlank()) this.cor = cor.trim();
  }
  ```

### 4.2 DTOs
- `CategoriaRequest`:
  ```java
  public record CategoriaRequest(
      @NotBlank(message = "Informe o nome da categoria.")
      @Size(max = 80, message = "O nome deve ter no máximo 80 caracteres.")
      String nome,

      TipoCategoria tipo,

      @Size(max = 50, message = "O ícone deve ter no máximo 50 caracteres.")
      String icone,

      @Size(max = 30, message = "A cor deve ter no máximo 30 caracteres.")
      String cor
  ) {}
  ```
- `CategoriaResponse`:
  ```java
  public record CategoriaResponse(
      Long id,
      String nome,
      TipoCategoria tipo,
      int ordem,
      String icone,
      String cor,
      List<ItemResponse> itens
  ) {}
  ```

### 4.3 Endpoints REST
- `GET /api/categorias`: Retorna lista ordenada de categorias com `icone`, `cor` e seus respectivos itens (`ItemResponse`).
- `POST /api/categorias`: Cria categoria com `nome`, `tipo`, `icone` (default: `'outros'`) e `cor` (default: `'#7d7a99'`).
- `PUT /api/categorias/{id}`: Atualiza `nome`, `icone` e `cor`.
- `DELETE /api/categorias/{id}`: Exclusão segura (bloqueada se houver lançamentos vinculados).
- `POST /api/categorias/reordenar`: Preservada para reordenação de linhas.

---

## 5. Arquitetura de Frontend (React 19 + Tailwind CSS)

### 5.1 Componentes Modulares
Localização: `frontend/src/paginas/categorias/`
1. `CategoriasPage.tsx`: Container principal com gerenciamento de estado (tipo selecionado: `DESPESA` ou `RECEITA`, termo de busca, modal ativo, paginação).
2. `CabecalhoCategorias.tsx`: Barra superior com o seletor em pílula (`Categoria de Despesas ▾` / `Categorias de Receitas ▾`), botão `+`, busca e menu.
3. `TabelaCategorias.tsx`: Renderização da tabela semântica (`<table>`), cabeçalhos `Nome`, `Ícone`, `Cor`, `Ações`.
4. `LinhaCategoria.tsx`: Linha da categoria principal com ícone centralizado, indicador de cor, título em destaque e os 4 botões de ação.
5. `LinhaSubcategoria.tsx`: Linha aninhada com prefixo `↳`, indicador de cor herdada e ações (Relatórios, Editar, Arquivar).
6. `EditorCategoria.tsx`: Modal com formulário de nome, seletor de cor com paleta + "OUTROS", seletor de ícones com grade rápida + catálogo com busca, e botões "SALVAR E CRIAR NOVA" / "SALVAR".
7. `EditorItem.tsx`: Modal para gerenciar subcategoria (nome, vencimento, cartão de crédito com limite, arquivar).
8. `CatalogoIcones.ts` & `SeletorIcone.tsx`: Mapeamento de ícones Lucide amigáveis organizados por categorias e componente seletor.
9. `PaletaCores.ts` & `SeletorCor.tsx`: Cores pré-definidas correspondentes aos prints com indicador de seleção ativa.
10. `PaginacaoTabela.tsx`: Rodapé com seletor de itens por página (ex.: 10, 25, 50) e navegação.

---

## 6. Plano de Testes e Validação

- **Backend**:
  - Testes de unidade em `CategoriaTest` e `CategoriaServiceTest` cobrindo criação e atualização com ícone e cor.
  - Testes de integração em `CategoriaControllerTest` validando payloads JSON, defaults e respostas 200/201/400/404.
- **Frontend**:
  - Testes em `CategoriasPage.test.tsx` verificando renderização da tabela, alternância entre Despesas e Receitas pelo dropdown, e filtragem por busca.
  - Testes em `EditorCategoria.test.tsx` testando envio de cor e ícone, e comportamento do botão "SALVAR E CRIAR NOVA".
  - Testes de regressão nos fluxos de Lançamentos e Relatórios para garantir integridade.
