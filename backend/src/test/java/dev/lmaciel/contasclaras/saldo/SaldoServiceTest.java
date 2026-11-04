package dev.lmaciel.contasclaras.saldo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.contasclaras.IntegracaoTest;
import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.saldo.dto.SaldoMes;

/** O saldo do Itaú começa em 2026-11 (app.saldo.inicio) e só conta lançamentos pagos. */
class SaldoServiceTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    SaldoService saldos;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private UsuarioLogado cadastrar(String email) throws Exception {
        cadastrarEEntrar(email);
        return new UsuarioLogado(jdbc.queryForObject("select id from usuario where email = ?", Long.class, email));
    }

    /** Novembro/2026: Salário pago 5500.00, Cagece pago 177.56, Financiamento previsto 1690.00. */
    private void cenarioDeNovembro() {
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 11, "5500.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Cagece"), 2026, 11, "177.56", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Financiamento"), 2026, 11, "1690.00", "PREVISTO");
    }

    @Test
    void antesDoInicioFicaInativo() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 10, "5000.00", "PAGO");

        SaldoMes s = saldos.saldo(2026, 10, u);

        assertThat(s.ativo()).isFalse();
        assertThat(s.saldo()).isEqualByComparingTo("0.00");
        assertThat(s.recebidoNoMes()).isEqualByComparingTo("0.00");
    }

    @Test
    void mesDeInicioSomaPagosEIgnoraPrevistos() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        cenarioDeNovembro();

        SaldoMes s = saldos.saldo(2026, 11, u);

        assertThat(s.ativo()).isTrue();
        assertThat(s.saldo()).isEqualByComparingTo("5322.44");
        assertThat(s.recebidoNoMes()).isEqualByComparingTo("5500.00");
    }

    @Test
    void sobraAndaSoParaFrente() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        cenarioDeNovembro();
        criarLancamento(criarItem(DONO, "Receitas", "Extra"), 2026, 12, "100.00", "PAGO");

        SaldoMes dezembro = saldos.saldo(2026, 12, u);
        SaldoMes novembro = saldos.saldo(2026, 11, u);

        assertThat(dezembro.saldo()).isEqualByComparingTo("5422.44");
        assertThat(dezembro.recebidoNoMes()).isEqualByComparingTo("100.00");
        assertThat(novembro.saldo()).isEqualByComparingTo("5322.44");
    }

    @Test
    void mesSemLancamentosMantemOAcumulado() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        cenarioDeNovembro();

        SaldoMes s = saldos.saldo(2026, 12, u);

        assertThat(s.ativo()).isTrue();
        assertThat(s.saldo()).isEqualByComparingTo("5322.44");
        assertThat(s.recebidoNoMes()).isEqualByComparingTo("0.00");
    }

    @Test
    void faturaPagaSubtraiEPrevistaNao() throws Exception {
        UsuarioLogado u = cadastrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 11, "5500.00", "PAGO");
        long amex = criarItem(DONO, "Cartões de crédito", "American Express");
        long inter = criarItem(DONO, "Cartões de crédito", "Inter");
        jdbc.update("update item set cartao = true where id in (?, ?)", amex, inter);
        criarLancamento(amex, 2026, 11, "3498.09", "PAGO");
        criarLancamento(inter, 2026, 11, "582.73", "PREVISTO");

        SaldoMes s = saldos.saldo(2026, 11, u);

        assertThat(s.saldo()).isEqualByComparingTo("2001.91");
    }

    @Test
    void outroUsuarioNaoEntra() throws Exception {
        UsuarioLogado dono = cadastrar(DONO);
        cadastrar(OUTRA);
        cenarioDeNovembro();
        criarLancamento(criarItem(OUTRA, "Receitas", "Salário"), 2026, 11, "9000.00", "PAGO");
        criarLancamento(criarItem(OUTRA, "Doméstica", "Aluguel"), 2026, 11, "1000.00", "PAGO");

        SaldoMes s = saldos.saldo(2026, 11, dono);

        assertThat(s.saldo()).isEqualByComparingTo("5322.44");
        assertThat(s.recebidoNoMes()).isEqualByComparingTo("5500.00");
    }
}
