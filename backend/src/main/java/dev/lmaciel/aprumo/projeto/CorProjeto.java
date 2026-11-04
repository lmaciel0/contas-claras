package dev.lmaciel.aprumo.projeto;

public enum CorProjeto {
    azul("Azul"),
    esmeralda("Esmeralda"),
    indigo("Índigo"),
    ambar("Âmbar"),
    rosa("Rosa"),
    roxo("Roxo");

    private final String descricao;

    CorProjeto(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
