package dev.lmaciel.contasclaras.nota;

import dev.lmaciel.contasclaras.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "categoria_nota")
public class CategoriaNota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 40)
    private String nome;

    /** Chave da paleta ({@link CorCategoriaNota#valor()}), em minúsculas. */
    @Column(nullable = false, length = 10)
    private String cor;

    protected CategoriaNota() {
    }

    public CategoriaNota(Usuario usuario, String nome, CorCategoriaNota cor) {
        this.usuario = usuario;
        this.nome = nome;
        this.cor = cor.valor();
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getNome() {
        return nome;
    }

    public String getCor() {
        return cor;
    }

    public void editar(String nome, CorCategoriaNota cor) {
        this.nome = nome;
        this.cor = cor.valor();
    }
}
