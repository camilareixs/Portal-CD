import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Visao = "geral" | "clientes"
type Periodo = "hoje" | "mes" | "trimestre" | "ano" | "todos"

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
  cliente?: string
  pagamento?: string
}

/* =====================================================
   DASHBOARD
===================================================== */

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
      console.log(
        "Erro ao buscar clientes:",
        clientesError
      )
    }

    const { data: comprasData, error: comprasError } =
      await supabase
        .from("compras")
        .select("id,clienteid,valor,criadoem,cliente,pagamento")
        .order("criadoem", { ascending: false })

    if (comprasError) {
      console.log(
        "Erro ao buscar compras:",
        comprasError
      )
    }

    setClientes(
      (clientesData || []) as Cliente[]
    )

    setCompras(
      (comprasData || []) as Compra[]
    )
  }

  /* =====================================================
     FUNÇÕES DE DATA
  ===================================================== */

  function inicioDoDia(data: Date) {
    const nova = new Date(data)

    nova.setHours(0, 0, 0, 0)

    return nova
  }

  function inicioDoMes(data: Date) {
    return new Date(
      data.getFullYear(),
      data.getMonth(),
      1
    )
  }

  function diferencaDias(
    dataInicial: Date,
    dataFinal: Date
  ) {
    return (
      (inicioDoDia(dataFinal).getTime() -
        inicioDoDia(dataInicial).getTime()) /
      86400000
    )
  }

  /* =====================================================
     COMPRAS FILTRADAS
  ===================================================== */

  const comprasFiltradas = useMemo(() => {
    const hoje = new Date()

    return compras.filter(c => {
      const data = new Date(c.criadoem)

      if (periodo === "hoje") {
        return (
          data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() ===
            hoje.getFullYear()
        )
      }

      if (periodo === "mes") {
        return (
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() ===
            hoje.getFullYear()
        )
      }

      if (periodo === "trimestre") {
        const diff = diferencaDias(
          data,
          hoje
        )

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

  /* =====================================================
     INDICADORES PRINCIPAIS
  ===================================================== */

  const faturamento =
    comprasFiltradas.reduce(
      (a, b) =>
        a + Number(b.valor || 0),
      0
    )

  const quantidadePedidos =
    comprasFiltradas.length

  const ticketMedio =
    quantidadePedidos > 0
      ? faturamento /
        quantidadePedidos
      : 0

  const clientesAtivos = new Set(
    comprasFiltradas.map(
      c => c.clienteid
    )
  ).size

  const lucroEstimado =
    faturamento * 0.45

  const progressoMeta =
    meta > 0
      ? Math.min(
          (faturamento / meta) * 100,
          100
        )
      : 0

  /* =====================================================
     META DIÁRIA
  ===================================================== */

  const metaDiaria =
    periodo === "hoje"
      ? 1500
      : meta

  const progressoMetaPeriodo =
    metaDiaria > 0
      ? Math.min(
          (faturamento /
            metaDiaria) *
            100,
          100
        )
      : 0

  /* =====================================================
     TÍTULO DO PERÍODO
  ===================================================== */

  const periodoTitulo =
    periodo === "hoje"
      ? "Hoje"
      : periodo === "mes"
      ? "Este mês"
      : periodo === "trimestre"
      ? "Últimos 3 meses"
      : periodo === "ano"
      ? "Este ano"
      : "Todo o período"

  const periodoDescricao =
    periodo === "hoje"
      ? new Date().toLocaleDateString(
          "pt-BR",
          {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }
        )
      : periodoTitulo

  /* =====================================================
     CLIENTES EM RISCO
  ===================================================== */

  const clientesRisco = useMemo(() => {
    const hoje = new Date()

    return clientes
      .map(cliente => {
        const comprasCliente =
          compras.filter(
            c =>
              c.clienteid ===
              cliente.id
          )

        const ultima =
          comprasCliente.length > 0
            ? comprasCliente.reduce(
                (maisRecente, compra) =>
                  new Date(
                    compra.criadoem
                  ) >
                  new Date(
                    maisRecente.criadoem
                  )
                    ? compra
                    : maisRecente
              )
            : null

        if (!ultima) {
          return {
            ...cliente,
            dias: 999
          }
        }

        const dias = Math.floor(
          diferencaDias(
            new Date(
              ultima.criadoem
            ),
            hoje
          )
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

  /* =====================================================
     TOP CLIENTES
  ===================================================== */

  const topClientes = [
    ...clientes
  ]
    .sort(
      (a, b) =>
        b.pontos - a.pontos
    )
    .slice(0, 5)

  /* =====================================================
     VENDAS POR MÊS
  ===================================================== */

  const vendasPorMesMap: Record<
    string,
    number
  > = {}

  compras.forEach(c => {
    const d = new Date(
      c.criadoem
    )

    const chave = `${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`

    vendasPorMesMap[chave] =
      (vendasPorMesMap[chave] ||
        0) +
      Number(c.valor || 0)
  })

  const melhorMes =
    Object.entries(
      vendasPorMesMap
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0]

  /* =====================================================
     COMPARAÇÃO COM DIA ANTERIOR
  ===================================================== */

  const vendasOntem = useMemo(() => {
    if (periodo !== "hoje") {
      return 0
    }

    const hoje = new Date()

    return compras
      .filter(c => {
        const data = new Date(
          c.criadoem
        )

        const diff =
          diferencaDias(
            data,
            hoje
          )

        return diff === 1
      })
      .reduce(
        (a, b) =>
          a +
          Number(
            b.valor || 0
          ),
        0
      )
  }, [compras, periodo])

  const variacaoDia =
    periodo === "hoje" &&
    vendasOntem > 0
      ? ((faturamento -
          vendasOntem) /
          vendasOntem) *
        100
      : null

  /* =====================================================
     VENDAS DO DIA
  ===================================================== */

  const vendasDoDia = useMemo(() => {
    if (periodo !== "hoje") {
      return []
    }

    return [...comprasFiltradas]
      .sort(
        (a, b) =>
          new Date(
            b.criadoem
          ).getTime() -
          new Date(
            a.criadoem
          ).getTime()
      )
  }, [
    comprasFiltradas,
    periodo
  ])

  /* =====================================================
     CAMPANHAS
  ===================================================== */

  function campanha(tipo: string) {
    if (tipo === "vip") {
      alert(
        "Campanha VIP enviada para melhores clientes"
      )
    }

    if (tipo === "estoque") {
      alert(
        "Campanha Queima de Estoque ativada"
      )
    }

    if (tipo === "pos") {
      alert(
        "Campanha Pós-compra iniciada"
      )
    }

    if (tipo === "inativos") {
      alert(
        "Campanha de recuperação para inativos enviada"
      )
    }
  }

  /* =====================================================
     CALENDÁRIO
  ===================================================== */

  const calendario = [
    [
      "15 Março",
      "Dia do Consumidor",
      "Campanha de recompra + cupom progressivo"
    ],
    [
      "Maio (2º domingo)",
      "Dia das Mães",
      "Kits premium + ticket médio elevado"
    ],
    [
      "12 Junho",
      "Dia dos Namorados",
      "Combos presenteáveis + venda cruzada"
    ],
    [
      "Agosto (2º domingo)",
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
      "26 Dez–Jan",
      "Pós-Natal / Liquidação",
      "Queima estratégica"
    ]
  ]

  /* =====================================================
     FORMATAÇÃO
  ===================================================== */

  function moeda(valor: number) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    )
  }

  function hora(data: string) {
    return new Date(
      data
    ).toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    )
  }

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div
      style={container}
      className="dashboard-container"
    >

      {/* HEADER */}

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
                e.target
                  .value as Periodo
              )
            }
            style={select}
          >
            <option value="hoje">
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
              Todos
            </option>
          </select>

        </div>
      </div>

      {/* PERÍODO ATUAL */}

      <div style={periodBadge}>
        <span>
          Período analisado
        </span>

        <strong>
          {periodoDescricao}
        </strong>
      </div>

      {/* VISÃO */}

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
          Visão Lucro
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

      {/* =================================================
          VISÃO GERAL
      ================================================= */}

      {visao === "geral" && (
        <>

          {/* KPIs */}

          <div
            style={dashGrid}
            className="dashboard-kpis"
          >

            <Dash
              label={
                periodo === "hoje"
                  ? "Faturamento de hoje"
                  : `Faturamento — ${periodoTitulo}`
              }
              value={moeda(
                faturamento
              )}
            />

            <Dash
              label={
                periodo === "hoje"
                  ? "Pedidos hoje"
                  : `Pedidos — ${periodoTitulo}`
              }
              value={
                quantidadePedidos
              }
            />

            <Dash
              label="Ticket médio"
              value={moeda(
                ticketMedio
              )}
            />

            <Dash
              label={
                periodo === "hoje"
                  ? "Lucro estimado hoje"
                  : "Lucro estimado"
              }
              value={moeda(
                lucroEstimado
              )}
            />

          </div>

          {/* CLIENTES */}

          <div
            style={dashGrid}
            className="dashboard-kpis"
          >

            <Dash
              label={
                periodo === "hoje"
                  ? "Clientes atendidos"
                  : "Clientes ativos"
              }
              value={
                clientesAtivos
              }
            />

            <Dash
              label="Média por cliente"
              value={moeda(
                clientesAtivos
                  ? faturamento /
                      clientesAtivos
                  : 0
              )}
            />

            {periodo === "hoje" && (
              <Dash
                label="Vendas ontem"
                value={moeda(
                  vendasOntem
                )}
              />
            )}

            {periodo === "hoje" && (
              <Dash
                label="Variação vs. ontem"
                value={
                  variacaoDia !==
                  null
                    ? `${
                        variacaoDia >=
                        0
                          ? "+"
                          : ""
                      }${variacaoDia.toFixed(
                        1
                      )}%`
                    : "Sem comparação"
                }
              />
            )}

          </div>

          {/* META */}

          <div
            style={metaCard}
            className="dashboard-meta"
          >

            <div
              style={metaHeader}
            >

              <div>
                <strong>
                  {periodo ===
                  "hoje"
                    ? "Meta diária"
                    : "Meta do período"}
                </strong>

                <span
                  style={
                    metaSubtitle
                  }
                >
                  {moeda(
                    periodo ===
                      "hoje"
                      ? metaDiaria
                      : meta
                  )}
                </span>
              </div>

              <button
                style={dots}
                onClick={() =>
                  setEditarMeta(
                    !editarMeta
                  )
                }
                aria-label={
                  editarMeta
                    ? "Fechar edição da meta"
                    : "Editar meta"
                }
              >
                {editarMeta
                  ? "×"
                  : "+"}
              </button>

            </div>

            {editarMeta && (
              <input
                type="number"
                value={
                  periodo ===
                  "hoje"
                    ? metaDiaria
                    : meta
                }
                onChange={e => {
                  const valor =
                    Number(
                      e.target.value
                    )

                  if (
                    periodo ===
                    "hoje"
                  ) {
                    return
                  }

                  setMeta(valor)
                }}
                style={input}
              />
            )}

            <div
              title={`${moeda(
                faturamento
              )} de ${moeda(
                periodo ===
                  "hoje"
                  ? metaDiaria
                  : meta
              )}`}
              style={
                progressBg
              }
            >

              <div
                style={{
                  ...progressFill,
                  width: `${
                    periodo ===
                    "hoje"
                      ? progressoMetaPeriodo
                      : progressoMeta
                  }%`
                }}
              />

            </div>

            <div
              style={
                progressText
              }
            >
              {(
                periodo ===
                "hoje"
                  ? progressoMetaPeriodo
                  : progressoMeta
              ).toFixed(
                1
              )}
              % da meta
            </div>

          </div>

          {/* =================================================
              RESUMO DIÁRIO
          ================================================= */}

          {periodo === "hoje" && (
            <div
              style={
                dailySection
              }
            >

              <div
                style={
                  dailyHeader
                }
              >

                <div>
                  <h3
                    style={
                      dailyTitle
                    }
                  >
                    Resumo de hoje
                  </h3>

                  <span
                    style={
                      dailySubtitle
                    }
                  >
                    Acompanhe o desempenho
                    da loja em tempo real
                  </span>
                </div>

                <div
                  style={
                    dailyDate
                  }
                >
                  {new Date().toLocaleDateString(
                    "pt-BR",
                    {
                      weekday:
                        "long",
                      day: "2-digit",
                      month:
                        "long"
                    }
                  )}
                </div>

              </div>

              <div
                style={
                  dailyGrid
                }
              >

                <MiniDaily
                  label="Faturamento"
                  value={moeda(
                    faturamento
                  )}
                />

                <MiniDaily
                  label="Pedidos"
                  value={
                    quantidadePedidos
                  }
                />

                <MiniDaily
                  label="Lucro estimado"
                  value={moeda(
                    lucroEstimado
                  )}
                />

                <MiniDaily
                  label="Ticket médio"
                  value={moeda(
                    ticketMedio
                  )}
                />

              </div>

            </div>
          )}

          {/* =================================================
              VENDAS DE HOJE
          ================================================= */}

          {periodo === "hoje" && (
            <div
              style={
                section
              }
              className="dashboard-section"
            >

              <div
                style={
                  sectionTop
                }
              >

                <div>
                  <h3
                    style={
                      sectionTitle
                    }
                  >
                    Vendas de hoje
                  </h3>

                  <span
                    style={
                      sectionSubtitle
                    }
                  >
                    {vendasDoDia.length}{" "}
                    pedido
                    {vendasDoDia.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    registrado
                    {vendasDoDia.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <strong
                  style={
                    sectionTotal
                  }
                >
                  {moeda(
                    faturamento
                  )}
                </strong>

              </div>

              {vendasDoDia.length ===
              0 ? (
                <div
                  style={
                    emptyState
                  }
                >
                  <strong>
                    Nenhuma venda hoje
                  </strong>

                  <span>
                    As vendas realizadas
                    aparecerão aqui.
                  </span>
                </div>
              ) : (
                <div
                  style={
                    dailySalesList
                  }
                >

                  {vendasDoDia
                    .slice(0, 10)
                    .map(
                      (
                        compra,
                        index
                      ) => (
                        <div
                          key={
                            compra.id
                          }
                          style={
                            saleRow
                          }
                        >

                          <div
                            style={
                              saleNumber
                            }
                          >
                            {String(
                              index +
                                1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div
                            style={
                              saleInfo
                            }
                          >

                            <strong>
                              {compra.cliente ||
                                "Cliente não identificado"}
                            </strong>

                            <span>
                              {hora(
                                compra.criadoem
                              )}

                              {compra.pagamento
                                ? ` • ${compra.pagamento}`
                                : ""}
                            </span>

                          </div>

                          <strong
                            style={
                              saleValue
                            }
                          >
                            {moeda(
                              Number(
                                compra.valor ||
                                  0
                              )
                            )}
                          </strong>

                        </div>
                      )
                    )}

                </div>
              )}

            </div>
          )}

          {/* =================================================
              KPIs EXECUTIVOS
          ================================================= */}

          <div
            style={dashGrid}
            className="dashboard-kpis dashboard-kpis-executivos"
          >

            <Dash
              label="Lucro estimado"
              value={moeda(
                lucroEstimado
              )}
            />

            <Dash
              label="Melhor mês"
              value={
                melhorMes
                  ? melhorMes[0]
                  : "-"
              }
            />

            <Dash
              label="Valor melhor mês"
              value={
                melhorMes
                  ? moeda(
                      Number(
                        melhorMes[1]
                      )
                    )
                  : "-"
              }
            />

            <Dash
              label="Média por cliente"
              value={moeda(
                clientesAtivos
                  ? faturamento /
                      clientesAtivos
                  : 0
              )}
            />

          </div>

          {/* =================================================
              GRÁFICOS
          ================================================= */}

          <div
            style={profitGrid}
            className="dashboard-graficos"
          >

            <div
              style={chartCard}
            >

              <h3
                style={
                  chartTitle
                }
              >
                Faturamento por mês
              </h3>

              {Object.entries(
                vendasPorMesMap
              )
                .sort(
                  (a, b) =>
                    a[0].localeCompare(
                      b[0]
                    )
                )
                .slice(-6)
                .map(
                  ([
                    mes,
                    total
                  ]) => {

                    const maiorValor =
                      Math.max(
                        ...Object.values(
                          vendasPorMesMap
                        )
                      )

                    const largura =
                      maiorValor >
                      0
                        ? (Number(
                            total
                          ) /
                            maiorValor) *
                          100
                        : 0

                    return (
                      <div
                        key={mes}
                        style={{
                          marginBottom:
                            12
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
                            {moeda(
                              Number(
                                total
                              )
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

            </div>

            {/* PERFORMANCE */}

            <div
              style={
                chartCard
              }
            >

              <h3
                style={
                  chartTitle
                }
              >
                Performance estratégica
              </h3>

              <MiniMetric
                label="Conversão da meta"
                value={`${(
                  periodo ===
                  "hoje"
                    ? progressoMetaPeriodo
                    : progressoMeta
                ).toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Margem estimada"
                value={`${(
                  (lucroEstimado /
                    faturamento) *
                    100 ||
                  0
                ).toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Recorrência"
                value={`${(
                  (clientesAtivos /
                    clientes.length) *
                    100 ||
                  0
                ).toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Potencial VIP"
                value={`${topClientes.length} clientes`}
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

            <h3>
              Insights estratégicos
            </h3>

            <div
              style={
                insightGrid
              }
            >

              <InsightCard
                title="Melhor oportunidade"
                text={
                  melhorMes
                    ? `Replicar estratégia de ${melhorMes[0]}`
                    : "Acompanhar sazonalidade"
                }
              />

              <InsightCard
                title="Ação recomendada"
                text={
                  ticketMedio <
                  150
                    ? "Criar combos para elevar ticket médio"
                    : "Focar retenção premium"
                }
              />

              <InsightCard
                title="Atenção"
                text={
                  progressoMeta <
                  60
                    ? "Meta abaixo do esperado"
                    : "Meta saudável"
                }
              />

              <InsightCard
                title="Expansão"
                text="Campanhas VIP + recompra pós-venda"
              />

            </div>

          </div>

        </>
      )}

      {/* =================================================
          VISÃO CLIENTES
      ================================================= */}

      {visao ===
        "clientes" && (
        <>

          {/* RISCO */}

          <div
            style={
              riskGrid
            }
            className="dashboard-risk-grid"
          >

            {clientesRisco
              .slice(0, 8)
              .map(c => (

                <div
                  key={c.id}
                  style={
                    riskCard
                  }
                >

                  <strong>
                    {c.nome}
                  </strong>

                  <div
                    style={
                      muted
                    }
                  >
                    {c.dias >=
                    999
                      ? "Nunca comprou"
                      : `${c.dias} dias sem comprar`}
                  </div>

                </div>

              ))}

          </div>

          {/* TOP CLIENTES */}

          <div
            style={section}
            className="dashboard-section"
          >

            <h3>
              Top clientes por pontos
            </h3>

            {topClientes.map(
              c => (

                <div
                  key={c.id}
                  style={
                    listRow
                  }
                >

                  <span>
                    {c.nome}
                  </span>

                  <strong>
                    {c.pontos} pts
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
              ([
                mes,
                data,
                acao
              ]) => (

                <div
                  key={mes}
                  style={
                    listRow
                  }
                >

                  <span>
                    {mes} •{" "}
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
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div
      style={dash}
    >

      <span
        style={
          dashLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          dashValue
        }
      >
        {value}
      </strong>

    </div>
  )
}

/* =====================================================
   COMPONENTE MINI METRIC
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
      style={
        miniMetric
      }
    >

      <span
        style={
          miniLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          miniValue
        }
      >
        {value}
      </strong>

    </div>
  )
}

/* =====================================================
   COMPONENTE DAILY
===================================================== */

function MiniDaily({
  label,
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div
      style={
        miniDaily
      }
    >

      <span
        style={
          miniDailyLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          miniDailyValue
        }
      >
        {value}
      </strong>

    </div>
  )
}

/* =====================================================
   COMPONENTE INSIGHT
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
      style={
        insightCard
      }
    >

      <span
        style={
          insightTitle
        }
      >
        {title}
      </span>

      <strong
        style={
          insightText
        }
      >
        {text}
      </strong>

    </div>
  )
}

/* =====================================================
   ESTILOS GERAIS
===================================================== */

const container = {
  padding: 40,
  background: "#f6f6f7",
  minHeight: "100vh",
  fontFamily:
    "Inter, sans-serif",
  width: "100%",
  boxSizing:
    "border-box" as const
}

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 18,
  flexWrap:
    "wrap" as const
}

const title = {
  fontSize: 34,
  margin: 0,
  fontWeight: 500
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
  padding: 11,
  borderRadius: 12,
  border:
    "1px solid #ddd",
  background: "#fff",
  maxWidth: "100%",
  cursor: "pointer"
}

/* =====================================================
   PERÍODO
===================================================== */

const periodBadge = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 12,
  padding:
    "10px 14px",
  marginBottom: 18,
  background: "#fff",
  border:
    "1px solid #eee",
  borderRadius: 12,
  fontSize: 13,
  color: "#777",
  flexWrap:
    "wrap" as const
}

const viewSwitch = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap:
    "wrap" as const
}

const tab = {
  padding:
    "10px 18px",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  background: "#fff"
}

const activeTab = {
  ...tab,
  background:
    "#f4e7a1",
  color: "#6e5815",
  fontWeight: 600
}

/* =====================================================
   KPIs
===================================================== */

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 20
}

const dash = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  minWidth: 0,
  overflow:
    "hidden" as const,
  border:
    "1px solid #eeeeee"
}

const dashLabel = {
  display: "block",
  color: "#777",
  fontSize: 13,
  marginBottom: 7
}

const dashValue = {
  fontSize: 24,
  fontWeight: 600,
  overflowWrap:
    "anywhere" as const
}

/* =====================================================
   META
===================================================== */

const metaCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #eee"
}

const metaHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12
}

const metaSubtitle = {
  display: "block",
  marginTop: 4,
  color: "#777",
  fontSize: 13
}

const dots = {
  width: 34,
  height: 34,
  border: "none",
  background: "#f9f3dc",
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 24,
  lineHeight: 1,
  color: "#9b7b2f",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  flexShrink: 0
}

const input = {
  marginTop: 10,
  padding: 10,
  width: "100%",
  borderRadius: 10,
  border:
    "1px solid #ddd",
  boxSizing:
    "border-box" as const
}

const progressBg = {
  marginTop: 14,
  height: 14,
  background: "#eee",
  borderRadius: 999,
  overflow:
    "hidden" as const
}

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999
}

const progressText = {
  marginTop: 8,
  fontSize: 12,
  color: "#777"
}

/* =====================================================
   RESUMO DIÁRIO
===================================================== */

const dailySection = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  border:
    "1px solid #eee"
}

const dailyHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 20,
  marginBottom: 18,
  flexWrap:
    "wrap" as const
}

const dailyTitle = {
  margin: 0,
  fontSize: 19,
  fontWeight: 600
}

const dailySubtitle = {
  display: "block",
  marginTop: 5,
  color: "#888",
  fontSize: 13
}

const dailyDate = {
  color: "#a88320",
  background:
    "#fffbe6",
  padding:
    "8px 12px",
  borderRadius: 10,
  fontSize: 12,
  textTransform:
    "capitalize" as const
}

const dailyGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10
}

const miniDaily = {
  background:
    "#fcfbf7",
  border:
    "1px solid #f1ead7",
  borderRadius: 13,
  padding: 15
}

const miniDailyLabel = {
  display: "block",
  color: "#777",
  fontSize: 12,
  marginBottom: 6
}

const miniDailyValue = {
  fontSize: 20,
  color: "#8d701e"
}

/* =====================================================
   VENDAS DO DIA
===================================================== */

const sectionTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  gap: 15,
  marginBottom: 15,
  flexWrap:
    "wrap" as const
}

const sectionTitle = {
  margin: 0,
  fontSize: 18
}

const sectionSubtitle = {
  display: "block",
  color: "#888",
  fontSize: 12,
  marginTop: 4
}

const sectionTotal = {
  fontSize: 18,
  color: "#9b7b2f"
}

const dailySalesList = {
  borderTop:
    "1px solid #eee"
}

const saleRow = {
  display: "flex",
  alignItems:
    "center",
  gap: 12,
  padding:
    "13px 0",
  borderBottom:
    "1px solid #f1f1f1"
}

const saleNumber = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background:
    "#f9f3dc",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  color: "#9b7b2f",
  fontSize: 11,
  flexShrink: 0
}

const saleInfo = {
  flex: 1,
  minWidth: 0
}

const saleInfoStrong = {
  display: "block"
}

const saleValue = {
  fontSize: 15,
  whiteSpace:
    "nowrap" as const
}

const emptyState = {
  padding: 35,
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: 6,
  color: "#777",
  textAlign:
    "center" as const
}

/* =====================================================
   GRÁFICOS
===================================================== */

const profitGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 20,
  width: "100%"
}

const chartCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  minWidth: 0,
  overflow:
    "hidden" as const,
  border:
    "1px solid #eee"
}

const chartTitle = {
  fontSize: 18,
  marginTop: 0,
  marginBottom: 16
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
  height: 10,
  background: "#f1f1f1",
  borderRadius: 999,
  overflow:
    "hidden" as const
}

const barFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999
}

const miniMetric = {
  padding:
    "12px 0",
  borderBottom:
    "1px solid #f1f1f1"
}

const miniLabel = {
  display: "block",
  fontSize: 12,
  color: "#777"
}

const miniValue = {
  fontSize: 18
}

/* =====================================================
   INSIGHTS
===================================================== */

const insightGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12
}

const insightCard = {
  background:
    "#fcfbf7",
  padding: 16,
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
  overflowWrap:
    "anywhere" as const
}

/* =====================================================
   SEÇÕES
===================================================== */

const section = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #eee"
}

/* =====================================================
   CLIENTES
===================================================== */

const campaignGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10
}

const actionBtn = {
  padding: 14,
  border: "none",
  borderRadius: 12,
  background:
    "#f9f3dc",
  cursor: "pointer",
  minHeight: 50
}

const riskGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 20
}

const riskCard = {
  background: "#fff",
  padding: 16,
  borderRadius: 14,
  minWidth: 0,
  border:
    "1px solid #eee"
}

const listRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  gap: 15,
  padding:
    "10px 0",
  borderBottom:
    "1px solid #f1f1f1",
  flexWrap:
    "wrap" as const
}

const muted = {
  color: "#777",
  fontSize: 12
}