package dev.lmaciel.contasclaras.nota;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.servlet.http.Cookie;

class NotaBuscaControllerTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private ResultActions buscar(Cookie sessao, String busca) throws Exception {
        return mvc.perform(get(URL).param("busca", busca).cookie(sessao)).andExpect(status().isOk());
    }

    @Test
    void buscaPorTituloETextoIgnorandoMaiusculas() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarNota(sessao, "Remédios", "Losartana 50mg", null);
        criarNota(sessao, "LOSARTANA no título", "nada", null);
        criarNota(sessao, "Mercado", "leite", null);

        buscar(sessao, "losartana").andExpect(jsonPath("$", hasSize(2)));
        buscar(sessao, "MERCADO").andExpect(jsonPath("$", hasSize(1)));
        buscar(sessao, "inexistente").andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void buscaTrataPorcentoUnderlineEBarraComoLiterais() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarNota(sessao, "Desconto", "tem 10% de desconto", null);
        criarNota(sessao, "Nome", "snake_case", null);
        criarNota(sessao, "Caminho", "a\\\\b", null);
        criarNota(sessao, "Outra", "sem nada especial", null);

        buscar(sessao, "%").andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].titulo").value("Desconto"));
        buscar(sessao, "_").andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].titulo").value("Nome"));
        buscar(sessao, "\\").andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].titulo").value("Caminho"));
        buscar(sessao, "s_ake").andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void buscaVaziaListaTudo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarNota(sessao, "A", "x", null);
        criarNota(sessao, "B", "y", null);

        buscar(sessao, "").andExpect(jsonPath("$", hasSize(2)));
        buscar(sessao, "   ").andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void buscaNaoVeNotasDeOutroUsuario() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        criarNota(dono, "Segredo", "losartana", null);

        buscar(outra, "losartana").andExpect(jsonPath("$", hasSize(0)));
        buscar(outra, "").andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void previaTemNoMaximo160CaracteresEEspacosColapsados() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criarNota(sessao, "Longa", "palavra ".repeat(60), null);
        criarNota(sessao, "Espacos", "a    b     c", null);

        String previaLonga = buscar(sessao, "palavra").andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(
                com.jayway.jsonpath.JsonPath.<String>read(previaLonga, "$[0].previa")).hasSize(160)
                .startsWith("palavra palavra ");
        buscar(sessao, "a    b").andExpect(jsonPath("$[0].previa").value("a b c"));
    }

    @Test
    void buscaComMaisDe100CaracteresResponde400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        mvc.perform(get(URL).param("busca", "a".repeat(101)).cookie(sessao))
                .andExpect(status().isBadRequest());
    }
}
