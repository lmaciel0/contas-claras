-- Altera a unicidade de categoria para permitir mesmo nome em tipos diferentes (RECEITA e DESPESA)
ALTER TABLE categoria DROP CONSTRAINT IF EXISTS categoria_usuario_id_nome_key;
ALTER TABLE categoria ADD CONSTRAINT uq_categoria_usuario_tipo_nome UNIQUE (usuario_id, tipo, nome);
