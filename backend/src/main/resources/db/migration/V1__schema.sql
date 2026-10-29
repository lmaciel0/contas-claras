create table usuario (
    id          bigserial primary key,
    nome        varchar(120) not null,
    email       varchar(254) not null unique,
    senha_hash  varchar(100),
    google_sub  varchar(255) unique,
    criado_em   timestamptz not null default now()
);

create table categoria (
    id          bigserial primary key,
    usuario_id  bigint not null references usuario (id) on delete cascade,
    nome        varchar(80) not null,
    tipo        varchar(10) not null check (tipo in ('RECEITA', 'DESPESA')),
    ordem       int not null,
    unique (usuario_id, nome)
);

create table item (
    id              bigserial primary key,
    categoria_id    bigint not null references categoria (id) on delete cascade,
    nome            varchar(120) not null,
    dia_vencimento  smallint check (dia_vencimento between 1 and 31),
    cartao          boolean not null default false,
    limite          numeric(12, 2) check (limite > 0),
    arquivado       boolean not null default false,
    unique (categoria_id, nome)
);

create table lancamento (
    id          bigserial primary key,
    item_id     bigint not null references item (id) on delete cascade,
    ano         smallint not null check (ano between 2000 and 2100),
    mes         smallint not null check (mes between 1 and 12),
    valor       numeric(12, 2) not null check (valor > 0),
    status      varchar(10) not null check (status in ('PREVISTO', 'PAGO')),
    vencimento  date,
    unique (item_id, ano, mes)
);

create index idx_categoria_usuario on categoria (usuario_id);
create index idx_item_categoria on item (categoria_id);
create index idx_lancamento_ano_mes on lancamento (ano, mes);
