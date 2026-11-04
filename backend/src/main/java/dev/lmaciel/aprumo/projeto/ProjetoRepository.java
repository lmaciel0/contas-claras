package dev.lmaciel.aprumo.projeto;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjetoRepository extends JpaRepository<Projeto, Long> {

    List<Projeto> findByUsuarioIdOrderByEstagioAscOrdemAscCriadoEmDesc(Long usuarioId);

    Optional<Projeto> findByIdAndUsuarioId(Long id, Long usuarioId);

    long countByUsuarioIdAndEstagio(Long usuarioId, EstagioProjeto estagio);

    List<Projeto> findByUsuarioIdAndEstagioOrderByOrdemAsc(Long usuarioId, EstagioProjeto estagio);

    @Query("""
        SELECT p FROM Projeto p
        WHERE p.usuario.id = :usuarioId
          AND (
            LOWER(p.titulo) LIKE LOWER(CONCAT('%', :busca, '%'))
            OR (p.descricao IS NOT NULL AND LOWER(p.descricao) LIKE LOWER(CONCAT('%', :busca, '%')))
            OR (p.categoria IS NOT NULL AND LOWER(p.categoria) LIKE LOWER(CONCAT('%', :busca, '%')))
          )
        ORDER BY p.estagio ASC, p.ordem ASC, p.criadoEm DESC
    """)
    List<Projeto> buscarPorTermo(@Param("usuarioId") Long usuarioId, @Param("busca") String busca);

    List<Projeto> findByUsuarioIdAndPrioridadeOrderByEstagioAscOrdemAsc(Long usuarioId, PrioridadeProjeto prioridade);
}
