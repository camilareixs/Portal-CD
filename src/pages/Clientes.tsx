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

  const [editarDados, setEditarDados] = useState(false)
  const [editarMedidas, setEditarMedidas] = useState(false)

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
    setEditarDados(false)
    setEditarMedidas(false)
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
    new Set(clientes.map(c => c.cidade).filter(Boolean))
  )

  const estados = Array.from(
    new Set(clientes.map(c => c.estado).filter(Boolean))
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
      c => !cidadeFiltro || c.cidade === cidadeFiltro
    )
    .filter(
      c => !estadoFiltro || c.estado === estadoFiltro
    )

  function fecharModal() {
    setSelected(null)
    setCreating(false)
    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
  }

  function iniciarEdicaoDados() {
    if (!selected) return

    setForm(selected)
    setEditing(true)
    setEditarDados(true)
    setEditarMedidas(false)
  }

  function iniciarEdicaoMedidas() {
    if (!selected) return

    setForm(selected)
    setEditing(true)
    setEditarDados(false)
    setEditarMedidas(true)
  }

  return (
    <div style={container}>
      <style>{`

        /* =====================================================
           CLIENTES - MOBILE
        ===================================================== */

        .clientes-filtros {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .clientes-busca {
          flex: 2;
          min-width: 220px;
        }

        .clientes-select {
          flex: 1;
          min-width: 140px;
        }

        .clientes-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(240px, 1fr)
          );
          gap: 20px;
        }

        .clientes-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 600px) {

          .clientes-header {
            margin-bottom: 18px !important;
          }

          .clientes-header-title {
            font-size: 28px !important;
          }

          .clientes-header-button {
            padding: 9px 14px !important;
          }

          .clientes-filtros {
            display: grid !important;
            grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
            gap: 8px !important;
            margin-bottom: 22px !important;
            width: 100%;
          }

          .clientes-busca,
          .clientes-select {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }

          .clientes-busca {
            grid-column: 1;
          }

          .clientes-select.cidade {
            grid-column: 2;
          }

          .clientes-select.estado {
            grid-column: 1;
          }

          .clientes-select.ranking {
            grid-column: 2;
          }

          .clientes-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
            gap: 10px !important;
          }

          .cliente-card {
            padding: 14px !important;
            border-radius: 15px !important;
          }

          .cliente-card-name {
            font-size: 14px !important;
          }

          .cliente-card-city {
            font-size: 12px !important;
          }

          .cliente-card-coupon {
            font-size: 13px !important;
            margin: 8px 0 !important;
          }

          .cliente-card-points {
            font-size: 11px !important;
          }

          .cliente-modal-overlay {
            padding: 10px !important;
            align-items: center !important;
          }

          .cliente-modal {
            width: 100% !important;
            max-width: 410px !important;
            max-height: calc(100vh - 20px) !important;
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .cliente-modal-title {
            font-size: 21px !important;
          }

          .cliente-modal-points {
            padding: 12px !important;
            margin-bottom: 16px !important;
          }

          .cliente-modal-actions {
            gap: 8px !important;
          }

          .cliente-modal-actions button {
            padding: 9px 12px !important;
            font-size: 13px !important;
          }

          .cliente-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 14px;
          }

          .cliente-info-full {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 380px) {

          .clientes-grid {
            gap: 8px !important;
          }

          .cliente-card {
            padding: 12px !important;
          }

          .cliente-card-name {
            font-size: 13px !important;
          }

          .cliente-modal {
            padding: 15px !important;
          }

          .cliente-info-grid {
            grid-template-columns: 1fr !important;
          }

          .cliente-info-full {
            grid-column: auto;
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="clientes-header"
        style={header}
      >
        <h1
          className="clientes-header-title"
          style={title}
        >
          Clientes
        </h1>

        <button
          className="clientes-header-button"
          style={primaryBtn}
          onClick={() => {
            setCreating(true)
            setNovo({})
          }}
        >
          + Novo cliente
        </button>
      </div>

      {/* =====================================================
          FILTROS
      ===================================================== */}

      <div
        className="clientes-filtros"
      >
        <input
          className="clientes-busca"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e =>
            setBusca(e.target.value)
          }
          style={input}
        />

        <select
          className="clientes-select cidade"
          value={cidadeFiltro}
          onChange={e =>
            setCidadeFiltro(e.target.value)
          }
          style={select}
        >
          <option value="">Cidades</option>

          {cidades.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className="clientes-select estado"
          value={estadoFiltro}
          onChange={e =>
            setEstadoFiltro(e.target.value)
          }
          style={select}
        >
          <option value="">Estados</option>

          {estados.map(e => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <select
          className="clientes-select ranking"
          value={ordenacao}
          onChange={e =>
            setOrdenacao(e.target.value)
          }
          style={select}
        >
          <option value="ranking">Ranking</option>
          <option value="alfabetica">
            A–Z
          </option>
          <option value="pontos">
            Pontos
          </option>
        </select>
      </div>

      {/* =====================================================
          CLIENTES
      ===================================================== */}

      <div
        className="clientes-grid"
      >
        {lista.map((c, index) => {
          const { cupons, resto } =
            calc(c.pontos)

          const pct =
            (resto / 10) * 100

          return (
            <div
              key={c.id}
              className="cliente-card"
              style={card}
              onClick={() => {
                setSelected(c)
                setForm(c)
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform =
                  "translateY(-4px)"

                e.currentTarget.style.boxShadow =
                  "0 12px 30px rgba(0,0,0,0.08)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform =
                  "translateY(0)"

                e.currentTarget.style.boxShadow =
                  "none"
              }}
            >
              {ordenacao === "ranking" &&
                index < 3 && (
                  <span style={rank}>
                    #{index + 1}
                  </span>
                )}

              <div
                className="cliente-card-name"
                style={name}
              >
                {c.nome}
              </div>

              <div
                className="cliente-card-city"
                style={muted}
              >
                {c.cidade ||
                  "Cidade não informada"}
              </div>

              <div
                className="cliente-card-coupon"
                style={coupon}
              >
                🎟 {cupons}
              </div>

              <div style={progressBg}>
                <div
                  style={{
                    ...progressFill,
                    width: `${pct}%`
                  }}
                />
              </div>

              <div
                className="cliente-card-points"
                style={mutedSmall}
              >
                {resto}/10 pontos
              </div>
            </div>
          )
        })}
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {(selected || creating) && (
        <div
          className="cliente-modal-overlay"
          style={overlay}
          onClick={fecharModal}
        >
          <div
            className="cliente-modal"
            style={modal}
            onClick={e =>
              e.stopPropagation()
            }
          >

            {/* =================================================
                VISUALIZAÇÃO
            ================================================= */}

            {selected && !editing && (
              <>
                <div
                  style={modalHeader}
                >
                  <h2
                    className="cliente-modal-title"
                    style={modalTitle}
                  >
                    {selected.nome}
                  </h2>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                {/* ================================
                    PONTOS
                ================================= */}

                <div
                  className="cliente-modal-points"
                  style={pointsCard}
                >
                  <div
                    style={pointsTop}
                  >
                    <span style={pointsLabel}>
                      Fidelidade
                    </span>

                    <strong
                      style={pointsNumber}
                    >
                      {selected.pontos} pts
                    </strong>
                  </div>

                  <div
                    style={progressBgLarge}
                  >
                    <div
                      style={{
                        ...progressFill,
                        width: `${
                          (calc(
                            selected.pontos
                          ).resto /
                            10) *
                          100
                        }%`
                      }}
                    />
                  </div>

                  <div
                    style={pointsBottom}
                  >
                    <span>
                      🎟{" "}
                      {
                        calc(
                          selected.pontos
                        ).cupons
                      }{" "}
                      cupom(ns)
                    </span>

                    <span>
                      {
                        calc(
                          selected.pontos
                        ).resto
                      }
                      /10 para o próximo
                    </span>
                  </div>
                </div>

                {/* ================================
                    DADOS PESSOAIS
                ================================= */}

                <div
                  style={sectionHeader}
                >
                  <span>
                    Dados pessoais
                  </span>

                  <button
                    style={editIcon}
                    onClick={
                      iniciarEdicaoDados
                    }
                    aria-label="Editar dados pessoais"
                  >
                    ✎
                  </button>
                </div>

                <div
                  className="cliente-info-grid"
                >
                  <Info
                    label="CPF"
                    value={
                      selected.cpf || "-"
                    }
                  />

                  <Info
                    label="Celular"
                    value={
                      selected.celular || "-"
                    }
                  />

                  <Info
                    label="Cidade"
                    value={
                      selected.cidade || "-"
                    }
                  />

                  <Info
                    label="Estado"
                    value={
                      selected.estado || "-"
                    }
                  />

                  <div className="cliente-info-full">
                    <Info
                      label="Rua"
                      value={
                        selected.rua || "-"
                      }
                    />
                  </div>

                  <Info
                    label="Cliente desde"
                    value={formatarData(
                      selected.criadoEm
                    )}
                  />
                </div>

                {/* ================================
                    MEDIDAS
                ================================= */}

                <div
                  style={{
                    ...sectionHeader,
                    marginTop: 18
                  }}
                >
                  <span>
                    Medidas e tamanhos
                  </span>

                  <button
                    style={editIcon}
                    onClick={
                      iniciarEdicaoMedidas
                    }
                    aria-label="Editar medidas e tamanhos"
                  >
                    ✎
                  </button>
                </div>

                <div
                  className="cliente-info-grid"
                >
                  <Info
                    label="Saia"
                    value={
                      selected.tamanhoSaia ||
                      "-"
                    }
                  />

                  <Info
                    label="Vestido"
                    value={
                      selected.tamanhoVestido ||
                      "-"
                    }
                  />

                  <Info
                    label="Blusa"
                    value={
                      selected.tamanhoBlusa ||
                      "-"
                    }
                  />

                  <Info
                    label="Busto"
                    value={
                      selected.busto || "-"
                    }
                  />

                  <Info
                    label="Quadril"
                    value={
                      selected.quadril ||
                      "-"
                    }
                  />
                </div>

                {/* ================================
                    AÇÕES
                ================================= */}

                <div
                  className="clientes-modal-actions"
                >
                  <button
                    style={secondaryBtn}
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
                    style={whatsBtn}
                    onClick={() =>
                      enviarWhats(
                        selected
                      )
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    style={secondaryBtn}
                    onClick={() =>
                      baixarRelatorio(
                        selected
                      )
                    }
                  >
                    Relatório
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                EDITAR
            ================================================= */}

            {selected && editing && (
              <>
                <div
                  style={modalHeader}
                >
                  <h2
                    className="cliente-modal-title"
                    style={modalTitle}
                  >
                    Editar cliente
                  </h2>

                  <button
                    style={closeBtn}
                    onClick={() => {
                      setEditing(false)
                      setEditarDados(false)
                      setEditarMedidas(false)
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* DADOS PESSOAIS */}

                {editarDados && (
                  <>
                    <div
                      style={editSectionLabel}
                    >
                      Dados pessoais
                    </div>

                    <input
                      style={inputSpacing}
                      placeholder="Nome"
                      value={
                        form.nome || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          nome: e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="CPF"
                      value={
                        form.cpf || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          cpf: e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Celular"
                      value={
                        form.celular || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          celular:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Rua"
                      value={
                        form.rua || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          rua: e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Cidade"
                      value={
                        form.cidade || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          cidade:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Estado"
                      value={
                        form.estado || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          estado:
                            e.target.value
                        })
                      }
                    />
                  </>
                )}

                {/* MEDIDAS */}

                {editarMedidas && (
                  <>
                    <div
                      style={editSectionLabel}
                    >
                      Medidas e tamanhos
                    </div>

                    <input
                      style={inputSpacing}
                      placeholder="Tamanho saia"
                      value={
                        form.tamanhoSaia ||
                        ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          tamanhoSaia:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Tamanho vestido"
                      value={
                        form.tamanhoVestido ||
                        ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          tamanhoVestido:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Tamanho blusa"
                      value={
                        form.tamanhoBlusa ||
                        ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          tamanhoBlusa:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Busto"
                      value={
                        form.busto || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          busto:
                            e.target.value
                        })
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Quadril"
                      value={
                        form.quadril || ""
                      }
                      onChange={e =>
                        setForm({
                          ...form,
                          quadril:
                            e.target.value
                        })
                      }
                    />
                  </>
                )}

                <div
                  className="clientes-modal-actions"
                >
                  <button
                    style={secondaryBtn}
                    onClick={() => {
                      setEditing(false)
                      setEditarDados(false)
                      setEditarMedidas(false)
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    style={primaryBtnSmall}
                    onClick={
                      salvarEdicao
                    }
                  >
                    Salvar
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                CRIAR CLIENTE
            ================================================= */}

            {creating && (
              <>
                <div
                  style={modalHeader}
                >
                  <h2
                    className="cliente-modal-title"
                    style={modalTitle}
                  >
                    Novo cliente
                  </h2>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <input
                  style={inputSpacing}
                  placeholder="Nome"
                  value={
                    novo.nome || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      nome: e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="CPF"
                  value={
                    novo.cpf || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      cpf: e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Celular"
                  value={
                    novo.celular || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      celular:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Rua"
                  value={
                    novo.rua || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      rua: e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Cidade"
                  value={
                    novo.cidade || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      cidade:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Estado"
                  value={
                    novo.estado || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      estado:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Tamanho saia"
                  value={
                    novo.tamanhoSaia ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoSaia:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Tamanho vestido"
                  value={
                    novo.tamanhoVestido ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoVestido:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Tamanho blusa"
                  value={
                    novo.tamanhoBlusa ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoBlusa:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Busto"
                  value={
                    novo.busto || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      busto:
                        e.target.value
                    })
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Quadril"
                  value={
                    novo.quadril || ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      quadril:
                        e.target.value
                    })
                  }
                />

                <div
                  style={createActions}
                >
                  <button
                    style={primaryBtnCreate}
                    onClick={
                      criarCliente
                    }
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

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div style={info}>
      <span style={mutedSmall}>
        {label}
      </span>

      <div style={infoValue}>
        {value}
      </div>
    </div>
  )
}

/* =========================================================
   CONTAINER
========================================================= */

const container = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#f6f6f7",
  fontFamily: "Inter, sans-serif"
}

/* =========================================================
   HEADER
========================================================= */

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 28,
  flexWrap: "wrap" as const
}

const title = {
  fontSize: 32,
  fontWeight: 500,
  margin: 0
}

/* =========================================================
   BOTÃO NOVO CLIENTE
========================================================= */

const primaryBtn = {
  padding: "10px 18px",
  borderRadius: 14,
  border: "1px solid #d4af37",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4a12",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 5px 14px rgba(212,175,55,0.22)",
  whiteSpace: "nowrap" as const
}

const secondaryBtn = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

const primaryBtnSmall = {
  padding: "10px 16px",
  borderRadius: 12,
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4a12",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

const primaryBtnCreate = {
  padding: "12px 24px",
  borderRadius: 14,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4a12",
  fontWeight: 600,
  boxShadow:
    "0 8px 20px rgba(212,175,55,0.25)",
  cursor: "pointer"
}

const whatsBtn = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e6e0c9",
  background: "#fffbe6",
  color: "#80651d",
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

/* =========================================================
   FILTROS
========================================================= */

const input = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e5e5e5",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#fff",
  outline: "none"
}

const inputSpacing = {
  ...input,
  marginBottom: 12
}

const select = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #e5e5e5",
  flex: 1,
  minWidth: 140,
  background: "#fff",
  boxSizing: "border-box" as const
}

/* =========================================================
   GRID DOS CLIENTES
========================================================= */

const card = {
  background: "#fff",
  padding: 18,
  borderRadius: 18,
  border: "1px solid #eee",
  cursor: "pointer",
  transition: "0.25s",
  position: "relative" as const,
  minWidth: 0,
  boxSizing: "border-box" as const
}

const rank = {
  position: "absolute" as const,
  top: 12,
  right: 12,
  color: "#b8962e",
  fontSize: 13,
  fontWeight: 600
}

const name = {
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  paddingRight: 35
}

const muted = {
  color: "#888"
}

const mutedSmall = {
  fontSize: 12,
  color: "#999"
}

const coupon = {
  margin: "10px 0",
  color: "#b8962e"
}

const progressBg = {
  height: 6,
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

/* =========================================================
   MODAL
========================================================= */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box" as const,
  zIndex: 2000
}

const modal = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  width: "100%",
  maxWidth: 430,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto" as const,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.12)",
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 16
}

const modalTitle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 500
}

const closeBtn = {
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 50,
  border: "1px solid #eee",
  background: "#fafafa",
  color: "#777",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer"
}

/* =========================================================
   PONTOS NO POPUP
========================================================= */

const pointsCard = {
  background: "#fcfbf7",
  border: "1px solid #f1ead7",
  borderRadius: 14,
  padding: 14,
  marginBottom: 18
}

const pointsTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 9
}

const pointsLabel = {
  fontSize: 13,
  color: "#777"
}

const pointsNumber = {
  fontSize: 18,
  color: "#b8962e"
}

const progressBgLarge = {
  height: 8,
  background: "#eee",
  borderRadius: 999,
  overflow: "hidden" as const
}

const pointsBottom = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 8,
  fontSize: 11,
  color: "#888"
}

/* =========================================================
   TÍTULOS DAS SEÇÕES DO POPUP
========================================================= */

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 14,
  fontWeight: 600,
  color: "#b8962e",
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: "1px solid #eee"
}

const editIcon = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #eadfbf",
  background: "#fffbe6",
  color: "#a88320",
  cursor: "pointer",
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}

const editSectionLabel = {
  fontSize: 14,
  fontWeight: 600,
  color: "#b8962e",
  marginBottom: 14
}

/* =========================================================
   INFORMAÇÕES
========================================================= */

const info = {
  marginBottom: 12,
  minWidth: 0
}

const infoValue = {
  marginTop: 2,
  wordBreak: "break-word" as const,
  fontSize: 14
}

/* =========================================================
   AÇÕES DO MODAL
========================================================= */

const createActions = {
  display: "flex",
  justifyContent: "center",
  marginTop: 8
}