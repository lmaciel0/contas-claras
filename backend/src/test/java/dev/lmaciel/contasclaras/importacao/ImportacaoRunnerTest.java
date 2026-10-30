package dev.lmaciel.contasclaras.importacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.TreeMap;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.ConfigurableApplicationContext;

import dev.lmaciel.contasclaras.importacao.ImportacaoService.ResumoImportacao;
import dev.lmaciel.contasclaras.importacao.ImportacaoService.TotaisAno;

/**
 * Só o {@code executar}, que devolve o código de saída. O {@code run} chama {@code System.exit} e por isso
 * não é chamado aqui: derrubaria a JVM dos testes.
 */
class ImportacaoRunnerTest {

    private static final String EMAIL = "dono@exemplo.com";

    @TempDir
    Path pasta;

    ImportacaoService importacao = mock(ImportacaoService.class);
    ImportacaoRunner runner = new ImportacaoRunner(importacao, mock(ConfigurableApplicationContext.class));
    ByteArrayOutputStream saida = new ByteArrayOutputStream();
    ByteArrayOutputStream erro = new ByteArrayOutputStream();

    Path planilha;

    @BeforeEach
    void gravarPlanilhaFicticia() throws Exception {
        planilha = Files.write(pasta.resolve("fake.xlsx"), PlanilhaFicticia.gerar());
    }

    private int executar(String... argumentos) {
        return runner.executar(new DefaultApplicationArguments(argumentos),
                new PrintStream(saida, true, StandardCharsets.UTF_8),
                new PrintStream(erro, true, StandardCharsets.UTF_8));
    }

    private String saida() {
        return saida.toString(StandardCharsets.UTF_8);
    }

    private String erro() {
        return erro.toString(StandardCharsets.UTF_8);
    }

    private String[] argumentosValidos() {
        return new String[] {"--importar.arquivo=" + planilha, "--importar.email=" + EMAIL};
    }

    @Test
    void sucesso_le_a_planilha_chama_o_service_e_imprime_a_tabela() {
        TreeMap<Integer, TotaisAno> porAno = new TreeMap<>();
        porAno.put(2025, new TotaisAno(new BigDecimal("6500.56"), new BigDecimal("250.00")));
        porAno.put(2026, new TotaisAno(new BigDecimal("3200.00"), new BigDecimal("4910.00")));
        when(importacao.importar(eq(EMAIL), any())).thenReturn(new ResumoImportacao(porAno, 4, 8, 11));

        int codigo = executar(argumentosValidos());

        assertThat(codigo).isZero();
        assertThat(erro()).isEmpty();
        assertThat(saida().lines().toList()).contains(
                "ano  |      receitas |      despesas |     diferença",
                "2025 |      6.500,56 |        250,00 |      6.250,56",
                "2026 |      3.200,00 |      4.910,00 |     -1.710,00",
                "4 categorias, 8 itens, 11 lançamentos");
        ArgumentCaptor<PlanilhaLida> lida = ArgumentCaptor.forClass(PlanilhaLida.class);
        verify(importacao).importar(eq(EMAIL), lida.capture());
        assertThat(lida.getValue().categorias()).hasSize(4);
    }

    @Test
    void sem_argumentos_obrigatorios_mostra_o_uso_e_sai_com_1() {
        assertThat(executar("--importar.email=" + EMAIL)).isEqualTo(1);
        assertThat(erro()).contains("--importar.arquivo=<caminho>").contains("--importar.email=<email>");

        erro.reset();
        assertThat(executar("--importar.arquivo=" + planilha)).isEqualTo(1);
        assertThat(erro()).contains("--importar.email=<email>");

        verify(importacao, never()).importar(anyString(), any());
    }

    @Test
    void arquivo_inexistente_sai_com_1_sem_chamar_o_service() {
        int codigo = executar("--importar.arquivo=" + pasta.resolve("nao-existe.xlsx"), "--importar.email=" + EMAIL);

        assertThat(codigo).isEqualTo(1);
        assertThat(erro()).contains("Não foi possível ler o arquivo");
        verify(importacao, never()).importar(anyString(), any());
    }

    @Test
    void arquivo_que_nao_e_xlsx_sai_com_1_com_a_mensagem_do_parser() throws Exception {
        Files.writeString(planilha, "isto nao e uma planilha");

        int codigo = executar(argumentosValidos());

        assertThat(codigo).isEqualTo(1);
        assertThat(erro()).contains(PlanilhaParser.MENSAGEM_ARQUIVO_INVALIDO);
        verify(importacao, never()).importar(anyString(), any());
    }

    @Test
    void importacao_recusada_sai_com_1_e_mostra_a_mensagem() {
        when(importacao.importar(anyString(), any()))
                .thenThrow(new ImportacaoRecusadaException(ImportacaoService.MENSAGEM_CONTA_COM_LANCAMENTOS));

        int codigo = executar(argumentosValidos());

        assertThat(codigo).isEqualTo(1);
        assertThat(erro()).contains(ImportacaoService.MENSAGEM_CONTA_COM_LANCAMENTOS);
        assertThat(saida()).isEmpty();
    }

    @Test
    void falha_inesperada_sai_com_1_e_mostra_o_tipo_e_a_mensagem() {
        when(importacao.importar(anyString(), any())).thenThrow(new IllegalStateException("banco fora do ar"));

        int codigo = executar(argumentosValidos());

        assertThat(codigo).isEqualTo(1);
        assertThat(erro()).contains("IllegalStateException").contains("banco fora do ar");
    }
}
