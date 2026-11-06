package dev.lmaciel.aprumo.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByGoogleSub(String googleSub);

    boolean existsByEmail(String email);

    /** Só a versão da sessão (vazio se o usuário não existe): é consultada a cada requisição. */
    @Query("select u.sessaoVersao from Usuario u where u.id = :id")
    Optional<Integer> buscarSessaoVersao(@Param("id") long id);

    /** Igual a {@code findById}, com {@code select ... for update}: serializa as trocas de senha do mesmo usuário. Exige transação. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.id = :id")
    Optional<Usuario> findByIdParaAtualizar(@Param("id") long id);
}
