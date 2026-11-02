package dev.lmaciel.contasclaras.projeto;

import com.jayway.jsonpath.JsonPath;
import dev.lmaciel.contasclaras.IntegracaoTest;
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

@DisplayName("ProjetoController - Endpoints REST do Kanban")
class ProjetoControllerTest extends IntegracaoTest {

    private static final String DONO = "dono@exemplo.com";
    private static final String OUTRO = "outro@exemplo.com";

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void limpar() {
        jdbc.update("delete from usuario");
    }

    private long criarProjeto(Cookie sessao, String corpo) throws Exception {
        String json = mvc.perform(post("/api/projetos")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(json, "$.id").longValue();
    }

    @Test
    @DisplayName("POST /api/projetos - Cria projeto com subtarefas em lote com sucesso")
    void criaProjetoComSubtarefas() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        String corpo = """
                {
                    "titulo": "Redesign da Aplicação",
                    "descricao": "Modernizar shell e kanban",
                    "categoria": "Frontend",
                    "estagio": "A_FAZER",
                    "prioridade": "ALTA",
                    "cor": "esmeralda",
                    "prazo": "2026-11-20",
                    "subtarefas": ["Criar mockups", "Construir componentes"]
                }
                """;

        mvc.perform(post("/api/projetos")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.titulo").value("Redesign da Aplicação"))
                .andExpect(jsonPath("$.categoria").value("Frontend"))
                .andExpect(jsonPath("$.estagio").value("A_FAZER"))
                .andExpect(jsonPath("$.prioridade").value("ALTA"))
                .andExpect(jsonPath("$.cor").value("esmeralda"))
                .andExpect(jsonPath("$.totalSubtarefas").value(2))
                .andExpect(jsonPath("$.subtarefasConcluidas").value(0))
                .andExpect(jsonPath("$.porcentagemProgresso").value(0))
                .andExpect(jsonPath("$.subtarefas", hasSize(2)));
    }

    @Test
    @DisplayName("GET /api/projetos - Lista projetos ordenados e não vaza dados de outro usuário")
    void listaProjetosComIsolamento() throws Exception {
        Cookie sessaoDono = cadastrarEEntrar(DONO);
        Cookie sessaoOutro = cadastrarEEntrar(OUTRO);

        criarProjeto(sessaoDono, """
                {"titulo": "Projeto Dono 1", "estagio": "A_FAZER", "prioridade": "MEDIA", "cor": "azul"}
                """);
        criarProjeto(sessaoDono, """
                {"titulo": "Projeto Dono 2", "estagio": "EM_ANDAMENTO", "prioridade": "ALTA", "cor": "esmeralda"}
                """);
        criarProjeto(sessaoOutro, """
                {"titulo": "Projeto Outro", "estagio": "A_FAZER", "prioridade": "BAIXA", "cor": "rosa"}
                """);

        mvc.perform(get("/api/projetos").cookie(sessaoDono))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].titulo").value("Projeto Dono 1"))
                .andExpect(jsonPath("$[1].titulo").value("Projeto Dono 2"));

        mvc.perform(get("/api/projetos").cookie(sessaoOutro))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Projeto Outro"));
    }

    @Test
    @DisplayName("GET /api/projetos?busca= - Filtra projetos por termo em título, descrição ou categoria")
    void filtraPorBusca() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);

        criarProjeto(sessao, """
                {"titulo": "Kanban Aprumo", "descricao": "Quadro interativo", "categoria": "Dev"}
                """);
        criarProjeto(sessao, """
                {"titulo": "Controle Financeiro", "descricao": "Planilha de gastos", "categoria": "Financas"}
                """);

        mvc.perform(get("/api/projetos?busca=kanban").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titulo").value("Kanban Aprumo"));
    }

    @Test
    @DisplayName("PUT /api/projetos/{id} - Atualiza campos de metadados do projeto")
    void atualizaProjeto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarProjeto(sessao, """
                {"titulo": "Original", "prioridade": "BAIXA", "cor": "azul"}
                """);

        String corpoEdicao = """
                {
                    "titulo": "Título Modificado",
                    "descricao": "Nova descrição",
                    "categoria": "Nova Categoria",
                    "prioridade": "URGENTE",
                    "cor": "indigo",
                    "prazo": "2026-12-31"
                }
                """;

        mvc.perform(put("/api/projetos/" + id)
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoEdicao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Título Modificado"))
                .andExpect(jsonPath("$.descricao").value("Nova descrição"))
                .andExpect(jsonPath("$.categoria").value("Nova Categoria"))
                .andExpect(jsonPath("$.prioridade").value("URGENTE"))
                .andExpect(jsonPath("$.cor").value("indigo"))
                .andExpect(jsonPath("$.prazo").value("2026-12-31"));
    }

    @Test
    @DisplayName("PATCH /api/projetos/{id}/estagio - Move card entre estágios")
    void moveEstagioProjeto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarProjeto(sessao, """
                {"titulo": "Em Preparo", "estagio": "A_FAZER", "ordem": 0}
                """);

        mvc.perform(patch("/api/projetos/" + id + "/estagio")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"estagio": "EM_ANDAMENTO", "novaOrdem": 0}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estagio").value("EM_ANDAMENTO"))
                .andExpect(jsonPath("$.ordem").value(0));
    }

    @Test
    @DisplayName("Gerenciamento de subtarefas: adicionar, alternar conclusão e excluir")
    void gerenciaSubtarefas() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarProjeto(sessao, """
                {"titulo": "Projeto com Subtarefa", "estagio": "EM_ANDAMENTO"}
                """);

        // 1. Adicionar subtarefa
        String jsonSub = mvc.perform(post("/api/projetos/" + id + "/subtarefas")
                        .cookie(sessao)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"titulo": "Subtarefa Alfa"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo").value("Subtarefa Alfa"))
                .andExpect(jsonPath("$.concluida").value(false))
                .andReturn().getResponse().getContentAsString();

        long subId = JsonPath.<Number>read(jsonSub, "$.id").longValue();

        // 2. Alternar conclusão
        mvc.perform(patch("/api/projetos/" + id + "/subtarefas/" + subId + "/alternar")
                        .cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.concluida").value(true));

        // Verificar que o progresso do projeto virou 100%
        mvc.perform(get("/api/projetos").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subtarefasConcluidas").value(1))
                .andExpect(jsonPath("$[0].porcentagemProgresso").value(100));

        // 3. Excluir subtarefa
        mvc.perform(delete("/api/projetos/" + id + "/subtarefas/" + subId)
                        .cookie(sessao))
                .andExpect(status().isNoContent());

        // Verificar que não há mais subtarefas
        mvc.perform(get("/api/projetos").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].totalSubtarefas").value(0));
    }

    @Test
    @DisplayName("DELETE /api/projetos/{id} - Exclui projeto em cascata")
    void excluiProjeto() throws Exception {
        Cookie sessao = cadastrarEEntrar(DONO);
        long id = criarProjeto(sessao, """
                {"titulo": "Para Excluir", "subtarefas": ["Item 1"]}
                """);

        mvc.perform(delete("/api/projetos/" + id).cookie(sessao))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/projetos").cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Operações em projeto alheio retornam estritamente 404 Not Found")
    void isolamentoTotalRetorna404() throws Exception {
        Cookie sessaoDono = cadastrarEEntrar(DONO);
        Cookie sessaoOutro = cadastrarEEntrar(OUTRO);

        long idDono = criarProjeto(sessaoDono, """
                {"titulo": "Projeto Privado", "subtarefas": ["Segredo"]}
                """);

        mvc.perform(put("/api/projetos/" + idDono)
                        .cookie(sessaoOutro)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"titulo": "Tentativa Invasão"}
                        """))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/projetos/" + idDono + "/estagio")
                        .cookie(sessaoOutro)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {"estagio": "CONCLUIDO", "novaOrdem": 0}
                        """))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/projetos/" + idDono).cookie(sessaoOutro))
                .andExpect(status().isNotFound());
    }
}
