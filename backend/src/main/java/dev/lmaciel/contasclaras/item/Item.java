package dev.lmaciel.contasclaras.item;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.lmaciel.contasclaras.categoria.Categoria;
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
@Table(name = "item")
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(nullable = false, length = 120)
    private String nome;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "dia_vencimento")
    private Integer diaVencimento;

    @Column(nullable = false)
    private boolean cartao;

    @Column(precision = 12, scale = 2)
    private BigDecimal limite;

    @Column(nullable = false)
    private boolean arquivado;

    protected Item() {
    }

    public Item(Categoria categoria, String nome, Integer diaVencimento, boolean cartao, BigDecimal limite) {
        this.categoria = categoria;
        this.nome = nome;
        this.diaVencimento = diaVencimento;
        this.cartao = cartao;
        this.limite = duasCasas(limite);
    }

    /** Troca todos os dados editáveis de uma vez (o PUT substitui o item). */
    public void atualizar(String nome, Integer diaVencimento, boolean cartao, BigDecimal limite,
            boolean arquivado) {
        this.nome = nome;
        this.diaVencimento = diaVencimento;
        this.cartao = cartao;
        this.limite = duasCasas(limite);
        this.arquivado = arquivado;
    }

    /** Mesma escala do banco ({@code numeric(12,2)}): a resposta traz "1500.50", não "1500.5". */
    private static BigDecimal duasCasas(BigDecimal valor) {
        return valor == null ? null : valor.setScale(2, RoundingMode.UNNECESSARY);
    }

    public Long getId() {
        return id;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public String getNome() {
        return nome;
    }

    public Integer getDiaVencimento() {
        return diaVencimento;
    }

    public boolean isCartao() {
        return cartao;
    }

    public BigDecimal getLimite() {
        return limite;
    }

    public boolean isArquivado() {
        return arquivado;
    }
}
