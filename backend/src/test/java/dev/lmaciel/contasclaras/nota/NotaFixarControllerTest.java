package dev.lmaciel.contasclaras.nota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

class NotaFixarControllerTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private void fixadaEh(Cookie sessao, Long id) throws Exception {
        var r = mvc.perform(get(URL + "/fixada").cookie(sessao)).andExpect(status().isOk());
        if (id == null) {
            r.andExpect(jsonPath("$.nota").value(nullValue()));
        } else {
            r.andExpect(jsonPath("$.nota.id").value(id)).andExpect(jsonPath("$.nota.fixada").value(true));
        }
    }

    @Test
    void semNotaFixadaDevolveNotaNula() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarNota(sessao, null);

        fixadaEh(sessao, null);
    }

    @Test
    void fixarDevolveNotaFixadaNoGet() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, "Lembrete", "pagar luz", null);

        String corpo = fixar(sessao, id, true, 200);
        assertThat(JsonPath.<Boolean>read(corpo, "$.fixada")).isTrue();
        assertThat(JsonPath.<String>read(corpo, "$.titulo")).isEqualTo("Lembrete");

        fixadaEh(sessao, id);
        mvc.perform(get(URL + "/fixada").cookie(sessao))
                .andExpect(jsonPath("$.nota.conteudo.content[0].content[0].text").value("pagar luz"));
    }

    @Test
    void fixarOutraTiraAAnterior() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long a = criarNota(sessao, null);
        long b = criarNota(sessao, null);

        fixar(sessao, a, true, 200);
        fixar(sessao, b, true, 200);

        fixadaEh(sessao, b);
        mvc.perform(get(URL).cookie(sessao))
                .andExpect(jsonPath("$[?(@.id == " + a + ")].fixada").value(false))
                .andExpect(jsonPath("$[?(@.fixada == true)]", hasSize(1)));
        assertThat(contarFixadas()).isEqualTo(1);
    }

    @Test
    void desfixarDeixaNenhumaFixada() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);
        fixar(sessao, id, true, 200);

        fixar(sessao, id, false, 200);

        fixadaEh(sessao, null);
        assertThat(contarFixadas()).isZero();
    }

    @Test
    void fixarDuasVezesAMesmaNotaContinuaFixada() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);

        fixar(sessao, id, true, 200);
        fixar(sessao, id, true, 200);

        fixadaEh(sessao, id);
    }

    @Test
    void cadaUsuarioTemSuaFixada() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long doDono = criarNota(dono, null);
        long daOutra = criarNota(outra, null);
        fixar(dono, doDono, true, 200);
        fixar(outra, daOutra, true, 200);

        fixadaEh(dono, doDono);
        fixadaEh(outra, daOutra);
    }

    @Test
    void fixarNotaAlheiaDa404EMantemAFixadaDoDono() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long fixadaDoDono = criarNota(dono, null);
        long outraDoDono = criarNota(dono, null);
        fixar(dono, fixadaDoDono, true, 200);

        fixar(outra, outraDoDono, true, 404);
        fixar(outra, 999_999L, true, 404);

        fixadaEh(dono, fixadaDoDono);
    }

    @Test
    void excluirNotaFixadaDeixaNenhumaFixada() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarNota(sessao, null);
        fixar(sessao, id, true, 200);

        mvc.perform(delete(URL + "/" + id).cookie(sessao)).andExpect(status().isNoContent());

        fixadaEh(sessao, null);
    }
}
