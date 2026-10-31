package dev.lmaciel.contasclaras.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.usuario.Usuario;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

/**
 * Fluxos que dependem de e-mail: cadastro confirmado por código ou link e recuperação de senha por código. Não é transacional de propósito: o SMTP
 * roda dentro da requisição, mas fora de qualquer transação, para não segurar uma das 2 conexões do pool nem
 * um lock enquanto espera a rede. Os trechos de banco usam {@link TransactionTemplate}.
 */
@Service
public class FluxoEmailService {

    static final String CODIGO_INVALIDO = "Código inválido ou expirado.";
    static final Duration VALIDADE = Duration.ofMinutes(15);
    static final int MAX_TENTATIVAS = 5;

    private final CodigoEmailRepository codigoRepo;
    private final UsuarioRepository usuarios;
    private final CodigosEmail codigos;
    private final LimiteEnvio limite;
    private final AuthService auth;
    private final ModelosEmail modelos;
    private final EnvioEmail envio;
    private final TransactionTemplate tx;
    private final Clock clock;

    public FluxoEmailService(CodigoEmailRepository codigoRepo, UsuarioRepository usuarios, CodigosEmail codigos,
            LimiteEnvio limite, AuthService auth, ModelosEmail modelos, EnvioEmail envio, TransactionTemplate tx,
            Clock clock) {
        this.codigoRepo = codigoRepo;
        this.usuarios = usuarios;
        this.codigos = codigos;
        this.limite = limite;
        this.auth = auth;
        this.modelos = modelos;
        this.envio = envio;
        this.tx = tx;
        this.clock = clock;
    }

    /** O {@code 400} genérico: código errado, vencido, esgotado ou de e-mail desconhecido não se distinguem. */
    public static RequisicaoInvalidaException codigoInvalido() {
        return new RequisicaoInvalidaException(CODIGO_INVALIDO);
    }

    // ---- cadastro ----------------------------------------------------------------------

    /**
     * Pede o cadastro: respeita os limites e envia exatamente um e-mail (código e link, ou o aviso de que já
     * existe conta). Dentro dos 60 s do último envio, responde sem enviar. Não recebe senha nem gera BCrypt: a
     * senha só é definida na confirmação, depois da prova de posse do e-mail.
     */
    public void pedirCadastro(String nome, String email, String ip) {
        String emailNormalizado = Emails.normalizar(email);
        Optional<Long> reserva = limite.reservar(emailNormalizado, ip);
        if (reserva.isEmpty()) {
            return;
        }
        String codigo = codigos.gerarCodigo();
        String token = codigos.gerarToken();
        enviarOuLiberar(reserva.get(), () -> {
            Boolean semConta = tx.execute(status -> {
                apagarVencidos();
                if (usuarios.existsByEmail(emailNormalizado)) {
                    codigoRepo.findByTipoAndEmail(TipoCodigo.CADASTRO, emailNormalizado)
                            .ifPresent(codigoRepo::delete);
                    return false;
                }
                gravar(TipoCodigo.CADASTRO, emailNormalizado, nome.trim(), codigo, token);
                return true;
            });
            return Boolean.TRUE.equals(semConta)
                    ? modelos.codigoCadastro(emailNormalizado, nome.trim(), codigo, token)
                    : modelos.contaJaExiste(emailNormalizado);
        });
    }

    /**
     * Gera código e link novos para o cadastro pendente, mantendo o nome. Sem pendência, ou dentro dos 60 s,
     * não faz nada: quem chama responde {@code 202} do mesmo jeito. Sem pendência não reserva envio, porque o
     * limite conta só e-mail enviado.
     */
    public void reenviarCadastro(String email, String ip) {
        String emailNormalizado = Emails.normalizar(email);
        Instant agora = clock.instant();
        boolean pendente = codigoRepo.findByTipoAndEmail(TipoCodigo.CADASTRO, emailNormalizado)
                .filter(c -> c.getExpiraEm().isAfter(agora))
                .isPresent();
        if (!pendente) {
            return;
        }
        Optional<Long> reserva = limite.reservar(emailNormalizado, ip);
        if (reserva.isEmpty()) {
            return;
        }
        String codigo = codigos.gerarCodigo();
        String token = codigos.gerarToken();
        long reservaId = reserva.get();
        enviarOuLiberar(reservaId, () -> {
            String nome = tx.execute(status -> {
                apagarVencidos();
                return codigoRepo.buscarParaConferir(TipoCodigo.CADASTRO, emailNormalizado).map(c -> {
                    gravar(TipoCodigo.CADASTRO, emailNormalizado, c.getNome(), codigo, token);
                    return c.getNome();
                }).orElse(null);
            });
            // A pendência venceu ou foi confirmada entre a checagem e a troca: nada a enviar.
            return nome == null ? null : modelos.codigoCadastro(emailNormalizado, nome, codigo, token);
        });
    }

    /**
     * Confirma o cadastro pelo código de 6 dígitos, define a senha e cria a conta. Como em
     * {@link #redefinirSenha}, o tamanho da senha é validado (sem gastar tentativa) e o BCrypt roda antes da
     * transação, para não segurar conexão nem lock durante o hash.
     */
    public Usuario confirmarCadastro(String email, String codigo, String senha) {
        String emailNormalizado = Emails.normalizar(email);
        String hashDaSenha = auth.hashDaSenha(senha);
        String esperado = codigos.hmacCodigo(TipoCodigo.CADASTRO, emailNormalizado, codigo);
        return confirmar(() -> codigoRepo.buscarParaConferir(TipoCodigo.CADASTRO, emailNormalizado), esperado,
                hashDaSenha);
    }

    /** Confirma o cadastro pelo token do link, define a senha e cria a conta. Mesma ordem de {@link #confirmarCadastro}. */
    public Usuario confirmarCadastroPorToken(String token, String senha) {
        String hashDaSenha = auth.hashDaSenha(senha);
        String hash = codigos.hashToken(token);
        // O hash do token já identifica a linha: achá-la é acertar, então não há código a comparar nem tentativa a contar.
        return confirmar(() -> codigoRepo.buscarPorTokenParaConferir(hash)
                .filter(c -> c.getTipo() == TipoCodigo.CADASTRO), null, hashDaSenha);
    }

    /**
     * Confere a linha e cria a conta numa transação só. A transação devolve o resultado e a exceção {@code 400} sai
     * depois do commit, senão o incremento de tentativas sofreria rollback. {@code hmacEsperado} nulo significa
     * que a linha já foi achada pelo token. {@code hashDaSenha} já vem pronto, gerado fora da transação.
     */
    private Usuario confirmar(Supplier<Optional<CodigoEmail>> busca, String hmacEsperado, String hashDaSenha) {
        AtomicReference<Long> idDaLinha = new AtomicReference<>();
        Resultado resultado;
        try {
            resultado = tx.execute(status -> {
                apagarVencidos();
                CodigoEmail c = busca.get().orElse(null);
                if (c == null) {
                    return Resultado.RECUSADO;
                }
                idDaLinha.set(c.getId());
                if (hmacEsperado != null && !codigos.iguais(c.getCodigoHmac(), hmacEsperado)) {
                    errouTentativa(c);
                    return Resultado.RECUSADO;
                }
                if (usuarios.existsByEmail(c.getEmail())) {
                    // Virou conta (ex.: Google) depois do pedido: a pendência não serve mais.
                    codigoRepo.delete(c);
                    return Resultado.RECUSADO;
                }
                Usuario usuario = auth.criarUsuario(c.getNome(), c.getEmail(), hashDaSenha, null);
                codigoRepo.delete(c);
                return new Resultado(usuario);
            });
        } catch (ConflitoException | DataIntegrityViolationException e) {
            // Corrida com outra criação de conta: a transação sofreu rollback e a pendência voltou. Apaga numa nova.
            Long id = idDaLinha.get();
            if (id != null) {
                tx.executeWithoutResult(status -> codigoRepo.deleteById(id));
            }
            throw codigoInvalido();
        }
        if (resultado == null || resultado.usuario() == null) {
            throw codigoInvalido();
        }
        return resultado.usuario();
    }

    // ---- esqueci a senha ---------------------------------------------------------------

    /**
     * Pede o código de redefinição: com ou sem conta, envia exatamente um e-mail (o código, ou o aviso de que não
     * há conta). Dentro dos 60 s do último envio, responde sem enviar e mantém o código anterior.
     */
    public void esqueciSenha(String email, String ip) {
        String emailNormalizado = Emails.normalizar(email);
        Optional<Long> reserva = limite.reservar(emailNormalizado, ip);
        if (reserva.isEmpty()) {
            return;
        }
        String codigo = codigos.gerarCodigo();
        enviarOuLiberar(reserva.get(), () -> {
            Boolean comConta = tx.execute(status -> {
                apagarVencidos();
                if (!usuarios.existsByEmail(emailNormalizado)) {
                    return false;
                }
                gravar(TipoCodigo.SENHA, emailNormalizado, null, codigo, null);
                return true;
            });
            return Boolean.TRUE.equals(comConta)
                    ? modelos.codigoSenha(emailNormalizado, codigo)
                    : modelos.semConta(emailNormalizado);
        });
    }

    /**
     * Troca a senha pelo código recebido e devolve o usuário, já com as sessões antigas invalidadas. O BCrypt (e a
     * checagem do tamanho da senha, que não gasta tentativa) acontece antes da transação, para não segurar
     * conexão nem lock durante o hash.
     */
    public Usuario redefinirSenha(String email, String codigo, String senha) {
        String emailNormalizado = Emails.normalizar(email);
        String hash = auth.hashDaSenha(senha);
        String esperado = codigos.hmacCodigo(TipoCodigo.SENHA, emailNormalizado, codigo);
        Resultado resultado = tx.execute(status -> {
            apagarVencidos();
            CodigoEmail c = codigoRepo.buscarParaConferir(TipoCodigo.SENHA, emailNormalizado).orElse(null);
            if (c == null) {
                return Resultado.RECUSADO;
            }
            if (!codigos.iguais(c.getCodigoHmac(), esperado)) {
                errouTentativa(c);
                return Resultado.RECUSADO;
            }
            codigoRepo.delete(c);
            Usuario usuario = usuarios.findByEmail(emailNormalizado).orElse(null);
            if (usuario == null) {
                return Resultado.RECUSADO;
            }
            usuario.setSenhaHash(hash);
            usuario.invalidarSessoes();
            return new Resultado(usuario);
        });
        if (resultado == null || resultado.usuario() == null) {
            throw codigoInvalido();
        }
        return resultado.usuario();
    }

    // ---- peças compartilhadas ----------------------------------------------------------

    private record Resultado(Usuario usuario) {
        static final Resultado RECUSADO = new Resultado(null);
    }

    /** Conta a tentativa errada e apaga a linha na quinta. Roda dentro da transação de conferência. */
    private void errouTentativa(CodigoEmail c) {
        c.registrarTentativa();
        if (c.getTentativas() >= MAX_TENTATIVAS) {
            codigoRepo.delete(c);
        }
    }

    private void apagarVencidos() {
        codigoRepo.deleteByExpiraEmBefore(clock.instant());
    }

    /**
     * Cria ou substitui a linha do tipo e e-mail, com o prazo de 15 min contado do {@code Clock}. Lê com lock: se
     * {@code confirmar} apagar a linha no intervalo, ele espera e a gravação vira um insert, sem erro.
     */
    private void gravar(TipoCodigo tipo, String email, String nome, String codigo, String token) {
        Instant agora = clock.instant();
        String codigoHmac = codigos.hmacCodigo(tipo, email, codigo);
        String tokenHash = token == null ? null : codigos.hashToken(token);
        CodigoEmail existente = codigoRepo.buscarParaConferir(tipo, email).orElse(null);
        if (existente != null) {
            existente.substituir(nome, codigoHmac, tokenHash, agora, agora.plus(VALIDADE));
        } else {
            codigoRepo.saveAndFlush(new CodigoEmail(tipo, email, nome, codigoHmac, tokenHash, agora,
                    agora.plus(VALIDADE)));
        }
    }

    /**
     * Prepara (no banco) e envia a mensagem, fora de transação. Se qualquer passo falhar, desfaz a reserva: o
     * envio que não saiu não conta no limite nem no prazo de 60 s. Mensagem nula significa nada a enviar.
     */
    private void enviarOuLiberar(long reservaId, Supplier<MensagemEmail> preparar) {
        boolean enviou = false;
        try {
            MensagemEmail mensagem = preparar.get();
            if (mensagem != null) {
                envio.enviar(mensagem);
                enviou = true;
            }
        } catch (DataIntegrityViolationException e) {
            // Pedidos simultâneos do mesmo e-mail disputaram a linha única: o outro vence, este responde 202 calado.
        } finally {
            if (!enviou) {
                limite.liberar(reservaId);
            }
        }
    }
}
