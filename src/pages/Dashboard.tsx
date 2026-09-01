import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Visao = "geral" | "clientes"
type Periodo = "dia" | "mes" | "trimestre" | "ano" | "todos"

type Cliente = {
  id: string
  nome: string
  cpf: string
  pontos: number
}

type Compra = {
  id: string
  clienteid: string
  valor: number
  criadoem: string
}

export default function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])

  const [visao, setVisao] = useState<Visao>("geral")
  const [periodo, setPeriodo] = useState<Periodo>("mes")

  const [meta, setMeta] = useState(30000)
  const [editarMeta, setEditarMeta] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: clientesData, error: clientesError } =
      await supabase
        .from("clientes")
        .select("id,nome,cpf,pontos")

    if (clientesError) {
      console.log("Erro ao buscar clientes:", clientesError)
    }

    const { data: comprasData, error: comprasError } =
      await supabase
        .from("compras")
        .select("id,clienteid,valor,criadoem")
        .order("criadoem", { ascending: false })

    if (comprasError) {
      console.log("Erro ao buscar compras:", comprasError)
    }

    setClientes((clientesData || []) as Cliente[])
    setCompras((comprasData || []) as Compra[])
  }

  function inicioDoPeriodo(periodoSelecionado: Periodo) {
    const hoje = new Date()

    if (periodoSelecionado === "dia") {
      const inicio = new Date(hoje)
      inicio.setHours(0, 0, 0, 0)
      return inicio
    }

    if (periodoSelecionado === "mes") {
      return new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1,
        0,
        0,
        0,
        0
      )
    }

    if (periodoSelecionado === "trimestre") {
      const inicio = new Date(hoje)
      inicio.setDate(hoje.getDate() - 90)
      inicio.setHours(0, 0, 0, 0)
      return inicio
    }

    if (periodoSelecionado === "ano") {
      return new Date(
        hoje.getFullYear(),
        0,
        1,
        0,
        0,
        0,
        0
      )
    }

    return null
  }

  const comprasFiltradas = useMemo(() => {
    const hoje = new Date()

    return compras.filter(compra => {
      const data = new Date(compra.criadoem)

      if (periodo === "dia") {
        return (
          data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        )
      }

      if (periodo === "mes") {
        return (
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        )
      }

      if (periodo === "trimestre") {
        const diff =
          (hoje.getTime() - data.getTime()) /
          86400000

        return diff >= 0 && diff <= 90
      }

      if (periodo === "ano") {
        return (
          data.getFullYear() ===
          hoje.getFullYear()
        )
      }

      return true
    })
  }, [compras, periodo])

  const faturamento = comprasFiltradas.reduce(
    (total, compra) =>
      total + Number(compra.valor || 0),
    0
  )

  const quantidadePedidos =
    comprasFiltradas.length

  const ticketMedio =
    quantidadePedidos > 0
      ? faturamento / quantidadePedidos
      : 0

  const clientesAtivos = new Set(
    comprasFiltradas.map(
      compra => compra.clienteid
    )
  ).size

  /*
   * Atualmente estamos usando uma margem estimada
   * de 45% para apresentar o lucro.
   *
   * Posteriormente podemos substituir isso pelo
   * lucro real baseado no custo dos produtos.
   */
  const margemEstimada = 0.45

  const lucroEstimado =
    faturamento * margemEstimada

  const progressoMeta =
    meta > 0
      ? Math.min(
          (faturamento / meta) * 100,
          100
        )
      : 0

  const mediaPorCliente =
    clientesAtivos > 0
      ? faturamento / clientesAtivos
      : 0

  /*
   * CLIENTES EM RISCO
   */

  const clientesRisco = useMemo(() => {
    const hoje = new Date()

    return clientes
      .map(cliente => {
        const comprasCliente =
          compras
            .filter(
              compra =>
                compra.clienteid ===
                cliente.id
            )
            .sort(
              (a, b) =>
                new Date(
                  b.criadoem
                ).getTime() -
                new Date(
                  a.criadoem
                ).getTime()
            )

        const ultima =
          comprasCliente[0]

        if (!ultima) {
          return {
            ...cliente,
            dias: 999
          }
        }

        const dias = Math.floor(
          (hoje.getTime() -
            new Date(
              ultima.criadoem
            ).getTime()) /
            86400000
        )

        return {
          ...cliente,
          dias
        }
      })
      .sort(
        (a, b) =>
          b.dias - a.dias
      )
  }, [clientes, compras])

  /*
   * TOP CLIENTES
   */

  const topClientes = [...clientes]
    .sort(
      (a, b) =>
        b.pontos - a.pontos
    )
    .slice(0, 5)

  /*
   * VENDAS POR MÊS
   */

  const vendasPorMesMap: Record<
    string,
    number
  > = {}

  compras.forEach(compra => {
    const data = new Date(
      compra.criadoem
    )

    const chave = `${String(
      data.getMonth() + 1
    ).padStart(2, "0")}/${data.getFullYear()}`

    vendasPorMesMap[chave] =
      (vendasPorMesMap[chave] || 0) +
      Number(compra.valor || 0)
  })

  const melhorMes = Object.entries(
    vendasPorMesMap
  ).sort(
    (a, b) => b[1] - a[1]
  )[0]

  /*
   * VENDAS DOS ÚLTIMOS 7 DIAS
   */

  const vendasUltimosDias = useMemo(() => {
    const hoje = new Date()

    const resultado: {
      data: string
      valor: number
      pedidos: number
    }[] = []

    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje)

      dia.setDate(
        hoje.getDate() - i
      )

      const vendasDia =
        compras.filter(compra => {
          const data = new Date(
            compra.criadoem
          )

          return (
            data.getDate() ===
              dia.getDate() &&
            data.getMonth() ===
              dia.getMonth() &&
            data.getFullYear() ===
              dia.getFullYear()
          )
        })

      resultado.push({
        data: dia.toLocaleDateString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit"
          }
        ),
        valor: vendasDia.reduce(
          (total, compra) =>
            total +
            Number(
              compra.valor || 0
            ),
          0
        ),
        pedidos:
          vendasDia.length
      })
    }

    return resultado
  }, [compras])

  /*
   * CAMPANHAS
   */

  function campanha(tipo: string) {
    if (tipo === "vip") {
      alert(
        "Campanha VIP enviada para os melhores clientes."
      )
    }

    if (tipo === "estoque") {
      alert(
        "Campanha de queima de estoque ativada."
      )
    }

    if (tipo === "pos") {
      alert(
        "Campanha pós-compra iniciada."
      )
    }

    if (tipo === "inativos") {
      alert(
        "Campanha de recuperação para clientes inativos enviada."
      )
    }
  }

  /*
   * CALENDÁRIO SAZONAL
   */

  const calendario = [
    [
      "15 Março",
      "Dia do Consumidor",
      "Campanha de recompra + cupom progressivo"
    ],
    [
      "Maio",
      "Dia das Mães",
      "Kits premium + ticket médio elevado"
    ],
    [
      "12 Junho",
      "Dia dos Namorados",
      "Combos presenteáveis + venda cruzada"
    ],
    [
      "Agosto",
      "Dia dos Pais",
      "Acessórios + campanhas de indicação"
    ],
    [
      "15 Setembro",
      "Dia do Cliente",
      "Cashback + fidelização"
    ],
    [
      "12 Outubro",
      "Dia das Crianças",
      "Linha família + combos"
    ],
    [
      "Novembro",
      "Black Friday",
      "Giro de estoque + aquisição"
    ],
    [
      "Dezembro",
      "Natal",
      "Luxo, presentes e retenção"
    ],
    [
      "26 Dez - Jan",
      "Pós-Natal / Liquidação",
      "Queima estratégica"
    ]
  ]

  const nomePeriodo =
    periodo === "dia"
      ? "Hoje"
      : periodo === "mes"
      ? "Este mês"
      : periodo === "trimestre"
      ? "Últimos 3 meses"
      : periodo === "ano"
      ? "Este ano"
      : "Todo o período"

  return (
    <div
      style={container}
      className="dashboard-container"
    >
      <style>{`

        .dashboard-graficos-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
        }

        .dashboard-daily-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        .dashboard-table-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f1f1;
        }

        @media (max-width: 900px) {
          .dashboard-graficos-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-daily-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 600px) {
          .dashboard-container {
            padding: 18px !important;
          }

          .dashboard-header {
            align-items: flex-start !important;
          }

          .dashboard-header h1 {
            font-size: 28px !important;
          }

          .dashboard-kpis {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .dashboard-daily-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-table-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }
        }

        @media (max-width: 380px) {
          .dashboard-kpis {
            grid-template-columns: 1fr !important;
          }

          .dashboard-daily-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={header}
        className="dashboard-header"
      >
        <div>
          <h1 style={title}>
            Dashboard
          </h1>

          <span style={sub}>
            Visão estratégica CamiDuda
          </span>
        </div>

        <div style={topControls}>
          <select
            value={periodo}
            onChange={e =>
              setPeriodo(
                e.target.value as Periodo
              )
            }
            style={select}
          >
            <option value="dia">
              Hoje
            </option>

            <option value="mes">
              Este mês
            </option>

            <option value="trimestre">
              Últimos 3 meses
            </option>

            <option value="ano">
              Este ano
            </option>

            <option value="todos">
              Todo o período
            </option>
          </select>
        </div>
      </div>

      {/* =====================================================
          VISÃO
      ===================================================== */}

      <div style={viewSwitch}>
        <button
          style={
            visao === "geral"
              ? activeTab
              : tab
          }
          onClick={() =>
            setVisao("geral")
          }
        >
          Visão Geral
        </button>

        <button
          style={
            visao === "clientes"
              ? activeTab
              : tab
          }
          onClick={() =>
            setVisao("clientes")
          }
        >
          Visão Clientes
        </button>
      </div>

      {visao === "geral" && (
        <>
          {/* =================================================
              RESUMO DO PERÍODO
          ================================================= */}

          <div style={periodLabel}>
            <span>
              Resumo de vendas
            </span>

            <strong>
              {nomePeriodo}
            </strong>
          </div>

          {/* =================================================
              KPIs PRINCIPAIS
          ================================================= */}

          <div
            style={dashGrid}
            className="dashboard-kpis"
          >
            <Dash
              label="Faturamento"
              value={`R$ ${faturamento.toFixed(
                2
              )}`}
              destaque
            />

            <Dash
              label="Lucro estimado"
              value={`R$ ${lucroEstimado.toFixed(
                2
              )}`}
            />

            <Dash
              label="Pedidos"
              value={
                quantidadePedidos
              }
            />

            <Dash
              label="Ticket médio"
              value={`R$ ${ticketMedio.toFixed(
                2
              )}`}
            />

            <Dash
              label="Clientes ativos"
              value={
                clientesAtivos
              }
            />

            <Dash
              label="Média por cliente"
              value={`R$ ${mediaPorCliente.toFixed(
                2
              )}`}
            />
          </div>

          {/* =================================================
              META
          ================================================= */}

          <div
            style={metaCard}
            className="dashboard-meta"
          >
            <div style={metaHeader}>
              <div>
                <strong>
                  Meta de {nomePeriodo}
                </strong>

                <div
                  style={metaValue}
                >
                  {meta.toLocaleString(
                    "pt-BR",
                    {
                      style:
                        "currency",
                      currency: "BRL"
                    }
                  )}
                </div>
              </div>

              <button
                style={dots}
                onClick={() =>
                  setEditarMeta(
                    !editarMeta
                  )
                }
                aria-label="Editar meta"
              >
                {editarMeta
                  ? "×"
                  : "✎"}
              </button>
            </div>

            {editarMeta && (
              <input
                type="number"
                value={meta}
                onChange={e =>
                  setMeta(
                    Number(
                      e.target.value
                    )
                  )
                }
                style={input}
              />
            )}

            <div
              title={`R$ ${faturamento.toFixed(
                2
              )} de R$ ${meta.toFixed(
                2
              )}`}
              style={progressBg}
            >
              <div
                style={{
                  ...progressFill,
                  width: `${progressoMeta}%`
                }}
              />
            </div>

            <div style={progressText}>
              {progressoMeta.toFixed(
                1
              )}
              % da meta
            </div>
          </div>

          {/* =================================================
              VENDAS DOS ÚLTIMOS 7 DIAS
          ================================================= */}

          <div
            style={chartCard}
            className="dashboard-section"
          >
            <div
              style={sectionTitleRow}
            >
              <div>
                <h3
                  style={{
                    ...chartTitle,
                    marginBottom: 4
                  }}
                >
                  Vendas recentes
                </h3>

                <span style={smallText}>
                  Últimos 7 dias
                </span>
              </div>
            </div>

            <div
              className="dashboard-daily-grid"
              style={{
                marginTop: 18
              }}
            >
              {vendasUltimosDias.map(
                dia => {
                  const maior =
                    Math.max(
                      ...vendasUltimosDias.map(
                        item =>
                          item.valor
                      ),
                      1
                    )

                  const altura =
                    Math.max(
                      8,
                      (dia.valor /
                        maior) *
                        100
                    )

                  return (
                    <div
                      key={dia.data}
                      style={
                        dailyCard
                      }
                    >
                      <span
                        style={
                          dailyDate
                        }
                      >
                        {dia.data}
                      </span>

                      <div
                        style={
                          dailyChart
                        }
                      >
                        <div
                          style={{
                            ...dailyBar,
                            height: `${altura}%`
                          }}
                        />
                      </div>

                      <strong
                        style={
                          dailyValue
                        }
                      >
                        R${" "}
                        {dia.valor.toFixed(
                          0
                        )}
                      </strong>

                      <span
                        style={
                          dailyOrders
                        }
                      >
                        {dia.pedidos}{" "}
                        {dia.pedidos ===
                        1
                          ? "pedido"
                          : "pedidos"}
                      </span>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          {/* =================================================
              GRÁFICOS
          ================================================= */}

          <div
            className="dashboard-graficos-grid"
            style={{
              marginBottom: 20
            }}
          >
            {/* FATURAMENTO POR MÊS */}

            <div
              style={chartCard}
            >
              <h3
                style={chartTitle}
              >
                Faturamento por mês
              </h3>

              {Object.entries(
                vendasPorMesMap
              )
                .sort((a, b) =>
                  a[0].localeCompare(
                    b[0]
                  )
                )
                .slice(-6)
                .map(
                  ([mes, total]) => {
                    const maiorValor =
                      Math.max(
                        ...Object.values(
                          vendasPorMesMap
                        ),
                        1
                      )

                    const largura =
                      (Number(total) /
                        maiorValor) *
                      100

                    return (
                      <div
                        key={mes}
                        style={{
                          marginBottom: 14
                        }}
                      >
                        <div
                          style={
                            barLabel
                          }
                        >
                          <span>
                            {mes}
                          </span>

                          <strong>
                            R${" "}
                            {Number(
                              total
                            ).toFixed(
                              0
                            )}
                          </strong>
                        </div>

                        <div
                          style={
                            barBg
                          }
                        >
                          <div
                            style={{
                              ...barFill,
                              width: `${largura}%`
                            }}
                          />
                        </div>
                      </div>
                    )
                  }
                )}

              {Object.keys(
                vendasPorMesMap
              ).length === 0 && (
                <Empty text="Ainda não existem vendas cadastradas." />
              )}
            </div>

            {/* PERFORMANCE */}

            <div
              style={chartCard}
            >
              <h3
                style={chartTitle}
              >
                Performance
              </h3>

              <MiniMetric
                label="Meta atingida"
                value={`${progressoMeta.toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Margem estimada"
                value={`${(
                  margemEstimada *
                  100
                ).toFixed(
                  0
                )}%`}
              />

              <MiniMetric
                label="Recorrência"
                value={`${(
                  (clientesAtivos /
                    Math.max(
                      clientes.length,
                      1
                    )) *
                    100
                ).toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Melhor mês"
                value={
                  melhorMes
                    ? melhorMes[0]
                    : "-"
                }
              />

              <MiniMetric
                label="Faturamento recorde"
                value={
                  melhorMes
                    ? `R$ ${Number(
                        melhorMes[1]
                      ).toFixed(
                        2
                      )}`
                    : "R$ 0,00"
                }
              />
            </div>
          </div>

          {/* =================================================
              INSIGHTS
          ================================================= */}

          <div
            style={section}
            className="dashboard-section"
          >
            <div
              style={
                sectionTitleRow
              }
            >
              <div>
                <h3
                  style={{
                    margin: 0
                  }}
                >
                  Insights estratégicos
                </h3>

                <span
                  style={smallText}
                >
                  Indicadores para apoiar
                  as decisões da loja
                </span>
              </div>
            </div>

            <div
              style={
                insightGrid
              }
            >
              <InsightCard
                title="Melhor oportunidade"
                text={
                  melhorMes
                    ? `O melhor resultado foi em ${melhorMes[0]}.`
                    : "Acompanhar a evolução das vendas."
                }
              />

              <InsightCard
                title="Ticket médio"
                text={
                  ticketMedio <
                  150
                    ? "Criar combos e venda cruzada pode aumentar o ticket."
                    : "O ticket médio está em um patamar interessante."
                }
              />

              <InsightCard
                title="Meta"
                text={
                  progressoMeta <
                  60
                    ? "O faturamento está abaixo de 60% da meta."
                    : progressoMeta <
                      100
                    ? "A meta está em andamento."
                    : "Meta atingida! Ótimo desempenho."
                }
              />

              <InsightCard
                title="Retenção"
                text="Campanhas de recompra e relacionamento podem aumentar a recorrência."
              />
            </div>
          </div>
        </>
      )}

      {/* =====================================================
          VISÃO CLIENTES
      ===================================================== */}

      {visao === "clientes" && (
        <>
          {/* CLIENTES EM RISCO */}

          <div
            style={section}
            className="dashboard-section"
          >
            <div
              style={
                sectionTitleRow
              }
            >
              <div>
                <h3
                  style={{
                    margin: 0
                  }}
                >
                  Clientes que precisam de atenção
                </h3>

                <span
                  style={smallText}
                >
                  Clientes há mais tempo
                  sem realizar uma compra
                </span>
              </div>
            </div>

            <div
              style={{
                ...riskGrid,
                marginTop: 18
              }}
            >
              {clientesRisco
                .slice(0, 8)
                .map(cliente => (
                  <div
                    key={
                      cliente.id
                    }
                    style={
                      riskCard
                    }
                  >
                    <strong>
                      {cliente.nome}
                    </strong>

                    <div
                      style={{
                        ...muted,
                        marginTop: 5
                      }}
                    >
                      {cliente.dias >=
                      999
                        ? "Nunca comprou"
                        : `${cliente.dias} dias sem comprar`}
                    </div>
                  </div>
                ))}
            </div>

            {clientesRisco.length ===
              0 && (
              <Empty text="Nenhum cliente cadastrado." />
            )}
          </div>

          {/* TOP CLIENTES */}

          <div
            style={section}
            className="dashboard-section"
          >
            <h3>
              Top clientes por fidelidade
            </h3>

            {topClientes.map(
              (cliente, index) => (
                <div
                  key={
                    cliente.id
                  }
                  style={
                    listRow
                  }
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 12
                    }}
                  >
                    <span
                      style={
                        rankingNumber
                      }
                    >
                      #{index + 1}
                    </span>

                    <span>
                      {
                        cliente.nome
                      }
                    </span>
                  </div>

                  <strong>
                    {
                      cliente.pontos
                    }{" "}
                    pts
                  </strong>
                </div>
              )
            )}
          </div>

          {/* CAMPANHAS */}

          <div
            style={section}
            className="dashboard-section"
          >
            <h3>
              Campanhas automáticas
            </h3>

            <p
              style={{
                ...muted,
                marginTop: -8,
                marginBottom: 16
              }}
            >
              Ações rápidas para
              relacionamento e vendas.
            </p>

            <div
              style={
                campaignGrid
              }
            >
              <button
                style={
                  actionBtn
                }
                onClick={() =>
                  campanha(
                    "vip"
                  )
                }
              >
                Enviar promoção VIP
              </button>

              <button
                style={
                  actionBtn
                }
                onClick={() =>
                  campanha(
                    "estoque"
                  )
                }
              >
                Queima de estoque
              </button>

              <button
                style={
                  actionBtn
                }
                onClick={() =>
                  campanha(
                    "pos"
                  )
                }
              >
                Pós-compra
              </button>

              <button
                style={
                  actionBtn
                }
                onClick={() =>
                  campanha(
                    "inativos"
                  )
                }
              >
                Recuperar inativos
              </button>
            </div>
          </div>

          {/* CALENDÁRIO */}

          <div
            style={section}
            className="dashboard-section"
          >
            <h3>
              Calendário sazonal
            </h3>

            {calendario.map(
              ([mes, data, acao]) => (
                <div
                  key={mes}
                  style={
                    listRow
                  }
                >
                  <span>
                    <strong>
                      {mes}
                    </strong>

                    {" • "}

                    {data}
                  </span>

                  <strong>
                    {acao}
                  </strong>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* =====================================================
   COMPONENTE DASH
===================================================== */

function Dash({
  label,
  value,
  destaque = false
}: {
  label: string
  value: string | number
  destaque?: boolean
}) {
  return (
    <div
      style={{
        ...dash,
        ...(destaque
          ? dashDestaque
          : {})
      }}
    >
      <span
        style={dashLabel}
      >
        {label}
      </span>

      <strong
        style={dashValue}
      >
        {value}
      </strong>
    </div>
  )
}

/* =====================================================
   MINI METRIC
===================================================== */

function MiniMetric({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={miniMetric}
    >
      <span
        style={miniLabel}
      >
        {label}
      </span>

      <strong
        style={miniValue}
      >
        {value}
      </strong>
    </div>
  )
}

/* =====================================================
   INSIGHT
===================================================== */

function InsightCard({
  title,
  text
}: {
  title: string
  text: string
}) {
  return (
    <div
      style={insightCard}
    >
      <span
        style={insightTitle}
      >
        {title}
      </span>

      <strong
        style={insightText}
      >
        {text}
      </strong>
    </div>
  )
}

/* =====================================================
   EMPTY
===================================================== */

function Empty({
  text
}: {
  text: string
}) {
  return (
    <div
      style={empty}
    >
      {text}
    </div>
  )
}

/* =====================================================
   CONTAINER
===================================================== */

const container = {
  padding: 40,
  background: "#f6f6f7",
  minHeight: "100vh",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  width: "100%",
  boxSizing:
    "border-box" as const
}

/* =====================================================
   HEADER
===================================================== */

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
  flexWrap:
    "wrap" as const
}

const title = {
  fontSize: 34,
  fontWeight: 500,
  margin: 0,
  letterSpacing:
    "-0.5px"
}

const sub = {
  color: "#777",
  fontSize: 14
}

const topControls = {
  display: "flex",
  gap: 10
}

const select = {
  padding: "11px 14px",
  borderRadius: 12,
  border:
    "1px solid #dedede",
  background: "#fff",
  color: "#444",
  outline: "none",
  cursor: "pointer"
}

/* =====================================================
   VIEW SWITCH
===================================================== */

const viewSwitch = {
  display: "flex",
  gap: 8,
  marginBottom: 24,
  flexWrap:
    "wrap" as const
}

const tab = {
  padding:
    "10px 18px",
  border: "1px solid #e5e5e5",
  borderRadius: 12,
  cursor: "pointer",
  background: "#fff",
  color: "#666",
  fontWeight: 500
}

const activeTab = {
  ...tab,
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  border:
    "1px solid #d4af37",
  color: "#5f4a12",
  fontWeight: 600
}

/* =====================================================
   PERÍODO
===================================================== */

const periodLabel = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 12,
  color: "#777",
  fontSize: 13
}

/* =====================================================
   DASH
===================================================== */

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
  marginBottom: 20
}

const dash = {
  background: "#fff",
  padding: 19,
  borderRadius: 17,
  border:
    "1px solid #eeeeee",
  minWidth: 0,
  overflow: "hidden" as const,
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
}

const dashDestaque = {
  border:
    "1px solid #eadfbf",
  background:
    "#fffdf7"
}

const dashLabel = {
  display: "block",
  color: "#777",
  fontSize: 13,
  marginBottom: 7
}

const dashValue = {
  fontSize: 23,
  fontWeight: 600,
  overflowWrap:
    "anywhere" as const,
  color: "#2d2d2d"
}

/* =====================================================
   META
===================================================== */

const metaCard = {
  background: "#fff",
  padding: 21,
  borderRadius: 17,
  marginBottom: 20,
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #eeeeee"
}

const metaHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12
}

const metaValue = {
  marginTop: 4,
  fontSize: 13,
  color: "#888"
}

const dots = {
  width: 36,
  height: 36,
  border: "none",
  background: "#f9f3dc",
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 18,
  color: "#9b7b2f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
}

const input = {
  marginTop: 10,
  padding: 11,
  width: "100%",
  borderRadius: 10,
  border:
    "1px solid #ddd",
  boxSizing:
    "border-box" as const
}

const progressBg = {
  marginTop: 16,
  height: 12,
  background: "#eeeeee",
  borderRadius: 999,
  overflow:
    "hidden" as const
}

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999,
  transition:
    "width 0.3s ease"
}

const progressText = {
  marginTop: 8,
  fontSize: 12,
  color: "#777"
}

/* =====================================================
   GRÁFICOS
===================================================== */

const chartCard = {
  background: "#fff",
  padding: 21,
  borderRadius: 17,
  minWidth: 0,
  overflow:
    "hidden" as const,
  border:
    "1px solid #eeeeee",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
}

const chartTitle = {
  fontSize: 18,
  fontWeight: 600,
  margin:
    "0 0 16px 0"
}

const sectionTitleRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15
}

const smallText = {
  color: "#888",
  fontSize: 12
}

const barLabel = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  marginBottom: 6,
  fontSize: 13
}

const barBg = {
  height: 9,
  background: "#f0f0f0",
  borderRadius: 999,
  overflow:
    "hidden" as const
}

const barFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999,
  transition:
    "width 0.3s ease"
}

/* =====================================================
   GRÁFICO DIÁRIO
===================================================== */

const dailyCard = {
  minWidth: 0,
  padding: 10,
  borderRadius: 12,
  background: "#fafafa",
  border:
    "1px solid #f0f0f0",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "center",
  gap: 5
}

const dailyDate = {
  fontSize: 11,
  color: "#888"
}

const dailyChart = {
  height: 75,
  width: 15,
  background: "#eeeeee",
  borderRadius: 999,
  display: "flex",
  alignItems: "flex-end",
  overflow:
    "hidden" as const,
  margin:
    "5px 0"
}

const dailyBar = {
  width: "100%",
  minHeight: 5,
  background:
    "linear-gradient(180deg,#f6e27a,#d4af37)",
  borderRadius: 999,
  transition:
    "height 0.3s ease"
}

const dailyValue = {
  fontSize: 12
}

const dailyOrders = {
  fontSize: 10,
  color: "#999"
}

/* =====================================================
   MINI METRIC
===================================================== */

const miniMetric = {
  padding:
    "13px 0",
  borderBottom:
    "1px solid #f1f1f1",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10
}

const miniLabel = {
  fontSize: 12,
  color: "#777"
}

const miniValue = {
  fontSize: 16,
  fontWeight: 600
}

/* =====================================================
   INSIGHTS
===================================================== */

const section = {
  background: "#fff",
  padding: 21,
  borderRadius: 17,
  marginBottom: 20,
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #eeeeee"
}

const insightGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: 12,
  marginTop: 18
}

const insightCard = {
  background: "#fcfbf7",
  padding: 17,
  borderRadius: 14,
  border:
    "1px solid #f1ead7",
  minWidth: 0
}

const insightTitle = {
  display: "block",
  fontSize: 12,
  color: "#777",
  marginBottom: 8
}

const insightText = {
  fontSize: 14,
  lineHeight: 1.45,
  overflowWrap:
    "anywhere" as const
}

/* =====================================================
   CLIENTES
===================================================== */

const riskGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
  marginBottom: 20
}

const riskCard = {
  background: "#fcfbf7",
  padding: 16,
  borderRadius: 14,
  minWidth: 0,
  border:
    "1px solid #f1ead7"
}

const listRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15,
  padding:
    "12px 0",
  borderBottom:
    "1px solid #f1f1f1",
  flexWrap:
    "wrap" as const
}

const rankingNumber = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#f9f3dc",
  color: "#9b7b2f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 600
}

const campaignGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
  marginTop: 16
}

const actionBtn = {
  padding: 14,
  border:
    "1px solid #eadfbf",
  borderRadius: 12,
  background: "#f9f3dc",
  color: "#70591d",
  cursor: "pointer",
  minHeight: 50,
  fontWeight: 500
}

const muted = {
  color: "#777",
  fontSize: 12
}

/* =====================================================
   EMPTY
===================================================== */

const empty = {
  padding: 25,
  textAlign:
    "center" as const,
  color: "#999",
  fontSize: 13,
  background: "#fafafa",
  borderRadius: 12
}