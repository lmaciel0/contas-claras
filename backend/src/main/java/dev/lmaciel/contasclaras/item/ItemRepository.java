package dev.lmaciel.contasclaras.item;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemRepository extends JpaRepository<Item, Long> {

    /** Todos os itens do usuário numa consulta só (a categoria vem junto, sem N+1). */
    @Query("select i from Item i join fetch i.categoria c where c.usuario.id = :usuarioId")
    List<Item> findDoUsuario(@Param("usuarioId") long usuarioId);

    /** Cartões não arquivados do usuário, em ordem de nome. */
    @Query("""
            select i from Item i join i.categoria c
            where c.usuario.id = :usuarioId and i.cartao = true and i.arquivado = false
            order by i.nome, i.id""")
    List<Item> findCartoesAtivos(@Param("usuarioId") long usuarioId);

    List<Item> findByCategoriaId(long categoriaId);

    boolean existsByCategoriaIdAndNome(long categoriaId, String nome);

    boolean existsByCategoriaIdAndNomeAndIdNot(long categoriaId, String nome, long id);

    @Query("select i from Item i join fetch i.categoria c where i.id = :id and c.usuario.id = :usuarioId")
    Optional<Item> findByIdDoUsuario(@Param("id") long id, @Param("usuarioId") long usuarioId);
}
