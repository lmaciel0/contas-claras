package dev.lmaciel.contasclaras.nota;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

import com.jayway.jsonpath.JsonPath;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class CategoriaNotaControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";
    private static final String URL = "/api/categorias-nota";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private String corpo(String nome, String cor) {
        return "{\"nome\":\"" + nome + "\",\"cor\":" + (cor == null ? "null" : "\"" + cor + "\"") + "}";
    }

    private long criar(Cookie sessao, String nome, String cor) throws Exception {
        String json = mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo(nome, cor)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(json, "$.id").longValue();
    }

    @Test
    void criaCategoriaComNomeECor() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nome":"  Saúde ","cor":"vermelho"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Saúde"))
                .andExpect(jsonPath("$.cor").value("vermelho"))
                .andExpect(jsonPath("$.totalNotas").value(0));
    }

    @Test
    void rejeitaNomeVazioSoComNbspOuComDirecaoDeTexto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        for (String nome : new String[] { "   ", "    ", "abc‮def" }) {
            mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                    .content(corpo(nome, "azul")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        }
    }

    @Test
    void rejeitaNome41Caracteres() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("a".repeat(41), "azul")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("a".repeat(40), "azul")))
                .andExpect(status().isCreated());
    }

    @Test
    void rejeitaCorForaDaPaleta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        for (String cor : new String[] { "magenta", null }) {
            mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                    .content(corpo("Casa", cor)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        }
    }

    @Test
    void nomeRepetidoIgnorandoMaiusculasDa409() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        criar(dono, "Casa", "verde");

        mvc.perform(post(URL).cookie(dono).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("casa", "azul")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        mvc.perform(post(URL).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("casa", "azul")))
                .andExpect(status().isCreated());
    }

    @Test
    void listaEmOrdemAlfabetica() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criar(sessao, "banana", "amarelo");
        criar(sessao, "Abacaxi", "verde");
        criar(sessao, "Cereja", "vermelho");

        mvc.perform(get(URL).cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].nome").value("Abacaxi"))
                .andExpect(jsonPath("$[1].nome").value("banana"))
                .andExpect(jsonPath("$[2].nome").value("Cereja"));
    }

    @Test
    void renomearEMudarCor() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criar(sessao, "Casa", "verde");
        criar(sessao, "Trabalho", "azul");

        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("Lar", "roxo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.nome").value("Lar"))
                .andExpect(jsonPath("$.cor").value("roxo"));
        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("trabalho", "roxo")))
                .andExpect(status().isConflict());
        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("LAR", "rosa")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("LAR"))
                .andExpect(jsonPath("$.cor").value("rosa"));
    }

    @Test
    void excluirResponde204() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criar(sessao, "Casa", "verde");

        mvc.perform(delete(URL + "/" + id).cookie(sessao)).andExpect(status().isNoContent());

        mvc.perform(get(URL).cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void totalNotasContaENotasFicamSemCategoriaAoExcluir() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criar(sessao, "Casa", "verde");
        for (String titulo : new String[] { "a", "b" }) {
            jdbc.update("""
                    insert into nota (usuario_id, categoria_id, titulo, conteudo)
                    values ((select id from usuario where email = ?), ?, ?, '{}'::jsonb)""",
                    DONO, id, titulo);
        }

        mvc.perform(get(URL).cookie(sessao))
                .andExpect(jsonPath("$[0].totalNotas").value(2));

        mvc.perform(delete(URL + "/" + id).cookie(sessao)).andExpect(status().isNoContent());

        Integer semCategoria = jdbc.queryForObject(
                "select count(*) from nota where categoria_id is null", Integer.class);
        org.assertj.core.api.Assertions.assertThat(semCategoria).isEqualTo(2);
    }

    @Test
    void categoriaAlheiaDa404EFicaIntacta() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long id = criar(dono, "Casa", "verde");

        mvc.perform(put(URL + "/" + id).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("Invadida", "cinza")))
                .andExpect(status().isNotFound());
        mvc.perform(delete(URL + "/" + id).cookie(outra)).andExpect(status().isNotFound());

        mvc.perform(get(URL).cookie(dono))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nome").value("Casa"))
                .andExpect(jsonPath("$[0].cor").value("verde"));
    }

    @Test
    void exigeAutenticacao() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }
}
