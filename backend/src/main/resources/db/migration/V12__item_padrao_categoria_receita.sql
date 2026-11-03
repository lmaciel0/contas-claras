-- Garante que toda categoria do tipo RECEITA possua pelo menos um item padrão correspondente ao seu nome.
INSERT INTO item (categoria_id, nome, dia_vencimento, cartao, limite, arquivado)
SELECT c.id, c.nome, NULL, false, NULL, false
FROM categoria c
LEFT JOIN item i ON i.categoria_id = c.id
WHERE c.tipo = 'RECEITA' AND i.id IS NULL;
