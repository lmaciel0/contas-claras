package dev.lmaciel.contasclaras.relatorio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class RelatorioControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private ResultActions relatorio(Cookie sessao, String ano) throws Exception {
        return mvc.perform(get("/api/relatorios/ano/" + ano).cookie(sessao));
    }

    private static List<BigDecimal> valores(String json, String caminho) {
        List<String> lidos = JsonPath.read(json, caminho);
        return lidos.stream().map(BigDecimal::new).toList();
    }

    @Test
    void sem_sessao_retorna_401() throws Exception {
        mvc.perform(get("/api/relatorios/ano/2026")).andExpect(status().isUnauthorized());
    }

    @Test
    void ano_sem_lancamentos_traz_12_meses_zerados() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        relatorio(sessao, "2026")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ano").value(2026))
                .andExpect(jsonPath("$.categorias", hasSize(0)))
                .andExpect(jsonPath("$.receitasMes", hasSize(12)))
                .andExpect(jsonPath("$.despesasMes", hasSize(12)))
                .andExpect(jsonPath("$.diferencaMes", hasSize(12)))
                .andExpect(jsonPath("$.receitasMes[0]").value("0.00"))
                .andExpect(jsonPath("$.diferencaMes[11]").value("0.00"))
                .andExpect(jsonPath("$.receitasAno").value("0.00"))
                .andExpect(jsonPath("$.despesasAno").value("0.00"))
                .andExpect(jsonPath("$.diferencaAno").value("0.00"));
    }

    @Test
    void relatorio_tem_12_meses_e_totais() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long salario = criarItem(DONO, "Receitas", "Salário");
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        long luz = criarItem(DONO, "Doméstica", "Luz");
        long onibus = criarItem(DONO, "Transporte", "Ônibus");
        criarLancamento(salario, 2026, 1, "5000.00", "PAGO");
        criarLancamento(salario, 2026, 2, "5000.00", "PAGO");
        criarLancamento(aluguel, 2026, 1, "1500.00", "PAGO");
        criarLancamento(aluguel, 2026, 2, "1500.00", "PREVISTO");
        criarLancamento(aluguel, 2026, 3, "1000.00", "PREVISTO");
        criarLancamento(luz, 2026, 1, "180.40", "PAGO");
        criarLancamento(onibus, 2026, 1, "200.00", "PAGO");
        criarLancamento(onibus, 2026, 12, "50.10", "PREVISTO");

        String json = relatorio(sessao, "2026")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ano").value(2026))
                .andExpect(jsonPath("$.categorias", hasSize(3)))
                .andExpect(jsonPath("$.categorias[0].nome").value("Receitas"))
                .andExpect(jsonPath("$.categorias[0].tipo").value("RECEITA"))
                .andExpect(jsonPath("$.categorias[0].itens[0].itemId").value(salario))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses", hasSize(12)))
                .andExpect(jsonPath("$.categorias[0].itens[0].total").value("10000.00"))
                .andExpect(jsonPath("$.categorias[0].totaisMes", hasSize(12)))
                .andExpect(jsonPath("$.categorias[0].totaisMes[2]").value("0.00"))
                .andExpect(jsonPath("$.categorias[0].total").value("10000.00"))
                .andExpect(jsonPath("$.categorias[1].nome").value("Doméstica"))
                .andExpect(jsonPath("$.categorias[1].itens", hasSize(2)))
                .andExpect(jsonPath("$.categorias[1].itens[0].nome").value("Aluguel"))
                .andExpect(jsonPath("$.categorias[1].itens[0].total").value("4000.00"))
                .andExpect(jsonPath("$.categorias[1].itens[1].nome").value("Luz"))
                .andExpect(jsonPath("$.categorias[1].totaisMes[0]").value("1680.40"))
                .andExpect(jsonPath("$.categorias[1].totaisMes[1]").value("1500.00"))
                .andExpect(jsonPath("$.categorias[1].total").value("4180.40"))
                .andExpect(jsonPath("$.categorias[2].nome").value("Transporte"))
                .andExpect(jsonPath("$.categorias[2].total").value("250.10"))
                .andExpect(jsonPath("$.receitasMes[0]").value("5000.00"))
                .andExpect(jsonPath("$.despesasMes[0]").value("1880.40"))
                .andExpect(jsonPath("$.diferencaMes[0]").value("3119.60"))
                .andExpect(jsonPath("$.diferencaMes[2]").value("-1000.00"))
                .andExpect(jsonPath("$.diferencaMes[11]").value("-50.10"))
                .andExpect(jsonPath("$.receitasAno").value("10000.00"))
                .andExpect(jsonPath("$.despesasAno").value("4430.50"))
                .andExpect(jsonPath("$.diferencaAno").value("5569.50"))
                .andReturn().getResponse().getContentAsString();

        List<BigDecimal> receitas = valores(json, "$.receitasMes");
        List<BigDecimal> despesas = valores(json, "$.despesasMes");
        List<BigDecimal> diferenca = valores(json, "$.diferencaMes");
        for (int i = 0; i < 12; i++) {
            assertThat(diferenca.get(i)).isEqualByComparingTo(receitas.get(i).subtract(despesas.get(i)));
        }
        BigDecimal somaCategorias = BigDecimal.ZERO;
        for (int c = 0; c < 3; c++) {
            List<BigDecimal> totaisMes = valores(json, "$.categorias[" + c + "].totaisMes");
            BigDecimal totalCategoria = new BigDecimal(JsonPath.<String>read(json, "$.categorias[" + c + "].total"));
            assertThat(totaisMes.stream().reduce(BigDecimal.ZERO, BigDecimal::add))
                    .isEqualByComparingTo(totalCategoria);
            somaCategorias = somaCategorias.add(totalCategoria);
        }
        assertThat(somaCategorias).isEqualByComparingTo("14430.50");
        assertThat(receitas.stream().reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("10000.00");
        assertThat(despesas.stream().reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("4430.50");
    }

    @Test
    void relatorio_marca_status_por_celula_e_null_sem_lancamento() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long aluguel = criarItem(DONO, "Doméstica", "Aluguel");
        criarLancamento(aluguel, 2026, 3, "1000.00", "PAGO");
        criarLancamento(aluguel, 2026, 4, "1100.00", "PREVISTO");

        relatorio(sessao, "2026")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[0]").value(nullValue()))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[1]").value(nullValue()))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[2].valor").value("1000.00"))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[2].status").value("PAGO"))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[3].valor").value("1100.00"))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[3].status").value("PREVISTO"))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[4]").value(nullValue()))
                .andExpect(jsonPath("$.categorias[0].itens[0].meses[11]").value(nullValue()));
    }

    @Test
    void relatorio_traz_so_itens_com_lancamento_no_ano_incluindo_arquivados() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long ativo = criarItem(DONO, "Doméstica", "Aluguel");
        long arquivado = criarItem(DONO, "Doméstica", "Internet antiga");
        criarItem(DONO, "Doméstica", "Sem lançamento");
        long outroAno = criarItem(DONO, "Doméstica", "Só em 2025");
        jdbc.update("update item set arquivado = true where id = ?", arquivado);
        criarLancamento(ativo, 2026, 5, "1000.00", "PAGO");
        criarLancamento(arquivado, 2026, 2, "99.90", "PAGO");
        criarLancamento(outroAno, 2025, 12, "300.00", "PAGO");

        relatorio(sessao, "2026")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categorias", hasSize(1)))
                .andExpect(jsonPath("$.categorias[0].itens", hasSize(2)))
                .andExpect(jsonPath("$.categorias[0].itens[0].nome").value("Aluguel"))
                .andExpect(jsonPath("$.categorias[0].itens[1].nome").value("Internet antiga"))
                .andExpect(jsonPath("$.categorias[0].total").value("1099.90"))
                .andExpect(jsonPath("$.despesasAno").value("1099.90"));
    }

    @Test
    void relatorio_ordena_receitas_primeiro_e_depois_por_ordem() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        // Ordem padrão: Receitas(0), Doméstica(1), Transporte(2)... Pessoais(10).
        criarLancamento(criarItem(DONO, "Pessoais", "Presente"), 2026, 1, "10.00", "PAGO");
        criarLancamento(criarItem(DONO, "Transporte", "Ônibus"), 2026, 1, "20.00", "PAGO");
        criarLancamento(criarItem(DONO, "Receitas", "Salário"), 2026, 1, "30.00", "PAGO");
        criarLancamento(criarItem(DONO, "Doméstica", "Luz"), 2026, 1, "40.00", "PAGO");
        // Pessoais passa a ser a primeira das despesas; Receitas, com a maior ordem, segue na frente.
        jdbc.update("update categoria set ordem = 100 where nome = 'Receitas'");
        jdbc.update("update categoria set ordem = -1 where nome = 'Pessoais'");

        relatorio(sessao, "2026")
                .andExpect(jsonPath("$.categorias", hasSize(4)))
                .andExpect(jsonPath("$.categorias[0].nome").value("Receitas"))
                .andExpect(jsonPath("$.categorias[1].nome").value("Pessoais"))
                .andExpect(jsonPath("$.categorias[2].nome").value("Doméstica"))
                .andExpect(jsonPath("$.categorias[3].nome").value("Transporte"));
    }

    @Test
    void relatorio_de_outro_usuario_nao_vaza_dados() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        cadastrarEEntrar(OUTRA);
        criarLancamento(criarItem(DONO, "Doméstica", "Aluguel"), 2026, 1, "1000.00", "PAGO");
        criarLancamento(criarItem(OUTRA, "Receitas", "Salário alheio"), 2026, 1, "9000.00", "PAGO");
        criarLancamento(criarItem(OUTRA, "Doméstica", "Aluguel alheio"), 2026, 1, "7000.00", "PAGO");

        relatorio(sessao, "2026")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categorias", hasSize(1)))
                .andExpect(jsonPath("$.categorias[0].itens", hasSize(1)))
                .andExpect(jsonPath("$.categorias[0].itens[0].nome").value("Aluguel"))
                .andExpect(jsonPath("$.receitasAno").value("0.00"))
                .andExpect(jsonPath("$.despesasAno").value("1000.00"))
                .andExpect(jsonPath("$.diferencaAno").value("-1000.00"));
    }

    @Test
    void ano_fora_de_2000_a_2100_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        for (String ano : new String[] {"1999", "2101"}) {
            relatorio(sessao, ano)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("O ano deve estar entre 2000 e 2100."));
        }
        relatorio(sessao, "2000").andExpect(status().isOk());
        relatorio(sessao, "2100").andExpect(status().isOk());
        relatorio(sessao, "abc").andExpect(status().isBadRequest()).andExpect(jsonPath("$.erro").exists());
    }
}
