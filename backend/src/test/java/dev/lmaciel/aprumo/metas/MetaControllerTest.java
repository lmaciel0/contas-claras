package dev.lmaciel.aprumo.metas;

import com.jayway.jsonpath.JsonPath;
import dev.lmaciel.aprumo.IntegracaoTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("MetaController - Endpoints REST de Metas e Caixinhas")
class MetaControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRO = "outro@exemplo.com";

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private long criarMeta(Cookie sessao, String corpo) throws Exception {
        String json = mvc.perform(post("/api/metas")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(json, "$.id").longValue();
    }

    @Test
    @DisplayName("POST /api/metas - Cria meta com sucesso")
    void criaMeta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        String corpo = """
                {
                    "nome": "IPVA 2027",
                    "valorAlvo": 3000.00,
                    "valorGuardado": 500.00,
                    "mesAlvo": 1,
                    "anoAlvo": 2027,
                    "presetVisual": "carro"
                }
                """;

        mvc.perform(post("/api/metas")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("IPVA 2027"))
                .andExpect(jsonPath("$.valorAlvo").value("3000.00"))
                .andExpect(jsonPath("$.valorGuardado").value("500.00"))
                .andExpect(jsonPath("$.presetVisual").value("carro"));
    }

    @Test
    @DisplayName("GET /api/metas - Lista apenas metas do usuário logado")
    void listaMetasDoUsuario() throws Exception {
        Cookie sessaoA = cadastrarEEntrar(DONO);
        Cookie sessaoB = cadastrarEEntrar(OUTRO);

        criarMeta(sessaoA, """
                { "nome": "Meta A1", "valorAlvo": 1000.00, "presetVisual": "reserva" }
                """);
        criarMeta(sessaoA, """
                { "nome": "Meta A2", "valorAlvo": 2000.00, "presetVisual": "viagem" }
                """);
        criarMeta(sessaoB, """
                { "nome": "Meta Alheia", "valorAlvo": 5000.00, "presetVisual": "carro" }
                """);

        mvc.perform(get("/api/metas").cookie(sessaoA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].nome").value("Meta A1"))
                .andExpect(jsonPath("$[1].nome").value("Meta A2"));
    }

    @Test
    @DisplayName("PATCH /api/metas/{id}/guardar - Incrementa saldo da meta")
    void guardaValorNaMeta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarMeta(sessao, """
                { "nome": "Viagem", "valorAlvo": 5000.00, "valorGuardado": 1000.00 }
                """);

        mvc.perform(patch("/api/metas/" + id + "/guardar")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"valor\": 500.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorGuardado").value("1500.00"));
    }

    @Test
    @DisplayName("PATCH /api/metas/{id}/resgatar - Decrementa saldo e rejeita valor maior que guardado")
    void resgataValorDaMeta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarMeta(sessao, """
                { "nome": "Viagem", "valorAlvo": 5000.00, "valorGuardado": 1000.00 }
                """);

        mvc.perform(patch("/api/metas/" + id + "/resgatar")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"valor\": 400.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorGuardado").value("600.00"));

        mvc.perform(patch("/api/metas/" + id + "/resgatar")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"valor\": 700.00}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/metas/{id} - Exclui meta com sucesso")
    void excluiMeta() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarMeta(sessao, """
                { "nome": "Excluir", "valorAlvo": 1000.00 }
                """);

        mvc.perform(delete("/api/metas/" + id).cookie(sessao))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/metas/" + id).cookie(sessao))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Isolamento: Usuário B recebe 404 ao tentar acessar ou alterar meta do Usuário A")
    void isolamentoEntreUsuarios() throws Exception {
        Cookie sessaoA = cadastrarEEntrar(DONO);
        Cookie sessaoB = cadastrarEEntrar(OUTRO);

        long idA = criarMeta(sessaoA, """
                { "nome": "Meta Confidencial", "valorAlvo": 10000.00 }
                """);

        mvc.perform(get("/api/metas/" + idA).cookie(sessaoB))
                .andExpect(status().isNotFound());

        mvc.perform(put("/api/metas/" + idA)
                        .cookie(sessaoB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\": \"Hackeada\", \"valorAlvo\": 1.00}"))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/metas/" + idA + "/guardar")
                        .cookie(sessaoB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"valor\": 100.00}"))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/metas/" + idA).cookie(sessaoB))
                .andExpect(status().isNotFound());
    }
}
