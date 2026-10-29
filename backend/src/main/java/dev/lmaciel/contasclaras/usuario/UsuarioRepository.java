package dev.lmaciel.contasclaras.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Só a versão da sessão (vazio se o usuário não existe): é consultada a cada requisição. */
    @Query("select u.sessaoVersao from Usuario u where u.id = :id")
    Optional<Integer> buscarSessaoVersao(@Param("id") long id);
}
