package dev.lmaciel.contasclaras.cartao;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class CartaoControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private ResultActions cartoes(Cookie sessao, String query) throws Exception {
        return mvc.perform(get("/api/cartoes" + query).cookie(sessao));
    }

    /** Cria um item de cartão na categoria "Cartões de crédito"; {@code limite} e {@code dia} podem ser null. */
    private long criarCartao(String email, String nome, String limite, Integer dia) {
        return criarCartao(email, nome, limite, dia, null);
    }

    private long criarCartao(String email, String nome, String limite, Integer dia, String titular) {
        long id = criarItem(email, "Cartões de crédito", nome);
        jdbc.update("update item set cartao = true, limite = ?::numeric, dia_vencimento = ?, titular = ? where id = ?",
                limite, dia, titular, id);
        return id;
    }

    @Test
    void cartoes_retorna_titular_do_cartao() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long c1 = criarCartao(DONO, "Cartão Diana", "2000.00", 5, "Diana");
        long c2 = criarCartao(DONO, "Cartão Meu", "5000.00", 10, null);
        criarLancamento(c1, 2026, 10, "500.00", "PREVISTO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartoes[0].itemId").value(c1))
                .andExpect(jsonPath("$.cartoes[0].titular").value("Diana"))
                .andExpect(jsonPath("$.cartoes[1].itemId").value(c2))
                .andExpect(jsonPath("$.cartoes[1].titular").value(nullValue()));
    }

    @Test
    void sem_sessao_retorna_401() throws Exception {
        mvc.perform(get("/api/cartoes?ano=2026&mes=10")).andExpect(status().isUnauthorized());
    }

    @Test
    void cartoes_calcula_uso_por_cartao_e_geral() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long a = criarCartao(DONO, "Cartão A", "1000.00", 10);
        long b = criarCartao(DONO, "Cartão B", null, null);
        criarLancamento(a, 2026, 10, "730.00", "PREVISTO");
        criarLancamento(b, 2026, 10, "200.00", "PREVISTO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFaturas").value("930.00"))
                .andExpect(jsonPath("$.limiteTotal").value("1000.00"))
                .andExpect(jsonPath("$.usoGeral").value("0.7300"))
                .andExpect(jsonPath("$.cartoes", hasSize(2)))
                .andExpect(jsonPath("$.cartoes[0].itemId").value(a))
                .andExpect(jsonPath("$.cartoes[0].nome").value("Cartão A"))
                .andExpect(jsonPath("$.cartoes[0].diaVencimento").value(10))
                .andExpect(jsonPath("$.cartoes[0].fatura").value("730.00"))
                .andExpect(jsonPath("$.cartoes[0].limite").value("1000.00"))
                .andExpect(jsonPath("$.cartoes[0].uso").value("0.7300"))
                .andExpect(jsonPath("$.cartoes[0].faixa").value("AMARELO"))
                .andExpect(jsonPath("$.cartoes[1].itemId").value(b))
                .andExpect(jsonPath("$.cartoes[1].diaVencimento").value(nullValue()))
                .andExpect(jsonPath("$.cartoes[1].fatura").value("200.00"))
                .andExpect(jsonPath("$.cartoes[1].limite").value(nullValue()))
                .andExpect(jsonPath("$.cartoes[1].uso").value(nullValue()))
                .andExpect(jsonPath("$.cartoes[1].faixa").value("SEM_LIMITE"));
    }

    @Test
    void usoGeral_so_conta_cartoes_com_limite() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long a = criarCartao(DONO, "Cartão A", "1000.00", null);
        long b = criarCartao(DONO, "Cartão B", "3000.00", null);
        long semLimite = criarCartao(DONO, "Cartão C", null, null);
        criarLancamento(a, 2026, 10, "900.00", "PAGO");
        criarLancamento(b, 2026, 10, "300.00", "PAGO");
        criarLancamento(semLimite, 2026, 10, "5000.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFaturas").value("6200.00"))
                .andExpect(jsonPath("$.limiteTotal").value("4000.00"))
                .andExpect(jsonPath("$.usoGeral").value("0.3000"));
    }

    @Test
    void faixas_seguem_os_limites_de_uso() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarLancamento(criarCartao(DONO, "Verde", "1000.00", null), 2026, 10, "500.00", "PAGO");
        criarLancamento(criarCartao(DONO, "Amarelo", "1000.00", null), 2026, 10, "800.00", "PAGO");
        criarLancamento(criarCartao(DONO, "Vermelho", "1000.00", null), 2026, 10, "810.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(jsonPath("$.cartoes[0].nome").value("Vermelho"))
                .andExpect(jsonPath("$.cartoes[0].faixa").value("VERMELHO"))
                .andExpect(jsonPath("$.cartoes[1].nome").value("Amarelo"))
                .andExpect(jsonPath("$.cartoes[1].faixa").value("AMARELO"))
                .andExpect(jsonPath("$.cartoes[2].nome").value("Verde"))
                .andExpect(jsonPath("$.cartoes[2].faixa").value("VERDE"));
    }

    @Test
    void uso_tem_4_casas_arredondando_para_cima_na_metade() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarLancamento(criarCartao(DONO, "Cartão A", "20000.00", null), 2026, 10, "1.00", "PAGO");
        criarLancamento(criarCartao(DONO, "Cartão B", "300.00", null), 2026, 10, "100.00", "PAGO");

        // 100 / 300 = 0.3333...; 1 / 20000 = 0.00005 (metade) sobe para 0.0001.
        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(jsonPath("$.cartoes[0].nome").value("Cartão B"))
                .andExpect(jsonPath("$.cartoes[0].uso").value("0.3333"))
                .andExpect(jsonPath("$.cartoes[1].nome").value("Cartão A"))
                .andExpect(jsonPath("$.cartoes[1].uso").value("0.0001"));
    }

    @Test
    void cartao_sem_lancamento_no_mes_tem_fatura_zero() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long a = criarCartao(DONO, "Cartão A", "1000.00", 5);
        criarLancamento(a, 2026, 9, "400.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFaturas").value("0.00"))
                .andExpect(jsonPath("$.limiteTotal").value("1000.00"))
                .andExpect(jsonPath("$.usoGeral").value("0.0000"))
                .andExpect(jsonPath("$.cartoes", hasSize(1)))
                .andExpect(jsonPath("$.cartoes[0].fatura").value("0.00"))
                .andExpect(jsonPath("$.cartoes[0].uso").value("0.0000"))
                .andExpect(jsonPath("$.cartoes[0].faixa").value("VERDE"));
    }

    @Test
    void sem_cartoes_responde_zeros_e_usoGeral_null() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long semLimite = criarCartao(DONO, "Cartão A", null, null);
        criarLancamento(semLimite, 2026, 10, "200.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(jsonPath("$.totalFaturas").value("200.00"))
                .andExpect(jsonPath("$.limiteTotal").value("0.00"))
                .andExpect(jsonPath("$.usoGeral").value(nullValue()));

        jdbc.update("update item set cartao = false");
        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(jsonPath("$.cartoes", hasSize(0)))
                .andExpect(jsonPath("$.totalFaturas").value("0.00"))
                .andExpect(jsonPath("$.limiteTotal").value("0.00"))
                .andExpect(jsonPath("$.usoGeral").value(nullValue()));
    }

    @Test
    void cartoes_ignora_item_arquivado_e_nao_cartao() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long ativo = criarCartao(DONO, "Cartão ativo", "1000.00", null);
        long arquivado = criarCartao(DONO, "Cartão antigo", "2000.00", null);
        jdbc.update("update item set arquivado = true where id = ?", arquivado);
        long comum = criarItem(DONO, "Doméstica", "Aluguel");
        criarLancamento(ativo, 2026, 10, "100.00", "PAGO");
        criarLancamento(arquivado, 2026, 10, "999.00", "PAGO");
        criarLancamento(comum, 2026, 10, "1300.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartoes", hasSize(1)))
                .andExpect(jsonPath("$.cartoes[0].nome").value("Cartão ativo"))
                .andExpect(jsonPath("$.totalFaturas").value("100.00"))
                .andExpect(jsonPath("$.limiteTotal").value("1000.00"));
    }

    @Test
    void cartoes_de_outro_usuario_nao_vazam() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        cadastrarEEntrar(OUTRA);
        criarLancamento(criarCartao(DONO, "Cartão do dono", "1000.00", null), 2026, 10, "100.00", "PAGO");
        criarLancamento(criarCartao(OUTRA, "Cartão alheio", "5000.00", null), 2026, 10, "4000.00", "PAGO");

        cartoes(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartoes", hasSize(1)))
                .andExpect(jsonPath("$.cartoes[0].nome").value("Cartão do dono"))
                .andExpect(jsonPath("$.totalFaturas").value("100.00"))
                .andExpect(jsonPath("$.limiteTotal").value("1000.00"))
                .andExpect(jsonPath("$.usoGeral").value("0.1000"));
    }

    @Test
    void mes_e_ano_fora_do_intervalo_retornam_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        cartoes(sessao, "?ano=2026&mes=13")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O mês deve estar entre 1 e 12."));
        cartoes(sessao, "?ano=1999&mes=1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O ano deve estar entre 2000 e 2100."));
        cartoes(sessao, "?ano=2026").andExpect(status().isBadRequest()).andExpect(jsonPath("$.erro").exists());
    }
}
