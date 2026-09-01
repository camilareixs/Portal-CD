import { useEffect, useMemo, useState } from "react"
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
  CEP: string
  Complemento: string
  cintura: string
  "Data de Nascimento": string
  criadoEm: string

  tamanhoSaia: string
  tamanhoVestido: string
  tamanhoBlusa: string
  busto: string
  quadril: string
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

type FormCliente = Partial<Cliente>

export default function Clientes({
  irParaCompra
}: {
  irParaCompra?: (clienteId: string, clienteNome: string) => void
}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])

  const [busca, setBusca] = useState("")
  const [cidadeFiltro, setCidadeFiltro] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [ordenacao, setOrdenacao] = useState("ranking")

  const [selected, setSelected] = useState<Cliente | null>(null)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editarDados, setEditarDados] = useState(false)
  const [editarMedidas, setEditarMedidas] = useState(false)

  const [mostrarRelatorio, setMostrarRelatorio] = useState(false)

  const [form, setForm] = useState<FormCliente>({})
  const [novo, setNovo] = useState<FormCliente>({})

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("pontos", { ascending: false })

    if (error) {
      console.error("Erro ao buscar clientes:", error)
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
        CEP: c.CEP || "",
        Complemento: c.Complemento || "",
        cintura: c.cintura || "",
        "Data de Nascimento": c["Data de Nascimento"] || "",
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
      console.error("Erro compras:", error)
      return
    }

    if (data) {
      const comprasFormatadas: Compra[] = data.map((c: any) => ({
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

      setCompras(comprasFormatadas)
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
        nome: form.nome || "",
        cpf: form.cpf || "",
        celular: form.celular || "",
        rua: form.rua || "",
        CEP: form.CEP || "",
        Complemento: form.Complemento || "",
        cidade: form.cidade || "",
        estado: form.estado || "",
        "Data de Nascimento": form["Data de Nascimento"] || "",

        tamanhoSaia: form.tamanhoSaia || "",
        tamanhoVestido: form.tamanhoVestido || "",
        tamanhoBlusa: form.tamanhoBlusa || "",
        busto: form.busto || "",
        cintura: form.cintura || "",
        quadril: form.quadril || ""
      })
      .eq("id", selected.id)

    if (error) {
      console.error("Erro ao editar:", error)
      alert("Erro ao editar cliente: " + error.message)
      return
    }

    alert("Cliente atualizado com sucesso!")

    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
    setSelected(null)
    setForm({})

    await fetchClientes()
  }

  async function criarCliente() {
    if (!novo.nome?.trim()) {
      alert("Preencha o nome do cliente.")
      return
    }

    const { error } = await supabase
      .from("clientes")
      .insert([
        {
          nome: novo.nome || "",
          cpf: novo.cpf || "",
          celular: novo.celular || "",

          rua: novo.rua || "",
          CEP: novo.CEP || "",
          Complemento: novo.Complemento || "",
          cidade: novo.cidade || "",
          estado: novo.estado || "",

          "Data de Nascimento":
            novo["Data de Nascimento"] || "",

          pontos: 0,

          criadoEm: new Date().toISOString(),

          tamanhoSaia: novo.tamanhoSaia || "",
          tamanhoVestido: novo.tamanhoVestido || "",
          tamanhoBlusa: novo.tamanhoBlusa || "",
          busto: novo.busto || "",
          cintura: novo.cintura || "",
          quadril: novo.quadril || ""
        }
      ])

    if (error) {
      console.error("Erro ao criar:", error)
      alert("Erro ao criar cliente: " + error.message)
      return
    }

    alert("Cliente criado com sucesso!")

    setCreating(false)
    setNovo({})

    await fetchClientes()
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
      return data
    }

    return dataObj.toLocaleDateString("pt-BR")
  }

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }

  function gerarMensagem(cliente: Cliente) {
    const { cupons, resto } = calc(cliente.pontos)

    return `Olá ${cliente.nome}!

Você possui:
${cupons} cupom(ns)
${resto}/10 pontos para o próximo

Te esperamos!`
  }

  function enviarWhats(cliente: Cliente) {
    const numero = "55" + cliente.celular.replace(/\D/g, "")

    if (numero.length < 12) {
      alert("O celular deste cliente não está preenchido corretamente.")
      return
    }

    const mensagem = encodeURIComponent(
      gerarMensagem(cliente)
    )

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank"
    )
  }

  const comprasDoCliente = useMemo(() => {
    if (!selected) return []

    return compras
      .filter(c => c.clienteid === selected.id)
      .sort(
        (a, b) =>
          new Date(b.criadoem).getTime() -
          new Date(a.criadoem).getTime()
      )
  }, [compras, selected])

  const resumoRelatorio = useMemo(() => {
    const totalGasto = comprasDoCliente.reduce(
      (total, compra) => total + compra.valor,
      0
    )

    const totalCompras = comprasDoCliente.length

    const ticketMedio =
      totalCompras > 0
        ? totalGasto / totalCompras
        : 0

    const cuponsUsados = comprasDoCliente.reduce(
      (total, compra) => total + compra.cupomusado,
      0
    )

    const pontosGerados = comprasDoCliente.reduce(
      (total, compra) => total + compra.pontosgerados,
      0
    )

    const ultimaCompra =
      comprasDoCliente.length > 0
        ? formatarData(comprasDoCliente[0].criadoem)
        : "Nenhuma"

    return {
      totalGasto,
      totalCompras,
      ticketMedio,
      cuponsUsados,
      pontosGerados,
      ultimaCompra
    }
  }, [comprasDoCliente])

  function gerarTextoRelatorio(cliente: Cliente) {
    const resumo = resumoRelatorio

    return `RELATÓRIO CAMI&DUDA

CLIENTE
Nome: ${cliente.nome}
CPF: ${cliente.cpf || "-"}
Celular: ${cliente.celular || "-"}
Data de nascimento: ${
      cliente["Data de Nascimento"]
        ? formatarData(cliente["Data de Nascimento"])
        : "-"
    }

ENDEREÇO
Rua: ${cliente.rua || "-"}
CEP: ${cliente.CEP || "-"}
Complemento: ${cliente.Complemento || "-"}
Cidade: ${cliente.cidade || "-"}
Estado: ${cliente.estado || "-"}

FIDELIDADE
Pontos atuais: ${cliente.pontos}
Cupons disponíveis: ${calc(cliente.pontos).cupons}
Pontos para próximo cupom: ${calc(cliente.pontos).resto}/10

Cliente desde: ${formatarData(cliente.criadoEm)}

RESUMO DE COMPRAS
Total gasto: ${formatarMoeda(resumo.totalGasto)}
Compras realizadas: ${resumo.totalCompras}
Ticket médio: ${formatarMoeda(resumo.ticketMedio)}
Última compra: ${resumo.ultimaCompra}
Cupons utilizados: ${resumo.cuponsUsados}
Pontos gerados: ${resumo.pontosGerados}

HISTÓRICO DE COMPRAS

${
  comprasDoCliente.length > 0
    ? comprasDoCliente
        .map(
          compra =>
            `${formatarData(
              compra.criadoem
            )} | ${formatarMoeda(
              compra.valor
            )} | ${
              compra.pagamento || "-"
            } | ${compra.pontosgerados} ponto(s)`
        )
        .join("\n")
    : "Nenhuma compra registrada."
}
`
  }

  function baixarRelatorio(cliente: Cliente) {
    const conteudo = gerarTextoRelatorio(cliente)

    const blob = new Blob([conteudo], {
      type: "text/plain;charset=utf-8"
    })

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${cliente.nome
      .replace(/\s+/g, "-")
      .toLowerCase()}.txt`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }

  const cidades = Array.from(
    new Set(
      clientes
        .map(c => c.cidade)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const estados = Array.from(
    new Set(
      clientes
        .map(c => c.estado)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  let lista = [...clientes]

  if (
    ordenacao === "ranking" ||
    ordenacao === "pontos"
  ) {
    lista.sort(
      (a, b) => b.pontos - a.pontos
    )
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
    setEditarDados(false)
    setEditarMedidas(false)
    setMostrarRelatorio(false)
    setForm({})
    setNovo({})
  }

  function iniciarEdicaoDados() {
    if (!selected) return

    setForm({ ...selected })
    setEditing(true)
    setEditarDados(true)
    setEditarMedidas(false)
  }

  function iniciarEdicaoMedidas() {
    if (!selected) return

    setForm({ ...selected })
    setEditing(true)
    setEditarDados(false)
    setEditarMedidas(true)
  }

  function abrirRelatorio() {
    if (!selected) return

    setMostrarRelatorio(true)
  }

  return (
    <div style={container}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .clientes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .clientes-filtros {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(130px, 1fr));
          gap: 12px;
          margin-bottom: 30px;
        }

        .clientes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 18px;
        }

        .cliente-card {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .cliente-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 35px rgba(40, 32, 15, 0.08);
          border-color: #eadfbf !important;
        }

        .cliente-modal-actions {
          display: flex;
          gap: 9px;
          margin-top: 20px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-full {
          grid-column: 1 / -1;
        }

        .relatorio-resumo {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 18px 0;
        }

        .relatorio-card {
          padding: 13px;
          border-radius: 13px;
          background: #faf9f5;
          border: 1px solid #eee8d8;
        }

        .relatorio-historico {
          border-top: 1px solid #eee;
          margin-top: 18px;
          padding-top: 16px;
        }

        .relatorio-compra {
          display: grid;
          grid-template-columns: 90px 1fr 100px;
          gap: 10px;
          padding: 11px 0;
          border-bottom: 1px solid #f0f0f0;
          align-items: center;
          font-size: 13px;
        }

        @media (max-width: 850px) {
          .clientes-filtros {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .clientes-header {
            margin-bottom: 20px !important;
          }

          .clientes-header-title {
            font-size: 28px !important;
          }

          .clientes-header-button {
            padding: 10px 14px !important;
          }

          .clientes-filtros {
            grid-template-columns: 1.35fr 1fr !important;
            gap: 8px !important;
            margin-bottom: 22px !important;
          }

          .clientes-busca {
            grid-column: 1 / -1;
          }

          .clientes-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .cliente-card {
            padding: 14px !important;
            border-radius: 15px !important;
          }

          .cliente-card-name {
            font-size: 14px !important;
          }

          .cliente-card-city {
            font-size: 11px !important;
          }

          .cliente-modal-overlay {
            padding: 10px !important;
          }

          .cliente-modal {
            width: 100% !important;
            max-width: 430px !important;
            max-height: calc(100vh - 20px) !important;
            padding: 18px !important;
            border-radius: 20px !important;
          }

          .cliente-modal-title {
            font-size: 21px !important;
          }

          .cliente-info-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 4px 14px;
          }

          .cliente-info-full {
            grid-column: 1 / -1;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-full {
            grid-column: auto;
          }

          .relatorio-resumo {
            grid-template-columns: 1fr 1fr;
          }

          .relatorio-compra {
            grid-template-columns: 75px 1fr;
          }

          .relatorio-compra strong {
            grid-column: 2;
          }

          .clientes-modal-actions {
            justify-content: center;
          }

          .clientes-modal-actions button {
            flex: 1;
            min-width: 100px;
          }
        }

        @media (max-width: 380px) {
          .clientes-grid {
            gap: 8px;
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

          .relatorio-resumo {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* HEADER */}

      <div
        className="clientes-header"
        style={header}
      >
        <div>
          <h1
            className="clientes-header-title"
            style={title}
          >
            Clientes
          </h1>

          <p style={subtitle}>
            Gestão de clientes e fidelidade
          </p>
        </div>

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

      {/* FILTROS */}

      <div className="clientes-filtros">
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
          value={cidadeFiltro}
          onChange={e =>
            setCidadeFiltro(e.target.value)
          }
          style={select}
        >
          <option value="">Todas as cidades</option>

          {cidades.map(cidade => (
            <option
              key={cidade}
              value={cidade}
            >
              {cidade}
            </option>
          ))}
        </select>

        <select
          value={estadoFiltro}
          onChange={e =>
            setEstadoFiltro(e.target.value)
          }
          style={select}
        >
          <option value="">Todos os estados</option>

          {estados.map(estado => (
            <option
              key={estado}
              value={estado}
            >
              {estado}
            </option>
          ))}
        </select>

        <select
          value={ordenacao}
          onChange={e =>
            setOrdenacao(e.target.value)
          }
          style={select}
        >
          <option value="ranking">
            Mais pontos
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
        {lista.map((cliente, index) => {
          const { cupons, resto } =
            calc(cliente.pontos)

          const porcentagem =
            (resto / 10) * 100

          return (
            <div
              key={cliente.id}
              className="cliente-card"
              style={card}
              onClick={() => {
                setSelected(cliente)
                setForm({ ...cliente })
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
                {cliente.nome}
              </div>

              <div
                className="cliente-card-city"
                style={muted}
              >
                {cliente.cidade ||
                  "Cidade não informada"}
                {cliente.estado
                  ? ` · ${cliente.estado}`
                  : ""}
              </div>

              <div style={coupon}>
                {cupons} cupom(ns)
              </div>

              <div style={progressBg}>
                <div
                  style={{
                    ...progressFill,
                    width: `${porcentagem}%`
                  }}
                />
              </div>

              <div style={mutedSmall}>
                {resto}/10 pontos
              </div>
            </div>
          )
        })}
      </div>

      {lista.length === 0 && (
        <div style={emptyState}>
          <strong>
            Nenhum cliente encontrado
          </strong>

          <span>
            Tente alterar os filtros ou cadastrar
            um novo cliente.
          </span>
        </div>
      )}

      {/* MODAL PRINCIPAL */}

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
            {/* VISUALIZAÇÃO */}

            {selected &&
              !editing &&
              !mostrarRelatorio && (
                <>
                  <div style={modalHeader}>
                    <div>
                      <h2
                        className="cliente-modal-title"
                        style={modalTitle}
                      >
                        {selected.nome}
                      </h2>

                      <span style={modalSubtitle}>
                        Perfil do cliente
                      </span>
                    </div>

                    <button
                      style={closeBtn}
                      onClick={fecharModal}
                    >
                      ×
                    </button>
                  </div>

                  {/* FIDELIDADE */}

                  <div
                    style={pointsCard}
                  >
                    <div style={pointsTop}>
                      <span
                        style={pointsLabel}
                      >
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

                  {/* DADOS PESSOAIS */}

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
                    >
                      Editar
                    </button>
                  </div>

                  <div className="cliente-info-grid">
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
                      label="Data de nascimento"
                      value={
                        selected[
                          "Data de Nascimento"
                        ]
                          ? formatarData(
                              selected[
                                "Data de Nascimento"
                              ]
                            )
                          : "-"
                      }
                    />

                    <Info
                      label="CEP"
                      value={
                        selected.CEP || "-"
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

                    <div className="cliente-info-full">
                      <Info
                        label="Complemento"
                        value={
                          selected.Complemento ||
                          "-"
                        }
                      />
                    </div>

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

                    <Info
                      label="Cliente desde"
                      value={formatarData(
                        selected.criadoEm
                      )}
                    />
                  </div>

                  {/* MEDIDAS */}

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
                    >
                      Editar
                    </button>
                  </div>

                  <div className="cliente-info-grid">
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
                      label="Cintura"
                      value={
                        selected.cintura || "-"
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

                  {/* AÇÕES */}

                  <div className="clientes-modal-actions">
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
                      onClick={
                        abrirRelatorio
                      }
                    >
                      Relatório
                    </button>
                  </div>
                </>
              )}

            {/* RELATÓRIO */}

            {selected &&
              mostrarRelatorio && (
                <>
                  <div style={modalHeader}>
                    <div>
                      <h2
                        className="cliente-modal-title"
                        style={modalTitle}
                      >
                        Relatório
                      </h2>

                      <span
                        style={modalSubtitle}
                      >
                        {selected.nome}
                      </span>
                    </div>

                    <button
                      style={closeBtn}
                      onClick={() =>
                        setMostrarRelatorio(
                          false
                        )
                      }
                    >
                      ×
                    </button>
                  </div>

                  <div
                    style={reportIntro}
                  >
                    <strong>
                      Resumo do cliente
                    </strong>

                    <span>
                      Informações de compras,
                      fidelidade e histórico.
                    </span>
                  </div>

                  <div className="relatorio-resumo">
                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Total gasto
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {formatarMoeda(
                          resumoRelatorio.totalGasto
                        )}
                      </strong>
                    </div>

                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Compras
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {
                          resumoRelatorio.totalCompras
                        }
                      </strong>
                    </div>

                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Ticket médio
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {formatarMoeda(
                          resumoRelatorio.ticketMedio
                        )}
                      </strong>
                    </div>

                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Pontos gerados
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {
                          resumoRelatorio.pontosGerados
                        }
                      </strong>
                    </div>

                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Cupons utilizados
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {
                          resumoRelatorio.cuponsUsados
                        }
                      </strong>
                    </div>

                    <div className="relatorio-card">
                      <span style={reportLabel}>
                        Última compra
                      </span>

                      <strong
                        style={reportValue}
                      >
                        {
                          resumoRelatorio.ultimaCompra
                        }
                      </strong>
                    </div>
                  </div>

                  <div
                    className="relatorio-historico"
                  >
                    <div
                      style={
                        reportSectionTitle
                      }
                    >
                      Histórico de compras
                    </div>

                    {comprasDoCliente.length ===
                    0 ? (
                      <div
                        style={
                          reportEmpty
                        }
                      >
                        Nenhuma compra registrada
                        para este cliente.
                      </div>
                    ) : (
                      comprasDoCliente.map(
                        compra => (
                          <div
                            className="relatorio-compra"
                            key={compra.id}
                          >
                            <span
                              style={
                                reportDate
                              }
                            >
                              {formatarData(
                                compra.criadoem
                              )}
                            </span>

                            <div>
                              <strong>
                                {formatarMoeda(
                                  compra.valor
                                )}
                              </strong>

                              <div
                                style={
                                  reportPayment
                                }
                              >
                                {compra.pagamento ||
                                  "Pagamento não informado"}

                                {compra.parcelas >
                                  1
                                  ? ` · ${compra.parcelas}x`
                                  : ""}
                              </div>
                            </div>

                            <strong
                              style={
                                reportPoints
                              }
                            >
                              +
                              {
                                compra.pontosgerados
                              }{" "}
                              pts
                            </strong>
                          </div>
                        )
                      )
                    )}
                  </div>

                  <div
                    className="clientes-modal-actions"
                  >
                    <button
                      style={secondaryBtn}
                      onClick={() =>
                        setMostrarRelatorio(
                          false
                        )
                      }
                    >
                      Voltar
                    </button>

                    <button
                      style={primaryBtnSmall}
                      onClick={() =>
                        baixarRelatorio(
                          selected
                        )
                      }
                    >
                      Baixar relatório
                    </button>
                  </div>
                </>
              )}

            {/* EDITAR */}

            {selected &&
              editing && (
                <>
                  <div style={modalHeader}>
                    <div>
                      <h2
                        className="cliente-modal-title"
                        style={modalTitle}
                      >
                        Editar cliente
                      </h2>

                      <span
                        style={modalSubtitle}
                      >
                        Atualize as informações
                      </span>
                    </div>

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

                  {/* DADOS */}

                  {editarDados && (
                    <>
                      <div
                        style={
                          editSectionLabel
                        }
                      >
                        Dados pessoais
                      </div>

                      <div className="form-grid">
                        <input
                          style={inputSpacing}
                          className="form-full"
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
                          type="date"
                          value={
                            form[
                              "Data de Nascimento"
                            ]
                              ? form[
                                  "Data de Nascimento"
                                ]!.substring(0, 10)
                              : ""
                          }
                          onChange={e =>
                            setForm({
                              ...form,
                              "Data de Nascimento":
                                e.target.value
                            })
                          }
                        />

                        <input
                          style={inputSpacing}
                          placeholder="CEP"
                          value={
                            form.CEP || ""
                          }
                          onChange={e =>
                            setForm({
                              ...form,
                              CEP: e.target.value
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
                          placeholder="Complemento"
                          value={
                            form.Complemento || ""
                          }
                          onChange={e =>
                            setForm({
                              ...form,
                              Complemento:
                                e.target.value
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
                      </div>
                    </>
                  )}

                  {/* MEDIDAS */}

                  {editarMedidas && (
                    <>
                      <div
                        style={
                          editSectionLabel
                        }
                      >
                        Medidas e tamanhos
                      </div>

                      <div className="form-grid">
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
                          placeholder="Cintura"
                          value={
                            form.cintura || ""
                          }
                          onChange={e =>
                            setForm({
                              ...form,
                              cintura:
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
                      </div>
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
                      Salvar alterações
                    </button>
                  </div>
                </>
              )}

            {/* CRIAR */}

            {creating && (
              <>
                <div style={modalHeader}>
                  <div>
                    <h2
                      className="cliente-modal-title"
                      style={modalTitle}
                    >
                      Novo cliente
                    </h2>

                    <span
                      style={modalSubtitle}
                    >
                      Cadastre os dados da cliente
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={
                    editSectionLabel
                  }
                >
                  Dados pessoais
                </div>

                <div className="form-grid">
                  <input
                    style={inputSpacing}
                    className="form-full"
                    placeholder="Nome completo"
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
                    type="date"
                    value={
                      novo[
                        "Data de Nascimento"
                      ] || ""
                    }
                    onChange={e =>
                      setNovo({
                        ...novo,
                        "Data de Nascimento":
                          e.target.value
                      })
                    }
                  />

                  <input
                    style={inputSpacing}
                    placeholder="CEP"
                    value={
                      novo.CEP || ""
                    }
                    onChange={e =>
                      setNovo({
                        ...novo,
                        CEP: e.target.value
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
                    placeholder="Complemento"
                    value={
                      novo.Complemento || ""
                    }
                    onChange={e =>
                      setNovo({
                        ...novo,
                        Complemento:
                          e.target.value
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
                </div>

                <div
                  style={{
                    ...editSectionLabel,
                    marginTop: 8
                  }}
                >
                  Medidas e tamanhos
                </div>

                <div className="form-grid">
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
                    placeholder="Cintura"
                    value={
                      novo.cintura || ""
                    }
                    onChange={e =>
                      setNovo({
                        ...novo,
                        cintura:
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
                </div>

                <div
                  style={fidelidadeInfo}
                >
                  A cliente começará com
                  <strong> 0 pontos</strong>.
                  Os pontos serão gerados
                  automaticamente pelas compras.
                </div>

                <div
                  style={createActions}
                >
                  <button
                    style={secondaryBtn}
                    onClick={fecharModal}
                  >
                    Cancelar
                  </button>

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
   COMPONENTE INFO
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
   ESTILOS
========================================================= */

const container = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#f8f7f3",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#292722"
}

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
  margin: 0,
  letterSpacing: "-0.5px"
}

const subtitle = {
  margin: "5px 0 0",
  color: "#99958b",
  fontSize: 13
}

/* BOTÕES */

const primaryBtn = {
  padding: "11px 19px",
  borderRadius: 13,
  border: "1px solid #caa94a",
  background:
    "linear-gradient(135deg, #d7b95c, #f1d982)",
  color: "#514218",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 7px 20px rgba(191,157,59,0.18)",
  whiteSpace: "nowrap" as const
}

const primaryBtnSmall = {
  padding: "10px 16px",
  borderRadius: 11,
  border: "1px solid #caa94a",
  background:
    "linear-gradient(135deg, #d7b95c, #f1d982)",
  color: "#514218",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

const primaryBtnCreate = {
  padding: "11px 20px",
  borderRadius: 12,
  border: "1px solid #caa94a",
  background:
    "linear-gradient(135deg, #d7b95c, #f1d982)",
  color: "#514218",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 7px 20px rgba(191,157,59,0.18)",
  whiteSpace: "nowrap" as const
}

const secondaryBtn = {
  padding: "10px 15px",
  borderRadius: 11,
  border: "1px solid #e4e1d9",
  background: "#fff",
  color: "#4c4942",
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

const whatsBtn = {
  padding: "10px 15px",
  borderRadius: 11,
  border: "1px solid #e5dfc7",
  background: "#fffdf3",
  color: "#806b27",
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

/* INPUTS */

const input = {
  padding: "12px 13px",
  borderRadius: 12,
  border: "1px solid #e2dfd8",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#fff",
  color: "#292722",
  outline: "none"
}

const inputSpacing = {
  ...input,
  marginBottom: 0
}

const select = {
  padding: "12px 13px",
  borderRadius: 12,
  border: "1px solid #e2dfd8",
  width: "100%",
  minWidth: 0,
  background: "#fff",
  color: "#555148",
  boxSizing: "border-box" as const,
  outline: "none"
}

/* CARDS */

const card = {
  background: "#fff",
  padding: 18,
  borderRadius: 17,
  border: "1px solid #ece9e1",
  cursor: "pointer",
  transition: "0.25s",
  position: "relative" as const,
  minWidth: 0,
  boxSizing: "border-box" as const
}

const rank = {
  position: "absolute" as const,
  top: 12,
  right: 13,
  color: "#ad8b2e",
  fontSize: 12,
  fontWeight: 600
}

const name = {
  fontWeight: 600,
  color: "#302e29",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  paddingRight: 35
}

const muted = {
  color: "#96928a",
  marginTop: 4
}

const mutedSmall = {
  fontSize: 11,
  color: "#99958c",
  marginTop: 6
}

const coupon = {
  margin: "13px 0 9px",
  color: "#a98627",
  fontSize: 13,
  fontWeight: 500
}

const progressBg = {
  height: 5,
  background: "#eeece6",
  borderRadius: 999,
  overflow: "hidden" as const
}

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg, #c7a43e, #ead276)",
  borderRadius: 999,
  transition: "width 0.3s ease"
}

/* MODAL */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(35,31,20,0.34)",
  backdropFilter: "blur(3px)",
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
  borderRadius: 20,
  width: "100%",
  maxWidth: 500,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto" as const,
  boxShadow:
    "0 25px 70px rgba(35,31,20,0.18)",
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 18
}

const modalTitle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 500,
  color: "#2e2c27",
  letterSpacing: "-0.3px"
}

const modalSubtitle = {
  display: "block",
  marginTop: 3,
  color: "#aaa69c",
  fontSize: 12
}

const closeBtn = {
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 50,
  border: "1px solid #e8e5dd",
  background: "#faf9f6",
  color: "#77736a",
  fontSize: 23,
  lineHeight: 1,
  cursor: "pointer"
}

/* PONTOS */

const pointsCard = {
  background:
    "linear-gradient(135deg, #fcfaf2, #fffdf8)",
  border: "1px solid #eee5cc",
  borderRadius: 15,
  padding: 15,
  marginBottom: 20
}

const pointsTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 10
}

const pointsLabel = {
  fontSize: 12,
  color: "#89847a"
}

const pointsNumber = {
  fontSize: 18,
  color: "#a98527",
  fontWeight: 600
}

const progressBgLarge = {
  height: 8,
  background: "#ece9df",
  borderRadius: 999,
  overflow: "hidden" as const
}

const pointsBottom = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 9,
  fontSize: 11,
  color: "#8f8a80"
}

/* SEÇÕES */

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 14,
  fontWeight: 600,
  color: "#a98527",
  marginBottom: 13,
  paddingBottom: 8,
  borderBottom: "1px solid #eeeae2"
}

const editIcon = {
  padding: "5px 9px",
  borderRadius: 7,
  border: "1px solid #e9dfbf",
  background: "#fffdf5",
  color: "#967821",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 500
}

const editSectionLabel = {
  fontSize: 13,
  fontWeight: 600,
  color: "#a98527",
  marginBottom: 12
}

/* INFORMAÇÕES */

const info = {
  marginBottom: 12,
  minWidth: 0
}

const infoValue = {
  marginTop: 3,
  wordBreak: "break-word" as const,
  fontSize: 13,
  color: "#37342e"
}

/* RELATÓRIO */

const reportIntro = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 3,
  padding: "12px 14px",
  background: "#faf9f5",
  border: "1px solid #eeeae0",
  borderRadius: 12,
  fontSize: 13,
  color: "#777269"
}

const reportLabel = {
  display: "block",
  fontSize: 11,
  color: "#99948a",
  marginBottom: 5
}

const reportValue = {
  fontSize: 15,
  color: "#39362f"
}

const reportSectionTitle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#a98527",
  marginBottom: 8
}

const reportDate = {
  color: "#8d887f",
  fontSize: 11
}

const reportPayment = {
  marginTop: 3,
  color: "#99958d",
  fontSize: 11
}

const reportPoints = {
  color: "#a98527",
  fontSize: 12
}

const reportEmpty = {
  padding: "20px 0",
  textAlign: "center" as const,
  color: "#99958d",
  fontSize: 13
}

/* OUTROS */

const fidelidadeInfo = {
  marginTop: 5,
  padding: "11px 13px",
  borderRadius: 11,
  background: "#faf9f5",
  border: "1px solid #eee9dc",
  color: "#89847b",
  fontSize: 11,
  lineHeight: 1.5
}

const createActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 9,
  marginTop: 18
}

const emptyState = {
  width: "100%",
  padding: "50px 20px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  color: "#77736b",
  textAlign: "center" as const,
  background: "#fff",
  border: "1px solid #ece9e1",
  borderRadius: 17
}