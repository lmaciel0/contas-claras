package dev.lmaciel.contasclaras.usuario;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "senha_hash", length = 100)
    private String senhaHash;

    @Column(name = "google_sub", unique = true)
    private String googleSub;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private Instant criadoEm;

    protected Usuario() {
    }

    public Usuario(String nome, String email, String senhaHash, String googleSub) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.googleSub = googleSub;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public void setGoogleSub(String googleSub) {
        this.googleSub = googleSub;
    }

    public boolean temSenha() {
        return senhaHash != null;
    }
}
