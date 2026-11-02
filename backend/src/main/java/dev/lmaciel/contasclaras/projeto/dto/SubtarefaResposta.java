package dev.lmaciel.contasclaras.projeto.dto;

import dev.lmaciel.contasclaras.projeto.ProjetoSubtarefa;

public record SubtarefaResposta(
        Long id,
        String titulo,
        boolean concluida,
        int ordem
) {
    public static SubtarefaResposta de(ProjetoSubtarefa subtarefa) {
        return new SubtarefaResposta(
                subtarefa.getId(),
                subtarefa.getTitulo(),
                subtarefa.isConcluida(),
                subtarefa.getOrdem()
        );
    }
}
