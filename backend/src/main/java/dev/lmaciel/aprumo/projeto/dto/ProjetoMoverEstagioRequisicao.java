package dev.lmaciel.aprumo.projeto.dto;

import dev.lmaciel.aprumo.projeto.EstagioProjeto;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProjetoMoverEstagioRequisicao(
        @NotNull(message = "O estágio de destino é obrigatório")
        EstagioProjeto estagio,

        @Min(value = 0, message = "A nova ordem não pode ser negativa")
        Integer novaOrdem
) {
}
