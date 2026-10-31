package dev.lmaciel.contasclaras.nota;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.servlet.http.Cookie;

class NotaCriacaoControllerTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    @Test
    void criaNotaVaziaComTituloPadrao() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.titulo").value("Sem título"))
                .andExpect(jsonPath("$.fixada").value(false))
                .andExpect(jsonPath("$.categoriaId").doesNotExist())
                .andExpect(jsonPath("$.conteudo.type").value("doc"))
                .andExpect(jsonPath("$.conteudo.content[0].type").value("paragraph"))
                .andExpect(jsonPath("$.criadoEm").value("2026-10-29T15:00:00Z"))
                .andExpect(jsonPath("$.atualizadoEm").value("2026-10-29T15:00:00Z"));
    }

    @Test
    void criaNotaJaNaCategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long categoria = criarCategoria(sessao, "Saúde");

        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"categoriaId\":" + categoria + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoriaId").value(categoria));
    }

    @Test
    void criarComCategoriaAlheiaDa404() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long categoriaDoDono = criarCategoria(dono, "Saúde");

        mvc.perform(post(URL).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content("{\"categoriaId\":" + categoriaDoDono + "}"))
                .andExpect(status().isNotFound());

        Assertions.assertThat(contarNotas()).isZero();
    }

    @Test
    void criarComCategoriaInexistenteDa404() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post(URL).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"categoriaId\":999999}"))
                .andExpect(status().isNotFound());

        Assertions.assertThat(contarNotas()).isZero();
    }
}
