package dev.lmaciel.contasclaras.nota;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import jakarta.servlet.http.Cookie;

class NotaAlheiaControllerTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    @Test
    void notaAlheiaDa404EmGetPutEDeleteEFicaIntacta() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long id = criarNota(dono, "Minha", "privada", null);

        mvc.perform(get(URL + "/" + id).cookie(outra)).andExpect(status().isNotFound());
        mvc.perform(put(URL + "/" + id).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content(corpo("Invadida", paragrafo("x"), null)))
                .andExpect(status().isNotFound());
        mvc.perform(delete(URL + "/" + id).cookie(outra)).andExpect(status().isNotFound());

        mvc.perform(get(URL + "/" + id).cookie(dono))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Minha"))
                .andExpect(jsonPath("$.conteudo.content[0].content[0].text").value("privada"));
    }

    @Test
    void notaInexistenteDa404() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(get(URL + "/999999").cookie(sessao)).andExpect(status().isNotFound());
        mvc.perform(delete(URL + "/999999").cookie(sessao)).andExpect(status().isNotFound());
    }

    @Test
    void excluirResponde204ENotaSome() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);

        mvc.perform(delete(URL + "/" + id).cookie(sessao)).andExpect(status().isNoContent());

        mvc.perform(get(URL + "/" + id).cookie(sessao)).andExpect(status().isNotFound());
        Assertions.assertThat(contarNotas()).isZero();
    }

    @Test
    void exigeAutenticacao() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(get(URL + "/1")).andExpect(status().isUnauthorized());
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(URL + "/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete(URL + "/1")).andExpect(status().isUnauthorized());
    }
}
