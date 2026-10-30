package dev.lmaciel.contasclaras.demo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import dev.lmaciel.contasclaras.IntegracaoTest;

/**
 * O seed de demonstração roda no profile {@code demo}. O e-mail dele não está em {@code ALLOWED_EMAILS}
 * dos testes: a conta nasce direto no banco, sem passar pelo cadastro.
 */
@ActiveProfiles("demo")
class DemoSeederTest extends IntegracaoTest {

    private static final String EMAIL_DEMO = "demo@contasclaras.dev";

    /** Lançamentos da conta demo com item: outros testes deixam dados de outros usuários no banco. */
    private static final String LANCAMENTOS_DEMO = """
            lancamento l join item i on i.id = l.item_id join categoria c on c.id = i.categoria_id
            join usuario u on u.id = c.usuario_id and u.email = '%s'""".formatted(EMAIL_DEMO);

    /** Itens da conta demo. */
    private static final String ITENS_DEMO = """
            item i join categoria c on c.id = i.categoria_id
            join usuario u on u.id = c.usuario_id and u.email = '%s'""".formatted(EMAIL_DEMO);

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DemoSeeder seeder;

    @Autowired
    PasswordEncoder encoder;

    /** O runner já semeou ao subir o contexto: cada teste parte de um banco sem a conta demo, e não deixa ela para os outros. */
    @BeforeEach
    @AfterEach
    void limpar() {
        jdbc.update("delete from lancamento");
        jdbc.update("delete from usuario where email = ?", EMAIL_DEMO);
    }

    private int contar(String consulta, Object... argumentos) {
        return jdbc.queryForObject(consulta, Integer.class, argumentos);
    }

    private int contarLancamentosDemo(String condicao) {
        return contar("select count(*) from " + LANCAMENTOS_DEMO + " where " + condicao);
    }

    @Test
    void cria_usuario_demo_uma_vez() {
        seeder.semear();
        int lancamentosDepoisDaPrimeira = contarLancamentosDemo("true");

        seeder.semear();

        assertThat(contar("select count(*) from usuario where email = ?", EMAIL_DEMO)).isEqualTo(1);
        assertThat(lancamentosDepoisDaPrimeira).isPositive();
        assertThat(contarLancamentosDemo("true")).isEqualTo(lancamentosDepoisDaPrimeira);
    }

    @Test
    void segunda_chamada_nao_cria_nada() {
        assertThat(seeder.semear()).isTrue();
        assertThat(seeder.semear()).isFalse();
    }

    @Test
    void senha_confere_e_o_email_nao_precisa_estar_na_lista_liberada() {
        seeder.semear();

        String hash = jdbc.queryForObject("select senha_hash from usuario where email = ?", String.class,
                EMAIL_DEMO);

        assertThat(encoder.matches("demo12345", hash)).isTrue();
        assertThat(EMAILS_LIBERADOS_TESTE).doesNotContain(EMAIL_DEMO);
    }

    @Test
    void cobre_os_12_meses_de_2026_com_lancamentos_pagos_e_previstos() {
        seeder.semear();

        List<Integer> meses = jdbc.queryForList(
                "select distinct l.mes from " + LANCAMENTOS_DEMO + " order by l.mes", Integer.class);
        List<Integer> anos = jdbc.queryForList("select distinct l.ano from " + LANCAMENTOS_DEMO, Integer.class);

        assertThat(meses).containsExactly(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
        assertThat(anos).containsExactly(2026);
        assertThat(contarLancamentosDemo("l.status = 'PAGO'")).isPositive();
        assertThat(contarLancamentosDemo("l.status = 'PREVISTO'")).isPositive();
    }

    @Test
    void tem_salario_aluguel_luz_dois_cartoes_com_limite_e_um_financiamento_repetido() {
        seeder.semear();

        assertThat(contar("select count(*) from " + ITENS_DEMO + " where i.nome in ('Salário', 'Aluguel', 'Luz')"))
                .isEqualTo(3);

        List<BigDecimal> limites = jdbc.queryForList(
                "select i.limite from " + ITENS_DEMO + " where i.cartao and i.limite is not null order by i.nome",
                BigDecimal.class);
        assertThat(limites).hasSize(2).allSatisfy(limite -> assertThat(limite).isPositive());

        List<BigDecimal> parcelas = jdbc.queryForList(
                "select l.valor from " + LANCAMENTOS_DEMO + " where i.nome like 'Financiamento%' order by l.mes",
                BigDecimal.class);
        assertThat(parcelas).hasSize(12).containsOnly(parcelas.get(0));
    }

    @Test
    void lancamentos_tem_vencimento_no_proprio_mes() {
        seeder.semear();

        assertThat(contarLancamentosDemo("""
                l.vencimento is null
                   or extract(year from l.vencimento) <> l.ano or extract(month from l.vencimento) <> l.mes"""))
                .isZero();
    }
}
