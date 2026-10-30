package dev.lmaciel.contasclaras.lancamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class LancamentoControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        // a chave de lancamento.item_id é RESTRICT: apagar o usuário só funciona sem lançamentos
        jdbc.update("delete from lancamento");
        jdbc.update("delete from usuario");
    }

    /** Sem isto os lançamentos deste teste travariam o "delete from usuario" das outras classes. */
    @AfterEach
    void limparLancamentos() {
        jdbc.update("delete from lancamento");
    }

    private long itemDe(String email, String categoria, String nome, Integer dia) {
        return jdbc.queryForObject("""
                insert into item (categoria_id, nome, dia_vencimento)
                values ((select c.id from categoria c join usuario u on u.id = c.usuario_id
                         where u.email = ? and c.nome = ?), ?, ?)
                returning id""", Long.class, email, categoria, nome, dia);
    }

    private long lancamentoDireto(long itemId, int ano, int mes, String valor, String status) {
        return jdbc.queryForObject("""
                insert into lancamento (item_id, ano, mes, valor, status)
                values (?, ?, ?, ?::numeric, ?) returning id""", Long.class, itemId, ano, mes, valor, status);
    }

    private ResultActions salvar(Cookie sessao, String corpo) throws Exception {
        return mvc.perform(put("/api/lancamentos").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private static String pedido(long itemId, int ano, int mes, String valor, String status) {
        return """
                {"itemId":%d,"ano":%d,"mes":%d,"valor":"%s","status":"%s"}""".formatted(itemId, ano, mes, valor, status);
    }

    private ResultActions listar(Cookie sessao, int ano, int mes) throws Exception {
        return mvc.perform(get("/api/lancamentos?ano=" + ano + "&mes=" + mes).cookie(sessao));
    }

    private int contar() {
        return jdbc.queryForObject("select count(*) from lancamento", Integer.class);
    }

    @Test
    void salvar_cria_lancamento_com_vencimento_padrao_do_item() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, pedido(luz, 2026, 11, "180.40", "PREVISTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].itemId").value(luz))
                .andExpect(jsonPath("$[0].itemNome").value("Luz"))
                .andExpect(jsonPath("$[0].categoriaNome").value("Doméstica"))
                .andExpect(jsonPath("$[0].tipo").value("DESPESA"))
                .andExpect(jsonPath("$[0].ano").value(2026))
                .andExpect(jsonPath("$[0].mes").value(11))
                .andExpect(jsonPath("$[0].status").value("PREVISTO"))
                .andExpect(jsonPath("$[0].vencimento").value("2026-11-10"));
    }

    @Test
    void valor_vai_no_json_como_string() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", null);

        salvar(sessao, pedido(luz, 2026, 11, "180.40", "PAGO"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"valor\":\"180.40\"")));
        listar(sessao, 2026, 11)
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"valor\":\"180.40\"")));
    }

    @Test
    void vencimento_informado_vale_mais_que_o_do_item() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":11,"valor":"50.00","status":"PREVISTO","vencimento":"2026-11-25"}"""
                .formatted(luz))
                .andExpect(jsonPath("$[0].vencimento").value("2026-11-25"));
    }

    @Test
    void item_sem_dia_fica_sem_vencimento() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", null);

        salvar(sessao, pedido(luz, 2026, 11, "50.00", "PREVISTO"))
                .andExpect(jsonPath("$[0].vencimento").doesNotExist());
    }

    @Test
    void dia_31_em_mes_curto_vira_ultimo_dia() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long aluguel = itemDe(DONO, "Doméstica", "Aluguel", 31);

        salvar(sessao, pedido(aluguel, 2026, 2, "900.00", "PREVISTO"))
                .andExpect(jsonPath("$[0].vencimento").value("2026-02-28"));
        salvar(sessao, pedido(aluguel, 2026, 4, "900.00", "PREVISTO"))
                .andExpect(jsonPath("$[0].vencimento").value("2026-04-30"));
    }

    @Test
    void salvar_de_novo_no_mesmo_mes_edita_em_vez_de_duplicar() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, pedido(luz, 2026, 11, "180.40", "PREVISTO")).andExpect(status().isOk());
        salvar(sessao, pedido(luz, 2026, 11, "190.00", "PAGO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].valor").value("190.00"))
                .andExpect(jsonPath("$[0].status").value("PAGO"));

        listar(sessao, 2026, 11)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].valor").value("190.00"));
        assertThat(contar()).isEqualTo(1);
    }

    @Test
    void valor_com_tres_casas_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, pedido(luz, 2026, 11, "10.999", "PREVISTO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Valor inválido."));
        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":11,"valor":10.999,"status":"PREVISTO"}""".formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Valor inválido."));
        assertThat(contar()).isZero();
    }

    @Test
    void valor_zero_negativo_ou_grande_demais_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        for (String valor : new String[] {"0", "0.00", "-5.00", "10000000000.00"}) {
            salvar(sessao, pedido(luz, 2026, 11, valor, "PREVISTO"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("Valor inválido."));
        }
        assertThat(contar()).isZero();
        // o teto exato cabe em numeric(12,2)
        salvar(sessao, pedido(luz, 2026, 11, "9999999999.99", "PREVISTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].valor").value("9999999999.99"));
    }

    @Test
    void valor_ausente_ou_dados_incompletos_retornam_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":11,"status":"PREVISTO"}""".formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Valor inválido."));
        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":13,"valor":"1.00","status":"PREVISTO"}""".formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O mês deve estar entre 1 e 12."));
        salvar(sessao, """
                {"itemId":%d,"ano":1999,"mes":1,"valor":"1.00","status":"PREVISTO"}""".formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O ano deve estar entre 2000 e 2100."));
        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":1,"valor":"1.00"}""".formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o status."));
        salvar(sessao, """
                {"ano":2026,"mes":1,"valor":"1.00","status":"PAGO"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o item."));
        assertThat(contar()).isZero();
    }

    @Test
    void repetir_ate_cria_previstos_sem_sobrescrever() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        lancamentoDireto(luz, 2026, 12, "650.00", "PAGO");

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":10,"valor":"500.00","status":"PAGO","repetirAte":{"ano":2027,"mes":1}}"""
                .formatted(luz))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].mes").value(10))
                .andExpect(jsonPath("$[0].status").value("PAGO"))
                .andExpect(jsonPath("$[1].ano").value(2026))
                .andExpect(jsonPath("$[1].mes").value(11))
                .andExpect(jsonPath("$[1].valor").value("500.00"))
                .andExpect(jsonPath("$[1].status").value("PREVISTO"))
                .andExpect(jsonPath("$[1].vencimento").value("2026-11-10"))
                .andExpect(jsonPath("$[2].ano").value(2027))
                .andExpect(jsonPath("$[2].mes").value(1))
                .andExpect(jsonPath("$[2].valor").value("500.00"))
                .andExpect(jsonPath("$[2].status").value("PREVISTO"))
                .andExpect(jsonPath("$[2].vencimento").value("2027-01-10"));

        // dezembro segue como estava
        listar(sessao, 2026, 12)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].valor").value("650.00"))
                .andExpect(jsonPath("$[0].status").value("PAGO"));
        assertThat(contar()).isEqualTo(4);
    }

    @Test
    void repetir_ate_usa_o_ultimo_dia_em_mes_curto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long aluguel = itemDe(DONO, "Doméstica", "Aluguel", 31);

        salvar(sessao, """
                {"itemId":%d,"ano":2027,"mes":1,"valor":"900.00","status":"PAGO","repetirAte":{"ano":2027,"mes":3}}"""
                .formatted(aluguel))
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].vencimento").value("2027-01-31"))
                .andExpect(jsonPath("$[1].vencimento").value("2027-02-28"))
                .andExpect(jsonPath("$[2].vencimento").value("2027-03-31"));
    }

    @Test
    void repetir_ate_no_limite_de_60_meses_e_aceito() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":11,"valor":"10.00","status":"PREVISTO","repetirAte":{"ano":2031,"mes":11}}"""
                .formatted(luz))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(61)));
    }

    @Test
    void repetir_ate_mais_de_60_meses_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":11,"valor":"10.00","status":"PREVISTO","repetirAte":{"ano":2031,"mes":12}}"""
                .formatted(luz))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Período de repetição inválido."));
        assertThat(contar()).isZero();
    }

    @Test
    void repetir_ate_igual_ou_antes_do_mes_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);

        for (String ate : new String[] {"{\"ano\":2026,\"mes\":11}", "{\"ano\":2026,\"mes\":10}",
                "{\"ano\":2025,\"mes\":12}"}) {
            salvar(sessao, """
                    {"itemId":%d,"ano":2026,"mes":11,"valor":"10.00","status":"PREVISTO","repetirAte":%s}"""
                    .formatted(luz, ate))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("Período de repetição inválido."));
        }
        assertThat(contar()).isZero();
    }

    @Test
    void patch_status_marca_pago() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long id = lancamentoDireto(luz, 2026, 11, "180.40", "PREVISTO");

        mvc.perform(patch("/api/lancamentos/" + id + "/status").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"status":"PAGO"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("PAGO"))
                .andExpect(jsonPath("$.valor").value("180.40"));

        assertThat(jdbc.queryForObject("select status from lancamento where id = ?", String.class, id))
                .isEqualTo("PAGO");
    }

    @Test
    void patch_status_sem_status_ou_invalido_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long id = lancamentoDireto(luz, 2026, 11, "180.40", "PREVISTO");

        mvc.perform(patch("/api/lancamentos/" + id + "/status").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o status."));
        mvc.perform(patch("/api/lancamentos/" + id + "/status").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"status":"ATRASADO"}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void apaga_lancamento() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long id = lancamentoDireto(luz, 2026, 11, "180.40", "PREVISTO");

        mvc.perform(delete("/api/lancamentos/" + id).cookie(sessao))
                .andExpect(status().isNoContent());
        assertThat(contar()).isZero();
        mvc.perform(delete("/api/lancamentos/" + id).cookie(sessao))
                .andExpect(status().isNotFound());
    }

    @Test
    void lancamento_de_outro_usuario_retorna_404() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long id = lancamentoDireto(luz, 2026, 11, "180.40", "PREVISTO");

        mvc.perform(patch("/api/lancamentos/" + id + "/status").cookie(outra)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"status":"PAGO"}"""))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Não encontrado."));
        mvc.perform(delete("/api/lancamentos/" + id).cookie(outra))
                .andExpect(status().isNotFound());
        salvar(outra, pedido(luz, 2026, 11, "1.00", "PAGO"))
                .andExpect(status().isNotFound());
        salvar(outra, pedido(luz, 2026, 12, "1.00", "PAGO"))
                .andExpect(status().isNotFound());
        listar(outra, 2026, 11).andExpect(jsonPath("$", hasSize(0)));

        // nada mudou para o dono
        assertThat(contar()).isEqualTo(1);
        listar(dono, 2026, 11)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("PREVISTO"))
                .andExpect(jsonPath("$[0].valor").value("180.40"));
    }

    @Test
    void item_arquivado_recusa_lancamento_novo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long existente = lancamentoDireto(luz, 2026, 10, "100.00", "PREVISTO");
        jdbc.update("update item set arquivado = true where id = ?", luz);

        salvar(sessao, pedido(luz, 2026, 11, "180.40", "PREVISTO"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Item arquivado."));
        assertThat(contar()).isEqualTo(1);

        // editar o que já existe continua permitido
        salvar(sessao, pedido(luz, 2026, 10, "120.00", "PAGO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(existente))
                .andExpect(jsonPath("$[0].valor").value("120.00"));
        mvc.perform(patch("/api/lancamentos/" + existente + "/status").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"status":"PREVISTO"}"""))
                .andExpect(status().isOk());
    }

    @Test
    void repetir_em_item_arquivado_nao_cria_os_meses_novos() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        lancamentoDireto(luz, 2026, 10, "100.00", "PREVISTO");
        jdbc.update("update item set arquivado = true where id = ?", luz);

        salvar(sessao, """
                {"itemId":%d,"ano":2026,"mes":10,"valor":"120.00","status":"PAGO","repetirAte":{"ano":2026,"mes":12}}"""
                .formatted(luz))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Item arquivado."));
        assertThat(contar()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select valor from lancamento", String.class)).isEqualTo("100.00");
    }

    @Test
    void lista_do_mes_na_ordem_da_categoria_e_nome_do_item() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long salario = itemDe(DONO, "Receitas", "Salário", 5);
        long luz = itemDe(DONO, "Doméstica", "Luz", 10);
        long agua = itemDe(DONO, "Doméstica", "Água", 12);
        long cabelo = itemDe(DONO, "Pessoais", "Cabelo", null);
        long outroMes = itemDe(DONO, "Doméstica", "Gás", null);
        lancamentoDireto(cabelo, 2026, 11, "80.00", "PREVISTO");
        lancamentoDireto(luz, 2026, 11, "180.40", "PAGO");
        lancamentoDireto(salario, 2026, 11, "3000.00", "PAGO");
        lancamentoDireto(agua, 2026, 11, "70.00", "PREVISTO");
        lancamentoDireto(outroMes, 2026, 10, "60.00", "PAGO");

        listar(sessao, 2026, 11)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].itemNome").value("Salário"))
                .andExpect(jsonPath("$[0].tipo").value("RECEITA"))
                .andExpect(jsonPath("$[1].itemNome").value("Água"))
                .andExpect(jsonPath("$[2].itemNome").value("Luz"))
                .andExpect(jsonPath("$[3].itemNome").value("Cabelo"))
                .andExpect(jsonPath("$[3].categoriaNome").value("Pessoais"));
    }

    @Test
    void listar_com_mes_invalido_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(get("/api/lancamentos?ano=2026&mes=13").cookie(sessao))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O mês deve estar entre 1 e 12."));
        mvc.perform(get("/api/lancamentos?ano=2026").cookie(sessao))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rotas_exigem_sessao() throws Exception {
        mvc.perform(get("/api/lancamentos?ano=2026&mes=11")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/lancamentos").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
