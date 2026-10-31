package dev.lmaciel.contasclaras.categoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class CategoriaControllerTest extends IntegracaoTest {

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

    private long itemDe(String email, String categoria, String nome) {
        return jdbc.queryForObject(
                "insert into item (categoria_id, nome) values (?, ?) returning id",
                Long.class, categoriaId(email, categoria), nome);
    }

    @Test
    void lista_categorias_do_usuario_em_ordem() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        cadastrarEEntrar(OUTRA);
        long casa = categoriaId(DONO, "Doméstica");
        jdbc.update("insert into item (categoria_id, nome) values (?, 'Luz'), (?, 'Aluguel')", casa, casa);

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(11)))
                .andExpect(jsonPath("$[0].nome").value("Receitas"))
                .andExpect(jsonPath("$[0].tipo").value("RECEITA"))
                .andExpect(jsonPath("$[0].ordem").value(0))
                .andExpect(jsonPath("$[1].nome").value("Doméstica"))
                .andExpect(jsonPath("$[10].nome").value("Pessoais"))
                .andExpect(jsonPath("$[1].itens", hasSize(2)))
                .andExpect(jsonPath("$[1].itens[0].nome").value("Aluguel"))
                .andExpect(jsonPath("$[1].itens[1].nome").value("Luz"))
                .andExpect(jsonPath("$[1].itens[1].cartao").value(false))
                .andExpect(jsonPath("$[1].itens[1].arquivado").value(false))
                .andExpect(jsonPath("$[2].itens", hasSize(0)));
    }

    @Test
    void cria_categoria_no_fim_da_ordem() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/categorias").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Viagens","tipo":"DESPESA"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Viagens"))
                .andExpect(jsonPath("$.tipo").value("DESPESA"))
                .andExpect(jsonPath("$.ordem").value(11))
                .andExpect(jsonPath("$.itens", hasSize(0)));

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[11].nome").value("Viagens"));
    }

    @Test
    void renomeia_categoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = categoriaId(DONO, "Pessoais");

        mvc.perform(put("/api/categorias/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Comigo"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.nome").value("Comigo"))
                .andExpect(jsonPath("$.tipo").value("DESPESA"));
    }

    @Test
    void categoria_nome_duplicado_retorna_409() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/categorias").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Transporte","tipo":"DESPESA"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe uma categoria com esse nome."));

        long id = categoriaId(DONO, "Pessoais");
        mvc.perform(put("/api/categorias/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Transporte"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value("Já existe uma categoria com esse nome."));
    }

    @Test
    void categoria_sem_nome_ou_tipo_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/categorias").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"  ","tipo":"DESPESA"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o nome da categoria."));

        mvc.perform(post("/api/categorias").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Viagens"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("Informe o tipo da categoria."));
    }

    @Test
    void categoria_de_outro_usuario_retorna_404() throws Exception {
        cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long categoriaDoDono = categoriaId(DONO, "Doméstica");
        long itemDoDono = itemDe(DONO, "Doméstica", "Luz");

        mvc.perform(put("/api/categorias/" + categoriaDoDono).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Invadida"}"""))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erro").value("Não encontrado."));

        mvc.perform(delete("/api/categorias/" + categoriaDoDono).cookie(outra))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/categorias/" + categoriaDoDono + "/itens").cookie(outra)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Invasor","cartao":false}"""))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/itens/" + itemDoDono).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"Invadido","cartao":false,"arquivado":true}"""))
                .andExpect(status().isNotFound());

        // nada mudou para o dono
        Integer categorias = jdbc.queryForObject(
                "select count(*) from categoria where id = ? and nome = 'Doméstica'", Integer.class, categoriaDoDono);
        assertThat(categorias).isEqualTo(1);
        String nomeDoItem = jdbc.queryForObject("select nome from item where id = ?", String.class, itemDoDono);
        assertThat(nomeDoItem).isEqualTo("Luz");
    }

    @Test
    void apaga_categoria_sem_lancamentos() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = categoriaId(DONO, "Pessoais");
        itemDe(DONO, "Pessoais", "Cabelo");

        mvc.perform(delete("/api/categorias/" + id).cookie(sessao))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$", hasSize(10)));
        assertThat(jdbc.queryForObject("select count(*) from item", Integer.class)).isZero();
    }

    @Test
    void apagar_categoria_com_lancamento_retorna_409() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = categoriaId(DONO, "Doméstica");
        long item = itemDe(DONO, "Doméstica", "Luz");
        jdbc.update("""
                insert into lancamento (item_id, ano, mes, valor, status)
                values (?, 2026, 10, 120.50, 'PREVISTO')""", item);

        mvc.perform(delete("/api/categorias/" + id).cookie(sessao))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro")
                        .value("Categoria tem lançamentos. Arquive os itens em vez de apagar."));

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$", hasSize(11)));
        assertThat(jdbc.queryForObject("select count(*) from lancamento where item_id = ?", Integer.class, item))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from item where id = ?", Integer.class, item))
                .isEqualTo(1);
    }

    @Test
    void reordena_categorias() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        List<Long> ids = jdbc.queryForList("""
                select c.id from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? order by c.ordem desc""", Long.class, DONO);

        mvc.perform(put("/api/categorias/ordem").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":" + ids + "}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$[0].nome").value("Pessoais"))
                .andExpect(jsonPath("$[0].ordem").value(0))
                .andExpect(jsonPath("$[10].nome").value("Receitas"))
                .andExpect(jsonPath("$[10].ordem").value(10));
    }

    @Test
    void reordenar_com_ids_incompletos_retorna_400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        List<Long> todos = jdbc.queryForList("""
                select c.id from categoria c join usuario u on u.id = c.usuario_id
                where u.email = ? order by c.ordem""", Long.class, DONO);
        long deOutro = categoriaId(OUTRA, "Doméstica");

        // faltando uma
        mvc.perform(put("/api/categorias/ordem").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":" + todos.subList(1, todos.size()) + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("A lista deve conter exatamente as suas categorias."));

        // repetida
        List<Long> repetida = new ArrayList<>(todos);
        repetida.set(0, repetida.get(1));
        mvc.perform(put("/api/categorias/ordem").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":" + repetida + "}"))
                .andExpect(status().isBadRequest());

        // com categoria de outro usuário no lugar de uma sua
        List<Long> alheia = new ArrayList<>(todos);
        alheia.set(0, deOutro);
        mvc.perform(put("/api/categorias/ordem").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"ids\":" + alheia + "}"))
                .andExpect(status().isBadRequest());

        // sem a lista
        mvc.perform(put("/api/categorias/ordem").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());

        // a ordem original segue intacta
        mvc.perform(get("/api/categorias").cookie(sessao))
                .andExpect(jsonPath("$[0].nome").value("Receitas"));
        mvc.perform(get("/api/categorias").cookie(outra))
                .andExpect(jsonPath("$[0].nome").value("Receitas"));
    }

    @Test
    void rotas_exigem_sessao() throws Exception {
        mvc.perform(get("/api/categorias")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/categorias/ordem").contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[]}"))
                .andExpect(status().isUnauthorized());
    }
}
