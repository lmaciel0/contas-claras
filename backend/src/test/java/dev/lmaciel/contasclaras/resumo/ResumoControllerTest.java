package dev.lmaciel.contasclaras.resumo;

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

class ResumoControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private long itemDe(String categoria, String nome) {
        return jdbc.queryForObject("""
                insert into item (categoria_id, nome)
                values ((select c.id from categoria c join usuario u on u.id = c.usuario_id
                         where u.email = ? and c.nome = ?), ?)
                returning id""", Long.class, DONO, categoria, nome);
    }

    private void lancar(long itemId, int ano, int mes, String valor, String status, String vencimento) {
        jdbc.update("""
                insert into lancamento (item_id, ano, mes, valor, status, vencimento)
                values (?, ?, ?, ?::numeric, ?, ?::date)""", itemId, ano, mes, valor, status, vencimento);
    }

    private ResultActions resumo(Cookie sessao, String query) throws Exception {
        return mvc.perform(get("/api/resumo" + query).cookie(sessao));
    }

    @Test
    void sem_sessao_retorna_401() throws Exception {
        mvc.perform(get("/api/resumo?ano=2026&mes=10")).andExpect(status().isUnauthorized());
    }

    @Test
    void mes_sem_dados_responde_zeros_como_string_e_anterior_null() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        resumo(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receitas").value("0.00"))
                .andExpect(jsonPath("$.despesas").value("0.00"))
                .andExpect(jsonPath("$.sobra").value("0.00"))
                .andExpect(jsonPath("$.sobraAno").value("0.00"))
                .andExpect(jsonPath("$.anterior").value(nullValue()))
                .andExpect(jsonPath("$.categorias", hasSize(0)))
                .andExpect(jsonPath("$.proximas", hasSize(0)))
                .andExpect(jsonPath("$.serieAno", hasSize(12)))
                .andExpect(jsonPath("$.serieAno[0].mes").value(1))
                .andExpect(jsonPath("$.serieAno[11].mes").value(12))
                .andExpect(jsonPath("$.serieAno[11].despesasPrevistas").value("0.00"));
    }

    @Test
    void resposta_traz_todos_os_campos_no_formato_combinado() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        lancar(itemDe("Receitas", "Salário"), 2026, 10, "5000.00", "PAGO", null);
        lancar(itemDe("Doméstica", "Aluguel"), 2026, 10, "1300.00", "PREVISTO", "2026-10-20");
        lancar(itemDe("Transporte", "Ônibus"), 2026, 10, "1400.00", "PAGO", null);
        lancar(itemDe("Transporte", "Aplicativo"), 2026, 9, "50.00", "PAGO", null);

        resumo(sessao, "?ano=2026&mes=10")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receitas").value("5000.00"))
                .andExpect(jsonPath("$.despesas").value("2700.00"))
                .andExpect(jsonPath("$.sobra").value("2300.00"))
                .andExpect(jsonPath("$.sobraAno").value("2250.00"))
                .andExpect(jsonPath("$.anterior.receitas").value("0.00"))
                .andExpect(jsonPath("$.anterior.despesas").value("50.00"))
                .andExpect(jsonPath("$.anterior.sobra").value("-50.00"))
                .andExpect(jsonPath("$.categorias", hasSize(2)))
                .andExpect(jsonPath("$.categorias[0].nome").value("Transporte"))
                .andExpect(jsonPath("$.categorias[0].total").value("1400.00"))
                .andExpect(jsonPath("$.categorias[0].percentual").value("0.5185"))
                .andExpect(jsonPath("$.categorias[1].nome").value("Doméstica"))
                .andExpect(jsonPath("$.categorias[1].percentual").value("0.4815"))
                .andExpect(jsonPath("$.proximas", hasSize(1)))
                .andExpect(jsonPath("$.proximas[0].itemNome").value("Aluguel"))
                .andExpect(jsonPath("$.proximas[0].categoriaNome").value("Doméstica"))
                .andExpect(jsonPath("$.proximas[0].valor").value("1300.00"))
                .andExpect(jsonPath("$.proximas[0].vencimento").value("2026-10-20"))
                .andExpect(jsonPath("$.proximas[0].atrasada").value(true))
                .andExpect(jsonPath("$.serieAno[9].receitas").value("5000.00"))
                .andExpect(jsonPath("$.serieAno[9].despesasPrevistas").value("1300.00"));
    }

    @Test
    void mes_fora_de_1_a_12_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        for (String mes : new String[] {"0", "13", "-1"}) {
            resumo(sessao, "?ano=2026&mes=" + mes)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("O mês deve estar entre 1 e 12."));
        }
    }

    @Test
    void ano_fora_de_2000_a_2100_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        for (String ano : new String[] {"1999", "2101"}) {
            resumo(sessao, "?ano=" + ano + "&mes=1")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("O ano deve estar entre 2000 e 2100."));
        }
        resumo(sessao, "?ano=2000&mes=1").andExpect(status().isOk());
        resumo(sessao, "?ano=2100&mes=12").andExpect(status().isOk());
    }

    @Test
    void parametros_ausentes_ou_nao_numericos_retornam_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        resumo(sessao, "").andExpect(status().isBadRequest()).andExpect(jsonPath("$.erro").exists());
        resumo(sessao, "?ano=2026").andExpect(status().isBadRequest()).andExpect(jsonPath("$.erro").exists());
        resumo(sessao, "?ano=abc&mes=1").andExpect(status().isBadRequest()).andExpect(jsonPath("$.erro").exists());
    }
}
