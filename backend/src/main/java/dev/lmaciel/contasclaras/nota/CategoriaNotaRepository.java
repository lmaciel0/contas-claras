package dev.lmaciel.contasclaras.nota;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoriaNotaRepository extends JpaRepository<CategoriaNota, Long> {

    List<CategoriaNota> findByUsuarioId(long usuarioId);

    Optional<CategoriaNota> findByIdAndUsuarioId(long id, long usuarioId);

    /** Mesma regra do índice único {@code uq_categoria_nota_nome}: nome sem distinguir maiúsculas. */
    @Query("select count(c) > 0 from CategoriaNota c where c.usuario.id = :usuarioId and lower(c.nome) = lower(:nome)")
    boolean existeNome(@Param("usuarioId") long usuarioId, @Param("nome") String nome);

    @Query("""
            select count(c) > 0 from CategoriaNota c
            where c.usuario.id = :usuarioId and lower(c.nome) = lower(:nome) and c.id <> :id""")
    boolean existeNomeEmOutra(@Param("usuarioId") long usuarioId, @Param("nome") String nome,
            @Param("id") long id);
}
