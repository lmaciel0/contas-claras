package dev.lmaciel.contasclaras.lancamento;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long> {

    /** Lançamentos do mês do usuário, com item e categoria numa consulta só (sem N+1), na ordem das categorias. */
    @Query("""
            select l from Lancamento l join fetch l.item i join fetch i.categoria c
            where c.usuario.id = :usuarioId and l.ano = :ano and l.mes = :mes
            order by c.ordem""")
    List<Lancamento> findDoMes(@Param("usuarioId") long usuarioId, @Param("ano") int ano, @Param("mes") int mes);

    /** Busca por id já com a checagem de dono (item, categoria, usuário): de outro usuário não aparece. */
    @Query("""
            select l from Lancamento l join fetch l.item i join fetch i.categoria c
            where l.id = :id and c.usuario.id = :usuarioId""")
    Optional<Lancamento> findByIdDoUsuario(@Param("id") long id, @Param("usuarioId") long usuarioId);

    Optional<Lancamento> findByItemIdAndAnoAndMes(long itemId, int ano, int mes);

    /**
     * Lançamentos do item entre dois meses (inclusive). {@code de} e {@code ate} são índices de
     * {@code MesAno.indice()}, ou seja, {@code ano * 12 + mes - 1}; a consulta usa a mesma conta.
     */
    @Query("""
            select l from Lancamento l
            where l.item.id = :itemId and (l.ano * 12 + l.mes - 1) between :de and :ate""")
    List<Lancamento> findDoItemNoPeriodo(@Param("itemId") long itemId, @Param("de") int de, @Param("ate") int ate);

    boolean existsByItemCategoriaId(long categoriaId);
}
