package dev.lmaciel.contasclaras.nota;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.lmaciel.contasclaras.auth.UsuarioLogado;
import dev.lmaciel.contasclaras.comum.NaoEncontradoException;
import dev.lmaciel.contasclaras.comum.RequisicaoInvalidaException;
import dev.lmaciel.contasclaras.nota.dto.NotaRequest;
import dev.lmaciel.contasclaras.nota.dto.NotaResponse;
import dev.lmaciel.contasclaras.nota.dto.NotaResumoResponse;
import dev.lmaciel.contasclaras.usuario.UsuarioRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class NotaService {

    static final String TITULO_PADRAO = "Sem título";
    static final String FILTRO_DUPLO = "Use categoriaId ou semCategoria, não os dois.";
    static final String TEXTO_INVALIDO = "O texto da nota contém caracteres que não podem ser gravados.";

    private final NotaRepository notas;
    private final UsuarioRepository usuarios;
    private final CategoriaNotaService categorias;
    private final ObjectMapper json;
    private final Clock clock;

    public NotaService(NotaRepository notas, UsuarioRepository usuarios, CategoriaNotaService categorias,
            ObjectMapper json, Clock clock) {
        this.notas = notas;
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.json = json;
        this.clock = clock;
    }

    /** De outro usuário ou inexistente dá o mesmo 404, para não revelar quais ids existem. */
    @Transactional(readOnly = true)
    public Nota buscarDoUsuario(long notaId, UsuarioLogado u) {
        return notas.findByIdAndUsuarioId(notaId, u.id()).orElseThrow(NaoEncontradoException::new);
    }

    @Transactional(readOnly = true)
    public NotaResponse obter(long id, UsuarioLogado u) {
        return resposta(buscarDoUsuario(id, u));
    }

    @Transactional
    public NotaResponse criar(Long categoriaId, UsuarioLogado u) {
        CategoriaNota categoria = categoriaId == null ? null : categorias.buscarDoUsuario(categoriaId, u);
        Nota nova = new Nota(usuarios.getReferenceById(u.id()), categoria, TITULO_PADRAO,
                ConteudoNota.VAZIO.toString(), "", agora());
        notas.saveAndFlush(nova);
        return NotaResponse.de(nova, ConteudoNota.VAZIO);
    }

    @Transactional
    public NotaResponse editar(long id, NotaRequest req, UsuarioLogado u) {
        Nota nota = buscarDoUsuario(id, u);
        ConteudoNota.validar(req.conteudo());
        String texto = ConteudoNota.textoSimples(req.conteudo());
        if (!gravavel(texto) || !gravavel(req.titulo())) {
            throw new RequisicaoInvalidaException(TEXTO_INVALIDO);
        }
        CategoriaNota categoria = req.categoriaId() == null ? null
                : categorias.buscarDoUsuario(req.categoriaId(), u);
        nota.editar(req.titulo(), json.writeValueAsString(req.conteudo()), texto, categoria, agora());
        notas.saveAndFlush(nota);
        return NotaResponse.de(nota, req.conteudo());
    }

    @Transactional
    public void excluir(long id, UsuarioLogado u) {
        notas.delete(buscarDoUsuario(id, u));
    }

    @Transactional(readOnly = true)
    public List<NotaResumoResponse> listar(String busca, Long categoriaId, boolean semCategoria,
            UsuarioLogado u) {
        if (categoriaId != null && semCategoria) {
            throw new RequisicaoInvalidaException(FILTRO_DUPLO);
        }
        int filtro = semCategoria ? NotaRepository.SEM_CATEGORIA
                : categoriaId != null ? NotaRepository.DA_CATEGORIA : NotaRepository.TODAS;
        return notas.listar(u.id(), padrao(busca), filtro, categoriaId == null ? 0 : categoriaId).stream()
                .map(NotaResumoResponse::de).toList();
    }

    /** {@code %texto%} com {@code \}, {@code %} e {@code _} da busca escapados; busca vazia casa tudo. */
    static String padrao(String busca) {
        String limpa = TextoSeguro.limpar(busca);
        if (limpa == null || limpa.isEmpty()) {
            return "%";
        }
        String escapada = limpa.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escapada + "%";
    }

    private NotaResponse resposta(Nota nota) {
        JsonNode conteudo = json.readTree(nota.getConteudo());
        return NotaResponse.de(nota, conteudo);
    }

    /** O Postgres guarda microssegundos; truncar mantém a resposta igual ao que a próxima leitura devolve. */
    private Instant agora() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    /** NUL e substitutos soltos (UTF-16 inválido) o Postgres recusa; sem este filtro viraria 500. */
    private static boolean gravavel(String texto) {
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c == '\u0000') {
                return false;
            }
            if (Character.isHighSurrogate(c)) {
                if (i + 1 >= texto.length() || !Character.isLowSurrogate(texto.charAt(i + 1))) {
                    return false;
                }
                i++;
            } else if (Character.isLowSurrogate(c)) {
                return false;
            }
        }
        return true;
    }
}
