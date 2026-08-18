import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Visao = "geral" | "clientes"
type Periodo = "mes" | "trimestre" | "ano" | "todos"

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
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id,nome,cpf,pontos")

    const { data: comprasData } = await supabase
      .from("compras")
      .select("id,clienteid,valor,criadoem")
      .order("criadoem", { ascending: false })

    setClientes((clientesData || []) as Cliente[])
    setCompras((comprasData || []) as Compra[])
  }

  const comprasFiltradas = useMemo(() => {
    const hoje = new Date()

    return compras.filter(c => {
      const data = new Date(c.criadoem)

      if (periodo === "mes") {
        return (
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        )
      }

      if (periodo === "trimestre") {
        const diff =
          (hoje.getTime() - data.getTime()) / 86400000

        return diff <= 90
      }

      if (periodo === "ano") {
        return data.getFullYear() === hoje.getFullYear()
      }

      return true
    })
  }, [compras, periodo])

  const faturamento = comprasFiltradas.reduce(
    (a, b) => a + Number(b.valor),
    0
  )

  const ticketMedio = comprasFiltradas.length
    ? faturamento / comprasFiltradas.length
    : 0

  const clientesAtivos = new Set(
    comprasFiltradas.map(c => c.clienteid)
  ).size

  const progressoMeta =
    meta > 0
      ? Math.min((faturamento / meta) * 100, 100)
      : 0

  const clientesRisco = useMemo(() => {
    const hoje = new Date()

    return clientes
      .map(cliente => {
        const ultima = compras.find(
          c => c.clienteid === cliente.id
        )

        if (!ultima) {
          return { ...cliente, dias: 999 }
        }

        const dias = Math.floor(
          (hoje.getTime() -
            new Date(ultima.criadoem).getTime()) /
            86400000
        )

        return { ...cliente, dias }
      })
      .sort((a, b) => b.dias - a.dias)
  }, [clientes, compras])

  const topClientes = [...clientes]
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 5)

  const vendasPorMesMap: Record<string, number> = {}

  compras.forEach(c => {
    const d = new Date(c.criadoem)

    const chave = `${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`

    vendasPorMesMap[chave] =
      (vendasPorMesMap[chave] || 0) + Number(c.valor)
  })

  const melhorMes = Object.entries(
    vendasPorMesMap
  ).sort((a, b) => b[1] - a[1])[0]

  const lucroEstimado = faturamento * 0.45

  function campanha(tipo: string) {
    if (tipo === "vip")
      alert("Campanha VIP enviada para melhores clientes")

    if (tipo === "estoque")
      alert("Campanha Queima de Estoque ativada")

    if (tipo === "pos")
      alert("Campanha Pós-compra iniciada")

    if (tipo === "inativos")
      alert(
        "Campanha de recuperação para inativos enviada"
      )
  }

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

  return (
    <div style={container} className="dashboard-container">

      {/* =========================
          HEADER
      ========================= */}

      <div style={header} className="dashboard-header">

        <div>
          <h1 style={title}>Dashboard</h1>

          <span style={sub}>
            Visão estratégica CamiDuda
          </span>
        </div>

        <div style={topControls}>

          <select
            value={periodo}
            onChange={e =>
              setPeriodo(e.target.value as Periodo)
            }
            style={select}
          >
            <option value="mes">Mês</option>
            <option value="trimestre">3 meses</option>
            <option value="ano">Ano</option>
            <option value="todos">Todos</option>
          </select>

        </div>
      </div>

      {/* =========================
          VISÃO
      ========================= */}

      <div style={viewSwitch}>

        <button
          style={
            visao === "geral"
              ? activeTab
              : tab
          }
          onClick={() => setVisao("geral")}
        >
          Visão Lucro
        </button>

        <button
          style={
            visao === "clientes"
              ? activeTab
              : tab
          }
          onClick={() => setVisao("clientes")}
        >
          Visão Clientes
        </button>

      </div>

      {/* =========================
          VISÃO GERAL
      ========================= */}

      {visao === "geral" && (
        <>

          {/* KPIs PRINCIPAIS */}

          <div
            style={dashGrid}
            className="dashboard-kpis"
          >

            <Dash
              label="Faturamento"
              value={`R$ ${faturamento.toFixed(2)}`}
            />

            <Dash
              label="Vendas"
              value={comprasFiltradas.length}
            />

            <Dash
              label="Ticket médio"
              value={`R$ ${ticketMedio.toFixed(2)}`}
            />

            <Dash
              label="Clientes ativos"
              value={clientesAtivos}
            />

          </div>

          {/* =========================
              META
          ========================= */}

          <div
            style={metaCard}
            className="dashboard-meta"
          >

            <div style={metaHeader}>

              <strong>
                Meta do período:{" "}
                {meta.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })}
              </strong>

              <button
                style={dots}
                onClick={() =>
                  setEditarMeta(!editarMeta)
                }
                aria-label={
                  editarMeta
                    ? "Fechar edição da meta"
                    : "Editar meta"
                }
              >
                {editarMeta ? "×" : "+"}
              </button>

            </div>

            {editarMeta && (
              <input
                type="number"
                value={meta}
                onChange={e =>
                  setMeta(Number(e.target.value))
                }
                style={input}
              />
            )}

            <div
              title={`R$ ${faturamento.toFixed(
                2
              )} de R$ ${meta.toFixed(2)}`}
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
              {progressoMeta.toFixed(1)}% da meta
            </div>

          </div>

          {/* =========================
              KPIs EXECUTIVOS
          ========================= */}

          <div
            style={dashGrid}
            className="dashboard-kpis dashboard-kpis-executivos"
          >

            <Dash
              label="Lucro estimado"
              value={`R$ ${lucroEstimado.toFixed(2)}`}
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
                  ? `R$ ${Number(
                      melhorMes[1]
                    ).toFixed(2)}`
                  : "-"
              }
            />

            <Dash
              label="Média por cliente"
              value={`R$ ${
                clientesAtivos
                  ? (
                      faturamento /
                      clientesAtivos
                    ).toFixed(2)
                  : "0.00"
              }`}
            />

          </div>

          {/* =========================
              GRÁFICOS
          ========================= */}

          <div
            style={profitGrid}
            className="dashboard-graficos"
          >

            {/* FATURAMENTO */}

            <div style={chartCard}>

              <h3 style={chartTitle}>
                Faturamento por mês
              </h3>

              {Object.entries(
                vendasPorMesMap
              )
                .sort((a, b) =>
                  a[0].localeCompare(b[0])
                )
                .slice(-6)
                .map(([mes, total]) => {

                  const maiorValor =
                    Math.max(
                      ...Object.values(
                        vendasPorMesMap
                      )
                    )

                  const largura =
                    maiorValor > 0
                      ? (Number(total) /
                          maiorValor) *
                        100
                      : 0

                  return (
                    <div
                      key={mes}
                      style={{
                        marginBottom: 12
                      }}
                    >

                      <div style={barLabel}>

                        <span>
                          {mes}
                        </span>

                        <strong>
                          R${" "}
                          {Number(
                            total
                          ).toFixed(0)}
                        </strong>

                      </div>

                      <div style={barBg}>

                        <div
                          style={{
                            ...barFill,
                            width: `${largura}%`
                          }}
                        />

                      </div>

                    </div>
                  )
                })}

            </div>

            {/* PERFORMANCE */}

            <div style={chartCard}>

              <h3 style={chartTitle}>
                Performance estratégica
              </h3>

              <MiniMetric
                label="Conversão da meta"
                value={`${progressoMeta.toFixed(
                  1
                )}%`}
              />

              <MiniMetric
                label="Margem estimada"
                value={`${(
                  (lucroEstimado /
                    faturamento) *
                    100 || 0
                ).toFixed(1)}%`}
              />

              <MiniMetric
                label="Recorrência"
                value={`${(
                  (clientesAtivos /
                    clientes.length) *
                    100 || 0
                ).toFixed(1)}%`}
              />

              <MiniMetric
                label="Potencial VIP"
                value={`${topClientes.length} clientes`}
              />

            </div>

          </div>

          {/* =========================
              INSIGHTS
          ========================= */}

          <div
            style={section}
            className="dashboard-section"
          >

            <h3>
              Insights estratégicos
            </h3>

            <div style={insightGrid}>

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
                  ticketMedio < 150
                    ? "Criar combos para elevar ticket médio"
                    : "Focar retenção premium"
                }
              />

              <InsightCard
                title="Atenção"
                text={
                  progressoMeta < 60
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

      {/* =========================
          VISÃO CLIENTES
      ========================= */}

      {visao === "clientes" && (
        <>

          <div
            style={riskGrid}
            className="dashboard-risk-grid"
          >

            {clientesRisco
              .slice(0, 8)
              .map(c => (

                <div
                  key={c.id}
                  style={riskCard}
                >

                  <strong>
                    {c.nome}
                  </strong>

                  <div style={muted}>
                    {c.dias >= 999
                      ? "Nunca comprou"
                      : `${c.dias} dias sem comprar`}
                  </div>

                </div>

              ))}

          </div>

          {/* TOP CLIENTES */}

          <div style={section} className="dashboard-section">

            <h3>
              Top clientes por pontos
            </h3>

            {topClientes.map(c => (

              <div
                key={c.id}
                style={listRow}
              >

                <span>
                  {c.nome}
                </span>

                <strong>
                  {c.pontos} pts
                </strong>

              </div>

            ))}

          </div>

          {/* CAMPANHAS */}

          <div style={section} className="dashboard-section">

            <h3>
              Campanhas automáticas
            </h3>

            <div style={campaignGrid}>

              <button
                style={actionBtn}
                onClick={() =>
                  campanha("vip")
                }
              >
                Enviar promoção VIP
              </button>

              <button
                style={actionBtn}
                onClick={() =>
                  campanha("estoque")
                }
              >
                Queima de estoque
              </button>

              <button
                style={actionBtn}
                onClick={() =>
                  campanha("pos")
                }
              >
                Pós-compra
              </button>

              <button
                style={actionBtn}
                onClick={() =>
                  campanha("inativos")
                }
              >
                Recuperar inativos
              </button>

            </div>

          </div>

          {/* CALENDÁRIO */}

          <div style={section} className="dashboard-section">

            <h3>
              Calendário sazonal
            </h3>

            {calendario.map(
              ([mes, data, acao]) => (

                <div
                  key={mes}
                  style={listRow}
                >

                  <span>
                    {mes} • {data}
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
   COMPONENTES
===================================================== */

function Dash({
  label,
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div style={dash}>

      <span style={dashLabel}>
        {label}
      </span>

      <strong style={dashValue}>
        {value}
      </strong>

    </div>
  )
}

function MiniMetric({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={miniMetric}>

      <span style={miniLabel}>
        {label}
      </span>

      <strong style={miniValue}>
        {value}
      </strong>

    </div>
  )
}

function InsightCard({
  title,
  text
}: {
  title: string
  text: string
}) {
  return (
    <div style={insightCard}>

      <span style={insightTitle}>
        {title}
      </span>

      <strong style={insightText}>
        {text}
      </strong>

    </div>
  )
}

/* =====================================================
   ESTILOS
===================================================== */

const container = {
  padding: 40,
  background: "#f6f6f7",
  minHeight: "100vh",
  fontFamily: "Inter",
  width: "100%",
  boxSizing: "border-box" as const
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
  flexWrap: "wrap" as const
}

const title = {
  fontSize: 34,
  margin: 0
}

const sub = {
  color: "#777"
}

const topControls = {
  display: "flex",
  gap: 10
}

const select = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  maxWidth: "100%"
}

const viewSwitch = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
  flexWrap: "wrap" as const
}

const tab = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 12,
  cursor: "pointer"
}

const activeTab = {
  ...tab,
  background: "#f4e7a1"
}

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
  overflow: "hidden" as const
}

const dashLabel = {
  display: "block",
  color: "#777",
  fontSize: 13,
  marginBottom: 5
}

const dashValue = {
  fontSize: 24,
  overflowWrap: "anywhere" as const
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
  boxSizing: "border-box" as const
}

const metaHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
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
  justifyContent: "center",
  flexShrink: 0
}

const input = {
  marginTop: 10,
  padding: 10,
  width: "100%",
  borderRadius: 10,
  border: "1px solid #ddd",
  boxSizing: "border-box" as const
}

const progressBg = {
  marginTop: 14,
  height: 14,
  background: "#eee",
  borderRadius: 999,
  overflow: "hidden" as const
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
   GRÁFICOS
===================================================== */

const profitGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
  marginBottom: 20,
  width: "100%"
}

const chartCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  minWidth: 0,
  overflow: "hidden" as const
}

const chartTitle = {
  fontSize: 18,
  marginBottom: 16
}

const barLabel = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 6,
  fontSize: 13
}

const barBg = {
  height: 10,
  background: "#f1f1f1",
  borderRadius: 999,
  overflow: "hidden" as const
}

const barFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999
}

const miniMetric = {
  padding: "12px 0",
  borderBottom: "1px solid #f1f1f1"
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
  background: "#fcfbf7",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #f1ead7",
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
  overflowWrap: "anywhere" as const
}

/* =====================================================
   CLIENTES
===================================================== */

const section = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  width: "100%",
  boxSizing: "border-box" as const
}

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
  background: "#f9f3dc",
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
  minWidth: 0
}

const listRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: "10px 0",
  borderBottom: "1px solid #f1f1f1",
  flexWrap: "wrap" as const
}

const muted = {
  color: "#777",
  fontSize: 12
}