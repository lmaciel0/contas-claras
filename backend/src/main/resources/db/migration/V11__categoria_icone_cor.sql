-- Adiciona suporte a ícone e cor na tabela categoria
ALTER TABLE categoria
    ADD COLUMN icone VARCHAR(50) NOT NULL DEFAULT 'outros',
    ADD COLUMN cor VARCHAR(30) NOT NULL DEFAULT '#7d7a99';

-- Atualiza categorias padrão com ícones e cores elegantes
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
