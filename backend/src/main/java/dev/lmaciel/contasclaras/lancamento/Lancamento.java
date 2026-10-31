package dev.lmaciel.contasclaras.lancamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.lmaciel.contasclaras.item.Item;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "lancamento")
public class Lancamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(nullable = false)
    private int ano;

    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(nullable = false)
    private int mes;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusLancamento status;

    private LocalDate vencimento;

    protected Lancamento() {
    }

    public Lancamento(Item item, int ano, int mes, BigDecimal valor, StatusLancamento status,
            LocalDate vencimento) {
        this.item = item;
        this.ano = ano;
        this.mes = mes;
        this.valor = duasCasas(valor);
        this.status = status;
        this.vencimento = vencimento;
    }

    /** Troca valor, status e vencimento; item, ano e mês identificam o lançamento e não mudam. */
    public void atualizar(BigDecimal valor, StatusLancamento status, LocalDate vencimento) {
        this.valor = duasCasas(valor);
        this.status = status;
        this.vencimento = vencimento;
    }

    public void mudarStatus(StatusLancamento status) {
        this.status = status;
    }

    /** Mesma escala do banco ({@code numeric(12,2)}): a resposta traz "180.40", não "180.4". */
    private static BigDecimal duasCasas(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.UNNECESSARY);
    }

    public Long getId() {
        return id;
    }

    public Item getItem() {
        return item;
    }

    public int getAno() {
        return ano;
    }

    public int getMes() {
        return mes;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public StatusLancamento getStatus() {
        return status;
    }

    public LocalDate getVencimento() {
        return vencimento;
    }
}
