CREATE TABLE metas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    valor_alvo NUMERIC(15, 2) NOT NULL,
    valor_guardado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    mes_alvo INT,
    ano_alvo INT,
    preset_visual VARCHAR(50) NOT NULL DEFAULT 'padrao',
    imagem_url VARCHAR(500),
    cor_gradiente VARCHAR(100),
    ordem INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metas_usuario ON metas(usuario_id);
