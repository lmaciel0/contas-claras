package dev.lmaciel.aprumo.exportacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.lmaciel.aprumo.IntegracaoTest;
import jakarta.servlet.http.Cookie;

class ExportacaoControllerTest extends IntegracaoTest {

    private static final String URL = "/api/auth/conta/exportacao";
    private static final String EMAIL_A = "a@exemplo.com";
    private static final String EMAIL_B = "b@exemplo.com";

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void limparUsuarios() {
        jdbc.update("delete from usuario");
    }

    /** Dá ao usuário uma linha de cada módulo, todas marcadas com o {@code marca} no texto. */
    private void popular(String email, String marca) {
        long id = jdbc.queryForObject("select id from usuario where email = ?", Long.class, email);
        long item = criarItem(email, "Doméstica", "Aluguel " + marca);
        criarLancamento(item, 2026, 10, "1200.50", "PAGO", "2026-10-05");
        criarLancamento(item, 2026, 11, "100.00", "PAGO");
        long cartao = criarItem(email, "Cartões de crédito", "Cartão " + marca);
        jdbc.update("update item set cartao = true, limite = 5000.00, dia_vencimento = 10, titular = ? where id = ?",
                "Titular " + marca, cartao);
        jdbc.update("insert into tarefa (usuario_id, titulo, data) values (?, ?, '2026-11-01')", id,
                "Tarefa " + marca);
        long catNota = jdbc.queryForObject(
                "insert into categoria_nota (usuario_id, nome, cor) values (?, ?, 'verde') returning id",
                Long.class, id, "CatNota " + marca);
        jdbc.update("""
                insert into nota (usuario_id, categoria_id, titulo, conteudo, texto)
                values (?, ?, ?, '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb, ?)""",
                id, catNota, "Nota " + marca, "Texto " + marca);
        long projeto = jdbc.queryForObject(
                "insert into projeto (usuario_id, titulo, estagio) values (?, ?, 'EM_ANDAMENTO') returning id",
                Long.class, id, "Projeto " + marca);
        jdbc.update("insert into projeto_subtarefa (projeto_id, titulo, concluida, ordem) values (?, ?, true, 0)",
                projeto, "Subtarefa " + marca);
    }

    @Test
    void semSessaoDevolve401() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }

    @Test
    void devolveSoOsDadosDoUsuarioLogado() throws Exception {
        Cookie sessaoA = cadastrarEEntrar(EMAIL_A);
        cadastrarEEntrar(EMAIL_B);
        popular(EMAIL_A, "AAA");
        popular(EMAIL_B, "BBB");

        String corpo = mvc.perform(get(URL).cookie(sessaoA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.geradoEm").exists())
                .andExpect(jsonPath("$.usuario.email").value(EMAIL_A))
                .andExpect(jsonPath("$.usuario.nome").value("Usuario Teste"))
                .andExpect(jsonPath("$.usuario.criadoEm").exists())
                .andExpect(jsonPath("$.categorias.length()").value(11))
                .andExpect(jsonPath("$.itens[0].nome").value("Aluguel AAA"))
                .andExpect(jsonPath("$.itens[0].categoria").value("Doméstica"))
                .andExpect(jsonPath("$.cartoes.length()").value(1))
                .andExpect(jsonPath("$.cartoes[0].nome").value("Cartão AAA"))
                .andExpect(jsonPath("$.cartoes[0].limite").value("5000.00"))
                .andExpect(jsonPath("$.cartoes[0].titular").value("Titular AAA"))
                .andExpect(jsonPath("$.lancamentos.length()").value(2))
                .andExpect(jsonPath("$.lancamentos[0].item").value("Aluguel AAA"))
                .andExpect(jsonPath("$.lancamentos[0].valor").value("1200.50"))
                .andExpect(jsonPath("$.lancamentos[0].status").value("PAGO"))
                .andExpect(jsonPath("$.lancamentos[0].vencimento").value("2026-10-05"))
                .andExpect(jsonPath("$.saldos.length()").value(1))
                .andExpect(jsonPath("$.saldos[0].ano").value(2026))
                .andExpect(jsonPath("$.saldos[0].mes").value(11))
                .andExpect(jsonPath("$.saldos[0].saldo").value("-100.00"))
                .andExpect(jsonPath("$.tarefas.length()").value(1))
                .andExpect(jsonPath("$.tarefas[0].titulo").value("Tarefa AAA"))
                .andExpect(jsonPath("$.categoriasNota.length()").value(1))
                .andExpect(jsonPath("$.categoriasNota[0].nome").value("CatNota AAA"))
                .andExpect(jsonPath("$.notas.length()").value(1))
                .andExpect(jsonPath("$.notas[0].titulo").value("Nota AAA"))
                .andExpect(jsonPath("$.notas[0].categoria").value("CatNota AAA"))
                .andExpect(jsonPath("$.notas[0].conteudo.type").value("doc"))
                .andExpect(jsonPath("$.projetos.length()").value(1))
                .andExpect(jsonPath("$.projetos[0].estagio").value("EM_ANDAMENTO"))
                .andExpect(jsonPath("$.projetos[0].subtarefas.length()").value(1))
                .andExpect(jsonPath("$.projetos[0].subtarefas[0].titulo").value("Subtarefa AAA"))
                .andReturn().getResponse().getContentAsString();

        assertThat(corpo).contains("AAA").doesNotContain("BBB").doesNotContain(EMAIL_B);
    }

    @Test
    void naoVazaSenhaCodigoSessaoNemToken() throws Exception {
        Cookie sessao = cadastrarEEntrar(EMAIL_A);
        popular(EMAIL_A, "AAA");
        jdbc.update("""
                insert into codigo_email (email, tipo, codigo_hmac, expira_em)
                values (?, 'SENHA', 'hmac-secreto', now() + interval '1 hour')""", EMAIL_A);
        String hashDaSenha = jdbc.queryForObject("select senha_hash from usuario where email = ?", String.class,
                EMAIL_A);

        String corpo = mvc.perform(get(URL).cookie(sessao))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(corpo.toLowerCase())
                .doesNotContain("senha")
                .doesNotContain("hash")
                .doesNotContain("codigo")
                .doesNotContain("sessao")
                .doesNotContain("token")
                .doesNotContain("googlesub")
                .doesNotContain(hashDaSenha);
    }

    @Test
    void mandaCabecalhosDeDownloadESemCache() throws Exception {
        Cookie sessao = cadastrarEEntrar(EMAIL_A);

        mvc.perform(get(URL).cookie(sessao))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"aprumo-dados-2026-10-29.json\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")));
    }
}
