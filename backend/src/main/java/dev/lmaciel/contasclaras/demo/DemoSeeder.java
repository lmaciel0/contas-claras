package dev.lmaciel.contasclaras.demo;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.jdbc.autoconfigure.JdbcConnectionDetails;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import dev.lmaciel.contasclaras.auth.AuthService;
import dev.lmaciel.contasclaras.categoria.Categoria;
import dev.lmaciel.contasclaras.categoria.CategoriaRepository;
import dev.lmaciel.contasclaras.item.Item;
import dev.lmaciel.contasclaras.item.ItemRepository;
import dev.lmaciel.contasclaras.lancamento.Lancamento;
import dev.lmaciel.contasclaras.lancamento.LancamentoRepository;
import dev.lmaciel.contasclaras.lancamento.StatusLancamento;
import dev.lmaciel.contasclaras.lancamento.Vencimento;
import dev.lmaciel.contasclaras.usuario.Usuario;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * Dados de demonstração para dev local e para os prints do README: uma conta com os 12 meses de 2026 (valores
 * fictícios), parte paga e parte prevista. Só existe com o profile {@code demo}, então nunca roda em produção.
 *
 * <p>Como a senha da conta é pública, o seed também se recusa a rodar (sem criar nada) se o banco não for local:
 * ver {@link GuardaBancoDemo}. Para rodar de propósito em outro host, defina {@code app.demo.permitir=true}.
 *
 * <p>A conta é criada direto no banco, sem passar pelo cadastro por e-mail (que exigiria confirmar um endereço
 * que não existe). Se a conta já existe, não faz nada.
 *
 * <pre>
 * ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev,demo
 * </pre>
 */
@Component
@Profile("demo")
public class DemoSeeder implements ApplicationRunner {

    static final String EMAIL = "demo@contasclaras.dev";
    static final String SENHA = "demo12345";
    static final int ANO = 2026;

    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);

    /** Um item da conta demo com o valor de cada um dos 12 meses (índice 0 = janeiro). */
    private record ItemDemo(String categoria, String nome, int diaVencimento, boolean cartao, BigDecimal limite,
            List<BigDecimal> valores) {
    }

    private static final List<ItemDemo> ITENS = List.of(
            new ItemDemo("Receitas", "Salário", 5, false, null, fixo("4800.00")),
            new ItemDemo("Receitas", "Freelas", 20, false, null, variavel(
                    "450.00", "600.00", "380.00", "720.00", "510.00", "430.00",
                    "650.00", "890.00", "540.00", "470.00", "610.00", "780.00")),
            new ItemDemo("Doméstica", "Aluguel", 10, false, null, fixo("1450.00")),
            new ItemDemo("Doméstica", "Luz", 15, false, null, variavel(
                    "142.30", "138.75", "151.20", "147.90", "133.40", "129.85",
                    "126.10", "131.55", "140.25", "149.60", "155.30", "160.45")),
            new ItemDemo("Doméstica", "Água", 18, false, null, variavel(
                    "68.40", "68.40", "71.20", "71.20", "69.90", "66.30",
                    "64.80", "64.80", "67.10", "70.50", "72.90", "74.00")),
            new ItemDemo("Doméstica", "Internet", 20, false, null, fixo("119.90")),
            new ItemDemo("Doméstica", "Mercado", 25, false, null, variavel(
                    "820.50", "790.30", "845.10", "910.75", "802.20", "776.90",
                    "835.40", "868.15", "851.60", "889.30", "934.80", "1120.45")),
            new ItemDemo("Transporte", "Combustível", 28, false, null, variavel(
                    "260.00", "245.50", "280.30", "255.90", "270.10", "262.40",
                    "288.75", "251.20", "266.60", "274.30", "259.80", "291.00")),
            // Dia 31 de propósito: nos meses curtos o vencimento vira o último dia do mês.
            new ItemDemo("Transporte", "Seguro do carro", 31, false, null, fixo("210.00")),
            new ItemDemo("Entretenimento", "Streaming", 8, false, null, fixo("55.90")),
            new ItemDemo("Saúde", "Plano de saúde", 7, false, null, fixo("389.00")),
            // Mesma parcela nos 12 meses: o financiamento repetido.
            new ItemDemo("Dívidas/Empréstimos", "Financiamento do carro", 12, false, null, fixo("987.65")),
            new ItemDemo("Cartões de crédito", "Cartão Aurora", 5, true, new BigDecimal("6000.00"), variavel(
                    "1240.30", "1105.80", "1388.45", "1560.20", "1322.75", "1198.60",
                    "1475.90", "1630.15", "1284.30", "1712.80", "1590.45", "2045.70")),
            new ItemDemo("Cartões de crédito", "Cartão Horizonte", 25, true, new BigDecimal("3500.00"), variavel(
                    "640.90", "702.35", "588.20", "735.60", "810.45", "695.30",
                    "722.85", "668.70", "790.10", "845.25", "912.60", "1080.35")));

    private final UsuarioRepository usuarios;
    private final AuthService auth;
    private final PasswordEncoder encoder;
    private final CategoriaRepository categorias;
    private final ItemRepository itens;
    private final LancamentoRepository lancamentos;
    private final Clock clock;
    private final TransactionTemplate transacao;
    private final JdbcConnectionDetails banco;
    private final boolean permitirBancoRemoto;

    public DemoSeeder(UsuarioRepository usuarios, AuthService auth, PasswordEncoder encoder,
            CategoriaRepository categorias, ItemRepository itens, LancamentoRepository lancamentos, Clock clock,
            PlatformTransactionManager transacoes, JdbcConnectionDetails banco,
            @Value("${" + GuardaBancoDemo.PROPRIEDADE_PERMITIR + ":false}") boolean permitirBancoRemoto) {
        this.usuarios = usuarios;
        this.auth = auth;
        this.encoder = encoder;
        this.categorias = categorias;
        this.itens = itens;
        this.lancamentos = lancamentos;
        this.clock = clock;
        this.transacao = new TransactionTemplate(transacoes);
        this.banco = banco;
        this.permitirBancoRemoto = permitirBancoRemoto;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (semear()) {
            log.info("Conta de demonstração criada: {}", EMAIL);
        } else {
            log.info("Conta de demonstração já existe: {}", EMAIL);
        }
    }

    /**
     * Cria a conta demo com categorias, itens e lançamentos, tudo numa transação: se algo falha, nada fica.
     * Antes de tudo confere o banco: se não é local e não há {@code app.demo.permitir=true}, lança
     * {@link IllegalStateException} sem tocar em nada.
     *
     * @return {@code true} se criou; {@code false} se a conta já existia (nada é alterado)
     */
    public boolean semear() {
        GuardaBancoDemo.exigir(banco.getJdbcUrl(), permitirBancoRemoto);
        return Boolean.TRUE.equals(transacao.execute(status -> {
            if (usuarios.existsByEmail(EMAIL)) {
                return false;
            }
            Usuario usuario = auth.criarUsuario("Conta Demo", EMAIL, encoder.encode(SENHA), null);
            gravarItensELancamentos(usuario);
            return true;
        }));
    }

    private void gravarItensELancamentos(Usuario usuario) {
        Map<String, Categoria> porNome = new HashMap<>();
        categorias.findByUsuarioIdOrderByOrdem(usuario.getId()).forEach(c -> porNome.put(c.getNome(), c));
        LocalDate hoje = LocalDate.now(clock);

        List<Lancamento> novos = new ArrayList<>();
        for (ItemDemo demo : ITENS) {
            Categoria categoria = porNome.get(demo.categoria());
            if (categoria == null) {
                throw new IllegalStateException("Categoria padrão ausente: " + demo.categoria());
            }
            Item item = itens.save(
                    new Item(categoria, demo.nome(), demo.diaVencimento(), demo.cartao(), demo.limite()));
            for (int mes = 1; mes <= 12; mes++) {
                LocalDate vencimento = Vencimento.padrao(ANO, mes, demo.diaVencimento());
                StatusLancamento status = vencimento.isBefore(hoje) ? StatusLancamento.PAGO : StatusLancamento.PREVISTO;
                novos.add(new Lancamento(item, ANO, mes, demo.valores().get(mes - 1), status, vencimento));
            }
        }
        lancamentos.saveAll(novos);
    }

    private static List<BigDecimal> fixo(String valor) {
        return Stream.generate(() -> new BigDecimal(valor)).limit(12).toList();
    }

    private static List<BigDecimal> variavel(String... valores) {
        if (valores.length != 12) {
            throw new IllegalArgumentException("Esperados 12 valores, vieram " + valores.length);
        }
        return Stream.of(valores).map(BigDecimal::new).toList();
    }
}
