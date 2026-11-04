package dev.lmaciel.aprumo.projeto;

public enum EstagioProjeto {
    A_FAZER("A Fazer"),
    EM_ANDAMENTO("Em Andamento"),
    EM_REVISAO("Em Revisão"),
    CONCLUIDO("Concluído");

    private final String descricao;

    EstagioProjeto(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
