package dev.lmaciel.aprumo.projeto;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjetoSubtarefaRepository extends JpaRepository<ProjetoSubtarefa, Long> {

    List<ProjetoSubtarefa> findByProjetoIdOrderByOrdemAsc(Long projetoId);

    Optional<ProjetoSubtarefa> findByIdAndProjetoId(Long id, Long projetoId);
}
