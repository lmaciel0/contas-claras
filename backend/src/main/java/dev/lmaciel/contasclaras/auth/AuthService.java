package dev.lmaciel.contasclaras.auth;

import java.nio.charset.StandardCharsets;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    /** O BCrypt só considera os 72 primeiros bytes e o encoder recusa senhas maiores que isso. */
    private static final int MAX_BYTES_BCRYPT = 72;

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final EmailsLiberados emailsLiberados;
    private final CategoriasPadrao categoriasPadrao;
    private final LimiteTentativasLogin limite;
    /** Hash de uma senha descartada: gasta o mesmo tempo de BCrypt quando o e-mail não existe. */
    private final String hashFalso;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, EmailsLiberados emailsLiberados,
            CategoriasPadrao categoriasPadrao, LimiteTentativasLogin limite) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.emailsLiberados = emailsLiberados;
        this.categoriasPadrao = categoriasPadrao;
        this.limite = limite;
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
