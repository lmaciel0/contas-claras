package dev.lmaciel.contasclaras.nota;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import com.jayway.jsonpath.JsonPath;

import dev.lmaciel.contasclaras.IntegracaoTest;
import jakarta.servlet.http.Cookie;

/** Base dos testes de notas: ajudantes para categoria, nota e JSON. */
abstract class NotaTestSupport extends IntegracaoTest {

    static final String DONO = "dono@exemplo.com";
    static final String OUTRA = "outra@exemplo.com";
    static final String URL = "/api/notas";

    @Autowired
    JdbcTemplate jdbc;

    long id(String json) {
        return JsonPath.<Number>read(json, "$.id").longValue();
    }

    long criarCategoria(Cookie sessao, String nome) throws Exception {
        String json = mvc.perform(post("/api/categorias-nota").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"" + nome + "\",\"cor\":\"verde\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return id(json);
    }

    /** Cria uma nota vazia (POST) e devolve o id. */
    long criarNota(Cookie sessao, Long categoriaId) throws Exception {
        String corpo = categoriaId == null ? "{}" : "{\"categoriaId\":" + categoriaId + "}";
        String json = mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return id(json);
    }

    /** Cria a nota e já grava título e texto (um parágrafo) com PUT. */
    long criarNota(Cookie sessao, String titulo, String texto, Long categoriaId) throws Exception {
        long id = criarNota(sessao, null);
        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo(titulo, paragrafo(texto), categoriaId)))
                .andExpect(status().isOk());
        return id;
    }

    static String paragrafo(String texto) {
        return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":"
                + "[{\"type\":\"text\",\"text\":\"" + texto + "\"}]}]}";
    }

    static String corpo(String titulo, String conteudo, Long categoriaId) {
        return "{\"titulo\":\"" + titulo + "\",\"conteudo\":" + conteudo + ",\"categoriaId\":" + categoriaId + "}";
    }

    int contarNotas() {
        return jdbc.queryForObject("select count(*) from nota", Integer.class);
    }
}
