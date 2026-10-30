package dev.lmaciel.contasclaras.importacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.contasclaras.CapturaLog;
import dev.lmaciel.contasclaras.IntegracaoTest;
import dev.lmaciel.contasclaras.categoria.TipoCategoria;
import dev.lmaciel.contasclaras.importacao.ImportacaoService.ResumoImportacao;
import dev.lmaciel.contasclaras.importacao.ImportacaoService.TotaisAno;
import dev.lmaciel.contasclaras.importacao.PlanilhaLida.CategoriaLida;

/** A planilha vem da fixture fictícia lida pelo parser; nenhum dado real. */
class ImportacaoServiceTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String MENSAGEM_CONTA_COM_LANCAMENTOS =
            "A conta já tem lançamentos. A importação só roda numa conta vazia.";

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ImportacaoService importacao;

    @Autowired
    ApplicationContext contexto;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private static PlanilhaLida planilha() {
        return PlanilhaParser.ler(new ByteArrayInputStream(PlanilhaFicticia.gerar()));
    }

    private List<String> nomesDasCategorias(String email) {
        return jdbc.queryForList("""
                select c.nome from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? order by c.ordem""", String.class, email);
    }

    private int contar(String tabelaEJoin) {
        return jdbc.queryForObject("select count(*) from " + tabelaEJoin, Integer.class);
    }

    @Test
    void runner_so_existe_com_o_profile_importar() {
        assertThat(contexto.getBeanNamesForType(ImportacaoRunner.class)).isEmpty();
    }

    @Test
    void importa_em_conta_nova_e_remove_categorias_padrao() throws Exception {
        cadastrarEEntrar(DONO);
        assertThat(nomesDasCategorias(DONO)).contains("Cartões de crédito");

        ResumoImportacao resumo = importacao.importar(DONO, planilha());

        assertThat(nomesDasCategorias(DONO))
                .containsExactly("RECEITAS", "DIVIDAS/EMPRESTIMOS", "DOMÉSTICA", "CARTÕES DE CREDITO - TESTE");
        assertThat(jdbc.queryForList("""
                select c.ordem from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? order by c.ordem""", Integer.class, DONO)).containsExactly(0, 1, 2, 3);
        assertThat(jdbc.queryForObject("""
                select c.tipo from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? and c.nome = 'RECEITAS'""", String.class, DONO))
                .isEqualTo(TipoCategoria.RECEITA.name());
        assertThat(resumo.categorias()).isEqualTo(4);
        assertThat(resumo.itens()).isEqualTo(8);
        assertThat(resumo.lancamentos()).isEqualTo(11);
        assertThat(contar("item")).isEqualTo(8);
        assertThat(contar("lancamento")).isEqualTo(11);
    }

    @Test
    void item_sem_valores_e_cartao_sao_criados_com_dia_de_vencimento() throws Exception {
        cadastrarEEntrar(DONO);

        importacao.importar(DONO, planilha());

        assertThat(jdbc.queryForObject("select count(*) from item where nome = 'AGUA'", Integer.class))
                .as("item sem nenhum valor também é criado").isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from lancamento l join item i on i.id = l.item_id where i.nome = 'AGUA'",
                Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select cartao from item where nome = 'CARTAO X'", Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("select cartao from item where nome = 'LUZ'", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("select dia_vencimento from item where nome = 'LUZ'", Integer.class))
                .isEqualTo(12);
        assertThat(jdbc.queryForObject("select limite from item where nome = 'CARTAO X'", Object.class)).isNull();
    }

    @Test
    void resumo_totais_por_ano_batem_com_a_fixture() throws Exception {
        cadastrarEEntrar(DONO);

        ResumoImportacao resumo = importacao.importar(DONO, planilha());

        assertThat(resumo.porAno()).containsOnlyKeys(2025, 2026);
        assertTotais(resumo.porAno().get(2025), "6500.56", "250.00");
        assertTotais(resumo.porAno().get(2026), "3200.00", "1910.00");
        assertThat(resumo.porAno().firstKey()).isEqualTo(2025);
    }

    private static void assertTotais(TotaisAno totais, String receitas, String despesas) {
        assertThat(totais.receitas()).isEqualByComparingTo(receitas);
        assertThat(totais.despesas()).isEqualByComparingTo(despesas);
    }

    @Test
    void lancamentos_tem_status_e_vencimento() throws Exception {
        cadastrarEEntrar(DONO);

        importacao.importar(DONO, planilha());

        String consulta = """
                select %s from lancamento l join item i on i.id = l.item_id
                where i.nome = ? and l.ano = ? and l.mes = ?""";
        assertThat(jdbc.queryForObject(consulta.formatted("l.vencimento"), LocalDate.class, "LUZ", 2026, 1))
                .isEqualTo(LocalDate.of(2026, 1, 12));
        assertThat(jdbc.queryForObject(consulta.formatted("l.status"), String.class, "LUZ", 2026, 1))
                .isEqualTo("PAGO");
        assertThat(jdbc.queryForObject(consulta.formatted("l.status"), String.class, "EMPRESTIMO A", 2026, 2))
                .isEqualTo("PREVISTO");
        assertThat(jdbc.queryForObject(consulta.formatted("l.vencimento"), LocalDate.class, "EMPRESTIMO A", 2026, 2))
                .as("item sem dia não tem vencimento").isNull();
        assertThat(jdbc.queryForObject(consulta.formatted("l.valor"), BigDecimal.class, "FREELA", 2025, 1))
                .isEqualByComparingTo("500.56");
    }

    @Test
    void normaliza_o_email_antes_de_procurar_o_usuario() throws Exception {
        cadastrarEEntrar(DONO);

        ResumoImportacao resumo = importacao.importar("  Dono@Exemplo.COM ", planilha());

        assertThat(resumo.lancamentos()).isEqualTo(11);
    }

    @Test
    void recusa_conta_com_lancamentos() throws Exception {
        cadastrarEEntrar(DONO);
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 10, "100.00", "PAGO");

        assertThatThrownBy(() -> importacao.importar(DONO, planilha()))
                .isInstanceOf(ImportacaoRecusadaException.class)
                .hasMessage(MENSAGEM_CONTA_COM_LANCAMENTOS);

        assertThat(nomesDasCategorias(DONO)).hasSize(11).contains("Cartões de crédito", "Doméstica");
        assertThat(contar("item")).isEqualTo(1);
        assertThat(contar("lancamento")).isEqualTo(1);
    }

    @Test
    void recusa_usuario_inexistente() {
        assertThatThrownBy(() -> importacao.importar("ninguem@exemplo.com", planilha()))
                .isInstanceOf(ImportacaoRecusadaException.class)
                .hasMessage("Usuário não encontrado: ninguem@exemplo.com");
    }

    @Test
    void falha_no_meio_desfaz_tudo() throws Exception {
        cadastrarEEntrar(DONO);
        PlanilhaLida repetida = new PlanilhaLida(List.of(
                new CategoriaLida("REPETIDA", TipoCategoria.DESPESA, List.of()),
                new CategoriaLida("REPETIDA", TipoCategoria.DESPESA, List.of())));

        // o Hibernate registra a violação de unicidade como WARN; aqui ela é esperada e não suja a saída
        try (CapturaLog log = CapturaLog.de("org.hibernate.orm.jdbc.error")) {
            assertThatThrownBy(() -> importacao.importar(DONO, repetida))
                    .isInstanceOf(DataIntegrityViolationException.class);
        }

        assertThat(nomesDasCategorias(DONO)).hasSize(11).contains("Cartões de crédito");
    }
}
