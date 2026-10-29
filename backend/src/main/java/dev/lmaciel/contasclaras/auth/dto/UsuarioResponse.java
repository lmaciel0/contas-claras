package dev.lmaciel.contasclaras.auth.dto;

import dev.lmaciel.contasclaras.usuario.Usuario;

public record UsuarioResponse(long id, String nome, String email, boolean temSenha) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.temSenha());
    }
}
