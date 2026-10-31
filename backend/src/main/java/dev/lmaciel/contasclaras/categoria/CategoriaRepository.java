package dev.lmaciel.contasclaras.categoria;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    List<Categoria> findByUsuarioIdOrderByOrdem(long usuarioId);

    Optional<Categoria> findByIdAndUsuarioId(long id, long usuarioId);

    boolean existsByUsuarioIdAndNome(long usuarioId, String nome);

    boolean existsByUsuarioIdAndNomeAndIdNot(long usuarioId, String nome, long id);

    /** Maior {@code ordem} do usuário, ou -1 se ele não tem categorias. */
    @Query("select coalesce(max(c.ordem), -1) from Categoria c where c.usuario.id = :usuarioId")
    int maiorOrdem(@Param("usuarioId") long usuarioId);

    /**
     * Apaga todas as categorias do usuário de uma vez; os itens saem em cascata no banco (e os lançamentos
     * barram: a chave deles é RESTRICT). Só a importação usa; ela confere antes que não há lançamentos.
     */
    @Modifying
    @Query("delete from Categoria c where c.usuario.id = :usuarioId")
    void apagarTodasDoUsuario(@Param("usuarioId") long usuarioId);
}
