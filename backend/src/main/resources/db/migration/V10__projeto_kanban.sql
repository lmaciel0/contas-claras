-- Migration V7: Módulo de Projetos e Quadro Kanban
CREATE TABLE projeto (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50),
    estagio VARCHAR(20) NOT NULL DEFAULT 'A_FAZER',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    cor VARCHAR(20) NOT NULL DEFAULT 'azul',
    ordem INTEGER NOT NULL DEFAULT 0,
    prazo DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_projeto_estagio CHECK (estagio IN ('A_FAZER', 'EM_ANDAMENTO', 'EM_REVISAO', 'CONCLUIDO')),
    CONSTRAINT ck_projeto_prioridade CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')),
    CONSTRAINT ck_projeto_cor CHECK (cor IN ('azul', 'esmeralda', 'indigo', 'ambar', 'rosa', 'roxo'))
);

CREATE INDEX idx_projeto_usuario_estagio ON projeto(usuario_id, estagio, ordem);

CREATE TABLE projeto_subtarefa (
    id BIGSERIAL PRIMARY KEY,
    projeto_id BIGINT NOT NULL REFERENCES projeto(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    concluida BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtarefa_projeto ON projeto_subtarefa(projeto_id, ordem);
