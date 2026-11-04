package dev.lmaciel.aprumo.auth.dto;

import dev.lmaciel.aprumo.usuario.Usuario;

public record UsuarioResponse(long id, String nome, String email, boolean temSenha) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.temSenha());
    }
}
