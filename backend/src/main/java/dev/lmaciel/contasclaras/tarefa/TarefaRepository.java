package dev.lmaciel.contasclaras.tarefa;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TarefaRepository extends JpaRepository<Tarefa, Long> {

    Optional<Tarefa> findByIdAndUsuarioId(long id, long usuarioId);

    List<Tarefa> findByUsuarioIdAndConcluidaEmIsNull(long usuarioId);

    List<Tarefa> findTop50ByUsuarioIdAndConcluidaEmIsNotNullOrderByConcluidaEmDesc(long usuarioId);

    long countByUsuarioIdAndConcluidaEmIsNotNull(long usuarioId);

    /** Concluídas no intervalo [desde, ate), da mais recente para a mais antiga (limite de 50). */
    List<Tarefa> findTop50ByUsuarioIdAndConcluidaEmGreaterThanEqualAndConcluidaEmLessThanOrderByConcluidaEmDesc(
            long usuarioId, Instant desde, Instant ate);
}
