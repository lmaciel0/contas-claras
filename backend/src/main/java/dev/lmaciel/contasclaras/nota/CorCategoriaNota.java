package dev.lmaciel.contasclaras.nota;

import java.util.Arrays;
import java.util.Optional;

/** Paleta fechada das categorias de nota; o banco guarda e a API devolve a chave em minúsculas. */
public enum CorCategoriaNota {
    VERMELHO("vermelho"),
    LARANJA("laranja"),
    AMARELO("amarelo"),
    VERDE("verde"),
    AZUL("azul"),
    ROXO("roxo"),
    ROSA("rosa"),
    CINZA("cinza");

    private final String valor;

    CorCategoriaNota(String valor) {
        this.valor = valor;
    }

    public String valor() {
        return valor;
    }

    /** A chave exata (minúsculas); qualquer outra coisa, inclusive {@code null}, volta vazia. */
    public static Optional<CorCategoriaNota> da(String chave) {
        return Arrays.stream(values()).filter(c -> c.valor.equals(chave)).findFirst();
    }
}
