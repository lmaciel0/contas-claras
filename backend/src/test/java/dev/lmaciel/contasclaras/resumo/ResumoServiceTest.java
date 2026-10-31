package dev.lmaciel.contasclaras.resumo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.contasclaras.IntegracaoTest;
import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.resumo.dto.CategoriaTotal;
import dev.lmaciel.contasclaras.resumo.dto.PontoSerie;
import dev.lmaciel.contasclaras.resumo.dto.ProximaConta;
import dev.lmaciel.contasclaras.resumo.dto.ResumoMes;

/** "Hoje" é 2026-10-29 (relógio fixo da base). */
class ResumoServiceTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    ResumoService resumos;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private UsuarioLogado cadastrar(String email) throws Exception {
        cadastrarEEntrar(email);
        return new UsuarioLogado(jdbc.queryForObject("select id from usuario where email = ?", Long.class, email));
    }

    private static BigDecimal v(String valor) {
        return new BigDecimal(valor);
    }

    @Test
    void resumo_calcula_receitas_despesas_e_sobra() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 10, "3000.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 10, "1200.50", "PREVISTO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.receitas()).isEqualByComparingTo("5000.00");
        assertThat(r.despesas()).isEqualByComparingTo("4200.50");
        assertThat(r.sobra()).isEqualByComparingTo("799.50");
        assertThat(r.sobra().scale()).isEqualTo(2);
    }

    @Test
    void sobra_do_ano_soma_so_os_meses_do_ano() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        criarLancamento(salario, 2026, 1, "1000.00", "PAGO");
        criarLancamento(aluguel, 2026, 1, "400.00", "PAGO");
        criarLancamento(salario, 2026, 10, "5000.00", "PAGO");
        criarLancamento(aluguel, 2026, 12, "7000.00", "PREVISTO");
        criarLancamento(salario, 2025, 12, "9999.00", "PAGO");
        criarLancamento(salario, 2027, 1, "8888.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.sobraAno()).isEqualByComparingTo("-1400.00");
    }

    @Test
    void resumo_sem_mes_anterior_retorna_anterior_null() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");
        // Setembro vazio; agosto e novembro com dados não contam como "mês anterior".
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 8, "100.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 11, "100.00", "PAGO");

        assertThat(resumos.resumo(2026, 10, u).anterior()).isNull();
    }

    @Test
    void resumo_traz_totais_do_mes_anterior() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        criarLancamento(salario, 2026, 9, "4000.00", "PAGO");
        criarLancamento(aluguel, 2026, 9, "1500.25", "PREVISTO");
        criarLancamento(salario, 2026, 10, "5000.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.anterior()).isNotNull();
        assertThat(r.anterior().receitas()).isEqualByComparingTo("4000.00");
        assertThat(r.anterior().despesas()).isEqualByComparingTo("1500.25");
        assertThat(r.anterior().sobra()).isEqualByComparingTo("2499.75");
    }

    @Test
    void resumo_janeiro_compara_com_dezembro_do_ano_anterior() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        criarLancamento(salario, 2025, 12, "2000.00", "PAGO");
        criarLancamento(aluguel, 2025, 12, "500.00", "PAGO");
        criarLancamento(salario, 2026, 1, "3000.00", "PAGO");
        // Dezembro do mesmo ano (depois de janeiro) não pode ser confundido com o anterior.
        criarLancamento(salario, 2026, 12, "7777.00", "PREVISTO");

        ResumoMes r = resumos.resumo(2026, 1, u);

        assertThat(r.anterior()).isNotNull();
        assertThat(r.anterior().receitas()).isEqualByComparingTo("2000.00");
        assertThat(r.anterior().despesas()).isEqualByComparingTo("500.00");
        assertThat(r.anterior().sobra()).isEqualByComparingTo("1500.00");
        assertThat(r.receitas()).isEqualByComparingTo("3000.00");
    }

    @Test
    void mes_sem_dados_retorna_zeros_e_listas_vazias() throws Exception {
        UsuarioLogado u = cadastrar(DONO);

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.receitas()).isEqualByComparingTo("0");
        assertThat(r.despesas()).isEqualByComparingTo("0");
        assertThat(r.sobra()).isEqualByComparingTo("0");
        assertThat(r.sobraAno()).isEqualByComparingTo("0");
        assertThat(r.anterior()).isNull();
        assertThat(r.categorias()).isEmpty();
        assertThat(r.proximas()).isEmpty();
        assertThat(r.serieAno()).hasSize(12);
        assertThat(r.serieAno()).allSatisfy(p -> {
            assertThat(p.receitas()).isEqualByComparingTo("0");
            assertThat(p.receitasPrevistas()).isEqualByComparingTo("0");
            assertThat(p.despesas()).isEqualByComparingTo("0");
            assertThat(p.despesasPrevistas()).isEqualByComparingTo("0");
        });
    }

    @Test
    void mes_vazio_em_ano_com_dados_zera_o_mes_mas_mantem_o_ano() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 3, u);

        assertThat(r.receitas()).isEqualByComparingTo("0");
        assertThat(r.despesas()).isEqualByComparingTo("0");
        assertThat(r.sobra()).isEqualByComparingTo("0");
        assertThat(r.sobraAno()).isEqualByComparingTo("5000.00");
        assertThat(r.anterior()).isNull();
        assertThat(r.categorias()).isEmpty();
    }

    @Test
    void mes_so_com_receitas_tem_categorias_vazias_sem_dividir_por_zero() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.despesas()).isEqualByComparingTo("0");
        assertThat(r.sobra()).isEqualByComparingTo("5000.00");
        assertThat(r.categorias()).isEmpty();
    }

    @Test
    void categorias_ordenadas_por_total_com_percentual() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "9000.00", "PAGO");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        long luz = criarItem(DONO, "Doméstica", "Luz");
        long onibus = criarItem(DONO, "Transporte", "Ônibus");
        long consulta = criarItem(DONO, "Saúde", "Consulta");
        criarLancamento(aluguel, 2026, 10, "1000.00", "PAGO");
        criarLancamento(luz, 2026, 10, "300.00", "PREVISTO");
        criarLancamento(onibus, 2026, 10, "900.00", "PAGO");
        criarLancamento(consulta, 2026, 10, "500.00", "PREVISTO");
        // Outro mês não entra.
        criarLancamento(consulta, 2026, 9, "4000.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.despesas()).isEqualByComparingTo("2700.00");
        assertThat(r.categorias()).extracting("nome").containsExactly("Doméstica", "Transporte", "Saúde");
        assertThat(r.categorias()).extracting(CategoriaTotal::total).usingElementComparator(BigDecimal::compareTo)
                .containsExactly(v("1300.00"), v("900.00"), v("500.00"));
        assertThat(r.categorias()).extracting(CategoriaTotal::percentual).usingElementComparator(BigDecimal::compareTo)
                .containsExactly(v("0.4815"), v("0.3333"), v("0.1852"));
        assertThat(r.categorias()).allSatisfy(c -> assertThat(c.percentual().scale()).isEqualTo(4));
        assertThat(r.categorias().get(0).categoriaId()).isPositive();
    }

    @Test
    void proximas_inclui_atrasadas_e_ate_30_dias_e_ignora_pagas() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long atrasada = criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 10, "900.00", "PREVISTO", "2026-10-20");
        long noMes = criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 11, "150.00", "PREVISTO", "2026-11-20");
        criarLancamento(criarItem(DONO, "Doméstica", "Gás"), 2026, 12, "90.00", "PREVISTO", "2026-12-15");
        criarLancamento(criarItem(DONO, "Transporte", "Seguro"), 2026, 11, "80.00", "PAGO", "2026-11-05");

        // O mês escolhido não muda a lista: "hoje" é que manda.
        for (int mes : new int[] {10, 3}) {
            ResumoMes r = resumos.resumo(2026, mes, u);

            assertThat(r.proximas()).hasSize(2);
            assertThat(r.proximas().get(0).lancamentoId()).isEqualTo(atrasada);
            assertThat(r.proximas().get(0).itemNome()).isEqualTo("Aluguel");
            assertThat(r.proximas().get(0).categoriaNome()).isEqualTo("Doméstica");
            assertThat(r.proximas().get(0).valor()).isEqualByComparingTo("900.00");
            assertThat(r.proximas().get(0).vencimento()).isEqualTo(LocalDate.of(2026, 10, 20));
            assertThat(r.proximas().get(0).atrasada()).isTrue();
            assertThat(r.proximas().get(1).lancamentoId()).isEqualTo(noMes);
            assertThat(r.proximas().get(1).atrasada()).isFalse();
        }
    }

    @Test
    void proximas_respeita_limites_e_ordena_por_vencimento() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long limite = criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 11, "1.00", "PREVISTO", "2026-11-28");
        criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 11, "2.00", "PREVISTO", "2026-11-29");
        long hoje = criarLancamento(criarItem(DONO, "Doméstica", "Gás"), 2026, 10, "3.00", "PREVISTO", "2026-10-29");
        long ontem = criarLancamento(criarItem(DONO, "Doméstica", "Água"), 2026, 10, "4.00", "PREVISTO", "2026-10-28");
        criarLancamento(criarItem(DONO, "Transporte", "Seguro"), 2026, 10, "5.00", "PREVISTO");
        // Receita prevista nunca é "conta a pagar".
        criarLancamento(salario, 2026, 11, "6.00", "PREVISTO", "2026-11-05");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.proximas()).extracting("lancamentoId").containsExactly(ontem, hoje, limite);
        assertThat(r.proximas()).extracting("atrasada").containsExactly(true, false, false);
    }

    @Test
    void proximas_ignora_atrasadas_com_mais_de_90_dias() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        // Hoje é 2026-10-29: 90 dias atrás é 2026-07-31; 91 dias atrás é 2026-07-30.
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 7, "10.00", "PREVISTO", "2026-07-30");
        long noLimite = criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 7, "20.00", "PREVISTO",
                "2026-07-31");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.proximas()).extracting(ProximaConta::lancamentoId).containsExactly(noLimite);
        assertThat(r.proximas().get(0).atrasada()).isTrue();
    }

    @Test
    void serie_ano_tem_12_meses_e_separa_previsto() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long extra = criarItem(DONO, "Receitas", "Extra");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        long luz = criarItem(DONO, "Doméstica", "Luz");
        criarLancamento(salario, 2026, 3, "1000.00", "PAGO");
        criarLancamento(extra, 2026, 3, "250.00", "PREVISTO");
        criarLancamento(aluguel, 2026, 3, "400.00", "PAGO");
        criarLancamento(luz, 2026, 3, "60.50", "PREVISTO");
        criarLancamento(salario, 2026, 12, "1000.00", "PREVISTO");
        criarLancamento(salario, 2025, 3, "9999.00", "PAGO");

        ResumoMes r = resumos.resumo(2026, 10, u);

        assertThat(r.serieAno()).hasSize(12);
        assertThat(r.serieAno()).extracting(PontoSerie::mes).containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
        PontoSerie marco = r.serieAno().get(2);
        assertThat(marco.receitas()).isEqualByComparingTo("1250.00");
        assertThat(marco.receitasPrevistas()).isEqualByComparingTo("250.00");
        assertThat(marco.despesas()).isEqualByComparingTo("460.50");
        assertThat(marco.despesasPrevistas()).isEqualByComparingTo("60.50");
        PontoSerie dezembro = r.serieAno().get(11);
        assertThat(dezembro.receitas()).isEqualByComparingTo("1000.00");
        assertThat(dezembro.receitasPrevistas()).isEqualByComparingTo("1000.00");
        assertThat(dezembro.despesas()).isEqualByComparingTo("0");
        PontoSerie fevereiro = r.serieAno().get(1);
        assertThat(fevereiro.receitas()).isEqualByComparingTo("0");
        assertThat(fevereiro.despesasPrevistas()).isEqualByComparingTo("0");
    }

    @Test
    void resumo_so_conta_dados_do_usuario_logado() throws Exception {
        UsuarioLogado dono = cadastrar(DONO);
        UsuarioLogado outra = cadastrar(OUTRA);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 10, "1000.00", "PREVISTO", "2026-10-25");
        criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 9, "10.00", "PAGO");
        criarLancamento(criarItem(OUTRA, "Receitas", "Salário"), 2026, 10, "777.00", "PAGO");
        criarLancamento(criarItem(OUTRA, "Doméstica", "Aluguel"), 2026, 10, "333.00", "PREVISTO", "2026-10-26");
        criarLancamento(criarItem(OUTRA, "Transporte", "Ônibus"), 2026, 9, "22.00", "PAGO");

        ResumoMes doDono = resumos.resumo(2026, 10, dono);
        ResumoMes daOutra = resumos.resumo(2026, 10, outra);

        assertThat(doDono.receitas()).isEqualByComparingTo("5000.00");
        assertThat(doDono.despesas()).isEqualByComparingTo("1000.00");
        assertThat(doDono.sobraAno()).isEqualByComparingTo("3990.00");
        assertThat(doDono.anterior().despesas()).isEqualByComparingTo("10.00");
        assertThat(doDono.categorias()).extracting("nome").containsExactly("Doméstica");
        assertThat(doDono.proximas()).extracting(ProximaConta::valor).usingElementComparator(BigDecimal::compareTo)
                .containsExactly(v("1000.00"));
        assertThat(doDono.serieAno().get(9).receitas()).isEqualByComparingTo("5000.00");

        assertThat(daOutra.receitas()).isEqualByComparingTo("777.00");
        assertThat(daOutra.despesas()).isEqualByComparingTo("333.00");
        assertThat(daOutra.anterior().despesas()).isEqualByComparingTo("22.00");
        assertThat(daOutra.categorias()).extracting("nome").containsExactly("Doméstica");
        assertThat(daOutra.proximas()).extracting(ProximaConta::valor).usingElementComparator(BigDecimal::compareTo)
                .containsExactly(v("333.00"));
    }
}
