package dev.lmaciel.contasclaras.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class ItemControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private long categoriaId(String email, String nome) {
        return jdbc.queryForObject("""
                select c.id from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? and c.nome = ?""", Long.class, email, nome);
    }

    private ResultActions criarItem(Cookie sessao, long categoriaId, String corpo) throws Exception {
        return mvc.perform(post("/api/categorias/" + categoriaId + "/itens").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private ResultActions editarItem(Cookie sessao, long itemId, String corpo) throws Exception {
        return mvc.perform(put("/api/itens/" + itemId).cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content(corpo));
    }

    private long idDoItem(ResultActions criado) throws Exception {
        String corpo = criado.andReturn().getResponse().getContentAsString();
        return Long.parseLong(corpo.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    @Test
    void cria_item_simples() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");

        criarItem(sessao, casa, """
                {"nome":"Luz","diaVencimento":10,"cartao":false}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Luz"))
                .andExpect(jsonPath("$.diaVencimento").value(10))
                .andExpect(jsonPath("$.cartao").value(false))
                .andExpect(jsonPath("$.limite").doesNotExist())
                .andExpect(jsonPath("$.arquivado").value(false));
    }

    @Test
    void cria_item_cartao_com_limite() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long cartoes = categoriaId(DONO, "Cartões de crédito");

        criarItem(sessao, cartoes, """
                {"nome":"Cartão Roxo","diaVencimento":15,"cartao":true,"limite":1500.5}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Cartão Roxo"))
                .andExpect(jsonPath("$.cartao").value(true))
                .andExpect(jsonPath("$.limite").value("1500.50"));

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$[6].nome").value("Cartões de crédito"))
                .andExpect(jsonPath("$[6].itens", hasSize(1)))
                .andExpect(jsonPath("$[6].itens[0].limite").value("1500.50"));
    }

    @Test
    void cria_e_edita_item_com_titular() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long cartoes = categoriaId(DONO, "Cartões de crédito");

        ResultActions criado = criarItem(sessao, cartoes, """
                {"nome":"Nubank Diana","diaVencimento":5,"cartao":true,"limite":2500,"titular":"Diana"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Nubank Diana"))
                .andExpect(jsonPath("$.titular").value("Diana"));

        long id = idDoItem(criado);

        editarItem(sessao, id, """
                {"nome":"Nubank Diana","diaVencimento":5,"cartao":true,"limite":3000,"arquivado":false,"titular":"Diana Mendonça"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titular").value("Diana Mendonça"));
    }

    @Test
    void item_dia_vencimento_32_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");

        criarItem(sessao, casa, """
                {"nome":"Luz","diaVencimento":32,"cartao":false}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O dia de vencimento deve estar entre 1 e 31."));
        criarItem(sessao, casa, """
                {"nome":"Luz","diaVencimento":0,"cartao":false}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O dia de vencimento deve estar entre 1 e 31."));

        assertThat(jdbc.queryForObject("select count(*) from item", Integer.class)).isZero();
    }

    @Test
    void item_limite_invalido_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long cartoes = categoriaId(DONO, "Cartões de crédito");

        for (String limite : new String[] {"0", "-10", "10.999", "\"10.999\"", "1e999999999"}) {
            criarItem(sessao, cartoes, """
                    {"nome":"Cartão","cartao":true,"limite":%s}""".formatted(limite))
                    .andExpect(status().isBadRequest());
        }
        criarItem(sessao, cartoes, """
                {"nome":"Cartão","cartao":true,"limite":0}""")
                .andExpect(jsonPath("$.erro").value("O limite deve ser maior que zero."));
        criarItem(sessao, cartoes, """
                {"nome":"Cartão","cartao":true,"limite":10.999}""")
                .andExpect(jsonPath("$.erro").value("O limite deve ter no máximo 2 casas decimais."));
        // 11 dígitos inteiros não cabem em numeric(12,2)
        criarItem(sessao, cartoes, """
                {"nome":"Cartão","cartao":true,"limite":12345678901.00}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O limite deve ser no máximo 9.999.999.999,99."));

        assertThat(jdbc.queryForObject("select count(*) from item", Integer.class)).isZero();
    }

    @Test
    void item_sem_nome_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");

        criarItem(sessao, casa, """
                {"nome":" ","cartao":false}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome do item."));
    }

    @Test
    void item_nome_duplicado_retorna_409() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");
        criarItem(sessao, casa, """
                {"nome":"Luz","cartao":false}""").andExpect(status().isCreated());
        long agua = idDoItem(criarItem(sessao, casa, """
                {"nome":"Água","cartao":false}"""));

        criarItem(sessao, casa, """
                {"nome":"Luz","cartao":false}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe um item com esse nome."));

        editarItem(sessao, agua, """
                {"nome":"Luz","cartao":false,"arquivado":false}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe um item com esse nome."));

        // mesmo nome em outra categoria é permitido
        criarItem(sessao, categoriaId(DONO, "Pessoais"), """
                {"nome":"Luz","cartao":false}""").andExpect(status().isCreated());
    }

    @Test
    void edita_item() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");
        long id = idDoItem(criarItem(sessao, casa, """
                {"nome":"Luz","diaVencimento":10,"cartao":false}"""));

        // PUT substitui tudo: diaVencimento e limite ausentes viram nulos
        editarItem(sessao, id, """
                {"nome":"Energia","cartao":false,"arquivado":false}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.nome").value("Energia"))
                .andExpect(jsonPath("$.diaVencimento").doesNotExist());
    }

    @Test
    void editar_item_sem_informar_arquivado_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = idDoItem(criarItem(sessao, categoriaId(DONO, "Doméstica"), """
                {"nome":"Luz","cartao":false}"""));

        editarItem(sessao, id, """
                {"nome":"Luz","cartao":false}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe se o item está arquivado."));
    }

    @Test
    void arquivar_item_mantem_no_get_com_arquivado_true() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long casa = categoriaId(DONO, "Doméstica");
        long id = idDoItem(criarItem(sessao, casa, """
                {"nome":"Luz","diaVencimento":10,"cartao":false}"""));

        editarItem(sessao, id, """
                {"nome":"Luz","diaVencimento":10,"cartao":false,"arquivado":true}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.arquivado").value(true));

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$[1].itens", hasSize(1)))
                .andExpect(jsonPath("$[1].itens[0].nome").value("Luz"))
                .andExpect(jsonPath("$[1].itens[0].arquivado").value(true));
    }

    @Test
    void item_inexistente_ou_de_outro_usuario_retorna_404() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long id = idDoItem(criarItem(sessao, categoriaId(DONO, "Doméstica"), """
                {"nome":"Luz","cartao":false}"""));

        editarItem(outra, id, """
                {"nome":"Invadido","cartao":false,"arquivado":true}""")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Não encontrado."));
        editarItem(sessao, id + 1000, """
                {"nome":"Luz","cartao":false,"arquivado":false}""")
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/categorias").cookie(outra))
                .andExpect(jsonPath("$[1].itens", hasSize(0)));
    }
}
