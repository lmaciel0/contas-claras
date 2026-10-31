create table categoria_nota (
    id         bigserial primary key,
    usuario_id bigint not null references usuario (id) on delete cascade,
    nome       varchar(40) not null check (char_length(nome) between 1 and 40),
    cor        varchar(10) not null
               check (cor in ('vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'rosa', 'cinza')),
    criado_em  timestamptz not null default now()
);

create unique index uq_categoria_nota_nome on categoria_nota (usuario_id, lower(nome));

create table nota (
    id            bigserial primary key,
    usuario_id    bigint not null references usuario (id) on delete cascade,
    categoria_id  bigint references categoria_nota (id) on delete set null,
    titulo        varchar(200) not null check (char_length(titulo) between 1 and 200),
    conteudo      jsonb not null,
    texto         text not null default '',
    fixada        boolean not null default false,
    criado_em     timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index idx_nota_usuario_atualizado on nota (usuario_id, atualizado_em desc);
create index idx_nota_categoria on nota (categoria_id);
create unique index uq_nota_fixada_usuario on nota (usuario_id) where fixada;
