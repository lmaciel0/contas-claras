-- Apagar um item (ou, em cascata, uma categoria ou um usuário) não pode levar os lançamentos junto
-- sem aviso: o banco passa a recusar. A API responde 409 e orienta a arquivar o item.
alter table lancamento drop constraint lancamento_item_id_fkey;
alter table lancamento add constraint lancamento_item_id_fkey
    foreign key (item_id) references item (id) on delete restrict;
