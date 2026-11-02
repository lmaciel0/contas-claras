package dev.lmaciel.contasclaras.projeto;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "projeto_subtarefa")
public class ProjetoSubtarefa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projeto_id", nullable = false)
    private Projeto projeto;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false)
    private boolean concluida;

    @Column(nullable = false)
    private int ordem;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private Instant criadoEm;

    protected ProjetoSubtarefa() {
    }

    public ProjetoSubtarefa(Projeto projeto, String titulo, int ordem) {
        this.projeto = projeto;
        this.titulo = titulo;
        this.concluida = false;
        this.ordem = ordem;
    }

    public void alternarConclusao() {
        this.concluida = !this.concluida;
    }

    public void setConcluida(boolean concluida) {
        this.concluida = concluida;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
    }

    public Long getId() {
        return id;
    }

    public Projeto getProjeto() {
        return projeto;
    }

    public String getTitulo() {
        return titulo;
    }

    public boolean isConcluida() {
        return concluida;
    }

    public int getOrdem() {
        return ordem;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
