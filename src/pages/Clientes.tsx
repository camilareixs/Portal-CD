```tsx
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
  "Data de Nascimento": string

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
  irParaCompra?: (
    clienteId: string,
    clienteNome: string
  ) => void
}) {
  const [compras, setCompras] = useState<Compra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [busca, setBusca] = useState("")
  const [cidadeFiltro, setCidadeFiltro] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [ordenacao, setOrdenacao] =
    useState("ranking")

  const [selected, setSelected] =
    useState<Cliente | null>(null)

  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const [editarDados, setEditarDados] =
    useState(false)

  const [editarMedidas, setEditarMedidas] =
    useState(false)

  const [form, setForm] =
    useState<Partial<Cliente>>({})

  const [novo, setNovo] =
    useState<Partial<Cliente>>({})

  const [relatorioCliente, setRelatorioCliente] =
    useState<Cliente | null>(null)

  const [mostrarOpcoesRelatorio, setMostrarOpcoesRelatorio] =
    useState(false)

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("pontos", {
        ascending: false
      })

    if (error) {
      console.log(
        "Erro ao buscar clientes:",
        error
      )

      alert(
        "Erro ao buscar clientes: " +
          error.message
      )

      return
    }

    if (data) {
      const clientesFormatados: Cliente[] =
        data.map((c: any) => ({
          id: String(c.id),

          nome: c.nome || "",
          cpf: c.cpf || "",
          celular: c.celular || "",

          pontos: Number(c.pontos || 0),

          cidade: c.cidade || "",
          estado: c.estado || "",
          rua: c.rua || "",

          criadoEm:
            c.criadoEm ||
            c.criadoem ||
            "",

          CEP: c.CEP || "",
          Complemento:
            c.Complemento || "",

          cintura: c.cintura || "",

          "Data de Nascimento":
            c["Data de Nascimento"] || "",

          tamanhoSaia:
            c.tamanhoSaia || "",

          tamanhoVestido:
            c.tamanhoVestido || "",

          tamanhoBlusa:
            c.tamanhoBlusa || "",

          busto:
            c.busto || "",

          quadril:
            c.quadril || ""
        }))

      setClientes(clientesFormatados)
    }
  }

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", {
        ascending: false
      })

    if (error) {
      console.log(
        "Erro compras:",
        error
      )

      return
    }

    if (data) {
      setCompras(
        data.map((c: any) => ({
          id: String(c.id),

          clienteid:
            String(c.clienteid),

          cliente:
            c.cliente || "",

          cpf:
            c.cpf || "",

          valor:
            Number(c.valor || 0),

          pagamento:
            c.pagamento || "",

          parcelas:
            Number(c.parcelas || 1),

          pontosgerados:
            Number(
              c.pontosgerados || 0
            ),

          criadoem:
            c.criadoem || "",

          cupomusado:
            Number(
              c.cupomusado || 0
            )
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

        CEP: form.CEP,
        Complemento:
          form.Complemento,

        "Data de Nascimento":
          form["Data de Nascimento"],

        tamanhoSaia:
          form.tamanhoSaia,

        tamanhoVestido:
          form.tamanhoVestido,

        tamanhoBlusa:
          form.tamanhoBlusa,

        busto:
          form.busto,

        cintura:
          form.cintura,

        quadril:
          form.quadril
      })
      .eq("id", selected.id)

    if (error) {
      console.log(
        "Erro ao editar:",
        error
      )

      alert(
        "Erro ao editar cliente: " +
          error.message
      )

      return
    }

    alert(
      "Cliente atualizado com sucesso!"
    )

    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
    setSelected(null)

    fetchClientes()
  }

  async function criarCliente() {
    if (!novo.nome) {
      alert(
        "Preencha o nome do cliente"
      )

      return
    }

    const { error } = await supabase
      .from("clientes")
      .insert([
        {
          nome:
            novo.nome || "",

          cpf:
            novo.cpf || "",

          celular:
            novo.celular || "",

          cidade:
            novo.cidade || "",

          estado:
            novo.estado || "",

          rua:
            novo.rua || "",

          CEP:
            novo.CEP || "",

          Complemento:
            novo.Complemento || "",

          "Data de Nascimento":
            novo[
              "Data de Nascimento"
            ] || "",

          pontos: 0,

          criadoEm:
            new Date().toISOString(),

          tamanhoSaia:
            novo.tamanhoSaia || "",

          tamanhoVestido:
            novo.tamanhoVestido || "",

          tamanhoBlusa:
            novo.tamanhoBlusa || "",

          busto:
            novo.busto || "",

          cintura:
            novo.cintura || "",

          quadril:
            novo.quadril || ""
        }
      ])

    if (error) {
      console.log(
        "Erro ao criar:",
        error
      )

      alert(
        "Erro ao criar cliente: " +
          error.message
      )

      return
    }

    alert(
      "Cliente criado com sucesso!"
    )

    setCreating(false)
    setNovo({})

    fetchClientes()
  }

  function calc(pontos: number) {
    return {
      cupons:
        Math.floor(
          pontos / 10
        ),

      resto:
        pontos % 10
    }
  }

  function formatarData(data: string) {
    if (!data) return "-"

    const dataObj =
      new Date(data)

    if (
      isNaN(
        dataObj.getTime()
      )
    ) {
      return data
    }

    return dataObj.toLocaleDateString(
      "pt-BR"
    )
  }

  function formatarMoeda(
    valor: number
  ) {
    return valor.toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    )
  }

  function gerarMensagem(
    cliente: Cliente
  ) {
    const {
      cupons,
      resto
    } = calc(cliente.pontos)

    return `Olá ${cliente.nome}!

Você possui:
${cupons} cupom(ns)
${resto}/10 pontos para o próximo

Te esperamos!`
  }

  function enviarWhats(
    cliente: Cliente
  ) {
    const numero =
      "55" +
      cliente.celular.replace(
        /\D/g,
        ""
      )

    const mensagem =
      encodeURIComponent(
        gerarMensagem(
          cliente
        )
      )

    window.open(
      `https://wa.me/${numero}?text=${mensagem}`,
      "_blank"
    )
  }

  function gerarDadosRelatorio(
    cliente: Cliente
  ) {
    const comprasCliente =
      compras
        .filter(
          c =>
            c.clienteid ===
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

    const totalGasto =
      comprasCliente.reduce(
        (a, c) =>
          a + c.valor,
        0
      )

    const totalCompras =
      comprasCliente.length

    const ticketMedio =
      totalCompras > 0
        ? totalGasto /
          totalCompras
        : 0

    const cuponsUsados =
      comprasCliente.reduce(
        (a, c) =>
          a +
          c.cupomusado,
        0
      )

    const pontosGerados =
      comprasCliente.reduce(
        (a, c) =>
          a +
          c.pontosgerados,
        0
      )

    const ultimaCompra =
      comprasCliente.length >
      0
        ? formatarData(
            comprasCliente[0]
              .criadoem
          )
        : "Nenhuma"

    return {
      comprasCliente,
      totalGasto,
      totalCompras,
      ticketMedio,
      cuponsUsados,
      pontosGerados,
      ultimaCompra
    }
  }

  function visualizarRelatorio(
    cliente: Cliente
  ) {
    setSelected(null)

    setMostrarOpcoesRelatorio(
      false
    )

    setRelatorioCliente(
      cliente
    )
  }

  function baixarRelatorio(
    cliente: Cliente
  ) {
    const dados =
      gerarDadosRelatorio(
        cliente
      )

    const conteudo = `
RELATÓRIO CAMIDUDA
========================================

DADOS DO CLIENTE
----------------------------------------
Cliente: ${cliente.nome}
CPF: ${cliente.cpf || "-"}
Celular: ${cliente.celular || "-"}
Data de nascimento: ${
      cliente[
        "Data de Nascimento"
      ] || "-"
    }
Cidade: ${
      cliente.cidade || "-"
    }
Estado: ${
      cliente.estado || "-"
    }
CEP: ${cliente.CEP || "-"}
Rua: ${cliente.rua || "-"}
Complemento: ${
      cliente.Complemento ||
      "-"
    }
Cliente desde: ${formatarData(
      cliente.criadoEm
    )}

MEDIDAS E TAMANHOS
----------------------------------------
Tamanho saia: ${
      cliente.tamanhoSaia ||
      "-"
    }
Tamanho vestido: ${
      cliente.tamanhoVestido ||
      "-"
    }
Tamanho blusa: ${
      cliente.tamanhoBlusa ||
      "-"
    }
Busto: ${
      cliente.busto || "-"
    }
Cintura: ${
      cliente.cintura || "-"
    }
Quadril: ${
      cliente.quadril || "-"
    }

FIDELIDADE
----------------------------------------
Pontos atuais: ${
      cliente.pontos
    }
Cupons disponíveis: ${
      calc(cliente.pontos)
        .cupons
    }
Pontos para próximo cupom: ${
      calc(cliente.pontos)
        .resto
    }/10

RESUMO DE COMPRAS
----------------------------------------
Total gasto: ${formatarMoeda(
      dados.totalGasto
    )}
Compras realizadas: ${
      dados.totalCompras
    }
Ticket médio: ${formatarMoeda(
      dados.ticketMedio
    )}
Última compra: ${
      dados.ultimaCompra
    }
Cupons utilizados: ${formatarMoeda(
      dados.cuponsUsados
    )}
Pontos gerados: ${
      dados.pontosGerados
    }

HISTÓRICO DE COMPRAS
----------------------------------------

${
  dados.comprasCliente
    .length > 0
    ? dados.comprasCliente
        .map(
          c =>
            `${formatarData(
              c.criadoem
            )} | ${formatarMoeda(
              c.valor
            )} | ${
              c.pagamento
            } | ${
              c.pontosgerados
            } ponto(s)`
        )
        .join("\n")
    : "Nenhuma compra registrada."
}

========================================
Relatório gerado pelo sistema CAMIDUDA
`

    const blob =
      new Blob(
        [conteudo],
        {
          type:
            "text/plain;charset=utf-8"
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const a =
      document.createElement(
        "a"
      )

    a.href = url

    a.download =
      `relatorio-${cliente.nome}.txt`

    a.click()

    URL.revokeObjectURL(
      url
    )
  }

  const cidades =
    Array.from(
      new Set(
        clientes
          .map(
            c => c.cidade
          )
          .filter(Boolean)
      )
    )

  const estados =
    Array.from(
      new Set(
        clientes
          .map(
            c => c.estado
          )
          .filter(Boolean)
      )
    )

  let lista = [
    ...clientes
  ]

  if (
    ordenacao ===
      "ranking" ||
    ordenacao ===
      "pontos"
  ) {
    lista.sort(
      (a, b) =>
        b.pontos -
        a.pontos
    )
  }

  if (
    ordenacao ===
    "alfabetica"
  ) {
    lista.sort(
      (a, b) =>
        a.nome.localeCompare(
          b.nome
        )
    )
  }

  lista =
    lista
      .filter(c =>
        c.nome
          .toLowerCase()
          .includes(
            busca.toLowerCase()
          )
      )
      .filter(
        c =>
          !cidadeFiltro ||
          c.cidade ===
            cidadeFiltro
      )
      .filter(
        c =>
          !estadoFiltro ||
          c.estado ===
            estadoFiltro
      )

  function fecharModal() {
    setSelected(null)
    setCreating(false)
    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
    setRelatorioCliente(null)
    setMostrarOpcoesRelatorio(
      false
    )
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

        .report-info-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px 18px;
        }

        .report-loyalty {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .report-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 700px) {

          .clientes-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .report-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .report-loyalty {
            grid-template-columns:
              1fr;
          }

          .report-info-grid {
            grid-template-columns:
              1fr;
          }
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
            grid-template-columns:
              minmax(0, 1.35fr)
              minmax(0, 1fr);
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
          }

          .cliente-modal {
            width: 100% !important;
            max-width: 410px !important;
            max-height:
              calc(100vh - 20px) !important;
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

          .cliente-info-grid {
            display: grid;
            grid-template-columns:
              1fr 1fr;
            gap: 4px 14px;
          }

          .cliente-info-full {
            grid-column:
              1 / -1;
          }

          .report-modal {
            padding: 18px !important;
          }

          .report-actions {
            justify-content:
              stretch !important;
          }

          .report-actions button {
            flex: 1;
          }

          .report-purchase {
            align-items: flex-start !important;
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
            grid-template-columns:
              1fr !important;
          }

          .cliente-info-full {
            grid-column:
              auto;
          }

          .report-stats {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>

      {/* HEADER */}

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

      {/* FILTROS */}

      <div className="clientes-filtros">
        <input
          className="clientes-busca"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e =>
            setBusca(
              e.target.value
            )
          }
          style={input}
        />

        <select
          className="clientes-select cidade"
          value={cidadeFiltro}
          onChange={e =>
            setCidadeFiltro(
              e.target.value
            )
          }
          style={select}
        >
          <option value="">
            Cidades
          </option>

          {cidades.map(c => (
            <option key={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="clientes-select estado"
          value={estadoFiltro}
          onChange={e =>
            setEstadoFiltro(
              e.target.value
            )
          }
          style={select}
        >
          <option value="">
            Estados
          </option>

          {estados.map(e => (
            <option key={e}>
              {e}
            </option>
          ))}
        </select>

        <select
          className="clientes-select ranking"
          value={ordenacao}
          onChange={e =>
            setOrdenacao(
              e.target.value
            )
          }
          style={select}
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
        {lista.map(
          (c, index) => {
            const {
              cupons,
              resto
            } = calc(
              c.pontos
            )

            const pct =
              (resto / 10) *
              100

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
                {ordenacao ===
                  "ranking" &&
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
                  {cupons} cupom(ns)
                </div>

                <div
                  style={
                    progressBg
                  }
                >
                  <div
                    style={{
                      ...progressFill,
                      width: `${pct}%`
                    }}
                  />
                </div>

                <div
                  className="cliente-card-points"
                  style={
                    mutedSmall
                  }
                >
                  {resto}/10 pontos
                </div>
              </div>
            )
          }
        )}
      </div>

      {/* MODAL CLIENTE */}

      {(selected ||
        creating) && (
        <div
          className="cliente-modal-overlay"
          style={overlay}
          onClick={
            fecharModal
          }
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
              !editing && (
                <>
                  <div
                    style={
                      modalHeader
                    }
                  >
                    <h2
                      className="cliente-modal-title"
                      style={
                        modalTitle
                      }
                    >
                      {
                        selected.nome
                      }
                    </h2>

                    <button
                      style={
                        closeBtn
                      }
                      onClick={
                        fecharModal
                      }
                    >
                      ×
                    </button>
                  </div>

                  <div
                    className="cliente-modal-points"
                    style={
                      pointsCard
                    }
                  >
                    <div
                      style={
                        pointsTop
                      }
                    >
                      <span
                        style={
                          pointsLabel
                        }
                      >
                        Fidelidade
                      </span>

                      <strong
                        style={
                          pointsNumber
                        }
                      >
                        {
                          selected.pontos
                        }{" "}
                        pts
                      </strong>
                    </div>

                    <div
                      style={
                        progressBgLarge
                      }
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
                      style={
                        pointsBottom
                      }
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
                    style={
                      sectionHeader
                    }
                  >
                    <span>
                      Dados pessoais
                    </span>

                    <button
                      style={
                        editIcon
                      }
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
                        selected.cpf ||
                        "-"
                      }
                    />

                    <Info
                      label="Celular"
                      value={
                        selected.celular ||
                        "-"
                      }
                    />

                    <Info
                      label="Data de nascimento"
                      value={
                        selected[
                          "Data de Nascimento"
                        ] ||
                        "-"
                      }
                    />

                    <Info
                      label="CEP"
                      value={
                        selected.CEP ||
                        "-"
                      }
                    />

                    <Info
                      label="Cidade"
                      value={
                        selected.cidade ||
                        "-"
                      }
                    />

                    <Info
                      label="Estado"
                      value={
                        selected.estado ||
                        "-"
                      }
                    />

                    <div className="cliente-info-full">
                      <Info
                        label="Endereço"
                        value={[
                          selected.rua,
                          selected.Complemento
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          ) ||
                          "-"
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
                      style={
                        editIcon
                      }
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
                        selected.busto ||
                        "-"
                      }
                    />

                    <Info
                      label="Cintura"
                      value={
                        selected.cintura ||
                        "-"
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
                      style={
                        secondaryBtn
                      }
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

                        setSelected(
                          null
                        )
                      }}
                    >
                      Nova compra
                    </button>

                    <button
                      style={
                        whatsBtn
                      }
                      onClick={() =>
                        enviarWhats(
                          selected
                        )
                      }
                    >
                      WhatsApp
                    </button>

                    <div
                      style={
                        reportWrapper
                      }
                    >
                      <button
                        style={
                          secondaryBtn
                        }
                        onClick={() =>
                          setMostrarOpcoesRelatorio(
                            !mostrarOpcoesRelatorio
                          )
                        }
                      >
                        Relatório
                      </button>

                      {mostrarOpcoesRelatorio && (
                        <div
                          style={
                            reportMenu
                          }
                        >
                          <button
                            style={
                              reportMenuItem
                            }
                            onClick={() =>
                              visualizarRelatorio(
                                selected
                              )
                            }
                          >
                            Visualizar relatório
                          </button>

                          <button
                            style={
                              reportMenuItem
                            }
                            onClick={() => {
                              setMostrarOpcoesRelatorio(
                                false
                              )

                              baixarRelatorio(
                                selected
                              )
                            }}
                          >
                            Baixar relatório
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

            {/* EDITAR */}

            {selected &&
              editing && (
                <>
                  <div
                    style={
                      modalHeader
                    }
                  >
                    <h2
                      className="cliente-modal-title"
                      style={
                        modalTitle
                      }
                    >
                      Editar cliente
                    </h2>

                    <button
                      style={
                        closeBtn
                      }
                      onClick={() => {
                        setEditing(
                          false
                        )

                        setEditarDados(
                          false
                        )

                        setEditarMedidas(
                          false
                        )
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {editarDados && (
                    <>
                      <div
                        style={
                          editSectionLabel
                        }
                      >
                        Dados pessoais
                      </div>

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Nome"
                        value={
                          form.nome ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            nome:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="CPF"
                        value={
                          form.cpf ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            cpf:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Celular"
                        value={
                          form.celular ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            celular:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        type="date"
                        style={
                          inputSpacing
                        }
                        value={
                          form[
                            "Data de Nascimento"
                          ] ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            "Data de Nascimento":
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="CEP"
                        value={
                          form.CEP ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            CEP:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Rua"
                        value={
                          form.rua ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            rua:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Complemento"
                        value={
                          form.Complemento ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            Complemento:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Cidade"
                        value={
                          form.cidade ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            cidade:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Estado"
                        value={
                          form.estado ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            estado:
                              e.target
                                .value
                          })
                        }
                      />
                    </>
                  )}

                  {editarMedidas && (
                    <>
                      <div
                        style={
                          editSectionLabel
                        }
                      >
                        Medidas e tamanhos
                      </div>

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Tamanho saia"
                        value={
                          form.tamanhoSaia ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            tamanhoSaia:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Tamanho vestido"
                        value={
                          form.tamanhoVestido ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            tamanhoVestido:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Tamanho blusa"
                        value={
                          form.tamanhoBlusa ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            tamanhoBlusa:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Busto"
                        value={
                          form.busto ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            busto:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Cintura"
                        value={
                          form.cintura ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            cintura:
                              e.target
                                .value
                          })
                        }
                      />

                      <input
                        style={
                          inputSpacing
                        }
                        placeholder="Quadril"
                        value={
                          form.quadril ||
                          ""
                        }
                        onChange={e =>
                          setForm({
                            ...form,
                            quadril:
                              e.target
                                .value
                          })
                        }
                      />
                    </>
                  )}

                  <div className="clientes-modal-actions">
                    <button
                      style={
                        secondaryBtn
                      }
                      onClick={() => {
                        setEditing(
                          false
                        )

                        setEditarDados(
                          false
                        )

                        setEditarMedidas(
                          false
                        )
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      style={
                        primaryBtnSmall
                      }
                      onClick={
                        salvarEdicao
                      }
                    >
                      Salvar
                    </button>
                  </div>
                </>
              )}

            {/* CRIAR CLIENTE */}

            {creating && (
              <>
                <div
                  style={
                    modalHeader
                  }
                >
                  <h2
                    className="cliente-modal-title"
                    style={
                      modalTitle
                    }
                  >
                    Novo cliente
                  </h2>

                  <button
                    style={
                      closeBtn
                    }
                    onClick={
                      fecharModal
                    }
                  >
                    ×
                  </button>
                </div>

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Nome"
                  value={
                    novo.nome ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      nome:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="CPF"
                  value={
                    novo.cpf ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      cpf:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Celular"
                  value={
                    novo.celular ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      celular:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  type="date"
                  style={
                    inputSpacing
                  }
                  value={
                    novo[
                      "Data de Nascimento"
                    ] ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      "Data de Nascimento":
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="CEP"
                  value={
                    novo.CEP ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      CEP:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Rua"
                  value={
                    novo.rua ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      rua:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Complemento"
                  value={
                    novo.Complemento ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      Complemento:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Cidade"
                  value={
                    novo.cidade ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      cidade:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Estado"
                  value={
                    novo.estado ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      estado:
                        e.target
                          .value
                    })
                  }
                />

                <div
                  style={
                    editSectionLabel
                  }
                >
                  Medidas e tamanhos
                </div>

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Tamanho saia"
                  value={
                    novo.tamanhoSaia ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoSaia:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Tamanho vestido"
                  value={
                    novo.tamanhoVestido ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoVestido:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Tamanho blusa"
                  value={
                    novo.tamanhoBlusa ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      tamanhoBlusa:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Busto"
                  value={
                    novo.busto ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      busto:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Cintura"
                  value={
                    novo.cintura ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      cintura:
                        e.target
                          .value
                    })
                  }
                />

                <input
                  style={
                    inputSpacing
                  }
                  placeholder="Quadril"
                  value={
                    novo.quadril ||
                    ""
                  }
                  onChange={e =>
                    setNovo({
                      ...novo,
                      quadril:
                        e.target
                          .value
                    })
                  }
                />

                <div
                  style={
                    createActions
                  }
                >
                  <button
                    style={
                      primaryBtnCreate
                    }
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

      {/* RELATÓRIO */}

      {relatorioCliente && (
        <div
          style={overlay}
          onClick={() =>
            setRelatorioCliente(
              null
            )
          }
        >
          <div
            className="report-modal"
            style={
              reportModal
            }
            onClick={e =>
              e.stopPropagation()
            }
          >
            <div
              style={
                modalHeader
              }
            >
              <div>
                <h2
                  style={
                    modalTitle
                  }
                >
                  Relatório do cliente
                </h2>

                <div
                  style={
                    reportClientName
                  }
                >
                  {
                    relatorioCliente.nome
                  }
                </div>
              </div>

              <button
                style={
                  closeBtn
                }
                onClick={() =>
                  setRelatorioCliente(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            {(() => {
              const dados =
                gerarDadosRelatorio(
                  relatorioCliente
                )

              const fidelidade =
                calc(
                  relatorioCliente.pontos
                )

              return (
                <>
                  <div
                    style={
                      reportSectionTitle
                    }
                  >
                    Dados do cliente
                  </div>

                  <div className="report-info-grid">
                    <ReportInfo
                      label="CPF"
                      value={
                        relatorioCliente.cpf ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Celular"
                      value={
                        relatorioCliente.celular ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Data de nascimento"
                      value={
                        relatorioCliente[
                          "Data de Nascimento"
                        ] ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="CEP"
                      value={
                        relatorioCliente.CEP ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Cidade"
                      value={
                        relatorioCliente.cidade ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Estado"
                      value={
                        relatorioCliente.estado ||
                        "-"
                      }
                    />

                    <div
                      style={{
                        gridColumn:
                          "1 / -1"
                      }}
                    >
                      <ReportInfo
                        label="Endereço"
                        value={[
                          relatorioCliente.rua,
                          relatorioCliente.Complemento
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          ) ||
                          "-"
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={
                      reportSectionTitle
                    }
                  >
                    Medidas e tamanhos
                  </div>

                  <div className="report-info-grid">
                    <ReportInfo
                      label="Saia"
                      value={
                        relatorioCliente.tamanhoSaia ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Vestido"
                      value={
                        relatorioCliente.tamanhoVestido ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Blusa"
                      value={
                        relatorioCliente.tamanhoBlusa ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Busto"
                      value={
                        relatorioCliente.busto ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Cintura"
                      value={
                        relatorioCliente.cintura ||
                        "-"
                      }
                    />

                    <ReportInfo
                      label="Quadril"
                      value={
                        relatorioCliente.quadril ||
                        "-"
                      }
                    />
                  </div>

                  <div
                    style={
                      reportSectionTitle
                    }
                  >
                    Fidelidade
                  </div>

                  <div
                    className="report-loyalty"
                    style={
                      reportLoyalty
                    }
                  >
                    <div>
                      <span
                        style={
                          reportLabel
                        }
                      >
                        Pontos atuais
                      </span>

                      <strong
                        style={
                          reportValueGold
                        }
                      >
                        {
                          relatorioCliente.pontos
                        }
                      </strong>
                    </div>

                    <div>
                      <span
                        style={
                          reportLabel
                        }
                      >
                        Cupons disponíveis
                      </span>

                      <strong
                        style={
                          reportValue
                        }
                      >
                        {
                          fidelidade.cupons
                        }
                      </strong>
                    </div>

                    <div>
                      <span
                        style={
                          reportLabel
                        }
                      >
                        Próximo cupom
                      </span>

                      <strong
                        style={
                          reportValue
                        }
                      >
                        {
                          fidelidade.resto
                        }
                        /10
                      </strong>
                    </div>
                  </div>

                  <div
                    style={
                      reportSectionTitle
                    }
                  >
                    Resumo de compras
                  </div>

                  <div
                    className="report-stats"
                    style={
                      reportStatsGrid
                    }
                  >
                    <ReportStat
                      label="Total gasto"
                      value={formatarMoeda(
                        dados.totalGasto
                      )}
                    />

                    <ReportStat
                      label="Compras"
                      value={String(
                        dados.totalCompras
                      )}
                    />

                    <ReportStat
                      label="Ticket médio"
                      value={formatarMoeda(
                        dados.ticketMedio
                      )}
                    />

                    <ReportStat
                      label="Última compra"
                      value={
                        dados.ultimaCompra
                      }
                    />
                  </div>

                  <div
                    style={
                      reportSectionTitle
                    }
                  >
                    Histórico de compras
                  </div>

                  {dados
                    .comprasCliente
                    .length ===
                  0 ? (
                    <div
                      style={
                        emptyReport
                      }
                    >
                      Nenhuma compra registrada.
                    </div>
                  ) : (
                    <div
                      style={
                        reportHistory
                      }
                    >
                      {dados.comprasCliente.map(
                        compra => (
                          <div
                            key={
                              compra.id
                            }
                            className="report-purchase"
                            style={
                              reportPurchase
                            }
                          >
                            <div>
                              <strong>
                                {formatarData(
                                  compra.criadoem
                                )}
                              </strong>

                              <span
                                style={
                                  reportPurchaseSub
                                }
                              >
                                {
                                  compra.pagamento
                                }

                                {compra.parcelas >
                                1
                                  ? ` · ${compra.parcelas}x`
                                  : ""}
                              </span>
                            </div>

                            <div
                              style={
                                reportPurchaseRight
                              }
                            >
                              <strong>
                                {formatarMoeda(
                                  compra.valor
                                )}
                              </strong>

                              <span
                                style={
                                  reportPurchasePoints
                                }
                              >
                                +
                                {
                                  compra.pontosgerados
                                }{" "}
                                pts
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div
                    className="report-actions"
                    style={
                      reportActions
                    }
                  >
                    <button
                      style={
                        secondaryBtn
                      }
                      onClick={() =>
                        baixarRelatorio(
                          relatorioCliente
                        )
                      }
                    >
                      Baixar relatório
                    </button>

                    <button
                      style={
                        primaryBtnSmall
                      }
                      onClick={() =>
                        setRelatorioCliente(
                          null
                        )
                      }
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================
   COMPONENTES
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
      <span
        style={
          mutedSmall
        }
      >
        {label}
      </span>

      <div
        style={
          infoValue
        }
      >
        {value}
      </div>
    </div>
  )
}

function ReportInfo({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <span
        style={
          reportLabel
        }
      >
        {label}
      </span>

      <div
        style={
          reportInfoValue
        }
      >
        {value}
      </div>
    </div>
  )
}

function ReportStat({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={
        reportStat
      }
    >
      <span
        style={
          reportLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          reportStatValue
        }
      >
        {value}
      </strong>
    </div>
  )
}

/* =========================================================
   CONTAINER
========================================================= */

const container = {
  width: "100%",
  minWidth: 0,
  boxSizing:
    "border-box" as const,
  background: "#f6f4ef",
  fontFamily:
    "Inter, sans-serif"
}

/* =========================================================
   HEADER
========================================================= */

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 28,
  flexWrap:
    "wrap" as const
}

const title = {
  fontSize: 32,
  fontWeight: 500,
  margin: 0,
  color: "#24211c"
}

/* =========================================================
   BOTÕES
========================================================= */

const primaryBtn = {
  padding: "10px 18px",
  borderRadius: 14,
  border:
    "1px solid #d4af37",
  background:
    "linear-gradient(90deg,#d4af37,#f3df83)",
  color: "#5f4a12",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 5px 14px rgba(212,175,55,0.22)",
  whiteSpace:
    "nowrap" as const
}

const secondaryBtn = {
  padding: "10px 16px",
  borderRadius: 12,
  border:
    "1px solid #ddd8cb",
  background: "#fff",
  color: "#36332d",
  cursor: "pointer",
  whiteSpace:
    "nowrap" as const
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
  whiteSpace:
    "nowrap" as const
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
  border:
    "1px solid #e6e0c9",
  background: "#fffdf4",
  color: "#80651d",
  cursor: "pointer",
  whiteSpace:
    "nowrap" as const
}

/* =========================================================
   INPUTS
========================================================= */

const input = {
  padding: 12,
  borderRadius: 14,
  border:
    "1px solid #e1ded6",
  width: "100%",
  minWidth: 0,
  boxSizing:
    "border-box" as const,
  background: "#fff",
  outline: "none",
  color: "#333"
}

const inputSpacing = {
  ...input,
  marginBottom: 12
}

const select = {
  padding: 12,
  borderRadius: 14,
  border:
    "1px solid #e1ded6",
  flex: 1,
  minWidth: 140,
  background: "#fff",
  boxSizing:
    "border-box" as const,
  color: "#333"
}

/* =========================================================
   CARDS
========================================================= */

const card = {
  background: "#fff",
  padding: 18,
  borderRadius: 18,
  border:
    "1px solid #e8e4da",
  cursor: "pointer",
  transition:
    "0.25s",
  position:
    "relative" as const,
  minWidth: 0,
  boxSizing:
    "border-box" as const
}

const rank = {
  position:
    "absolute" as const,
  top: 12,
  right: 12,
  color: "#b8962e",
  fontSize: 13,
  fontWeight: 600
}

const name = {
  fontWeight: 500,
  color: "#2c2924",
  overflow: "hidden",
  textOverflow:
    "ellipsis",
  whiteSpace:
    "nowrap" as const,
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
  color: "#b8962e",
  fontSize: 13,
  fontWeight: 500
}

const progressBg = {
  height: 6,
  background: "#eeeae1",
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

/* =========================================================
   MODAL
========================================================= */

const overlay = {
  position:
    "fixed" as const,
  inset: 0,
  background:
    "rgba(30,27,22,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  padding: 16,
  boxSizing:
    "border-box" as const,
  zIndex: 2000
}

const modal = {
  background: "#fff",
  padding: 24,
  borderRadius: 18,
  width: "100%",
  maxWidth: 430,
  maxHeight:
    "calc(100vh - 32px)",
  overflowY:
    "auto" as const,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.14)",
  boxSizing:
    "border-box" as const
}

const modalHeader = {
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "space-between",
  gap: 15,
  marginBottom: 16
}

const modalTitle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 500,
  color: "#292620"
}

const closeBtn = {
  width: 34,
  height: 34,
  minWidth: 34,
  borderRadius: 50,
  border:
    "1px solid #e8e5df",
  background: "#faf9f6",
  color: "#777",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer"
}

/* =========================================================
   PONTOS
========================================================= */

const pointsCard = {
  background: "#fcfbf7",
  border:
    "1px solid #f1ead7",
  borderRadius: 14,
  padding: 14,
  marginBottom: 18
}

const pointsTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
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
  overflow:
    "hidden" as const
}

const pointsBottom = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 10,
  marginTop: 8,
  fontSize: 11,
  color: "#888"
}

/* =========================================================
   SEÇÕES
========================================================= */

const sectionHeader = {
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "space-between",
  gap: 10,
  fontSize: 14,
  fontWeight: 600,
  color: "#b8962e",
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom:
    "1px solid #eee"
}

const editIcon = {
  padding:
    "5px 9px",
  borderRadius: 8,
  border:
    "1px solid #eadfbf",
  background: "#fffbe6",
  color: "#a88320",
  cursor: "pointer",
  fontSize: 11,
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center"
}

const editSectionLabel = {
  fontSize: 14,
  fontWeight: 600,
  color: "#b8962e",
  marginBottom: 14,
  marginTop: 4
}

/* =========================================================
   INFO
========================================================= */

const info = {
  marginBottom: 12,
  minWidth: 0
}

const infoValue = {
  marginTop: 2,
  wordBreak:
    "break-word" as const,
  fontSize: 14,
  color: "#333"
}

/* =========================================================
   RELATÓRIO
========================================================= */

const reportWrapper = {
  position:
    "relative" as const
}

const reportMenu = {
  position:
    "absolute" as const,
  bottom:
    "calc(100% + 8px)",
  right: 0,
  width: 190,
  background: "#fff",
  border:
    "1px solid #eadfbf",
  borderRadius: 14,
  padding: 6,
  boxShadow:
    "0 12px 30px rgba(0,0,0,0.12)",
  zIndex: 20
}

const reportMenuItem = {
  width: "100%",
  padding:
    "11px 12px",
  border: "none",
  background:
    "transparent",
  borderRadius: 10,
  textAlign:
    "left" as const,
  cursor: "pointer",
  fontSize: 13,
  color: "#333"
}

const reportModal = {
  background: "#fff",
  padding: 26,
  borderRadius: 22,
  width: "100%",
  maxWidth: 650,
  maxHeight:
    "calc(100vh - 32px)",
  overflowY:
    "auto" as const,
  boxShadow:
    "0 25px 70px rgba(0,0,0,0.16)",
  boxSizing:
    "border-box" as const
}

const reportClientName = {
  marginTop: 4,
  fontSize: 13,
  color: "#999"
}

const reportSectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#a88320",
  paddingBottom: 8,
  marginTop: 20,
  marginBottom: 12,
  borderBottom:
    "1px solid #eee8d8"
}

const reportLabel = {
  display: "block",
  fontSize: 11,
  color: "#999",
  marginBottom: 3
}

const reportInfoValue = {
  fontSize: 13,
  color: "#333",
  wordBreak:
    "break-word" as const
}

const reportLoyalty = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 10,
  background: "#fcfbf7",
  border:
    "1px solid #f1ead7",
  borderRadius: 14,
  padding: 14
}

const reportValue = {
  display: "block",
  fontSize: 17,
  fontWeight: 600,
  color: "#333"
}

const reportValueGold = {
  display: "block",
  fontSize: 19,
  fontWeight: 600,
  color: "#b8962e"
}

const reportStatsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 10
}

const reportStat = {
  background: "#fafafa",
  border:
    "1px solid #eee",
  borderRadius: 13,
  padding: 13,
  minWidth: 0
}

const reportStatValue = {
  display: "block",
  marginTop: 5,
  fontSize: 15,
  color: "#333",
  wordBreak:
    "break-word" as const
}

const reportHistory = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 7,
  maxHeight: 230,
  overflowY:
    "auto" as const
}

const reportPurchase = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  gap: 12,
  padding:
    "11px 12px",
  border:
    "1px solid #eee",
  borderRadius: 12,
  background: "#fff"
}

const reportPurchaseSub = {
  display: "block",
  fontSize: 11,
  color: "#999",
  marginTop: 3
}

const reportPurchaseRight = {
  textAlign:
    "right" as const
}

const reportPurchasePoints = {
  display: "block",
  fontSize: 10,
  color: "#b8962e",
  marginTop: 3
}

const emptyReport = {
  padding: 18,
  textAlign:
    "center" as const,
  color: "#999",
  fontSize: 13,
  background: "#fafafa",
  borderRadius: 12
}

const reportActions = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: 10,
  marginTop: 22,
  flexWrap:
    "wrap" as const
}

/* =========================================================
   AÇÕES
========================================================= */

const createActions = {
  display: "flex",
  justifyContent:
    "center",
  marginTop: 8
}
```
