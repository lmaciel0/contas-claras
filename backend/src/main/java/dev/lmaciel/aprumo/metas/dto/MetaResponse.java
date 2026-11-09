package dev.lmaciel.aprumo.metas.dto;

import dev.lmaciel.aprumo.metas.Meta;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

public record MetaResponse(
        Long id,
        String nome,
        String valorAlvo,
        String valorGuardado,
        Integer mesAlvo,
        Integer anoAlvo,
        String presetVisual,
        String imagemUrl,
        String corGradiente,
        int ordem,
        String percentualConcluido,
        String valorRestante,
        Integer mesesRestantes,
        String valorMensalSugerido,
        boolean concluida
) {
    public static MetaResponse de(Meta meta, LocalDate hoje) {
        BigDecimal alvo = meta.getValorAlvo();
        BigDecimal guardado = meta.getValorGuardado();

        BigDecimal restante = alvo.subtract(guardado);
        if (restante.compareTo(BigDecimal.ZERO) < 0) {
            restante = BigDecimal.ZERO;
        }

        BigDecimal percentual;
        if (alvo.compareTo(BigDecimal.ZERO) > 0) {
            percentual = guardado.divide(alvo, 4, RoundingMode.HALF_UP);
        } else {
            percentual = BigDecimal.ZERO;
        }

        Integer mesesRestantes = null;
        BigDecimal mensalSugerido = BigDecimal.ZERO;

        if (meta.getAnoAlvo() != null && meta.getMesAlvo() != null) {
            LocalDate dataAlvo = LocalDate.of(meta.getAnoAlvo(), meta.getMesAlvo(), 1);
            LocalDate inicioMesAtual = LocalDate.of(hoje.getYear(), hoje.getMonthValue(), 1);

            if (!dataAlvo.isBefore(inicioMesAtual)) {
                Period periodo = Period.between(inicioMesAtual, dataAlvo);
                int totalMeses = periodo.getYears() * 12 + periodo.getMonths();
                mesesRestantes = Math.max(1, totalMeses);

                if (restante.compareTo(BigDecimal.ZERO) > 0) {
                    mensalSugerido = restante.divide(BigDecimal.valueOf(mesesRestantes), 2, RoundingMode.HALF_UP);
                }
            } else {
                mesesRestantes = 0;
                mensalSugerido = restante;
            }
        }

        boolean concluida = guardado.compareTo(alvo) >= 0;

        return new MetaResponse(
                meta.getId(),
                meta.getNome(),
                alvo.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                guardado.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                meta.getMesAlvo(),
                meta.getAnoAlvo(),
                meta.getPresetVisual(),
                meta.getImagemUrl(),
                meta.getCorGradiente(),
                meta.getOrdem(),
                percentual.setScale(4, RoundingMode.HALF_UP).toPlainString(),
                restante.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                mesesRestantes,
                mensalSugerido.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                concluida
        );
    }
}
