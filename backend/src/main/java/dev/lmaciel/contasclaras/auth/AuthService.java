package dev.lmaciel.contasclaras.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import dev.lmaciel.contasclaras.auth.GoogleTokenVerifier.IdentidadeGoogle;
import dev.lmaciel.contasclaras.categoria.CategoriasPadrao;
import dev.lmaciel.contasclaras.comum.ConflitoException;
import dev.lmaciel.contasclaras.comum.MuitasTentativasException;
import dev.lmaciel.contasclaras.comum.NaoAutenticadoException;
import dev.lmaciel.contasclaras.comum.ProibidoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.usuario.Usuario;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;

@Service
public class AuthService {

    static final String CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos.";
    static final String LOGIN_GOOGLE_INVALIDO = "Login Google inválido.";
    /** Tamanho da coluna {@code usuario.nome}. */
    private static final int MAX_NOME = 120;
    /** O BCrypt só considera os 72 primeiros bytes e o encoder recusa senhas maiores que isso. */
    private static final int MAX_BYTES_BCRYPT = 72;

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final EmailsLiberados emailsLiberados;
    private final CategoriasPadrao categoriasPadrao;
    private final LimiteTentativasLogin limite;
    private final GoogleTokenVerifier googleVerificador;
    /** Hash de uma senha descartada: gasta o mesmo tempo de BCrypt quando o e-mail não existe. */
    private final String hashFalso;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, EmailsLiberados emailsLiberados,
            CategoriasPadrao categoriasPadrao, LimiteTentativasLogin limite, GoogleTokenVerifier googleVerificador) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.emailsLiberados = emailsLiberados;
        this.categoriasPadrao = categoriasPadrao;
        this.limite = limite;
        this.googleVerificador = googleVerificador;
        this.hashFalso = encoder.encode("senha-descartada-sem-uso");
    }

    /**
     * E-mail fora da lista e e-mail já cadastrado recebem exatamente a mesma recusa, e o BCrypt roda antes
     * de qualquer decisão, para que nem a resposta nem o tempo revelem quais e-mails têm conta.
     */
    @Transactional
    public Usuario cadastrar(String nome, String email, String senha) {
        String hash = hashDaSenha(senha);
        if (!emailsLiberados.permite(email) || usuarios.existsByEmail(Emails.normalizar(email))) {
            throw cadastroRecusado();
        }
        try {
            return criarUsuario(nome, email, hash, null);
        } catch (ConflitoException e) {
            throw cadastroRecusado();
        }
    }

    /**
     * Único lugar que cria usuário (cadastro por senha e, depois, por Google): garante e-mail
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
     * Confere o ID token no Google. Fica fora de transação de propósito: é uma chamada de rede numa
     * rota pública e não deve segurar uma conexão do banco enquanto espera.
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
     * conta com o mesmo e-mail (vincula o Google, apaga a senha e derruba as outras sessões); e-mail
     * liberado (cria a conta, sem senha); senão recusa.
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
            porEmail.setGoogleSub(identidade.sub());
            porEmail.setSenhaHash(null);
            porEmail.invalidarSessoes();
            return porEmail;
        }
        if (!emailsLiberados.permite(email)) {
            throw cadastroRecusado();
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
     * versão devolvida. Quem já tem senha precisa informar a senha atual; contas só com Google não.
     */
    @Transactional
    public Usuario definirSenha(long id, String senhaAtual, String senhaNova) {
        Usuario usuario = buscar(id);
        if (usuario.temSenha() && !senhaAtualConfere(usuario, senhaAtual)) {
            throw new RequisicaoInvalidaException("Senha atual incorreta.");
        }
        usuario.setSenhaHash(hashDaSenha(senhaNova));
        usuario.invalidarSessoes();
        return usuario;
    }

    private boolean senhaAtualConfere(Usuario usuario, String senhaAtual) {
        return senhaAtual != null && cabeNoBcrypt(senhaAtual) && encoder.matches(senhaAtual, usuario.getSenhaHash());
    }

    private String hashDaSenha(String senha) {
        if (!cabeNoBcrypt(senha)) {
            throw new RequisicaoInvalidaException("A senha deve ter entre 8 e 72 caracteres.");
        }
        return encoder.encode(senha);
    }

    private static boolean cabeNoBcrypt(String senha) {
        return senha.getBytes(StandardCharsets.UTF_8).length <= MAX_BYTES_BCRYPT;
    }

    private static ProibidoException cadastroRecusado() {
        return new ProibidoException("Não foi possível criar a conta com este e-mail.");
    }

    private static ConflitoException emailJaCadastrado() {
        return new ConflitoException("E-mail já cadastrado.");
    }
}
