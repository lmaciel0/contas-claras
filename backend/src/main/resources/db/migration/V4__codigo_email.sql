create table codigo_email (
    id          bigserial primary key,
    tipo        varchar(10) not null check (tipo in ('CADASTRO', 'SENHA')),
    email       varchar(254) not null,
    nome        varchar(120),          -- só CADASTRO
    senha_hash  varchar(100),          -- só CADASTRO
    codigo_hmac varchar(64) not null,
    token_hash  varchar(64),           -- só CADASTRO
    tentativas  int not null default 0,
    expira_em   timestamptz not null,
    criado_em   timestamptz not null default now(),
    unique (tipo, email)
);

create table envio_email (
    id          bigserial primary key,
    email_hmac  varchar(64) not null,
    ip_hmac     varchar(64) not null,
    criado_em   timestamptz not null default now()
);
create index on envio_email (email_hmac, criado_em);
create index on envio_email (ip_hmac, criado_em);
create index on envio_email (criado_em);
