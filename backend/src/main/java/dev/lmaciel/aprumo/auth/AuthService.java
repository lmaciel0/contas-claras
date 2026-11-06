package dev.lmaciel.aprumo.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import dev.lmaciel.aprumo.auth.GoogleTokenVerifier.IdentidadeGoogle;
import dev.lmaciel.aprumo.auth.dto.ExcluirContaRequest;
import dev.lmaciel.aprumo.categoria.CategoriasPadrao;
import dev.lmaciel.aprumo.comum.ConflitoException;
import dev.lmaciel.aprumo.comum.MuitasTentativasException;
import dev.lmaciel.aprumo.comum.NaoAutenticadoException;
import dev.lmaciel.aprumo.comum.RequisicaoInvalidaException;
import dev.lmaciel.aprumo.lancamento.LancamentoRepository;
import dev.lmaciel.aprumo.usuario.Usuario;
import dev.lmaciel.aprumo.usuario.UsuarioRepository;

@Service
public class AuthService {

    static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";
    static final String LOGIN_GOOGLE_INVALIDO = "Login Google inválido.";
    static final String SENHA_INCORRETA = "Senha incorreta.";
    /** Idade máxima do ID token do Google aceito como reautenticação (excluir conta, definir senha). */
    private static final Duration IDADE_MAXIMA_TOKEN_GOOGLE = Duration.ofMinutes(5);
    /** Tamanho da coluna {@code usuario.nome}. */
    private static final int MAX_NOME = 120;
    /** O BCrypt só considera os 72 primeiros bytes e o encoder recusa senhas maiores que isso. */
    private static final int MAX_BYTES_BCRYPT = 72;

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final CategoriasPadrao categoriasPadrao;
    private final LimiteTentativasLogin limite;
    /** Balde próprio das reautenticações por senha: nunca divide contador com o login. */
    private final LimiteTentativasLogin limiteReautenticacao;
    private final GoogleTokenVerifier googleVerificador;
    private final LancamentoRepository lancamentos;
    private final CodigoEmailRepository codigos;
    private final Clock clock;
    /** Transação curta só da gravação (exclusão, troca de senha); a reautenticação e o BCrypt (CPU, rede) ficam fora dela. */
    private final TransactionTemplate tx;
    /** Hash de uma senha descartada: gasta o mesmo tempo de BCrypt quando o e-mail não existe. */
    private final String hashFalso;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder,
            CategoriasPadrao categoriasPadrao, LimiteTentativasLogin limite, GoogleTokenVerifier googleVerificador,
            LancamentoRepository lancamentos, CodigoEmailRepository codigos, Clock clock,
            TransactionTemplate tx) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.categoriasPadrao = categoriasPadrao;
        this.limite = limite;
        this.limiteReautenticacao = new LimiteTentativasLogin(clock);
        this.googleVerificador = googleVerificador;
        this.lancamentos = lancamentos;
        this.codigos = codigos;
        this.clock = clock;
        this.tx = tx;
        this.hashFalso = encoder.encode("senha-descartada-sem-uso");
    }

    /**
     * Único lugar que cria usuário (cadastro confirmado por e-mail e login por Google): garante e-mail
     * normalizado, e-mail único e as categorias padrão.
     */
    @Transactional
    public Usuario criarUsuario(String nome, String email, String senhaHashOuNull, String googleSubOuNull) {
        String emailNormalizado = Emails.normalizar(email);
        if (usuarios.existsByEmail(emailNormalizado)) {
            throw emailJaCadastrado();
        }
        Usuario usuario;
        try {
            usuario = usuarios.saveAndFlush(
                    new Usuario(nome.trim(), emailNormalizado, senhaHashOuNull, googleSubOuNull));
        } catch (DataIntegrityViolationException e) {
            // Cadastros simultâneos do mesmo e-mail: a restrição única do banco decide.
            throw emailJaCadastrado();
        }
        categoriasPadrao.criarPara(usuario);
        return usuario;
    }

    @Transactional(readOnly = true)
    public Usuario autenticar(String email, String senha) {
        // A tentativa é reservada antes do BCrypt: uma rajada paralela não passa de 5 verificações.
        if (!limite.reservarTentativa(email)) {
            throw new MuitasTentativasException();
        }
        Usuario usuario = usuarios.findByEmail(Emails.normalizar(email)).orElse(null);
        boolean comSenha = usuario != null && usuario.temSenha();
        String hash = comSenha ? usuario.getSenhaHash() : hashFalso;
        boolean senhaConfere = cabeNoBcrypt(senha) && encoder.matches(senha, hash);
        if (!comSenha || !senhaConfere) {
            throw new NaoAutenticadoException(CREDENCIAIS_INVALIDAS);
        }
        limite.registrarSucesso(email);
        return usuario;
    }

    /**
     * Confere o ID token no Google (chamada de rede). Este método em si não abre transação, então no login
     * e em {@link #excluirConta} e {@link #definirSenha} a espera não segura conexão do banco.
     */
    public IdentidadeGoogle verificarGoogle(String credential) {
        IdentidadeGoogle identidade = googleVerificador.verificar(credential).orElse(null);
        if (identidade == null || !identidade.emailVerificado() || !StringUtils.hasText(identidade.sub())
                || !StringUtils.hasText(identidade.email())) {
            throw new NaoAutenticadoException(LOGIN_GOOGLE_INVALIDO);
        }
        return identidade;
    }

    /**
     * Entra com uma identidade Google já verificada, nesta ordem: conta com o mesmo {@code google_sub};
     * conta com o mesmo e-mail e sem Google ainda (vincula, apaga a senha e derruba as outras sessões;
     * se já tem outro Google, recusa sem mudar nada); senão cria a conta, sem senha, para qualquer e-mail
     * que o Google verificou.
     */
    @Transactional
    public Usuario entrarComGoogle(IdentidadeGoogle identidade) {
        Usuario porSub = usuarios.findByGoogleSub(identidade.sub()).orElse(null);
        if (porSub != null) {
            return porSub;
        }
        String email = Emails.normalizar(identidade.email());
        Usuario porEmail = usuarios.findByEmail(email).orElse(null);
        if (porEmail != null) {
            // Conta já ligada a outro Google com este e-mail (ex.: e-mail corporativo reaproveitado):
            // não troca o vínculo, senão quem herdou o e-mail tomaria a conta.
            if (porEmail.getGoogleSub() != null) {
                throw new NaoAutenticadoException(LOGIN_GOOGLE_INVALIDO);
            }
            porEmail.setGoogleSub(identidade.sub());
            porEmail.setSenhaHash(null);
            porEmail.invalidarSessoes();
            return porEmail;
        }
        return criarUsuario(nomeDaConta(identidade.nome(), email), email, null, identidade.sub());
    }

    /** O Google pode não mandar nome, ou mandar um maior que a coluna: nunca falha por isso. */
    private static String nomeDaConta(String nomeGoogle, String email) {
        String nome = StringUtils.hasText(nomeGoogle) ? nomeGoogle.trim() : email;
        if (nome.codePointCount(0, nome.length()) > MAX_NOME) {
            nome = nome.substring(0, nome.offsetByCodePoints(0, MAX_NOME));
        }
        return nome;
    }

    @Transactional(readOnly = true)
    public Usuario buscar(long id) {
        return usuarios.findById(id).orElseThrow(NaoAutenticadoException::new);
    }

    /**
     * Define ou troca a senha e invalida as sessões antigas; quem chama deve emitir um token novo com a
     * versão devolvida. Reautenticação obrigatória, conforme o tipo da conta:
     * <ul>
     * <li>com senha: {@code senhaAtual} (400 se errada, 429 se estourar o limite); {@code credencialGoogle}
     * é ignorada;</li>
     * <li>sem senha (só Google): {@code credencialGoogle} do mesmo Google da conta (401 se ausente, inválida
     * ou de outro usuário); {@code senhaAtual} é ignorada. Sem isso uma sessão roubada criaria uma senha e
     * a usaria para excluir a conta, contornando o Google.</li>
     * </ul>
     */
    public Usuario definirSenha(long id, String senhaAtual, String credencialGoogle, String senhaNova) {
        Usuario usuario = buscar(id);
        if (usuario.temSenha()) {
            reservarTentativaDeReautenticacao(id);
            if (!senhaAtualConfere(usuario, senhaAtual)) {
                throw new RequisicaoInvalidaException("Senha atual incorreta.");
            }
            limiteReautenticacao.registrarSucesso(chaveReautenticacao(id));
        } else {
            exigirGoogleDoUsuario(usuario, credencialGoogle);
        }
        // BCrypt e Google ficam fora da transação, como no redefinirSenha: só a gravação segura conexão.
        String hashNovo = hashDaSenha(senhaNova);
        return tx.execute(status -> {
            Usuario atual = usuarios.findById(id).orElseThrow(NaoAutenticadoException::new);
            atual.setSenhaHash(hashNovo);
            atual.invalidarSessoes();
            return atual;
        });
    }

    /**
     * Exclui a conta e todos os dados dela. Exige reautenticação: exatamente um entre a senha e a credencial
     * do Google (400 se vierem os dois ou nenhum; 401 se não conferem; 429 se a senha errar demais). Os
     * lançamentos saem primeiro (a chave de {@code lancamento.item_id} é RESTRICT); os códigos de e-mail
     * pendentes saem pelo e-mail, pois não têm chave para o usuário; o resto cai por {@code ON DELETE CASCADE}.
     * {@code envio_email} guarda só HMAC de e-mail e IP para o limite de envio e fica como está.
     * <p>
     * A reautenticação (BCrypt ou chamada ao Google) roda sem transação, para não segurar conexão do pool; só
     * os deletes ficam numa transação curta. Se a conta sumir no meio (exclusão concorrente), responde 401.
     */
    public void excluirConta(Long usuarioId, ExcluirContaRequest pedido) {
        // A senha não passa por hasText: oito espaços é uma senha válida.
        boolean comSenha = pedido.senha() != null && !pedido.senha().isEmpty();
        boolean comGoogle = StringUtils.hasText(pedido.credencialGoogle());
        if (comSenha == comGoogle) {
            throw new RequisicaoInvalidaException("Informe a senha ou a credencial do Google.");
        }
        Usuario usuario = buscar(usuarioId);
        if (comSenha) {
            if (!usuario.temSenha()) {
                throw new NaoAutenticadoException(SENHA_INCORRETA);
            }
            reservarTentativaDeReautenticacao(usuarioId);
            if (!senhaAtualConfere(usuario, pedido.senha())) {
                throw new NaoAutenticadoException(SENHA_INCORRETA);
            }
            limiteReautenticacao.registrarSucesso(chaveReautenticacao(usuarioId));
        } else {
            exigirGoogleDoUsuario(usuario, pedido.credencialGoogle());
        }
        String email = usuario.getEmail();
        tx.executeWithoutResult(status -> {
            if (!usuarios.existsById(usuarioId)) {
                throw new NaoAutenticadoException();
            }
            lancamentos.apagarDoUsuario(usuarioId);
            codigos.apagarPorEmail(email);
            usuarios.deleteById(usuarioId);
        });
    }

    /**
     * Confere o ID token e exige que o {@code sub} seja o do usuário e que o token tenha sido emitido há no
     * máximo 5 minutos (sem {@code iat}, vale como velho); 401 se ausente, inválido, velho ou de outro.
     */
    private void exigirGoogleDoUsuario(Usuario usuario, String credencialGoogle) {
        if (!StringUtils.hasText(credencialGoogle)) {
            throw new NaoAutenticadoException(LOGIN_GOOGLE_INVALIDO);
        }
        IdentidadeGoogle identidade = verificarGoogle(credencialGoogle);
        if (!identidade.sub().equals(usuario.getGoogleSub()) || !emitidoRecentemente(identidade.iat())) {
            throw new NaoAutenticadoException(LOGIN_GOOGLE_INVALIDO);
        }
    }

    private boolean emitidoRecentemente(Instant iat) {
        return iat != null && Duration.between(iat, clock.instant()).compareTo(IDADE_MAXIMA_TOKEN_GOOGLE) <= 0;
    }

    /**
     * Reserva uma tentativa de senha em ação sensível (excluir conta, trocar senha) antes do BCrypt. O balde é
     * por usuário e separado do login: quem tem uma sessão roubada não consegue travar o login do dono.
     */
    private void reservarTentativaDeReautenticacao(long usuarioId) {
        if (!limiteReautenticacao.reservarTentativa(chaveReautenticacao(usuarioId))) {
            throw new MuitasTentativasException();
        }
    }

    private static String chaveReautenticacao(long usuarioId) {
        return "excluir:" + usuarioId;
    }

    private boolean senhaAtualConfere(Usuario usuario, String senhaAtual) {
        return senhaAtual != null && cabeNoBcrypt(senhaAtual) && encoder.matches(senhaAtual, usuario.getSenhaHash());
    }

    /** Valida o tamanho (400 se não couber no BCrypt) e gera o hash. Package-private: o fluxo de e-mail o usa. */
    String hashDaSenha(String senha) {
        if (!cabeNoBcrypt(senha)) {
            throw new RequisicaoInvalidaException("A senha deve ter entre 8 e 72 caracteres.");
        }
        return encoder.encode(senha);
    }

    private static boolean cabeNoBcrypt(String senha) {
        return senha.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES_BCRYPT;
    }

    private static ConflitoException emailJaCadastrado() {
        return new ConflitoException("E-mail já cadastrado.");
    }
}
