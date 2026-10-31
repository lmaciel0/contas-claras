package dev.lmaciel.contasclaras.nota;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.servlet.http.Cookie;

class NotaConteudoPatchControllerTest extends NotaTestSupport {

    private static final String COM_CAIXINHA_MARCADA = "{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"taskList\",\"content\":[{\"type\":\"taskItem\",\"attrs\":{\"checked\":true},"
            + "\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Leite\"}]}]}]}]}";

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private void patchConteudo(Cookie sessao, long id, String conteudo, int esperado) throws Exception {
        mvc.perform(patch(URL + "/" + id + "/conteudo").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"conteudo\":" + conteudo + "}"))
                .andExpect(status().is(esperado));
    }

    @Test
    void marcarCaixinhaGravaConteudoETexto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, "Mercado", "antigo", null);
        jdbc.update("update nota set atualizado_em = '2026-01-01T00:00:00Z' where id = ?", id);

        mvc.perform(patch(URL + "/" + id + "/conteudo").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"conteudo\":" + COM_CAIXINHA_MARCADA + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.atualizadoEm").value("2026-10-29T15:00:00Z"));

        mvc.perform(get(URL + "/" + id).cookie(sessao))
                .andExpect(jsonPath("$.titulo").value("Mercado"))
                .andExpect(jsonPath("$.conteudo.content[0].type").value("taskList"))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].attrs.checked").value(true))
                .andExpect(jsonPath("$.atualizadoEm").value("2026-10-29T15:00:00Z"));
        mvc.perform(get(URL).param("busca", "leite").cookie(sessao))
                .andExpect(jsonPath("$[0].id").value(id));
        mvc.perform(get(URL).param("busca", "antigo").cookie(sessao))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void patchConteudoRecusaConteudoInvalido() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, "Original", "texto antigo", null);

        patchConteudo(sessao, id, "{\"type\":\"doc\",\"content\":[{\"type\":\"image\"}]}", 400);
        patchConteudo(sessao, id, "null", 400);
        patchConteudo(sessao, id, "\"texto\"", 400);

        mvc.perform(get(URL + "/" + id).cookie(sessao))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].text").value("texto antigo"));
    }

    @Test
    void patchConteudoDeNotaAlheiaDa404() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long id = criarNota(dono, "Original", "texto antigo", null);

        patchConteudo(outra, id, COM_CAIXINHA_MARCADA, 404);
        patchConteudo(outra, 999_999L, COM_CAIXINHA_MARCADA, 404);

        mvc.perform(get(URL + "/" + id).cookie(dono))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].text").value("texto antigo"));
    }
}
