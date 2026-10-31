package dev.lmaciel.contasclaras.importacao;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import dev.lmaciel.contasclaras.importacao.ImportacaoService.ResumoImportacao;
import dev.lmaciel.contasclaras.importacao.ImportacaoService.TotaisAno;

/**
 * Comando de linha para a importação única: lê a planilha, grava na conta e encerra o processo. Só existe com
 * o profile {@code importar} (ver {@code application-importar.yml}); a API normal nunca o carrega.
 *
 * <pre>
 * ./mvnw spring-boot:run -Dspring-boot.run.profiles=importar \
 *     -Dspring-boot.run.arguments="--importar.arquivo=&lt;caminho&gt; --importar.email=&lt;email&gt;"
 * </pre>
 */
@Component
@Profile("importar")
public class ImportacaoRunner implements ApplicationRunner {

    static final String OPCAO_ARQUIVO = "importar.arquivo";
    static final String OPCAO_EMAIL = "importar.email";
    static final String USO = "Uso: --importar.arquivo=<caminho> --importar.email=<email>";

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final String LINHA_DA_TABELA = "%-4s | %13s | %13s | %13s";

    private final ImportacaoService importacao;
    private final ConfigurableApplicationContext contexto;

    public ImportacaoRunner(ImportacaoService importacao, ConfigurableApplicationContext contexto) {
        this.importacao = importacao;
        this.contexto = contexto;
    }

    /** Fecha o contexto e encerra a JVM com o código de {@link #executar}. Fora dos testes de propósito. */
    @Override
    public void run(ApplicationArguments args) {
        int codigo = executar(args, System.out, System.err);
        System.exit(SpringApplication.exit(contexto, () -> codigo));
    }

    /** Faz o trabalho e devolve o código de saída: 0 em sucesso, 1 com a mensagem do erro em {@code erro}. */
    int executar(ApplicationArguments args, PrintStream saida, PrintStream erro) {
        String arquivo = opcao(args, OPCAO_ARQUIVO);
        String email = opcao(args, OPCAO_EMAIL);
        if (arquivo == null || email == null) {
            erro.println(USO);
            return 1;
        }

        try {
            PlanilhaLida planilha = lerPlanilha(Path.of(arquivo));
            ResumoImportacao resumo = importacao.importar(email, planilha);
            imprimir(resumo, saida);
            return 0;
        } catch (IOException e) {
            erro.println("Não foi possível ler o arquivo: " + arquivo);
            return 1;
        } catch (ImportacaoRecusadaException | IllegalArgumentException e) {
            erro.println(e.getMessage());
            return 1;
        } catch (RuntimeException e) {
            erro.println("Falha inesperada na importação, nada foi gravado: " + e.getClass().getSimpleName() + ": "
                    + e.getMessage());
            return 1;
        }
    }

    private static PlanilhaLida lerPlanilha(Path arquivo) throws IOException {
        try (InputStream entrada = Files.newInputStream(arquivo)) {
            return PlanilhaParser.ler(entrada);
        }
    }

    private static String opcao(ApplicationArguments args, String nome) {
        List<String> valores = args.getOptionValues(nome);
        if (valores == null || valores.isEmpty() || valores.get(0).isBlank()) {
            return null;
        }
        return valores.get(0);
    }

    private static void imprimir(ResumoImportacao resumo, PrintStream saida) {
        saida.println(LINHA_DA_TABELA.formatted("ano", "receitas", "despesas", "diferença"));
        resumo.porAno().forEach((ano, totais) -> saida.println(linha(ano, totais)));
        saida.printf("%d categorias, %d itens, %d lançamentos%n",
                resumo.categorias(), resumo.itens(), resumo.lancamentos());
    }

    private static String linha(int ano, TotaisAno totais) {
        BigDecimal diferenca = totais.receitas().subtract(totais.despesas());
        return LINHA_DA_TABELA.formatted(ano, moeda(totais.receitas()), moeda(totais.despesas()), moeda(diferenca));
    }

    private static String moeda(BigDecimal valor) {
        return String.format(PT_BR, "%,.2f", valor);
    }
}
