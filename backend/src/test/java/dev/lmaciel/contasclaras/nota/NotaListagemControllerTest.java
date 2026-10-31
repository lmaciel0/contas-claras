package dev.lmaciel.contasclaras.nota;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import jakarta.servlet.http.Cookie;

class NotaListagemControllerTest extends NotaTestSupport {

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private ResultActions listar(Cookie sessao, String consulta) throws Exception {
        return mvc.perform(get(URL + consulta).cookie(sessao)).andExpect(status().isOk());
    }

    private void datar(long id, String instante) {
        jdbc.update("update nota set atualizado_em = ?::timestamptz where id = ?", instante, id);
    }

    @Test
    void listaMaisRecentesPrimeiro() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long antiga = criarNota(sessao, "Antiga", "a", null);
        long nova = criarNota(sessao, "Nova", "b", null);
        long meio = criarNota(sessao, "Meio", "c", null);
        datar(antiga, "2026-01-01T00:00:00Z");
        datar(meio, "2026-05-01T00:00:00Z");
        datar(nova, "2026-09-01T00:00:00Z");

        listar(sessao, "")
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].titulo").value("Nova"))
                .andExpect(jsonPath("$[1].titulo").value("Meio"))
                .andExpect(jsonPath("$[2].titulo").value("Antiga"))
                .andExpect(jsonPath("$[0].previa").value("b"))
                .andExpect(jsonPath("$[0].fixada").value(false))
                .andExpect(jsonPath("$[0].atualizadoEm").value("2026-09-01T00:00:00Z"));
    }

    @Test
    void filtraPorCategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long saude = criarCategoria(sessao, "Saúde");
        long casa = criarCategoria(sessao, "Casa");
        criarNota(sessao, "Remédios", "x", saude);
        criarNota(sessao, "Reforma", "x", casa);
        criarNota(sessao, "Solta", "x", null);

        listar(sessao, "?categoriaId=" + saude)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Remédios"))
                .andExpect(jsonPath("$[0].categoriaId").value(saude));
    }

    @Test
    void filtraSemCategoria() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long saude = criarCategoria(sessao, "Saúde");
        criarNota(sessao, "Remédios", "x", saude);
        criarNota(sessao, "Solta", "x", null);

        listar(sessao, "?semCategoria=true")
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Solta"))
                .andExpect(jsonPath("$[0].categoriaId").doesNotExist());
        listar(sessao, "?semCategoria=false").andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void categoriaEBuscaSeCombinam() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long saude = criarCategoria(sessao, "Saúde");
        criarNota(sessao, "Remédios", "losartana", saude);
        criarNota(sessao, "Mercado", "losartana", null);

        listar(sessao, "?busca=losartana&categoriaId=" + saude)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Remédios"));
    }

    @Test
    void totalNotasDaCategoriaConta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long saude = criarCategoria(sessao, "Saúde");
        criarNota(sessao, saude);
        criarNota(sessao, saude);
        criarNota(sessao, null);

        mvc.perform(get("/api/categorias-nota").cookie(sessao))
                .andExpect(jsonPath("$[0].totalNotas").value(2));
    }
}
