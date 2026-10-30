package dev.lmaciel.contasclaras.lancamento;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import dev.lmaciel.contasclaras.categoria.TipoCategoria;

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

    /**
     * Totais do ano do usuário agrupados por mês, tipo da categoria e status. Só existe linha para o que
     * tem lançamento: mês sem linha é mês sem lançamentos.
     */
    @Query("""
            select new dev.lmaciel.contasclaras.lancamento.TotalMensal(l.mes, c.tipo, l.status, sum(l.valor))
            from Lancamento l join l.item i join i.categoria c
            where c.usuario.id = :usuarioId and l.ano = :ano
            group by l.mes, c.tipo, l.status""")
    List<TotalMensal> totaisDoAno(@Param("usuarioId") long usuarioId, @Param("ano") int ano);

    /** Totais por categoria do tipo informado no mês, do maior para o menor (empate: ordem da categoria). */
    @Query("""
            select new dev.lmaciel.contasclaras.lancamento.TotalCategoria(c.id, c.nome, sum(l.valor))
            from Lancamento l join l.item i join i.categoria c
            where c.usuario.id = :usuarioId and c.tipo = :tipo and l.ano = :ano and l.mes = :mes
            group by c.id, c.nome, c.ordem
            order by sum(l.valor) desc, c.ordem""")
    List<TotalCategoria> totaisPorCategoria(@Param("usuarioId") long usuarioId, @Param("tipo") TipoCategoria tipo,
            @Param("ano") int ano, @Param("mes") int mes);

    /**
     * Lançamentos do status e tipo informados com vencimento entre as duas datas (inclusive), do mais antigo
     * para o mais novo. Sem vencimento não entra. Não filtra por mês: o que vence fora do mês escolhido também vem.
     */
    @Query("""
            select l from Lancamento l join fetch l.item i join fetch i.categoria c
            where c.usuario.id = :usuarioId and c.tipo = :tipo and l.status = :status
              and l.vencimento is not null and l.vencimento between :de and :ate
            order by l.vencimento, l.id""")
    List<Lancamento> findComVencimentoEntre(@Param("usuarioId") long usuarioId, @Param("tipo") TipoCategoria tipo,
            @Param("status") StatusLancamento status, @Param("de") LocalDate de, @Param("ate") LocalDate ate);

    /** Lançamentos do ano do usuário, com item e categoria numa consulta só, por categoria, item e mês. */
    @Query("""
            select l from Lancamento l join fetch l.item i join fetch i.categoria c
            where c.usuario.id = :usuarioId and l.ano = :ano
            order by c.ordem, c.id, i.nome, i.id, l.mes""")
    List<Lancamento> findDoAno(@Param("usuarioId") long usuarioId, @Param("ano") int ano);

    /** Valor do mês de cada cartão não arquivado do usuário; cartão sem lançamento no mês não tem linha. */
    @Query("""
            select new dev.lmaciel.contasclaras.lancamento.FaturaItem(i.id, l.valor)
            from Lancamento l join l.item i join i.categoria c
            where c.usuario.id = :usuarioId and i.cartao = true and i.arquivado = false
              and l.ano = :ano and l.mes = :mes""")
    List<FaturaItem> faturasDosCartoesNoMes(@Param("usuarioId") long usuarioId, @Param("ano") int ano,
            @Param("mes") int mes);

    boolean existsByItemCategoriaId(long categoriaId);

    boolean existsByItemCategoriaUsuarioId(long usuarioId);
}
