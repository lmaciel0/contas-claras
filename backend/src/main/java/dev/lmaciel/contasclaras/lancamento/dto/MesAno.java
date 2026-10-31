package dev.lmaciel.contasclaras.lancamento.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Um mês do calendário; compara por ordem cronológica. */
public record MesAno(
        @Min(value = 2000, message = "O ano deve estar entre 2000 e 2100.")
        @Max(value = 2100, message = "O ano deve estar entre 2000 e 2100.")
        int ano,

        @Min(value = 1, message = "O mês deve estar entre 1 e 12.")
        @Max(value = 12, message = "O mês deve estar entre 1 e 12.")
        int mes) implements Comparable<MesAno> {

    /** Posição na linha do tempo: meses seguidos têm índices seguidos (dezembro/2026 e janeiro/2027 também). */
    public int indice() {
        return ano * 12 + mes - 1;
    }

    @Override
    public int compareTo(MesAno outro) {
        return Integer.compare(indice(), outro.indice());
    }

    /** O mês seguinte, virando o ano em dezembro. */
    public MesAno proximo() {
        return mes == 12 ? new MesAno(ano + 1, 1) : new MesAno(ano, mes + 1);
    }
}
