package dev.lmaciel.contasclaras.nota;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotaRepository extends JpaRepository<Nota, Long> {

    /** Linha da listagem: só as colunas que a prévia usa, sem o JSON do conteúdo. */
    record Resumo(long id, String titulo, String texto, Long categoriaId, boolean fixada, Instant atualizadoEm) {
    }

    record TotalPorCategoria(long categoriaId, long total) {
    }

    /** Filtro de categoria da listagem. */
    int TODAS = 0;
    int DA_CATEGORIA = 1;
    int SEM_CATEGORIA = 2;

    Optional<Nota> findByIdAndUsuarioId(long id, long usuarioId);

    Optional<Nota> findByUsuarioIdAndFixadaTrue(long usuarioId);

    /** Tira a fixação das outras notas do usuário; o flush antes grava o que a transação já mudou. */
    @Modifying(flushAutomatically = true)
    @Query("update Nota n set n.fixada = false where n.usuario.id = :usuarioId and n.fixada = true and n.id <> :id")
    int desfixarOutras(@Param("usuarioId") long usuarioId, @Param("id") long id);

    /**
     * {@code padrao} já vem com {@code %} nas pontas e com {@code \}, {@code %} e {@code _} da busca escapados
     * por {@code \}. Tudo entra por parâmetro ligado.
     */
    @Query("""
            select new dev.lmaciel.contasclaras.nota.NotaRepository$Resumo(
                n.id, n.titulo, n.texto, n.categoria.id, n.fixada, n.atualizadoEm)
            from Nota n
            where n.usuario.id = :usuarioId
              and (lower(n.titulo) like lower(:padrao) escape '\\' or lower(n.texto) like lower(:padrao) escape '\\')
              and (:filtro = 0
                   or (:filtro = 1 and n.categoria.id = :categoriaId)
                   or (:filtro = 2 and n.categoria is null))
            order by n.atualizadoEm desc, n.id desc""")
    List<Resumo> listar(@Param("usuarioId") long usuarioId, @Param("padrao") String padrao,
            @Param("filtro") int filtro, @Param("categoriaId") long categoriaId,
            org.springframework.data.domain.Pageable pageable);

    @Query("""
            select new dev.lmaciel.contasclaras.nota.NotaRepository$TotalPorCategoria(n.categoria.id, count(n))
            from Nota n
            where n.usuario.id = :usuarioId and n.categoria is not null
            group by n.categoria.id""")
    List<TotalPorCategoria> totaisPorCategoria(@Param("usuarioId") long usuarioId);
}
