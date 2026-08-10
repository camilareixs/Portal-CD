import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
  cidade: string
  estado: string
  rua: string
  criadoEm: string
  CEP: string
  Complemento: string
  cintura: string
  
  tamanhoSaia?: string
  tamanhoVestido?: string
  tamanhoBlusa?: string
  busto?: string
  quadril?: string
}

type Compra = {
  id: string
  clienteid: string
  cliente: string
  cpf: string
  valor: number
  pagamento: string
  parcelas: number
  pontosgerados: number
  criadoem: string
  cupomusado: number
}

export default function Clientes({
  irParaCompra
}: {
  irParaCompra?: (clienteId: string, clienteNome: string) => void
}) {

  const [compras, setCompras] = useState<Compra[]>([])

  const [clientes, setClientes] = useState<Cliente[]>([])

  const [busca, setBusca] = useState("")
  const [cidadeFiltro, setCidadeFiltro] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [ordenacao, setOrdenacao] = useState("ranking")

  const [selected, setSelected] = useState<Cliente | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState<Partial<Cliente>>({})
  const [novo, setNovo] = useState<Partial<Cliente>>({})

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("pontos", { ascending: false })

    if (error) {
      console.log("Erro ao buscar clientes:", error)
      alert("Erro ao buscar clientes: " + error.message)
      return
    }

    if (data) {
      const clientesFormatados: Cliente[] = data.map((c: any) => ({
        id: String(c.id),
        nome: c.nome || "",
        cpf: c.cpf || "",
        celular: c.celular || "",
        pontos: c.pontos || 0,
        cidade: c.cidade || "",
        estado: c.estado || "",
        rua: c.rua || "",
        criadoEm: c.criadoEm || "",

        tamanhoSaia: c.tamanhoSaia || "",
        tamanhoVestido: c.tamanhoVestido || "",
        tamanhoBlusa: c.tamanhoBlusa || "",
        busto: c.busto || "",
        quadril: c.quadril || ""
      }))

      setClientes(clientesFormatados)
    }
  }

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", { ascending: false })
  
    if (error) {
      console.log("Erro compras:", error)
      return
    }
  
    if (data) {
      setCompras(
        data.map((c: any) => ({
          id: String(c.id),
          clienteid: String(c.clienteid),
          cliente: c.cliente || "",
          cpf: c.cpf || "",
          valor: Number(c.valor || 0),
          pagamento: c.pagamento || "",
          parcelas: Number(c.parcelas || 1),
          pontosgerados: Number(c.pontosgerados || 0),
          criadoem: c.criadoem || "",
          cupomusado: Number(c.cupomusado || 0)
        }))
      )
    }
  }

  useEffect(() => {
    fetchClientes()
    fetchCompras()
  }, [])

  async function salvarEdicao() {
    if (!selected) return

    const { error } = await supabase
      .from("clientes")
      .update({
        nome: form.nome,
        cpf: form.cpf,
        celular: form.celular,
        rua: form.rua,
        cidade: form.cidade,
        estado: form.estado,

        tamanhoSaia: form.tamanhoSaia,
        tamanhoVestido: form.tamanhoVestido,
        tamanhoBlusa: form.tamanhoBlusa,
        busto: form.busto,
        quadril: form.quadril
      })
      .eq("id", selected.id)

    if (error) {
      console.log("Erro ao editar:", error)
      alert("Erro ao editar cliente: " + error.message)
      return
    }

    alert("Cliente atualizado com sucesso!")

    setEditing(false)
    setSelected(null)

    fetchClientes()
  }

  async function criarCliente() {
    if (!novo.nome) {
      alert("Preencha o nome do cliente")
      return
    }

    const { error } = await supabase
      .from("clientes")
      .insert([
        {
          nome: novo.nome || "",
          cpf: novo.cpf || "",
          celular: novo.celular || "",
          cidade: novo.cidade || "",
          estado: novo.estado || "",
          rua: novo.rua || "",
          pontos: 0,
          criadoEm: new Date().toISOString(),

          tamanhoSaia: novo.tamanhoSaia || "",
          tamanhoVestido: novo.tamanhoVestido || "",
          tamanhoBlusa: novo.tamanhoBlusa || "",
          busto: novo.busto || "",
          quadril: novo.quadril || ""
        }
      ])

    if (error) {
      console.log("Erro ao criar:", error)
      alert("Erro ao criar cliente: " + error.message)
      return
    }

    alert("Cliente criado com sucesso!")

    setCreating(false)
    setNovo({})

    fetchClientes()
  }

  function calc(pontos: number) {
    return {
      cupons: Math.floor(pontos / 10),
      resto: pontos % 10
    }
  }

  function formatarData(data: string) {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR")
  }

  function gerarMensagem(cliente: Cliente) {
    const { cupons, resto } = calc(cliente.pontos)

    return `Olá ${cliente.nome}! 

Você possui:
🎟 ${cupons} cupom(ns)
⭐ ${resto}/10 pontos para o próximo

Te esperamos! 💛`
  }

  function enviarWhats(cliente: Cliente) {
    const numero = "55" + cliente.celular.replace(/\D/g, "")
    const mensagem = encodeURIComponent(gerarMensagem(cliente))
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank")
  }

  function baixarRelatorio(cliente: Cliente) {
    const comprasCliente = compras.filter(
      (c) => c.clienteid === cliente.id
    )
  
    const totalGasto = comprasCliente.reduce(
      (a, c) => a + c.valor,
      0
    )
  
    const totalCompras = comprasCliente.length
  
    const ticketMedio =
      totalCompras > 0
        ? totalGasto / totalCompras
        : 0
  
    const cuponsUsados = comprasCliente.reduce(
      (a, c) => a + c.cupomusado,
      0
    )
  
    const pontosGerados = comprasCliente.reduce(
      (a, c) => a + c.pontosgerados,
      0
    )
  
    const ultimaCompra =
      comprasCliente.length > 0
        ? formatarData(comprasCliente[0].criadoem)
        : "Nenhuma"
  
    const conteudo = `
  RELATÓRIO CAMIDUDA
  
  Cliente: ${cliente.nome}
  CPF: ${cliente.cpf}
  Celular: ${cliente.celular}
  Cidade: ${cliente.cidade}
  Estado: ${cliente.estado}
  Cliente desde: ${formatarData(cliente.criadoEm)}
  
  --- RESUMO ---
  Total gasto: R$ ${totalGasto.toFixed(2)}
  Compras realizadas: ${totalCompras}
  Ticket médio: R$ ${ticketMedio.toFixed(2)}
  Última compra: ${ultimaCompra}
  Cupons usados: R$ ${cuponsUsados.toFixed(2)}
  Pontos gerados: ${pontosGerados}
  
  --- HISTÓRICO ---
  ${comprasCliente
    .map(
      (c) =>
        `${formatarData(c.criadoem)} | R$ ${c.valor.toFixed(
          2
        )} | ${c.pagamento}`
    )
    .join("\n")}
  `
  
    const blob = new Blob([conteudo], {
      type: "text/plain;charset=utf-8"
    })
  
    const url = URL.createObjectURL(blob)
  
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${cliente.nome}.txt`
    a.click()
  
    URL.revokeObjectURL(url)
  }

  const cidades = Array.from(
    new Set(clientes.map((c) => c.cidade).filter(Boolean))
  )

  const estados = Array.from(
    new Set(clientes.map((c) => c.estado).filter(Boolean))
  )

  let lista = [...clientes]

  if (ordenacao === "ranking" || ordenacao === "pontos") {
    lista.sort((a, b) => b.pontos - a.pontos)
  }

  if (ordenacao === "alfabetica") {
    lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  lista = lista
    .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((c) => !cidadeFiltro || c.cidade === cidadeFiltro)
    .filter((c) => !estadoFiltro || c.estado === estadoFiltro)

  return (
    <div style={container}>
      <div style={header}>
        <h1 style={title}>Clientes</h1>

        <button
          style={primaryBtn}
          onClick={() => setCreating(true)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#fff3c4")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "#fffbe6")
          }
        >
          Novo cliente
        </button>
      </div>

      <div style={filters}>
        <input
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ ...input, flex: 2 }}
        />

        <select
          value={cidadeFiltro}
          onChange={(e) => setCidadeFiltro(e.target.value)}
          style={select}
        >
          <option value="">Cidade</option>
          {cidades.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          style={select}
        >
          <option value="">Estado</option>
          {estados.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          style={select}
        >
          <option value="ranking">Ranking</option>
          <option value="alfabetica">A–Z</option>
          <option value="pontos">Pontos</option>
        </select>
      </div>

      <div style={grid}>
        {lista.map((c, index) => {
          const { cupons, resto } = calc(c.pontos)
          const pct = (resto / 10) * 100

          return (
            <div
              key={c.id}
              style={card}
              onClick={() => {
                setSelected(c)
                setForm(c)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)"
                e.currentTarget.style.boxShadow =
                  "0 12px 30px rgba(0,0,0,0.08)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              {ordenacao === "ranking" && index < 3 && (
                <span style={rank}>#{index + 1}</span>
              )}

              <div style={name}>{c.nome}</div>
              <div style={muted}>{c.cidade}</div>

              <div style={coupon}>🎟 {cupons}</div>

              <div style={progressBg}>
                <div
                  style={{
                    ...progressFill,
                    width: `${pct}%`
                  }}
                />
              </div>

              <div style={mutedSmall}>{resto}/10</div>
            </div>
          )
        })}
      </div>

      {(selected || creating) && (
        <div
          style={overlay}
          onClick={() => {
            setSelected(null)
            setCreating(false)
            setEditing(false)
          }}
        >
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            {selected && !editing && (
              <>
                <h2 style={modalTitle}>{selected.nome}</h2>

                <Info label="CPF" value={selected.cpf} />
                <Info label="Celular" value={selected.celular} />
                <Info label="Rua" value={selected.rua} />
                <Info label="Cidade" value={selected.cidade} />
                <Info label="Estado" value={selected.estado} />
                <Info
                  label="Cliente desde"
                  value={formatarData(selected.criadoEm)}
                />

                <Info label="Saia" value={selected.tamanhoSaia || "-"} />
                <Info
                  label="Vestido"
                  value={selected.tamanhoVestido || "-"}
                />
                <Info label="Blusa" value={selected.tamanhoBlusa || "-"} />
                <Info label="Busto" value={selected.busto || "-"} />
                <Info label="Quadril" value={selected.quadril || "-"} />

                <div style={modalActions}>
                  <button
                    style={secondaryBtn}
                    onClick={() => {
                      setForm(selected)
                      setEditing(true)
                    }}
                  >
                    Editar
                  </button>

                  <button
                    style={primaryBtnSmall}
                    onClick={() => {
                      if (irParaCompra && selected) {
                        irParaCompra(selected.id, selected.nome)
                      }

                      setSelected(null)
                    }}
                  >
                    Nova compra
                  </button>

                  <button
                    style={whatsBtn}
                    onClick={() => enviarWhats(selected)}
                  >
                    WhatsApp
                  </button>

                  <button
  style={secondaryBtn}
  onClick={() => {
    if (selected) {
      baixarRelatorio(selected)
    }
  }}
>
  Relatório
</button>

                </div>
              </>
            )}

            {selected && editing && (
              <>
                <h2 style={modalTitle}>Editar cliente</h2>

                <input style={inputSpacing} value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                <input style={inputSpacing} value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                <input style={inputSpacing} value={form.celular || ""} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
                <input style={inputSpacing} value={form.rua || ""} onChange={(e) => setForm({ ...form, rua: e.target.value })} />
                <input style={inputSpacing} value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                <input style={inputSpacing} value={form.estado || ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
                <input style={inputSpacing} value={form.tamanhoSaia || ""} onChange={(e) => setForm({ ...form, tamanhoSaia: e.target.value })} />
                <input style={inputSpacing} value={form.tamanhoVestido || ""} onChange={(e) => setForm({ ...form, tamanhoVestido: e.target.value })} />
                <input style={inputSpacing} value={form.tamanhoBlusa || ""} onChange={(e) => setForm({ ...form, tamanhoBlusa: e.target.value })} />
                <input style={inputSpacing} value={form.busto || ""} onChange={(e) => setForm({ ...form, busto: e.target.value })} />
                <input style={inputSpacing} value={form.quadril || ""} onChange={(e) => setForm({ ...form, quadril: e.target.value })} />

                <div style={modalActions}>
                  <button style={secondaryBtn} onClick={() => setEditing(false)}>
                    Cancelar
                  </button>

                  <button style={primaryBtnSmall} onClick={salvarEdicao}>
                    Salvar
                  </button>
                </div>
              </>
            )}

            {creating && (
              <>
                <h2 style={modalTitle}>Novo cliente</h2>

                <input style={inputSpacing} placeholder="Nome" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
                <input style={inputSpacing} placeholder="CPF" onChange={(e) => setNovo({ ...novo, cpf: e.target.value })} />
                <input style={inputSpacing} placeholder="Celular" onChange={(e) => setNovo({ ...novo, celular: e.target.value })} />
                <input style={inputSpacing} placeholder="Rua" onChange={(e) => setNovo({ ...novo, rua: e.target.value })} />
                <input style={inputSpacing} placeholder="Cidade" onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} />
                <input style={inputSpacing} placeholder="Estado" onChange={(e) => setNovo({ ...novo, estado: e.target.value })} />
                <input style={inputSpacing} placeholder="Tamanho saia" onChange={(e) => setNovo({ ...novo, tamanhoSaia: e.target.value })} />
                <input style={inputSpacing} placeholder="Tamanho vestido" onChange={(e) => setNovo({ ...novo, tamanhoVestido: e.target.value })} />
                <input style={inputSpacing} placeholder="Tamanho blusa" onChange={(e) => setNovo({ ...novo, tamanhoBlusa: e.target.value })} />
                <input style={inputSpacing} placeholder="Busto" onChange={(e) => setNovo({ ...novo, busto: e.target.value })} />
                <input style={inputSpacing} placeholder="Quadril" onChange={(e) => setNovo({ ...novo, quadril: e.target.value })} />

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button style={primaryBtnCreate} onClick={criarCliente}>
                    Criar cliente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={mutedSmall}>{label}</span>
      <div>{value}</div>
    </div>
  )
}

const container = { padding: "48px", background: "#f6f6f7", fontFamily: "Inter, sans-serif" }
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }
const title = { fontSize: 32, fontWeight: 500 }
const primaryBtn = { padding: "10px 18px", borderRadius: 14, border: "1px solid #e6e0c9", background: "#fffbe6", cursor: "pointer", boxShadow: "0 4px 12px rgba(212,175,55,0.15)" }
const filters = { display: "flex", gap: 12, marginBottom: 30 }
const input = { padding: 12, borderRadius: 14, border: "1px solid #e5e5e5", width: "100%" }
const inputSpacing = { ...input, marginBottom: 12 }
const select = { padding: 12, borderRadius: 14, border: "1px solid #e5e5e5", flex: 1 }
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 }
const card = { background: "#fff", padding: 18, borderRadius: 18, border: "1px solid #eee", cursor: "pointer", transition: "0.25s", position: "relative" as const }
const rank = { position: "absolute" as const, top: 12, right: 12, color: "#b8962e" }
const name = { fontWeight: 500 }
const muted = { color: "#888" }
const mutedSmall = { fontSize: 12, color: "#999" }
const coupon = { margin: "10px 0", color: "#b8962e" }
const progressBg = { height: 6, background: "#eee", borderRadius: 999 }
const progressFill = { height: "100%", background: "linear-gradient(90deg,#d4af37,#f6e27a)" }
const overlay = { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }
const modal = { background: "#fff", padding: "24px", borderRadius: 18, width: 400, maxHeight: "80vh", overflowY: "auto" as const, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }
const modalTitle = { marginBottom: 20 }
const modalActions = { display: "flex", gap: 10, marginTop: 20, justifyContent: "center" }
const secondaryBtn = { padding: "10px 16px", borderRadius: 12, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" }
const primaryBtnSmall = { padding: "10px 16px", borderRadius: 12, background: "linear-gradient(90deg,#d4af37,#f6e27a)", border: "none", cursor: "pointer" }
const primaryBtnCreate = { padding: "12px 24px", borderRadius: 14, border: "none", background: "linear-gradient(90deg,#d4af37,#f6e27a)", boxShadow: "0 8px 20px rgba(212,175,55,0.25)", cursor: "pointer" }
const whatsBtn = { padding: "10px 16px", borderRadius: 12, border: "1px solid #e6e0c9", background: "#fffbe6", cursor: "pointer" }