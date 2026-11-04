package dev.lmaciel.aprumo.projeto.dto;

import dev.lmaciel.aprumo.projeto.CorProjeto;
import dev.lmaciel.aprumo.projeto.EstagioProjeto;
import dev.lmaciel.aprumo.projeto.PrioridadeProjeto;
import dev.lmaciel.aprumo.projeto.Projeto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ProjetoResposta(
        Long id,
        String titulo,
        String descricao,
        String categoria,
        EstagioProjeto estagio,
        PrioridadeProjeto prioridade,
        CorProjeto cor,
        int ordem,
        LocalDate prazo,
        int porcentagemProgresso,
        int totalSubtarefas,
        int subtarefasConcluidas,
        List<SubtarefaResposta> subtarefas,
        Instant criadoEm,
        Instant atualizadoEm
) {
    public static ProjetoResposta de(Projeto projeto) {
        List<SubtarefaResposta> subtarefas = projeto.getSubtarefas().stream()
                .map(SubtarefaResposta::de)
                .toList();

        return new ProjetoResposta(
                projeto.getId(),
                projeto.getTitulo(),
                projeto.getDescricao(),
                projeto.getCategoria(),
                projeto.getEstagio(),
                projeto.getPrioridade(),
                projeto.getCor(),
                projeto.getOrdem(),
                projeto.getPrazo(),
                projeto.calcularPorcentagemProgresso(),
                projeto.getTotalSubtarefas(),
                projeto.getSubtarefasConcluidas(),
                subtarefas,
                projeto.getCriadoEm(),
                projeto.getAtualizadoEm()
        );
    }
}
