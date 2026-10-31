package dev.lmaciel.contasclaras.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface CodigoEmailRepository extends JpaRepository<CodigoEmail, Long> {

    Optional<CodigoEmail> findByTipoAndEmail(TipoCodigo tipo, String email);

    Optional<CodigoEmail> findByTokenHash(String tokenHash);

    /** Igual a {@link #findByTipoAndEmail}, com {@code select ... for update}: tentativas de instâncias paralelas se enfileiram. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CodigoEmail c where c.tipo = :tipo and c.email = :email")
    Optional<CodigoEmail> buscarParaConferir(@Param("tipo") TipoCodigo tipo, @Param("email") String email);

    /** Igual a {@link #findByTokenHash}, com {@code select ... for update}. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CodigoEmail c where c.tokenHash = :tokenHash")
    Optional<CodigoEmail> buscarPorTokenParaConferir(@Param("tokenHash") String tokenHash);

    /** Apaga os códigos vencidos antes de {@code limite}. Exige transação ativa. */
    @Modifying
    @Query("delete from CodigoEmail c where c.expiraEm < :limite")
    void deleteByExpiraEmBefore(@Param("limite") Instant limite);
}
