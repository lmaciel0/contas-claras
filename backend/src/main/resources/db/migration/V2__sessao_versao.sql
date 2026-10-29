-- Versão da sessão: o JWT carrega este número e perde a validade quando ele muda
-- (troca de senha, vínculo com Google).
alter table usuario add column sessao_versao int not null default 0;
