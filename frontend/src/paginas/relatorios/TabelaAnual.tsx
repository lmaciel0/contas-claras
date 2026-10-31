import type { CategoriaRelatorio, CelulaRelatorio, RelatorioAnualResponse } from '../../api/tipos'
import { nomeMes } from '../../formato/mes'

const MESES = Array.from({ length: 12 }, (_, i) => i + 1)

// Dentro das células o valor sai sem o "R$" (`1.234,56`) para caber 13 colunas; a legenda da página avisa que é em reais.
const formatadorNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatarNumero = (valor: string) => formatadorNumero.format(Number(valor))

// A primeira coluna fica colada à esquerda quando a tabela rola de lado. Precisa de fundo opaco (cada linha passa o seu)
// para os meses não aparecerem por baixo. `border-separate` mantém a borda junto da célula fixa.
const PRIMEIRA = 'sticky left-0 z-10 min-w-36 max-w-52 border-r border-b border-[var(--cor-linha)] px-3 py-2 text-left'
const NUMERO = 'border-b border-[var(--cor-linha)] px-2.5 py-2 text-right tabular-nums'
const FUNDO_DESTAQUE = 'bg-[var(--cor-fundo)]'

function CelulaDeItem({ celula }: { celula: CelulaRelatorio | null }) {
  if (celula === null) {
    return (
      <td className={`${NUMERO} text-[var(--cor-mutado)]`}>
        <span aria-hidden="true">–</span>
        <span className="sr-only">sem lançamento</span>
      </td>
    )
  }
  const paga = celula.status === 'PAGO'
  return (
    <td className={paga ? `${NUMERO} celula-paga` : NUMERO}>
      {formatarNumero(celula.valor)}
      <span className="sr-only">{paga ? ', pago' : ', previsto'}</span>
    </td>
  )
}

function LinhaDaCategoria({ categoria }: { categoria: CategoriaRelatorio }) {
  return (
    <tbody>
      <tr className="font-bold">
        <th scope="rowgroup" className={`${PRIMEIRA} ${FUNDO_DESTAQUE}`}>
          {categoria.nome}
        </th>
        {MESES.map((mes) => (
          <td key={mes} className={`${NUMERO} ${FUNDO_DESTAQUE}`}>
            {formatarNumero(categoria.totaisMes[mes - 1] ?? '0')}
          </td>
        ))}
        <td className={`${NUMERO} ${FUNDO_DESTAQUE}`}>{formatarNumero(categoria.total)}</td>
      </tr>
      {categoria.itens.map((item) => (
        <tr key={item.itemId}>
          <th scope="row" className={`${PRIMEIRA} bg-white pl-6 font-normal`}>
            {item.nome}
          </th>
          {MESES.map((mes) => (
            <CelulaDeItem key={mes} celula={item.meses[mes - 1] ?? null} />
          ))}
          <td className={`${NUMERO} font-semibold`}>{formatarNumero(item.total)}</td>
        </tr>
      ))}
    </tbody>
  )
}

interface LinhaTotalProps {
  rotulo: string
  /** Os 12 valores, de janeiro a dezembro. */
  porMes: string[]
  ano: string
  /** Pinta de vermelho o valor menor que zero (diferença de caixa). */
  vermelhoSeNegativo?: boolean
  /** Fundo da linha, repetido na primeira coluna fixa. */
  fundo: string
}

function LinhaTotal({ rotulo, porMes, ano, vermelhoSeNegativo = false, fundo }: LinhaTotalProps) {
  const celula = (valor: string, chave: string) => {
    const negativa = vermelhoSeNegativo && Number(valor) < 0
    return (
      <td key={chave} className={`${NUMERO} ${fundo}${negativa ? ' diferenca-negativa' : ''}`}>
        {formatarNumero(valor)}
      </td>
    )
  }
  return (
    <tr className="font-bold">
      <th scope="row" className={`${PRIMEIRA} ${fundo}`}>
        {rotulo}
      </th>
      {MESES.map((mes) => celula(porMes[mes - 1] ?? '0', String(mes)))}
      {celula(ano, 'ano')}
    </tr>
  )
}

/**
 * Tabela do relatório anual no formato da planilha: Item, JAN a DEZ e Ano. Cada categoria abre com a linha do
 * subtotal (em negrito) seguida dos itens; no fim ficam "Despesas totais" e "Diferença de caixa". Só o contêiner rola
 * de lado (a página não), com a coluna Item fixa à esquerda. O contêiner é focável para dar para rolar pelo teclado e é
 * `relative` de propósito: os textos `sr-only` são absolutos e, sem um ancestral posicionado, alargariam a página.
 */
export function TabelaAnual({ relatorio }: { relatorio: RelatorioAnualResponse }) {
  const { ano } = relatorio
  return (
    <div
      role="region"
      aria-label={`Relatório anual de ${ano}`}
      tabIndex={0}
      className="relative overflow-x-auto rounded-[var(--raio-card)] bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-principal)]"
    >
      <table className="w-max min-w-full border-separate border-spacing-0 text-xs md:text-[13px]">
        <caption className="sr-only">Valor de cada item por mês em {ano}, em reais</caption>
        <thead>
          <tr className="text-[11px] font-semibold text-[var(--cor-mutado)] uppercase">
            <th scope="col" className={`${PRIMEIRA} bg-white`}>
              Item
            </th>
            {MESES.map((mes) => (
              <th
                key={mes}
                scope="col"
                title={nomeMes(mes)}
                className="min-w-20 border-b border-[var(--cor-linha)] px-2.5 py-2 text-right"
              >
                {nomeMes(mes).slice(0, 3).toUpperCase()}
              </th>
            ))}
            <th scope="col" className="min-w-24 border-b border-[var(--cor-linha)] px-2.5 py-2 text-right">
              Ano
            </th>
          </tr>
        </thead>
        {relatorio.categorias.map((categoria) => (
          <LinhaDaCategoria key={categoria.categoriaId} categoria={categoria} />
        ))}
        <tfoot>
          <LinhaTotal
            rotulo="Despesas totais"
            porMes={relatorio.despesasMes}
            ano={relatorio.despesasAno}
            fundo="bg-[var(--cor-linha)]"
          />
          <LinhaTotal
            rotulo="Diferença de caixa"
            porMes={relatorio.diferencaMes}
            ano={relatorio.diferencaAno}
            vermelhoSeNegativo
            fundo="bg-white"
          />
        </tfoot>
      </table>
    </div>
  )
}
