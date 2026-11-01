alter table nota
    add constraint chk_nota_conteudo_objeto check (jsonb_typeof(conteudo) = 'object'),
    add constraint chk_nota_texto_tamanho check (char_length(texto) <= 50000);
