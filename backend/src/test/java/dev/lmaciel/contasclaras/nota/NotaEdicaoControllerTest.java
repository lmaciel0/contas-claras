package dev.lmaciel.contasclaras.nota;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.servlet.http.Cookie;

class NotaEdicaoControllerTest extends NotaTestSupport {

    private static final String LISTA_DE_CAIXINHAS = "{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Comprar\"}]},"
            + "{\"type\":\"taskList\",\"content\":[{\"type\":\"taskItem\",\"attrs\":{\"checked\":true},"
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Leite\"}]}]}]}]}";

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private void editar(Cookie sessao, long id, String corpo, int esperado) throws Exception {
        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().is(esperado));
    }

    @Test
    void editaTituloConteudoECategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long categoria = criarCategoria(sessao, "Saúde");
        long id = criarNota(sessao, null);
        jdbc.update("update nota set atualizado_em = '2026-01-01T00:00:00Z' where id = ?", id);

        mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("  Remédios ", LISTA_DE_CAIXINHAS, categoria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Remédios"));

        mvc.perform(get(URL + "/" + id).cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Remédios"))
                .andExpect(jsonPath("$.categoriaId").value(categoria))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].text").value("Comprar"))
                .andExpect(jsonPath("$.conteudo.content[1].type").value("taskList"))
                .andExpect(jsonPath("$.conteudo.content[1].content[0].attrs.checked").value(true))
                .andExpect(jsonPath("$.atualizadoEm").value("2026-10-29T15:00:00Z"));
    }

    @Test
    void editarComNullTiraDaCategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long categoria = criarCategoria(sessao, "Saúde");
        long id = criarNota(sessao, categoria);

        editar(sessao, id, corpo("x", paragrafo("y"), null), 200);

        mvc.perform(get(URL + "/" + id).cookie(sessao)).andExpect(jsonPath("$.categoriaId").doesNotExist());
    }

    @Test
    void rejeitaTituloInvalido() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);
        String doc = paragrafo("ok");

        for (String titulo : new String[] { "   ", " ", "\\u00a0 \\u00a0", "abc\\u202edef", "a\\nb", "a".repeat(201) }) {
            mvc.perform(put(URL + "/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                    .content(corpo(titulo, doc, null)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        }
        editar(sessao, id, corpo("a".repeat(200), doc, null), 200);
    }

    @Test
    void rejeitaConteudoForaDaListaPermitida() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, "Original", "texto antigo", null);
        String[] ruins = {
            "{\"type\":\"doc\",\"content\":[{\"type\":\"image\"}]}",
            "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\","
                    + "\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"http://x\"}}]}]}]}",
            "{\"type\":\"paragraph\"}",
            "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                    + "a".repeat(100_001) + "\"}]}]}" };
        for (String ruim : ruins) {
            editar(sessao, id, corpo("Novo", ruim, null), 400);
        }

        mvc.perform(get(URL + "/" + id).cookie(sessao))
                .andExpect(jsonPath("$.titulo").value("Original"))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].text").value("texto antigo"));
    }

    @Test
    void rejeitaCorpoSemConteudoOuComConteudoNaoObjeto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);

        editar(sessao, id, "{\"titulo\":\"x\",\"conteudo\":\"texto\"}", 400);
        editar(sessao, id, "{\"titulo\":\"x\",\"conteudo\":null}", 400);
        editar(sessao, id, "{\"titulo\":\"x\"}", 400);
    }

    @Test
    void rejeitaCaractereImpossivelDeGravarNoTexto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);

        editar(sessao, id, corpo("x", paragrafo("a\\u0000b"), null), 400);
        editar(sessao, id, corpo("x", paragrafo("a\\ud800b"), null), 400);
        editar(sessao, id, corpo("a\\ud800b", paragrafo("ok"), null), 400);
    }

    @Test
    void editarComCategoriaAlheiaDa404() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long categoriaDoDono = criarCategoria(dono, "Saúde");
        long idDaOutra = criarNota(outra, null);

        editar(outra, idDaOutra, corpo("Invadida", paragrafo("x"), categoriaDoDono), 404);

        mvc.perform(get(URL + "/" + idDaOutra).cookie(outra))
                .andExpect(jsonPath("$.titulo").value("Sem título"))
                .andExpect(jsonPath("$.categoriaId").doesNotExist());
    }
}
