create table tarefa (
    id           bigserial primary key,
    usuario_id   bigint not null references usuario (id) on delete cascade,
    titulo       varchar(200) not null check (char_length(titulo) between 1 and 200),
    data         date,
    concluida_em timestamptz,
    criado_em    timestamptz not null default now()
);

create index idx_tarefa_usuario on tarefa (usuario_id);
