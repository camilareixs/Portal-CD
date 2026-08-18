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
        pontos: Number(c.pontos || 0),
        cidade: c.cidade || "",
        estado: c.estado || "",
        rua: c.rua || "",
        criadoEm: c.criadoEm || "",
        CEP: c.CEP || "",
        Complemento: c.Complemento || "",
        cintura: c.cintura || "",
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
    if (!novo.nome?.trim()) {
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

    const dataObj = new Date(data)

    if (Number.isNaN(dataObj.getTime())) {
      return "-"
    }

    return dataObj.toLocaleDateString("pt-BR")
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
    const mensagem = encodeURIComponent(
      gerarMensagem(cliente)
    )

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank"
    )
  }

  function baixarRelatorio(cliente: Cliente) {
    const comprasCliente = compras.filter(
      c => c.clienteid === cliente.id
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

    const conteudo = `RELATÓRIO CAMIDUDA

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
Cupons usados: ${cuponsUsados}
Pontos gerados: ${pontosGerados}

--- HISTÓRICO ---

${comprasCliente
  .map(
    c =>
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
    new Set(
      clientes
        .map(c => c.cidade)
        .filter(Boolean)
    )
  )

  const estados = Array.from(
    new Set(
      clientes
        .map(c => c.estado)
        .filter(Boolean)
    )
  )

  let lista = [...clientes]

  if (
    ordenacao === "ranking" ||
    ordenacao === "pontos"
  ) {
    lista.sort((a, b) => b.pontos - a.pontos)
  }

  if (ordenacao === "alfabetica") {
    lista.sort((a, b) =>
      a.nome.localeCompare(b.nome)
    )
  }

  lista = lista
    .filter(c =>
      c.nome
        .toLowerCase()
        .includes(busca.toLowerCase())
    )
    .filter(
      c =>
        !cidadeFiltro ||
        c.cidade === cidadeFiltro
    )
    .filter(
      c =>
        !estadoFiltro ||
        c.estado === estadoFiltro
    )

  function fecharModal() {
    setSelected(null)
    setCreating(false)
    setEditing(false)
    setForm({})
    setNovo({})
  }

  function abrirCliente(cliente: Cliente) {
    setSelected(cliente)
    setForm(cliente)
  }

  return (
    <div className="clientes-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .clientes-page {
          width: 100%;
          min-width: 0;
          background: #f6f6f7;
          font-family: Inter, Arial, sans-serif;
        }

        .clientes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .clientes-title {
          font-size: 32px;
          font-weight: 500;
          margin: 0;
          color: #222;
        }

        .clientes-primary-btn {
          padding: 10px 18px;
          border-radius: 14px;
          border: 1px solid #e6e0c9;
          background: #fffbe6;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(212,175,55,0.15);
          white-space: nowrap;
          transition: 0.2s;
        }

        .clientes-primary-btn:hover {
          background: #fff3c4;
        }

        .clientes-filters {
          display: grid;
          grid-template-columns: minmax(200px, 2fr) repeat(3, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 30px;
          width: 100%;
        }

        .clientes-input,
        .clientes-select {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid #e5e5e5;
          width: 100%;
          min-width: 0;
          background: #fff;
          outline: none;
          font-family: inherit;
          font-size: 14px;
        }

        .clientes-input:focus,
        .clientes-select:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.10);
        }

        .clientes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .cliente-card {
          background: #fff;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid #eee;
          cursor: pointer;
          transition: 0.25s;
          position: relative;
          min-width: 0;
          overflow: hidden;
        }

        .cliente-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        }

        .cliente-rank {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #b8962e;
          font-weight: 600;
        }

        .cliente-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-right: 35px;
          color: #222;
        }

        .cliente-muted {
          color: #888;
          font-size: 14px;
        }

        .cliente-muted-small {
          font-size: 12px;
          color: #999;
        }

        .cliente-coupon {
          margin: 10px 0;
          color: #b8962e;
        }

        .cliente-progress-bg {
          height: 6px;
          background: #eee;
          border-radius: 999px;
          overflow: hidden;
        }

        .cliente-progress-fill {
          height: 100%;
          background: linear-gradient(90deg,#d4af37,#f6e27a);
          border-radius: 999px;
        }

        .clientes-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
          z-index: 2000;
        }

        .clientes-modal {
          background: #fff;
          padding: 24px;
          border-radius: 18px;
          width: 100%;
          max-width: 400px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
          box-sizing: border-box;
        }

        .clientes-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 20px;
        }

        .clientes-modal-title {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .clientes-close {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 50%;
          border: 1px solid #eee;
          background: #fafafa;
          color: #777;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .clientes-info {
          margin-bottom: 12px;
        }

        .clientes-info-label {
          display: block;
          font-size: 12px;
          color: #999;
          margin-bottom: 3px;
        }

        .clientes-info-value {
          margin-top: 2px;
          word-break: break-word;
          color: #222;
        }

        .clientes-section-title {
          font-size: 14px;
          font-weight: 600;
          color: #b8962e;
          margin-top: 22px;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }

        .clientes-modal-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .clientes-secondary-btn,
        .clientes-primary-small,
        .clientes-whats-btn {
          min-width: 0;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
        }

        .clientes-secondary-btn {
          border: 1px solid #ddd;
          background: #fafafa;
        }

        .clientes-primary-small {
          background: linear-gradient(90deg,#d4af37,#f6e27a);
          border: none;
        }

        .clientes-whats-btn {
          border: 1px solid #e6e0c9;
          background: #fffbe6;
        }

        .clientes-create-actions {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .clientes-create-btn {
          padding: 12px 24px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(90deg,#d4af37,#f6e27a);
          box-shadow: 0 8px 20px rgba(212,175,55,0.25);
          cursor: pointer;
          font-family: inherit;
        }

        @media (max-width: 900px) {
          .clientes-filters {
            grid-template-columns: 1fr 1fr;
          }

          .clientes-filters > :first-child {
            grid-column: 1 / -1;
          }

          .clientes-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .clientes-header {
            align-items: stretch;
            margin-bottom: 20px;
            gap: 14px;
          }

          .clientes-title {
            font-size: 28px;
          }

          .clientes-primary-btn {
            width: 100%;
            min-height: 46px;
          }

          .clientes-filters {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
          }

          .clientes-filters > :first-child {
            grid-column: auto;
          }

          .clientes-input,
          .clientes-select {
            width: 100%;
            min-width: 0;
            height: 46px;
          }

          .clientes-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .cliente-card {
            padding: 16px;
            border-radius: 16px;
          }

          .clientes-overlay {
            padding: 10px;
            align-items: flex-end;
          }

          .clientes-modal {
            width: 100%;
            max-width: none;
            max-height: calc(100vh - 20px);
            padding: 18px;
            border-radius: 20px 20px 0 0;
          }

          .clientes-modal-title {
            font-size: 21px;
          }

          .clientes-modal-actions {
            grid-template-columns: 1fr;
          }

          .clientes-secondary-btn,
          .clientes-primary-small,
          .clientes-whats-btn {
            width: 100%;
            min-height: 44px;
          }

          .clientes-create-btn {
            width: 100%;
            min-height: 46px;
          }
        }

        @media (max-width: 380px) {
          .clientes-title {
            font-size: 25px;
          }

          .clientes-modal {
            padding: 16px;
          }

          .cliente-card {
            padding: 14px;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="clientes-header">
        <h1 className="clientes-title">
          Clientes
        </h1>

        <button
          className="clientes-primary-btn"
          onClick={() => {
            setNovo({})
            setCreating(true)
          }}
        >
          + Novo cliente
        </button>
      </div>

      {/* FILTROS */}
      <div className="clientes-filters">
        <input
          className="clientes-input"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />

        <select
          className="clientes-select"
          value={cidadeFiltro}
          onChange={e =>
            setCidadeFiltro(e.target.value)
          }
        >
          <option value="">Cidade</option>

          {cidades.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="clientes-select"
          value={estadoFiltro}
          onChange={e =>
            setEstadoFiltro(e.target.value)
          }
        >
          <option value="">Estado</option>

          {estados.map(e => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          className="clientes-select"
          value={ordenacao}
          onChange={e =>
            setOrdenacao(e.target.value)
          }
        >
          <option value="ranking">
            Ranking
          </option>

          <option value="alfabetica">
            A–Z
          </option>

          <option value="pontos">
            Pontos
          </option>
        </select>
      </div>

      {/* CLIENTES */}
      <div className="clientes-grid">
        {lista.map((c, index) => {
          const { cupons, resto } = calc(c.pontos)
          const pct = (resto / 10) * 100

          return (
            <div
              key={c.id}
              className="cliente-card"
              onClick={() => abrirCliente(c)}
            >
              {ordenacao === "ranking" &&
                index < 3 && (
                  <span className="cliente-rank">
                    #{index + 1}
                  </span>
                )}

              <div className="cliente-name">
                {c.nome}
              </div>

              <div className="cliente-muted">
                {c.cidade ||
                  "Cidade não informada"}
              </div>

              <div className="cliente-coupon">
                🎟 {cupons}
              </div>

              <div className="cliente-progress-bg">
                <div
                  className="cliente-progress-fill"
                  style={{
                    width: `${pct}%`
                  }}
                />
              </div>

              <div className="cliente-muted-small">
                {resto}/10 pontos
              </div>
            </div>
          )
        })}

        {lista.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              background: "#fff",
              padding: 30,
              borderRadius: 16,
              textAlign: "center",
              color: "#888"
            }}
          >
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* MODAL */}
      {(selected || creating) && (
        <div
          className="clientes-overlay"
          onClick={fecharModal}
        >
          <div
            className="clientes-modal"
            onClick={e =>
              e.stopPropagation()
            }
          >
            {/* VISUALIZAÇÃO */}
            {selected && !editing && (
              <>
                <div className="clientes-modal-header">
                  <h2 className="clientes-modal-title">
                    {selected.nome}
                  </h2>

                  <button
                    className="clientes-close"
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <Info
                  label="CPF"
                  value={selected.cpf || "-"}
                />

                <Info
                  label="Celular"
                  value={selected.celular || "-"}
                />

                <Info
                  label="Rua"
                  value={selected.rua || "-"}
                />

                <Info
                  label="Cidade"
                  value={selected.cidade || "-"}
                />

                <Info
                  label="Estado"
                  value={selected.estado || "-"}
                />

                <Info
                  label="CEP"
                  value={selected.CEP || "-"}
                />

                <Info
                  label="Complemento"
                  value={
                    selected.Complemento || "-"
                  }
                />

                <Info
                  label="Cliente desde"
                  value={formatarData(
                    selected.criadoEm
                  )}
                />

                <div className="clientes-section-title">
                  Medidas e tamanhos
                </div>

                <Info
                  label="Saia"
                  value={
                    selected.tamanhoSaia || "-"
                  }
                />

                <Info
                  label="Vestido"
                  value={
                    selected.tamanhoVestido || "-"
                  }
                />

                <Info
                  label="Blusa"
                  value={
                    selected.tamanhoBlusa || "-"
                  }
                />

                <Info
                  label="Busto"
                  value={selected.busto || "-"}
                />

                <Info
                  label="Quadril"
                  value={
                    selected.quadril || "-"
                  }
                />

                <Info
                  label="Cintura"
                  value={
                    selected.cintura || "-"
                  }
                />

                <div className="clientes-modal-actions">
                  <button
                    className="clientes-secondary-btn"
                    onClick={() => {
                      setForm(selected)
                      setEditing(true)
                    }}
                  >
                    Editar
                  </button>

                  <button
                    className="clientes-primary-small"
                    onClick={() => {
                      if (
                        irParaCompra &&
                        selected
                      ) {
                        irParaCompra(
                          selected.id,
                          selected.nome
                        )
                      }

                      setSelected(null)
                    }}
                  >
                    Nova compra
                  </button>

                  <button
                    className="clientes-whats-btn"
                    onClick={() =>
                      enviarWhats(selected)
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    className="clientes-secondary-btn"
                    onClick={() =>
                      baixarRelatorio(selected)
                    }
                  >
                    Relatório
                  </button>
                </div>
              </>
            )}

            {/* EDITAR */}
            {selected && editing && (
              <>
                <div className="clientes-modal-header">
                  <h2 className="clientes-modal-title">
                    Editar cliente
                  </h2>

                  <button
                    className="clientes-close"
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <ClienteForm
                  data={form}
                  setData={setForm}
                />

                <div className="clientes-modal-actions">
                  <button
                    className="clientes-secondary-btn"
                    onClick={() =>
                      setEditing(false)
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="clientes-primary-small"
                    onClick={salvarEdicao}
                  >
                    Salvar
                  </button>
                </div>
              </>
            )}

            {/* CRIAR */}
            {creating && (
              <>
                <div className="clientes-modal-header">
                  <h2 className="clientes-modal-title">
                    Novo cliente
                  </h2>

                  <button
                    className="clientes-close"
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <ClienteForm
                  data={novo}
                  setData={setNovo}
                />

                <div className="clientes-create-actions">
                  <button
                    className="clientes-create-btn"
                    onClick={criarCliente}
                  >
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

/* =====================================================
   FORMULÁRIO DE CLIENTE
===================================================== */

function ClienteForm({
  data,
  setData
}: {
  data: Partial<Cliente>
  setData: React.Dispatch<
    React.SetStateAction<Partial<Cliente>>
  >
}) {
  return (
    <>
      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Nome"
        value={data.nome || ""}
        onChange={e =>
          setData({
            ...data,
            nome: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="CPF"
        value={data.cpf || ""}
        onChange={e =>
          setData({
            ...data,
            cpf: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Celular"
        value={data.celular || ""}
        onChange={e =>
          setData({
            ...data,
            celular: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Rua"
        value={data.rua || ""}
        onChange={e =>
          setData({
            ...data,
            rua: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Cidade"
        value={data.cidade || ""}
        onChange={e =>
          setData({
            ...data,
            cidade: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Estado"
        value={data.estado || ""}
        onChange={e =>
          setData({
            ...data,
            estado: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="CEP"
        value={data.CEP || ""}
        onChange={e =>
          setData({
            ...data,
            CEP: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Complemento"
        value={data.Complemento || ""}
        onChange={e =>
          setData({
            ...data,
            Complemento: e.target.value
          })
        }
      />

      <div className="clientes-section-title">
        Medidas e tamanhos
      </div>

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Tamanho saia"
        value={data.tamanhoSaia || ""}
        onChange={e =>
          setData({
            ...data,
            tamanhoSaia: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Tamanho vestido"
        value={data.tamanhoVestido || ""}
        onChange={e =>
          setData({
            ...data,
            tamanhoVestido: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Tamanho blusa"
        value={data.tamanhoBlusa || ""}
        onChange={e =>
          setData({
            ...data,
            tamanhoBlusa: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Busto"
        value={data.busto || ""}
        onChange={e =>
          setData({
            ...data,
            busto: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Quadril"
        value={data.quadril || ""}
        onChange={e =>
          setData({
            ...data,
            quadril: e.target.value
          })
        }
      />

      <input
        className="clientes-input"
        style={{ marginBottom: 12 }}
        placeholder="Cintura"
        value={data.cintura || ""}
        onChange={e =>
          setData({
            ...data,
            cintura: e.target.value
          })
        }
      />
    </>
  )
}

/* =====================================================
   INFO
===================================================== */

function Info({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="clientes-info">
      <span className="clientes-info-label">
        {label}
      </span>

      <div className="clientes-info-value">
        {value}
      </div>
    </div>
  )
}