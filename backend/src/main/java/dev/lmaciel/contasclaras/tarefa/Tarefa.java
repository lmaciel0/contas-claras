package dev.lmaciel.contasclaras.tarefa;

import java.time.Instant;
import java.time.LocalDate;

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
@Table(name = "tarefa")
public class Tarefa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(name = "data")
    private LocalDate data;

    @Column(name = "concluida_em")
    private Instant concluidaEm;

    @Column(name = "criado_em", nullable = false, insertable = false, updatable = false)
    private Instant criadoEm;

    protected Tarefa() {
    }

    public Tarefa(Usuario usuario, String titulo, LocalDate data) {
        this.usuario = usuario;
        this.titulo = titulo;
        this.data = data;
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getTitulo() {
        return titulo;
    }

    public LocalDate getData() {
        return data;
    }

    public Instant getConcluidaEm() {
        return concluidaEm;
    }

    public boolean isConcluida() {
        return concluidaEm != null;
    }

    public void editar(String titulo, LocalDate data) {
        this.titulo = titulo;
        this.data = data;
    }

    public void concluir(Instant quando) {
        this.concluidaEm = quando;
    }

    public void reabrir() {
        this.concluidaEm = null;
    }
}
