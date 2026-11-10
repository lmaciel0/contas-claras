# Especificação: Metas com Propósito ("Caixinhas do Futuro")

- **Data:** 2026-11-09
- **Status:** Proposta para Aprovação
- **Autor:** Antigravity & Lucas Maciel

---

## 1. Visão Geral e Contexto

### O Problema
Quem busca organizar suas finanças com visão anual costuma guardar dinheiro para compromissos e sonhos específicos (IPVA/IPTU, viagem, manutenção do carro, reserva de emergência), mas não consegue acompanhar visualmente se o valor guardado está no ritmo ideal em relação à sobra prevista do mês.

### A Solução
O módulo de **Metas com Propósito ("Caixinhas do Futuro")** permite que o usuário crie caixinhas visuais com objetivo, valor alvo, valor guardado atual e prazo (ou meta contínua). O sistema calcula o ritmo ideal mensal e traz um **Conselheiro Inteligente** integrado à sobra prevista, sugerindo quanto destinar da sobra do mês para cada meta.

### Princípios do Design
- **Fricção Zero / Caminho 1:** Alimentação ágil e intuitiva. O usuário atualiza o saldo da caixinha com botões rápidos (`+ Guardar` e `- Resgatar`) ou edição direta, sem obrigação de vincular lançamentos bancários complexos.
- **Identidade Visual Rica:** Cards inspirados no design dos cartões de crédito do Aprumo (`CardCartao`), com fotos/ilustrações pré-selecionadas de alta qualidade (presets temáticos: Carro/IPVA, Casa, Viagem, Reserva de Emergência, Estudos, etc.) e suporte a imagem personalizada/cor de fundo.
- **Presença Estratégica na Interface:**
  1. Aba dedicada `/metas` no menu principal (Sidebar no desktop e menu "Mais" no mobile).
  2. Card inteligente integrado na Visão Geral (`/financeiro`) cruzando a sobra prevista com as metas.
  3. Widget compacto e elegante na tela inicial (`PainelPage`), destacando o progresso da meta prioritária/próxima.

---

## 2. Modelo de Dados e Backend (Spring Boot + Flyway)

### Tabela `metas` (PostgreSQL)
```sql
CREATE TABLE metas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    valor_alvo NUMERIC(15, 2) NOT NULL,
    valor_guardado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    mes_alvo INT, -- 1 a 12 (opcional se contínua)
    ano_alvo INT, -- ex: 2027 (opcional se contínua)
    preset_visual VARCHAR(50) NOT NULL DEFAULT 'padrao', -- ex: 'reserva', 'carro', 'viagem', 'casa', 'estudos', 'personalizado'
    imagem_url VARCHAR(500), -- URL customizada opcional
    cor_gradiente VARCHAR(100), -- estilo/gradiente customizado
    ordem INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metas_usuario ON metas(usuario_id);
```

### Regras de Negócio do Backend
1. **Isolamento por Usuário:** Toda operação (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) valida `usuario_id = usuarioAutenticado.getId()`. Acesso a meta alheia devolve `404 Not Found`.
2. **Validações:**
   - `nome`: obrigatório, 1 a 100 caracteres.
   - `valor_alvo`: obrigatório, positivo (> 0).
   - `valor_guardado`: >= 0. Não pode ficar negativo em operações de resgate.
   - `mes_alvo` e `ano_alvo`: se preenchidos, devem ser uma data no presente ou futuro. Se nulos, representam meta contínua (ex: Reserva de Emergência).
3. **Cálculos DTO (`MetaResponse`):**
   - `percentualConcluido`: fração de 0 a 1 (`valor_guardado / valor_alvo`).
   - `valorRestante`: `max(0, valor_alvo - valor_guardado)`.
   - `mesesRestantes`: quantidade de meses entre o mês atual e o prazo.
   - `valorMensalSugerido`: se houver prazo e faltar valor: `valorRestante / max(1, mesesRestantes)`. Se for contínua, zero ou valor livre.

### Endpoints REST
- `GET /api/metas` - Lista metas do usuário, ordenadas por prazo mais próximo e ordem.
- `POST /api/metas` - Cria uma nova meta.
- `PUT /api/metas/{id}` - Atualiza dados cadastrais da meta (nome, valor_alvo, prazo, preset/imagem).
- `PATCH /api/metas/{id}/guardar` - Adiciona valor ao montante guardado (`{ "valor": "300.00" }`).
- `PATCH /api/metas/{id}/resgatar` - Subtrai valor do montante guardado (`{ "valor": "100.00" }`).
- `DELETE /api/metas/{id}` - Exclui a meta.
- `GET /api/metas/resumo-conselheiro?ano=X&mes=Y` - Devolve a sugestão consolidada cruzando com a sobra do mês daquele período.

---

## 3. Frontend Architecture (React 19, TypeScript, Tailwind)

### Estrutura de Pastas e Componentes
```
frontend/src/paginas/metas/
├── MetasPage.tsx               # Página dedicada /metas com grid de caixinhas
├── MetasPage.test.tsx
├── CardMeta.tsx                # Card visual no estilo cartão com preset/imagem, barra e ações
├── CardMeta.test.tsx
├── ModalMetaForm.tsx           # Criação e edição da meta (nome, alvo, prazo, preset)
├── ModalAporteMeta.tsx         # Modal ágil para "+ Guardar" ou "- Resgatar"
├── CardConselheiroMetas.tsx    # Card inteligente integrado na Visão Geral (/financeiro)
├── WidgetMetaInicio.tsx        # Widget compacto opcional para o PainelPage (tela inicial)
├── presetsVisuais.ts           # Galeria de presets (imagens/gradientes temáticos)
├── metasApi.ts                 # Chamadas aos endpoints de metas
└── tipos.ts                    # Interfaces TypeScript (MetaResponse, MetaRequest, etc.)
```

### Presets Visuais ("Estilo Cartão")
Presets pré-definidos com gradientes modernos e ilustrações/fotos elegantes:
- **Reserva de Emergência:** Gradiente esmeralda/verde riqueza com ícone de escudo ou cofre.
- **Carro / IPVA:** Gradiente azul petróleo/noite com ilustração temática de automóvel.
- **Viagem / Férias:** Gradiente pôr-do-sol (laranja/rosa/dourado) com tema de praia/avião.
- **Casa / Reforma:** Gradiente terracota/âmbar com tema de lar.
- **Estudos / Carreira:** Gradiente violeta/índigo com tema acadêmico.
- **Personalizado:** O usuário pode definir uma cor sólida/gradiente ou informar uma URL de imagem de fundo.

### Conselheiro Inteligente da Sobra (`CardConselheiroMetas`)
- Exibido em `/financeiro` (Visão Geral):
  - Lê a `sobra` calculada do mês atual via `endpoints.resumo(ano, mes)`.
  - Se `sobra > 0`: sugere a distribuição automática proporcional ao ritmo ideal de cada meta ativa.
    - Exemplo: *"Sua sobra prevista em novembro é de R$ 600,00. Sugestão: destinar R$ 300,00 para IPVA 2027 (faltam 8 meses) e R$ 150,00 para Reserva."*
  - Se `sobra <= 0`: avisa com gentileza que não há sobra prevista para aportes no mês, sugerindo foco em manter as contas em dia.
  - Botão de atalho rápido: *"Abrir Caixinhas"*.

### Widget no Painel (`WidgetMetaInicio`)
- Localizado no `PainelPage`:
  - Compacto, discreto e integrado harmonicamente entre a reflexão e as finanças do mês.
  - Exibe a meta mais próxima do prazo com barra de preenchimento e percentual atingido, além de atalho direto para a aba de metas.

---

## 4. Navegação e Menus
- **Sidebar (Desktop):** Adicionar item `Metas` no grupo Financeiro (após "Visão geral" ou "Orçamento").
- **Menu Mais (Mobile):** Adicionar `/metas` na lista de rotas em `ORDEM_MAIS`.
- **Dock Lateral & Paleta de Navegação:** Registrar a rota `/metas` com ícone temático (`Target` ou `PiggyBank`).

---

## 5. Plano de Testes e Aceitação
- **Backend (Spring Boot + JUnit):**
  - CRUD completo de metas com prova de isolamento entre usuários (usuário B não pode ver nem editar meta de usuário A).
  - Validação de saldo (não permitir resgate maior que o saldo guardado).
  - Cálculo correto de parcelas sugeridas e meses restantes.
- **Frontend (Vitest + React Testing Library + MSW):**
  - Renderização da lista de caixinhas e cálculo visual da barra de progresso.
  - Aporte rápido (`+ Guardar`) atualizando o saldo na hora via mutação TanStack Query.
  - Resgate rápido (`- Resgatar`) validando valores limites.
  - Renderização do Conselheiro Inteligente na Visão Geral sugerindo os valores de acordo com a sobra.
  - Navegação via Sidebar, Menu Mais e Paleta de Navegação.

