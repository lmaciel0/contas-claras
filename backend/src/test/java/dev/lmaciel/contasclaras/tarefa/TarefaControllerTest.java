package dev.lmaciel.contasclaras.tarefa;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

class TarefaControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRA = "outra@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private void criar(Cookie sessao, String corpo) throws Exception {
        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isCreated());
    }

    private long criarComId(Cookie sessao, String corpo) throws Exception {
        String json = mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(json, "$.id").longValue();
    }

    private void inserirConcluida(String email, String titulo, String concluidaEm) {
        jdbc.update("""
                insert into tarefa (usuario_id, titulo, concluida_em)
                values ((select id from usuario where email = ?), ?, ?::timestamptz)""",
                email, titulo, concluidaEm);
    }

    @Test
    void criaTarefaSoComTitulo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"  Pagar fatura  "}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value("Pagar fatura"))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.concluida").value(false))
                .andExpect(jsonPath("$.concluidaEm").doesNotExist());
    }

    @Test
    void rejeitaTituloVazioOuSoEspacos() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"   "}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
    }

    @Test
    void rejeitaTitulo201Caracteres() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titulo\":\"" + "a".repeat(201) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value(not(blankOrNullString())));
        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titulo\":\"" + "a".repeat(200) + "\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void rejeitaDataInvalida() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"x","data":"2026-13-40"}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejeitaNulNoTitulo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"ok"}""");
        // "\\u0000" no fonte Java vira o escape JSON \u0000, que o Jackson decodifica para NUL.
        String corpo = "{\"titulo\":\"abc\\u0000def\"}";

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O título da tarefa contém caracteres inválidos."));
        mvc.perform(put("/api/tarefas/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erro").value("O título da tarefa contém caracteres inválidos."));
    }

    @Test
    void rejeitaDataForaDoIntervalo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"ok"}""");

        for (String data : new String[] { "+999999999-01-01", "1899-12-31", "2201-01-01" }) {
            String corpo = "{\"titulo\":\"x\",\"data\":\"" + data + "\"}";
            mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(corpo))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("A data deve estar entre os anos 1900 e 2200."));
            mvc.perform(put("/api/tarefas/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                    .content(corpo))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erro").value("A data deve estar entre os anos 1900 e 2200."));
        }
        for (String data : new String[] { "1900-01-01", "2200-12-31" }) {
            mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"titulo\":\"x\",\"data\":\"" + data + "\"}"))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void agrupaPorDataComRelogioFixo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        criar(sessao, """
                {"titulo":"sem data"}""");
        criar(sessao, """
                {"titulo":"proxima","data":"2026-10-30"}""");
        criar(sessao, """
                {"titulo":"de hoje","data":"2026-10-29"}""");
        criar(sessao, """
                {"titulo":"atrasada","data":"2026-10-28"}""");

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hoje").value("2026-10-29"))
                .andExpect(jsonPath("$.atrasadas", hasSize(1)))
                .andExpect(jsonPath("$.atrasadas[0].titulo").value("atrasada"))
                .andExpect(jsonPath("$.atrasadas[0].data").value("2026-10-28"))
                .andExpect(jsonPath("$.deHoje", hasSize(1)))
                .andExpect(jsonPath("$.deHoje[0].titulo").value("de hoje"))
                .andExpect(jsonPath("$.proximas", hasSize(2)))
                .andExpect(jsonPath("$.proximas[0].titulo").value("proxima"))
                .andExpect(jsonPath("$.proximas[1].titulo").value("sem data"))
                .andExpect(jsonPath("$.concluidasHoje", hasSize(0)))
                .andExpect(jsonPath("$.concluidas", hasSize(0)))
                .andExpect(jsonPath("$.totalConcluidas").value(0));
    }

    @Test
    void concluidasHojeRespeitaFusoDeSaoPaulo() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        inserirConcluida(DONO, "ontem 23:59", "2026-10-29T02:59:00Z");
        inserirConcluida(DONO, "hoje 00:00", "2026-10-29T03:00:00Z");

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluidasHoje", hasSize(1)))
                .andExpect(jsonPath("$.concluidasHoje[0].titulo").value("hoje 00:00"))
                .andExpect(jsonPath("$.concluidasHoje[0].concluida").value(true))
                .andExpect(jsonPath("$.concluidas", hasSize(2)))
                .andExpect(jsonPath("$.concluidas[0].titulo").value("hoje 00:00"))
                .andExpect(jsonPath("$.concluidas[1].titulo").value("ontem 23:59"))
                .andExpect(jsonPath("$.totalConcluidas").value(2))
                .andExpect(jsonPath("$.atrasadas", hasSize(0)))
                .andExpect(jsonPath("$.deHoje", hasSize(0)))
                .andExpect(jsonPath("$.proximas", hasSize(0)));
    }

    @Test
    void listaSoTarefasDoUsuarioLogado() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        criar(dono, """
                {"titulo":"minha"}""");

        mvc.perform(get("/api/tarefas").cookie(outra))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.atrasadas", hasSize(0)))
                .andExpect(jsonPath("$.deHoje", hasSize(0)))
                .andExpect(jsonPath("$.proximas", hasSize(0)))
                .andExpect(jsonPath("$.concluidasHoje", hasSize(0)))
                .andExpect(jsonPath("$.concluidas", hasSize(0)))
                .andExpect(jsonPath("$.totalConcluidas").value(0));
    }

    @Test
    void editaTituloEData() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"velha","data":"2026-10-28"}""");

        mvc.perform(put("/api/tarefas/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"  nova  ","data":"2026-10-30"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.titulo").value("nova"))
                .andExpect(jsonPath("$.data").value("2026-10-30"));

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(jsonPath("$.atrasadas", hasSize(0)))
                .andExpect(jsonPath("$.proximas", hasSize(1)))
                .andExpect(jsonPath("$.proximas[0].titulo").value("nova"))
                .andExpect(jsonPath("$.proximas[0].data").value("2026-10-30"));
    }

    @Test
    void editarComDataNulaVaiParaProximasSemData() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"de hoje","data":"2026-10-29"}""");

        mvc.perform(put("/api/tarefas/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"de hoje","data":null}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(jsonPath("$.deHoje", hasSize(0)))
                .andExpect(jsonPath("$.proximas", hasSize(1)))
                .andExpect(jsonPath("$.proximas[0].titulo").value("de hoje"))
                .andExpect(jsonPath("$.proximas[0].data").doesNotExist());
    }

    @Test
    void concluiEReabre() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"x"}""");

        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"concluida":true}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluida").value(true))
                .andExpect(jsonPath("$.concluidaEm").value("2026-10-29T15:00:00Z"));

        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"concluida":false}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluida").value(false))
                .andExpect(jsonPath("$.concluidaEm").doesNotExist());
    }

    @Test
    void concluirDeNovoMantemMomentoOriginal() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        inserirConcluida(DONO, "ja feita", "2026-10-20T10:00:00Z");
        long id = jdbc.queryForObject("select id from tarefa where titulo = 'ja feita'", Long.class);

        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"concluida":true}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluidaEm").value("2026-10-20T10:00:00Z"));
    }

    @Test
    void excluiTarefa() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"x"}""");

        mvc.perform(delete("/api/tarefas/" + id).cookie(sessao))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(jsonPath("$.proximas", hasSize(0)));
    }

    @Test
    void outroUsuarioNaoMexeNaTarefaAlheia() throws Exception {
        Cookie dono = cadastrarEEntrar(DONO);
        Cookie outra = cadastrarEEntrar(OUTRA);
        long id = criarComId(dono, """
                {"titulo":"minha","data":"2026-10-30"}""");

        mvc.perform(put("/api/tarefas/" + id).cookie(outra).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"invadida","data":"2026-11-01"}"""))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(outra)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"concluida":true}"""))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/tarefas/" + id).cookie(outra))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/tarefas").cookie(dono))
                .andExpect(jsonPath("$.proximas", hasSize(1)))
                .andExpect(jsonPath("$.proximas[0].titulo").value("minha"))
                .andExpect(jsonPath("$.proximas[0].data").value("2026-10-30"))
                .andExpect(jsonPath("$.totalConcluidas").value(0));
    }

    @Test
    void idInexistenteDa404() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        mvc.perform(put("/api/tarefas/999999").cookie(sessao).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"x"}"""))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/tarefas/999999/concluida").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"concluida":true}"""))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/tarefas/999999").cookie(sessao))
                .andExpect(status().isNotFound());
    }

    @Test
    void criaTarefaSanitizandoCaracteresInvisiveisENbsp() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        // Título com NBSP, RLO e zero-width spaces antes, no meio e depois
        String json = """
                {"titulo": "\\u00A0Comprar\\u202E leite\\u200B\\uFEFF\\u00A0"}""";

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value("Comprar leite"));
    }

    @Test
    void rejeitaCriacaoComTituloSoDeCaracteresInvisiveis() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        String json = """
                {"titulo": "\\u00A0\\u200B\\uFEFF   "}""";

        mvc.perform(post("/api/tarefas").cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejeitaEdicaoComTituloSoDeCaracteresInvisiveis() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo": "Tarefa normal"}""");

        String json = """
                {"titulo": "\\u202E\\u200B   "}""";

        mvc.perform(put("/api/tarefas/" + id).cookie(sessao).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    void retorna404AoBuscarEditarConcluirOuExcluirTarefaDeOutroUsuario() throws Exception {
        Cookie sessaoDono = cadastrarEEntrar(DONO);
        long id = criarComId(sessaoDono, """
                {"titulo": "Tarefa privada do dono"}""");

        Cookie sessaoOutra = cadastrarEEntrar(OUTRA);

        mvc.perform(put("/api/tarefas/" + id).cookie(sessaoOutra).contentType(MediaType.APPLICATION_JSON).content("""
                {"titulo": "Tentando alterar"}"""))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(sessaoOutra).contentType(MediaType.APPLICATION_JSON).content("""
                {"concluida": true}"""))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/tarefas/" + id).cookie(sessaoOutra))
                .andExpect(status().isNotFound());
    }

    @Test
    void limitaConcluidasHojeA50Itens() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        // Insere 55 tarefas concluídas dentro do dia de hoje (2026-10-29 no relógio de teste)
        for (int i = 1; i <= 55; i++) {
            inserirConcluida(DONO, "Feita " + i, "2026-10-29T12:30:00-03:00");
        }

        mvc.perform(get("/api/tarefas").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluidasHoje", hasSize(50)))
                .andExpect(jsonPath("$.totalConcluidas").value(55));
    }

    @Test
    void patchSemCampoDa400() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarComId(sessao, """
                {"titulo":"x"}""");

        mvc.perform(patch("/api/tarefas/" + id + "/concluida").cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void exigeAutenticacao() throws Exception {
        mvc.perform(get("/api/tarefas"))
                .andExpect(status().isUnauthorized());
    }
}
