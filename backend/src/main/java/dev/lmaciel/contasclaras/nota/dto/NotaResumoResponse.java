package dev.lmaciel.contasclaras.nota.dto;

import java.time.Instant;

import dev.lmaciel.contasclaras.nota.NotaRepository.Resumo;

public record NotaResumoResponse(
        long id,
        String titulo,
        String previa,
        Long categoriaId,
        boolean fixada,
        Instant atualizadoEm) {

    static final int TAMANHO_PREVIA = 160;

    /** Prévia: texto simples com qualquer sequência de espaços e quebras virando um espaço, até 160 caracteres. */
    public static NotaResumoResponse de(Resumo r) {
        String colapsado = r.texto().replaceAll("\\s+", " ").strip();
        String previa = colapsado.length() <= TAMANHO_PREVIA ? colapsado : cortar(colapsado);
        return new NotaResumoResponse(r.id(), r.titulo(), previa, r.categoriaId(), r.fixada(), r.atualizadoEm());
    }

    /** Corta em 160 sem partir um par substituto (emoji). */
    private static String cortar(String texto) {
        int fim = TAMANHO_PREVIA;
        if (Character.isHighSurrogate(texto.charAt(fim - 1))) {
            fim--;
        }
        return texto.substring(0, fim);
    }
}
