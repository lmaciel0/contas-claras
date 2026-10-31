package dev.lmaciel.contasclaras.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistroEnvioRepository extends JpaRepository<RegistroEnvio, Long> {

    long countByEmailHmacAndCriadoEmAfter(String emailHmac, Instant limite);

    long countByIpHmacAndCriadoEmAfter(String ipHmac, Instant limite);

    long countByCriadoEmAfter(Instant limite);

    Optional<RegistroEnvio> findFirstByEmailHmacOrderByCriadoEmDesc(String emailHmac);

    /** Apaga os registros anteriores a {@code limite}. Exige transação ativa. */
    @Modifying
    @Query("delete from RegistroEnvio r where r.criadoEm < :limite")
    void deleteByCriadoEmBefore(@Param("limite") Instant limite);
}
