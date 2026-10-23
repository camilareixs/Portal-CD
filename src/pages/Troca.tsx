import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
}

type Resgate = {
  id: string
  clienteid: string
  cupomnumero: number
  tipo: string
  valorcupom: number
  criadoem: string
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\D/g, "") === ""
    ? valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    : valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function formatarData(data: string) {
  if (!data) return "-"
  const dataObj = new Date(data.length === 10 ? `${data}T00:00:00` : data)
  return Number.isNaN(dataObj.getTime()) ? "-" : dataObj.toLocaleDateString("pt-BR")
}

function chaveMes(data: string) {
  if (!data) return ""
  const d = new Date(data.length === 10 ? `${data}T00:00:00` : data)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function Trocas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [resgates, setResgates] = useState<Resgate[]>([])
  const [busca, setBusca] = useState("")
  const [mesFiltro, setMesFiltro] = useState("todos")
  const [anoFiltro, setAnoFiltro] = useState("todos")

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,cpf,celular,pontos")
      .order("nome")

    if (error) {
      alert("Erro clientes: " + error.message)
      return
    }

    setClientes((data || []).map((c: any) => ({
      id: String(c.id),
      nome: c.nome || "",
      cpf: c.cpf || "",
      celular: c.celular || "",
      pontos: Number(c.pontos || 0)
    })))
  }

  async function fetchTrocas() {
    const { data, error } = await supabase
      .from("trocas")
      .select("*")
      .order("criadoem", { ascending: false })

    if (error) {
      alert("Erro trocas: " + error.message)
      return
    }

    setResgates((data || []).map((r: any) => ({
      id: String(r.id),
      clienteid: String(r.clienteid),
      cupomnumero: Number(r.cupomnumero || 0),
      tipo: r.tipo || "Cupom Fidelidade",
      valorcupom: Number(r.valorcupom ?? 60),
      criadoem: r.criadoem || ""
    })))
  }

  useEffect(() => {
    void fetchClientes()
    void fetchTrocas()
  }, [])

  const clientesPorId = useMemo(
    () => new Map(clientes.map(cliente => [cliente.id, cliente])),
    [clientes]
  )

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>()
    resgates.forEach(r => {
      const chave = chaveMes(r.criadoem)
      if (chave) anos.add(chave.slice(0, 4))
    })
    return Array.from(anos).sort((a, b) => b.localeCompare(a))
  }, [resgates])

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>()
    resgates.forEach(r => {
      const chave = chaveMes(r.criadoem)
      if (chave && (anoFiltro === "todos" || chave.startsWith(`${anoFiltro}-`))) {
        meses.add(chave)
      }
    })
    return Array.from(meses).sort((a, b) => b.localeCompare(a))
  }, [resgates, anoFiltro])

  useEffect(() => {
    if (mesFiltro !== "todos" && !mesesDisponiveis.includes(mesFiltro)) {
      setMesFiltro("todos")
    }
  }, [mesesDisponiveis, mesFiltro])

  const resgatesFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca)
    const numerosBusca = busca.replace(/\D/g, "")

    return resgates.filter(r => {
      const dataChave = chaveMes(r.criadoem)
      if (!dataChave) return false

      if (anoFiltro !== "todos" && dataChave.slice(0, 4) !== anoFiltro) return false
      if (mesFiltro !== "todos" && dataChave !== mesFiltro) return false

      if (!termo) return true

      const cliente = clientesPorId.get(r.clienteid)
      if (!cliente) {
        return String(r.cupomnumero).includes(termo)
      }

      const camposTexto = [
        cliente.nome,
        cliente.cpf,
        cliente.celular,
        r.tipo,
        String(r.cupomnumero)
      ].map(normalizarBusca)

      const correspondeTexto = camposTexto.some(campo => campo.includes(termo))
      const correspondeNumeros = numerosBusca.length > 0 && [
        cliente.cpf,
        cliente.celular,
        String(r.cupomnumero)
      ].some(campo => campo.replace(/\D/g, "").includes(numerosBusca))

      return correspondeTexto || correspondeNumeros
    })
  }, [resgates, clientesPorId, busca, mesFiltro, anoFiltro])

  const agrupados = useMemo(() => {
    return resgatesFiltrados.reduce((acc: Record<string, Resgate[]>, r) => {
      const chave = chaveMes(r.criadoem)
      if (!chave) return acc
      if (!acc[chave]) acc[chave] = []
      acc[chave].push(r)
      return acc
    }, {})
  }, [resgatesFiltrados])

  const mesesOrdenados = Object.keys(agrupados).sort((a, b) => b.localeCompare(a))
  const hoje = new Date()
  const totalMes = resgates.filter(r => {
    const chave = chaveMes(r.criadoem)
    return chave === `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
  }).length
  const clientesElegiveis = clientes.filter(c => c.pontos >= 10).length
  const cuponsAtivos = clientes.reduce((acc, c) => acc + Math.floor(Number(c.pontos || 0) / 10), 0)

  return (
    <div className="trocas-container" style={container}>
      <div style={header}>
        <div>
          <h1 className="trocas-title" style={title}>Trocas</h1>
          <span style={sub}>Histórico automático de cupons utilizados</span>
        </div>
      </div>

      <div style={regraCard}>
        <div>
          <span style={regraLabel}>Programa de fidelidade</span>
          <strong style={regraValor}>10 pontos = R$ 60,00</strong>
        </div>
        <span style={regraDescricao}>
          Cada cupom utilizado corresponde a R$ 60,00 em benefício.
        </span>
      </div>

      <div style={dashGrid}>
        <Dash label="Resgates no mês" value={totalMes} />
        <Dash label="Cupons ativos" value={cuponsAtivos} />
        <Dash label="Clientes elegíveis" value={clientesElegiveis} />
      </div>

      <section style={filtrosCard}>
        <div style={filtrosTitulo}>Buscar no histórico</div>
        <div className="trocas-filtros-grid" style={filtrosGrid}>
          <div style={campoBusca}>
            <label htmlFor="trocas-busca" style={filtroLabel}>Cliente ou cupom</label>
            <input
              id="trocas-busca"
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Nome, CPF, celular ou número do cupom"
              style={inputStyle}
            />
          </div>
          <div style={campoFiltro}>
            <label htmlFor="trocas-ano" style={filtroLabel}>Ano</label>
            <select
              id="trocas-ano"
              value={anoFiltro}
              onChange={e => setAnoFiltro(e.target.value)}
              style={selectStyle}
            >
              <option value="todos">Todos os anos</option>
              {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </div>
          <div style={campoFiltro}>
            <label htmlFor="trocas-mes" style={filtroLabel}>Mês</label>
            <select
              id="trocas-mes"
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
              style={selectStyle}
            >
              <option value="todos">Todos os meses</option>
              {mesesDisponiveis.map(m => {
                const [ano, mes] = m.split("-")
                const nomeMes = new Date(Number(ano), Number(mes) - 1)
                  .toLocaleString("pt-BR", { month: "long" })
                return <option key={m} value={m}>{nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} {ano}</option>
              })}
            </select>
          </div>
        </div>
        <div style={resultadoFiltro}>
          {resgatesFiltrados.length} {resgatesFiltrados.length === 1 ? "resgate encontrado" : "resgates encontrados"}
        </div>
      </section>

      {mesesOrdenados.map(m => {
        const lista = agrupados[m]
        const [ano, mes] = m.split("-")
        const nomeMes = new Date(Number(ano), Number(mes) - 1)
          .toLocaleString("pt-BR", { month: "long" })
        const valorMes = lista.reduce((total, r) => total + Number(r.valorcupom || 0), 0)

        return (
          <div key={m} style={monthSection}>
            <div className="trocas-month-header" style={monthHeader}>
              <div>
                <h2 style={mesTitulo}>{nomeMes.toUpperCase()} {ano}</h2>
                <span style={monthSub}>{lista.length} {lista.length === 1 ? "resgate" : "resgates"}</span>
              </div>
              <strong style={monthTotal}>{formatarMoeda(valorMes)}</strong>
            </div>

            <div style={card}>
              {lista.map(r => {
                const cliente = clientesPorId.get(r.clienteid)
                return (
                  <div className="trocas-row" key={r.id} style={row}>
                    <div style={clientInfo}>
                      <strong style={nomeCliente}>{cliente?.nome || "Cliente"}</strong>
                      <div style={muted}>CPF: {cliente?.cpf || "-"}</div>
                      <div style={muted}>Celular: {cliente?.celular || "-"}</div>
                    </div>

                    <div style={rowInfo}>
                      <span className="trocas-mobile-label" style={mobileLabel}>Data</span>
                      <span>{formatarData(r.criadoem)}</span>
                    </div>

                    <div style={rowInfo}>
                      <span className="trocas-mobile-label" style={mobileLabel}>Cupom</span>
                      <span>#{r.cupomnumero}</span>
                    </div>

                    <div style={rowInfo}>
                      <span className="trocas-mobile-label" style={mobileLabel}>Valor</span>
                      <strong style={valorCupom}>{formatarMoeda(r.valorcupom)}</strong>
                    </div>

                    <div className="trocas-check" style={checkWrap} title="Cupom utilizado">
                      <span style={checkIcon}>✓</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {mesesOrdenados.length === 0 && (
        <div style={empty}>
          {busca || mesFiltro !== "todos" || anoFiltro !== "todos"
            ? "Nenhum resgate encontrado para os filtros selecionados."
            : "Ainda não existem trocas ou cupons utilizados."}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .trocas-filtros-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .trocas-row {
            grid-template-columns: minmax(180px, 2fr) minmax(100px, 1fr) minmax(90px, 1fr) minmax(100px, 1fr) 50px !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 700px) {
          .trocas-filtros-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .trocas-container { padding: 20px !important; }
          .trocas-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .trocas-row > div { width: 100%; }
          .trocas-row > div:first-child { overflow-wrap: anywhere; }
          .trocas-check { width: 100% !important; justify-content: flex-start !important; }
          .trocas-mobile-label { display: block !important; }
          .trocas-month-header { align-items: flex-start !important; flex-direction: column !important; gap: 5px !important; }
          .trocas-container { padding: 20px !important; }
        }
        @media (max-width: 450px) {
          .trocas-container { padding: 16px !important; }
          .trocas-title { font-size: 28px !important; }
        }
      `}</style>
    </div>
  )
}

function Dash({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={dash}>
      <span style={dashLabel}>{label}</span>
      <strong style={dashValue}>{value}</strong>
    </div>
  )
}

const container = {
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding: 40,
  background: "#f6f6f7",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  boxSizing: "border-box" as const,
  overflow: "hidden"
}
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25 }
const title = { fontSize: 34, margin: 0, fontWeight: 600, letterSpacing: "-0.5px" }
const sub = { color: "#777", fontSize: 13 }
const regraCard = {
  background: "linear-gradient(135deg,#fffdf7,#fff)",
  border: "1px solid #eadfbf",
  borderRadius: 16,
  padding: 18,
  marginBottom: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap" as const
}
const regraLabel = { display: "block", fontSize: 11, color: "#8a8a8a", marginBottom: 5 }
const regraValor = { fontSize: 17, color: "#6d561b" }
const regraDescricao = { fontSize: 12, color: "#777" }
const dashGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 22 }
const dash = {
  background: "#fff",
  padding: 18,
  borderRadius: 14,
  minWidth: 0,
  border: "1px solid #eeeeee",
  boxShadow: "0 3px 12px rgba(0,0,0,0.025)"
}
const dashLabel = { fontSize: 12, color: "#777", display: "block", marginBottom: 6 }
const dashValue = { fontSize: 22, fontWeight: 600, color: "#2d2d2d", overflowWrap: "anywhere" as const }
const filtrosCard = {
  background: "#fff",
  border: "1px solid #eeeeee",
  borderRadius: 14,
  padding: 18,
  marginBottom: 28,
  boxShadow: "0 3px 12px rgba(0,0,0,0.02)"
}
const filtrosTitulo = { fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 14 }
const filtrosGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 2fr) minmax(130px, 1fr) minmax(150px, 1fr)",
  gap: 12,
  alignItems: "end"
}
const campoBusca = { minWidth: 0, display: "flex", flexDirection: "column" as const, gap: 6 }
const campoFiltro = { minWidth: 0, display: "flex", flexDirection: "column" as const, gap: 6 }
const filtroLabel = { fontSize: 12, color: "#777", fontWeight: 500 }
const inputStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  border: "1px solid #dedede",
  borderRadius: 9,
  padding: "11px 12px",
  background: "#fff",
  color: "#333",
  fontSize: 13,
  outlineColor: "#b9974f"
}
const selectStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  border: "1px solid #dedede",
  borderRadius: 9,
  padding: "11px 12px",
  background: "#fff",
  color: "#333",
  fontSize: 13,
  outlineColor: "#b9974f",
  textTransform: "capitalize" as const
}
const resultadoFiltro = { color: "#888", fontSize: 12, marginTop: 12 }
const monthSection = { marginBottom: 36, minWidth: 0 }
const monthHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 10, flexWrap: "wrap" as const }
const mesTitulo = { fontSize: 16, margin: 0, fontWeight: 600 }
const monthSub = { display: "block", color: "#999", fontSize: 11, marginTop: 3 }
const monthTotal = { fontSize: 15, color: "#6d561b" }
const card = { background: "#fff", borderRadius: 14, overflow: "hidden", minWidth: 0, border: "1px solid #eeeeee" }
const row = {
  display: "grid",
  gridTemplateColumns: "minmax(200px,2fr) minmax(120px,1fr) minmax(100px,1fr) minmax(110px,1fr) 60px",
  gap: 16,
  padding: 16,
  borderTop: "1px solid #eee",
  alignItems: "center",
  minWidth: 0
}
const clientInfo = { minWidth: 0, overflow: "hidden" }
const nomeCliente = { overflowWrap: "anywhere" as const }
const rowInfo = { display: "flex", flexDirection: "column" as const, gap: 3, fontSize: 14, minWidth: 0 }
const mobileLabel = { display: "none", fontSize: 11, color: "#999" }
const valorCupom = { fontSize: 14, fontWeight: 600, color: "#6d561b" }
const muted = { fontSize: 12, color: "#999", marginTop: 3, overflowWrap: "anywhere" as const }
const checkWrap = { display: "flex", justifyContent: "center", alignItems: "center" }
const checkIcon = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#22c55e",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700
}
const empty = {
  padding: 30,
  textAlign: "center" as const,
  color: "#999",
  fontSize: 13,
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #eeeeee"
}
