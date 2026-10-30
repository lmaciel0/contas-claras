package dev.lmaciel.contasclaras.importacao;

import java.math.BigDecimal;
import java.util.List;
import java.util.SortedMap;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.lancamento.dto.MesAno;

/** O que o parser leu da planilha: categorias e itens na ordem da primeira aparição, já casados entre anos. */
public record PlanilhaLida(List<CategoriaLida> categorias) {

    public record CategoriaLida(String nome, TipoCategoria tipo, List<ItemLido> itens) {
    }

    /** {@code diaVencimento} é null quando o nome não tinha o sufixo {@code (NN)}. */
    public record ItemLido(String nome, Integer diaVencimento, boolean cartao, SortedMap<MesAno, ValorLido> valores) {
    }

    /** Só entram valores diferentes de zero, com 2 casas. */
    public record ValorLido(BigDecimal valor, boolean pago) {
    }
}
