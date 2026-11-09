package dev.lmaciel.aprumo.metas.dto;

import java.util.List;

public record ResumoConselheiroResponse(
        String sobraMes,
        int totalMetas,
        String totalGuardado,
        String totalAlvo,
        String sugestaoTexto,
        List<SugestaoAporte> sugestoes
) {
}
