package dev.lmaciel.aprumo.metas.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record MetaRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 100, message = "Nome pode ter até 100 caracteres")
        String nome,

        @NotNull(message = "Valor alvo é obrigatório")
        @Positive(message = "Valor alvo deve ser positivo")
        BigDecimal valorAlvo,

        @PositiveOrZero(message = "Valor guardado não pode ser negativo")
        BigDecimal valorGuardado,

        @Min(value = 1, message = "Mês deve ser entre 1 e 12")
        @Max(value = 12, message = "Mês deve ser entre 1 e 12")
        Integer mesAlvo,

        Integer anoAlvo,

        @Size(max = 50, message = "Preset visual pode ter até 50 caracteres")
        String presetVisual,

        @Size(max = 500, message = "URL da imagem pode ter até 500 caracteres")
        String imagemUrl,

        @Size(max = 100, message = "Cor ou gradiente pode ter até 100 caracteres")
        String corGradiente,

        Integer ordem
) {
}
