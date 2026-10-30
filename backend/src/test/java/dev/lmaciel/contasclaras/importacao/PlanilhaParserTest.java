package dev.lmaciel.contasclaras.importacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.CategoriaLida;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.ItemLido;
import dev.lmaciel.contasclaras.lancamento.dto.MesAno;

class PlanilhaParserTest {

    private static PlanilhaLida planilha;

    @BeforeAll
    static void lerPlanilhaFicticia() {
        planilha = PlanilhaParser.ler(new ByteArrayInputStream(PlanilhaFicticia.gerar()));
    }

    @Test
    void le_so_abas_de_ano() {
        assertThat(nomesDasCategorias()).doesNotContain("NOTAS");
        assertThat(todosOsItens()).extracting(ItemLido::nome).doesNotContain("ITEM NOTA");
    }

    @Test
    void categorias_na_ordem_da_primeira_aparicao_com_o_nome_do_ano_mais_recente() {
        assertThat(nomesDasCategorias())
                .containsExactly("RECEITAS", "DIVIDAS/EMPRESTIMOS", "DOMÉSTICA", "CARTÕES DE CREDITO - TESTE");
        assertThat(itensDe("DOMÉSTICA")).extracting(ItemLido::nome).containsExactly("LUZ", "AGUA", "ALUGUEL", "ALUGUEL 2");
    }

    @Test
    void receitas_viram_categoria_receita() {
        assertThat(categoria("RECEITAS").tipo()).isEqualTo(TipoCategoria.RECEITA);
        assertThat(planilha.categorias())
                .filteredOn(c -> !c.nome().equals("RECEITAS"))
                .extracting(CategoriaLida::tipo)
                .containsOnly(TipoCategoria.DESPESA);
    }

    @Test
    void verde_e_pago_preto_e_vermelho_sao_previstos() {
        ItemLido salario = item("RECEITAS", "SALARIO");
        assertThat(salario.valores().get(new MesAno(2025, 1)).pago()).as("verde do tema 9").isTrue();
        assertThat(salario.valores().get(new MesAno(2025, 2)).pago()).as("preto, mesmo com fundo verde").isFalse();
        assertThat(salario.valores().get(new MesAno(2026, 1)).pago()).isTrue();

        ItemLido emprestimo = item("DIVIDAS/EMPRESTIMOS", "EMPRESTIMO A");
        assertThat(emprestimo.valores().get(new MesAno(2025, 1)).pago()).as("verde em ARGB FF70AD47").isTrue();
        assertThat(emprestimo.valores().get(new MesAno(2026, 2)).pago()).as("vermelho FFC00000").isFalse();
    }

    @Test
    void usa_valor_em_cache_da_formula() {
        ItemLido luz = item("DOMÉSTICA", "LUZ");
        assertThat(luz.valores().get(new MesAno(2026, 1)).valor()).isEqualTo(new BigDecimal("160.00"));
    }

    @Test
    void ignora_zero_vazio_e_linhas_total_e_abaixo_de_totais() {
        // AGUA: jan = 0, fev vazio, mar = texto "-"
        assertThat(item("DOMÉSTICA", "AGUA").valores()).isEmpty();
        // coluna O (total do ano) não vira mês
        assertThat(item("RECEITAS", "SALARIO").valores().keySet())
                .containsExactly(new MesAno(2025, 1), new MesAno(2025, 2), new MesAno(2026, 1));

        assertThat(nomesDasCategorias()).doesNotContain("TOTAIS", "FANTASMA");
        assertThat(todosOsItens()).extracting(ItemLido::nome)
                .doesNotContain("TOTAL", "ITEM FANTASMA", "DESPESAS")
                .doesNotContain("RECEITAS");
        assertThat(todosOsItens().stream().mapToInt(i -> i.valores().size()).sum()).isEqualTo(11);
    }

    @Test
    void arredonda_para_duas_casas() {
        assertThat(item("RECEITAS", "FREELA").valores().get(new MesAno(2025, 1)).valor())
                .isEqualTo(new BigDecimal("500.56"));
    }

    @Test
    void casa_item_entre_anos_e_usa_vencimento_mais_recente() {
        List<ItemLido> luzes = itensDe("DOMÉSTICA").stream().filter(i -> i.nome().equals("LUZ")).toList();
        assertThat(luzes).hasSize(1);
        ItemLido luz = luzes.get(0);
        assertThat(luz.diaVencimento()).isEqualTo(12);
        assertThat(luz.valores().keySet()).containsExactly(new MesAno(2025, 1), new MesAno(2026, 1));
        assertThat(luz.valores().get(new MesAno(2025, 1)).valor()).isEqualTo(new BigDecimal("150.00"));
    }

    @Test
    void alias_dividas_junta_categorias() {
        List<CategoriaLida> dividas = planilha.categorias().stream()
                .filter(c -> NomeNormalizado.chave(c.nome()).equals("DIVIDAS/EMPRESTIMOS"))
                .toList();
        assertThat(dividas).hasSize(1);
        assertThat(dividas.get(0).nome()).isEqualTo("DIVIDAS/EMPRESTIMOS");
        assertThat(dividas.get(0).itens()).hasSize(1);
        ItemLido emprestimo = dividas.get(0).itens().get(0);
        assertThat(emprestimo.nome()).isEqualTo("EMPRESTIMO A");
        assertThat(emprestimo.valores()).hasSize(2);
    }

    @Test
    void nome_repetido_no_bloco_vira_sufixo() {
        assertThat(item("DOMÉSTICA", "ALUGUEL").valores().get(new MesAno(2026, 1)).valor())
                .isEqualTo(new BigDecimal("900.00"));
        assertThat(item("DOMÉSTICA", "ALUGUEL 2").valores().get(new MesAno(2026, 1)).valor())
                .isEqualTo(new BigDecimal("50.00"));
    }

    @Test
    void itens_de_cartoes_de_credito_sao_cartao() {
        ItemLido cartao = item("CARTÕES DE CREDITO - TESTE", "CARTAO X");
        assertThat(cartao.cartao()).isTrue();
        assertThat(cartao.diaVencimento()).isEqualTo(5);
        assertThat(cartao.valores().get(new MesAno(2026, 1)).valor()).isEqualTo(new BigDecimal("700.00"));

        assertThat(planilha.categorias())
                .filteredOn(c -> !c.nome().startsWith("CARTÕES"))
                .flatExtracting(CategoriaLida::itens)
                .extracting(ItemLido::cartao)
                .containsOnly(false);
    }

    @Test
    void arquivo_que_nao_e_xlsx_vira_erro_claro() {
        byte[] valida = PlanilhaFicticia.gerar();
        List<byte[]> invalidos = List.of(
                "isto não é uma planilha".getBytes(StandardCharsets.UTF_8),
                new byte[0],
                Arrays.copyOf(valida, valida.length / 2));

        for (byte[] bytes : invalidos) {
            assertThatThrownBy(() -> PlanilhaParser.ler(new ByteArrayInputStream(bytes)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Arquivo não é uma planilha .xlsx válida.");
        }
    }

    // ---- ajudantes

    private static List<String> nomesDasCategorias() {
        return planilha.categorias().stream().map(CategoriaLida::nome).toList();
    }

    private static List<ItemLido> todosOsItens() {
        return planilha.categorias().stream().flatMap(c -> c.itens().stream()).toList();
    }

    private static CategoriaLida categoria(String nome) {
        return planilha.categorias().stream()
                .filter(c -> c.nome().equals(nome))
                .findFirst()
                .orElseThrow(() -> new AssertionError("categoria não encontrada: " + nome));
    }

    private static List<ItemLido> itensDe(String categoria) {
        return categoria(categoria).itens();
    }

    private static ItemLido item(String categoria, String nome) {
        return itensDe(categoria).stream()
                .filter(i -> i.nome().equals(nome))
                .findFirst()
                .orElseThrow(() -> new AssertionError("item não encontrado: " + categoria + " / " + nome));
    }
}
