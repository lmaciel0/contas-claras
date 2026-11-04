package dev.lmaciel.aprumo.saldo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.aprumo.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class SaldoControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    @Test
    void saldo_do_mes_de_inicio() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 11, "5500.00", "PAGO");

        mvc.perform(get("/api/saldo?ano=2026&mes=11").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.saldo").value("5500.00"))
                .andExpect(jsonPath("$.recebidoNoMes").value("5500.00"));
    }

    @Test
    void sem_sessao_retorna_401() throws Exception {
        mvc.perform(get("/api/saldo?ano=2026&mes=11")).andExpect(status().isUnauthorized());
    }

    @Test
    void mes_invalido_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(get("/api/saldo?ano=2026&mes=13").cookie(sessao)).andExpect(status().isBadRequest());
    }

    @Test
    void sem_mes_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(get("/api/saldo?ano=2026").cookie(sessao)).andExpect(status().isBadRequest());
    }

    @Test
    void ano_nao_numerico_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(get("/api/saldo?ano=abc&mes=11").cookie(sessao)).andExpect(status().isBadRequest());
    }
}
