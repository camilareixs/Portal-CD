import { useState } from "react"

type Cliente = {
  nome: string
  cpf: string
}

type Compra = {
  id: string
  cliente: string
  cpf: string
  data: Date
  valor: number
  pagamento: string
  pontos: number
}

export default function Compras() {

  const clientes: Cliente[] = [
    { nome: "Ana Souza", cpf: "111" },
    { nome: "Mariana Lima", cpf: "222" },
    { nome: "Carla Mendes", cpf: "333" },
    { nome: "Fernanda Alves", cpf: "444" }
  ]

  const [compras] = useState<Compra[]>([
    { id: "1", cliente: "Ana Souza", cpf: "111", data: new Date(2026, 2, 10), valor: 450, pagamento: "Pix", pontos: 3 },
    { id: "2", cliente: "Mariana Lima", cpf: "222", data: new Date(2026, 2, 5), valor: 900, pagamento: "Cartão", pontos: 6 },
    { id: "3", cliente: "Carla Mendes", cpf: "333", data: new Date(2026, 1, 12), valor: 300, pagamento: "Dinheiro", pontos: 2 },
    { id: "4", cliente: "Ana Souza", cpf: "111", data: new Date(2026, 0, 22), valor: 1500, pagamento: "Pix", pontos: 10 }
  ])

  const hoje = new Date()

  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState("")
  const [mesFiltro, setMesFiltro] = useState("")

  const [nomeCliente, setNomeCliente] = useState("")
  const [cpf, setCpf] = useState("")
  const [valor, setValor] = useState(0)
  const [pagamento, setPagamento] = useState("Pix")
  const [dataCompra, setDataCompra] = useState("")

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(nomeCliente.toLowerCase())
  )

  const comprasFiltradas = compras
    .filter(c => {
      if (!mesFiltro) return true
      return c.data.getMonth().toString() === mesFiltro
    })
    .filter(c =>
      c.cliente.toLowerCase().includes(busca.toLowerCase())
    )

  const totalMes = comprasFiltradas.reduce((acc, c) => acc + c.valor, 0)
  const totalCompras = comprasFiltradas.length
  const totalPontos = comprasFiltradas.reduce((a, c) => a + c.pontos, 0)

  const agrupadas = comprasFiltradas.reduce((acc: any, c) => {
    const chave = `${c.data.getFullYear()}-${c.data.getMonth()}`
    if (!acc[chave]) acc[chave] = []
    acc[chave].push(c)
    return acc
  }, {})

  const mesesOrdenados = Object.keys(agrupadas).sort((a, b) => b.localeCompare(a))

  const pontos = Math.floor(valor / 150)

  return (
    <div>

      {/* HEADER */}
      <div style={header}>
        <div>
          <h1 style={title}>Compras</h1>
          <span style={sub}>Controle financeiro e fidelidade</span>
        </div>

        <button style={novoBtn} onClick={() => setModal(true)}>
          Nova Compra
        </button>
      </div>

      {/* DASH */}
      <div style={dashGrid}>
        <Dash
          label={`Vendas ${mesFiltro !== "" ? "do mês selecionado" : "do mês atual"}`}
          value={`R$ ${totalMes}`}
        />
        <Dash label="Compras registradas" value={totalCompras} />
        <Dash label="Pontos gerados no período" value={totalPontos} />
      </div>

      {/* FILTROS */}
      <div style={filtrosRow}>
        <input
          placeholder="Pesquisar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={filtro}
        />

        <select style={filtro} onChange={e => setMesFiltro(e.target.value)}>
          <option value="">Todos meses</option>
          <option value="0">Janeiro</option>
          <option value="1">Fevereiro</option>
          <option value="2">Março</option>
        </select>
      </div>

      {/* TIMELINE */}
      {mesesOrdenados.map(m => {

        const lista = agrupadas[m]
        const [ano, mes] = m.split("-")

        const nomeMes = new Date(Number(ano), Number(mes))
          .toLocaleString("pt-BR", { month: "long" })

        const totalMesLista = lista.reduce((a: any, c: any) => a + c.valor, 0)

        return (
          <div key={m} style={{ marginBottom: 36 }}>

            <h2 style={mesTitulo}>
              {nomeMes.toUpperCase()} {ano}
            </h2>

            <span style={subExtrato}>
              {lista.length} compras registradas • Total R$ {totalMesLista}
            </span>

            <div style={cardMes}>
              {lista.map((c: Compra) => (
                <div
                  key={c.id}
                  style={row}
                  onMouseEnter={e => e.currentTarget.style.background = "#fbfaf7"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >

                  <div>
                    <strong>{c.cliente}</strong>
                    <div style={cpfTxt}>{c.cpf}</div>
                  </div>

                  <div>{c.data.toLocaleDateString()}</div>
                  <div>R$ {c.valor}</div>
                  <div>{c.pagamento}</div>
                  <div style={pts}>{c.pontos} pts</div>

                </div>
              ))}
            </div>

          </div>
        )

      })}

      {/* MODAL */}
      {modal && (
        <div style={overlay}>
          <div style={modalCard}>

            <div style={modalHead}>
              <h2 style={{ fontFamily: "Playfair Display" }}>Registrar Compra</h2>
              <button style={close} onClick={() => setModal(false)}>✕</button>
            </div>

            <input
              placeholder="Nome Cliente"
              value={nomeCliente}
              onChange={e => {
                setNomeCliente(e.target.value)
                const achado = clientes.find(c => c.nome === e.target.value)
                if (achado) setCpf(achado.cpf)
              }}
              style={input}
            />

            {nomeCliente && (
              <div style={dropdown}>
                {clientesFiltrados.map(c => (
                  <div
                    key={c.cpf}
                    style={item}
                    onClick={() => {
                      setNomeCliente(c.nome)
                      setCpf(c.cpf)
                    }}
                  >
                    {c.nome}
                  </div>
                ))}
              </div>
            )}

            <input value={cpf} readOnly placeholder="CPF" style={input} />

            <input type="date" onChange={e => setDataCompra(e.target.value)} style={input} />

            <input
              type="number"
              placeholder="Valor Compra"
              onChange={e => setValor(Number(e.target.value))}
              style={input}
            />

            <select onChange={e => setPagamento(e.target.value)} style={input}>
              <option>Pix</option>
              <option>Cartão</option>
              <option>Dinheiro</option>
            </select>

            <div style={{ marginTop: 12 }}>
              Pontos gerados: <strong>{pontos}</strong>
            </div>

            <button style={save}>Finalizar Compra</button>

          </div>
        </div>
      )}

    </div>
  )
}

function Dash({ label, value }: { label: string, value: any }) {
  return (
    <div style={dashCard}>
      <span style={dashLabel}>{label}</span>
      <strong style={dashValue}>{value}</strong>
    </div>
  )
}

/* STYLES */

const header = { display: "flex", justifyContent: "space-between", marginBottom: 30 }
const title = { fontFamily: "Playfair Display", fontSize: 42, margin: 0 }
const sub = { color: "#8a8a8a" }

const novoBtn = { background: "linear-gradient(135deg,#d4b05f,#b8963a)", color: "#fff", border: "none", padding: "14px 28px", borderRadius: 12, cursor: "pointer" }

const dashGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 22, marginBottom: 30 }
const dashCard = { background: "#fff", padding: 26, borderRadius: 20, border: "1px solid #f1efe9" }
const dashLabel = { fontSize: 13, color: "#9a978f", display: "block", marginBottom: 6 }
const dashValue = { fontSize: 30, fontFamily: "Playfair Display" }

const filtrosRow = { display: "flex", gap: 16, marginBottom: 30 }
const filtro = { padding: 12, borderRadius: 10, border: "1px solid #ddd" }

const mesTitulo = { fontFamily: "Playfair Display", marginBottom: 6 }
const subExtrato = { display: "block", marginBottom: 12, color: "#9a978f", fontSize: 13 }

const cardMes = { background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid #f3f1ea" }

const row = { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr .6fr", padding: "18px 22px", borderTop: "1px solid #f5f3ed", alignItems: "center", transition: "0.2s" }

const cpfTxt = { fontSize: 12, color: "#aaa" }
const pts = { color: "#b8963a", fontWeight: 600 }

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }
const modalCard = { background: "#fff", padding: 34, borderRadius: 20, width: 420 }

const modalHead = { display: "flex", justifyContent: "space-between", alignItems: "center" }
const close = { border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }

const input = { width: "100%", padding: 13, marginTop: 12, borderRadius: 10, border: "1px solid #ddd" }

const dropdown = { border: "1px solid #eee", borderRadius: 10, maxHeight: 120, overflow: "auto" }
const item = { padding: 10, cursor: "pointer" }

const save = { marginTop: 20, width: "100%", padding: 14, background: "#c6a75e", color: "#fff", border: "none", borderRadius: 10 }