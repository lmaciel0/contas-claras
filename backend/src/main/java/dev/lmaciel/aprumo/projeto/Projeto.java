package dev.lmaciel.aprumo.projeto;

import dev.lmaciel.aprumo.usuario.Usuario;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(name = "projeto")
public class Projeto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 50)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstagioProjeto estagio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadeProjeto prioridade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CorProjeto cor;

    @Column(nullable = false)
    private int ordem;

    @Column
    private LocalDate prazo;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em")
    private Instant atualizadoEm;

    @OneToMany(mappedBy = "projeto", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem ASC")
    private List<ProjetoSubtarefa> subtarefas = new ArrayList<>();

    protected Projeto() {
    }

    public Projeto(Usuario usuario, String titulo, String descricao, String categoria,
                   EstagioProjeto estagio, PrioridadeProjeto prioridade, CorProjeto cor,
                   int ordem, LocalDate prazo) {
        this.usuario = usuario;
        this.titulo = titulo;
        this.descricao = descricao;
        this.categoria = categoria;
        this.estagio = estagio != null ? estagio : EstagioProjeto.A_FAZER;
        this.prioridade = prioridade != null ? prioridade : PrioridadeProjeto.MEDIA;
        this.cor = cor != null ? cor : CorProjeto.azul;
        this.ordem = ordem;
        this.prazo = prazo;
        this.atualizadoEm = Instant.now();
    }

    public void adicionarSubtarefa(String titulo) {
        ProjetoSubtarefa subtarefa = new ProjetoSubtarefa(this, titulo, this.subtarefas.size());
        this.subtarefas.add(subtarefa);
        this.atualizadoEm = Instant.now();
    }

    public void removerSubtarefa(Long subtarefaId) {
        this.subtarefas.removeIf(s -> s.getId() != null && s.getId().equals(subtarefaId));
        // Renormalizar ordens
        for (int i = 0; i < this.subtarefas.size(); i++) {
            this.subtarefas.get(i).setOrdem(i);
        }
        this.atualizadoEm = Instant.now();
    }

    public void moverPara(EstagioProjeto novoEstagio, int novaOrdem) {
        if (novoEstagio != null) {
            this.estagio = novoEstagio;
        }
        this.ordem = Math.max(0, novaOrdem);
        this.atualizadoEm = Instant.now();
    }

    public void atualizarDados(String titulo, String descricao, String categoria,
                               PrioridadeProjeto prioridade, CorProjeto cor, LocalDate prazo) {
        if (titulo != null && !titulo.isBlank()) {
            this.titulo = titulo;
        }
        this.descricao = descricao;
        this.categoria = categoria;
        if (prioridade != null) {
            this.prioridade = prioridade;
        }
        if (cor != null) {
            this.cor = cor;
        }
        this.prazo = prazo;
        this.atualizadoEm = Instant.now();
    }

    public int calcularPorcentagemProgresso() {
        if (subtarefas.isEmpty()) {
            return estagio == EstagioProjeto.CONCLUIDO ? 100 : 0;
        }
        long concluidas = subtarefas.stream().filter(ProjetoSubtarefa::isConcluida).count();
        return (int) Math.round(((double) concluidas / subtarefas.size()) * 100.0);
    }

    public int getTotalSubtarefas() {
        return subtarefas.size();
    }

    public int getSubtarefasConcluidas() {
        return (int) subtarefas.stream().filter(ProjetoSubtarefa::isConcluida).count();
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

    public String getDescricao() {
        return descricao;
    }

    public String getCategoria() {
        return categoria;
    }

    public EstagioProjeto getEstagio() {
        return estagio;
    }

    public PrioridadeProjeto getPrioridade() {
        return prioridade;
    }

    public CorProjeto getCor() {
        return cor;
    }

    public int getOrdem() {
        return ordem;
    }

    public void setOrdem(int ordem) {
        this.ordem = ordem;
    }

    public LocalDate getPrazo() {
        return prazo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public List<ProjetoSubtarefa> getSubtarefas() {
        return Collections.unmodifiableList(subtarefas);
    }
}
