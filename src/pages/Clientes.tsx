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

type SecaoEdicao = "dados" | "medidas" | null

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
  const [secaoEdicao, setSecaoEdicao] =
    useState<SecaoEdicao>(null)

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
      const clientesFormatados: Cliente[] = data.map(
        (c: any) => ({
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
        })
      )

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
    setSecaoEdicao(null)
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
    const numero =
      "55" + cliente.celular.replace(/\D/g, "")

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
    setSecaoEdicao(null)
  }

  function abrirEdicao(secao: SecaoEdicao) {
    if (!selected) return

    setForm({ ...selected })
    setEditing(true)
    setSecaoEdicao(secao)
  }

  function atualizarForm(
    campo: keyof Cliente,
    valor: string
  ) {
    setForm(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  function atualizarNovo(
    campo: keyof Cliente,
    valor: string
  ) {
    setNovo(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  return (
    <div style={container}>
      {/* HEADER */}

      <div className="clientes-header" style={header}>
        <h1 style={title}>Clientes</h1>

        <button
          className="clientes-novo-btn"
          style={primaryBtn}
          onClick={() => {
            setNovo({})
            setCreating(true)
          }}
        >
          + Novo cliente
        </button>
      </div>

      {/* FILTROS */}

      <div
        className="clientes-filtros"
        style={filters}
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
          className="clientes-cidade"
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
          className="clientes-estado"
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
          className="clientes-ranking"
          value={ordenacao}
          onChange={e =>
            setOrdenacao(e.target.value)
          }
          style={select}
        >
          <option value="ranking">Ranking</option>
          <option value="alfabetica">A–Z</option>
          <option value="pontos">Pontos</option>
        </select>
      </div>

      {/* CLIENTES */}

      <div className="clientes-grid" style={grid}>
        {lista.map((c, index) => {
          const { cupons, resto } = calc(
            c.pontos
          )

          const pct = (resto / 10) * 100

          return (
            <div
              key={c.id}
              className="cliente-card"
              style={card}
              onClick={() => {
                setSelected(c)
                setForm({ ...c })
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

              <div style={name}>
                {c.nome}
              </div>

              <div style={muted}>
                {c.cidade ||
                  "Cidade não informada"}
              </div>

              <div style={coupon}>
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

              <div style={mutedSmall}>
                {resto}/10 pontos
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL */}

      {(selected || creating) && (
        <div
          className="clientes-overlay"
          style={overlay}
          onClick={fecharModal}
        >
          <div
            className="clientes-modal"
            style={modal}
            onClick={e =>
              e.stopPropagation()
            }
          >
            {/* VISUALIZAÇÃO */}

            {selected && !editing && (
              <>
                <div style={modalHeader}>
                  <div>
                    <h2 style={modalTitle}>
                      {selected.nome}
                    </h2>

                    <span style={modalSubtitle}>
                      Cliente CamiDuda
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                {/* DADOS PESSOAIS */}

                <div style={sectionHeader}>
                  <span>
                    Dados pessoais
                  </span>

                  <button
                    style={editIcon}
                    onClick={() =>
                      abrirEdicao("dados")
                    }
                    aria-label="Editar dados pessoais"
                  >
                    ✎
                  </button>
                </div>

                <div style={infoGrid}>
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
                    label="Rua"
                    value={
                      selected.rua || "-"
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
                    marginTop: 8
                  }}
                >
                  <span>
                    Medidas e tamanhos
                  </span>

                  <button
                    style={editIcon}
                    onClick={() =>
                      abrirEdicao("medidas")
                    }
                    aria-label="Editar medidas e tamanhos"
                  >
                    ✎
                  </button>
                </div>

                <div style={measureGrid}>
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

                  <Info
                    label="Cintura"
                    value={
                      selected.cintura ||
                      "-"
                    }
                  />
                </div>

                {/* PONTOS */}

                <div style={pointsBox}>
                  <div>
                    <span style={pointsLabel}>
                      Pontos
                    </span>

                    <strong
                      style={pointsValue}
                    >
                      ⭐ {selected.pontos}
                    </strong>
                  </div>

                  <div>
                    <span style={pointsLabel}>
                      Cupons
                    </span>

                    <strong
                      style={couponValue}
                    >
                      🎟{" "}
                      {
                        calc(
                          selected.pontos
                        ).cupons
                      }
                    </strong>
                  </div>
                </div>

                {/* AÇÕES */}

                <div
                  className="clientes-modal-actions"
                  style={modalActions}
                >
                  <button
                    style={primaryBtnSmall}
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
                    + Nova compra
                  </button>

                  <button
                    style={whatsBtn}
                    onClick={() =>
                      enviarWhats(selected)
                    }
                  >
                    WhatsApp
                  </button>

                  <button
                    style={secondaryBtn}
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
                <div style={modalHeader}>
                  <div>
                    <h2 style={modalTitle}>
                      Editar cliente
                    </h2>

                    <span style={modalSubtitle}>
                      {selected.nome}
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                {secaoEdicao ===
                  "dados" && (
                  <>
                    <div style={sectionHeader}>
                      <span>
                        Dados pessoais
                      </span>
                    </div>

                    <input
                      style={inputSpacing}
                      placeholder="Nome"
                      value={
                        form.nome || ""
                      }
                      onChange={e =>
                        atualizarForm(
                          "nome",
                          e.target.value
                        )
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="CPF"
                      value={
                        form.cpf || ""
                      }
                      onChange={e =>
                        atualizarForm(
                          "cpf",
                          e.target.value
                        )
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Celular"
                      value={
                        form.celular || ""
                      }
                      onChange={e =>
                        atualizarForm(
                          "celular",
                          e.target.value
                        )
                      }
                    />

                    <input
                      style={inputSpacing}
                      placeholder="Rua"
                      value={
                        form.rua || ""
                      }
                      onChange={e =>
                        atualizarForm(
                          "rua",
                          e.target.value
                        )
                      }
                    />

                    <div style={editTwoColumns}>
                      <input
                        style={inputSpacing}
                        placeholder="Cidade"
                        value={
                          form.cidade || ""
                        }
                        onChange={e =>
                          atualizarForm(
                            "cidade",
                            e.target.value
                          )
                        }
                      />

                      <input
                        style={inputSpacing}
                        placeholder="Estado"
                        value={
                          form.estado || ""
                        }
                        onChange={e =>
                          atualizarForm(
                            "estado",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </>
                )}

                {secaoEdicao ===
                  "medidas" && (
                  <>
                    <div style={sectionHeader}>
                      <span>
                        Medidas e tamanhos
                      </span>
                    </div>

                    <div style={editTwoColumns}>
                      <input
                        style={inputSpacing}
                        placeholder="Tamanho saia"
                        value={
                          form.tamanhoSaia ||
                          ""
                        }
                        onChange={e =>
                          atualizarForm(
                            "tamanhoSaia",
                            e.target.value
                          )
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
                          atualizarForm(
                            "tamanhoVestido",
                            e.target.value
                          )
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
                          atualizarForm(
                            "tamanhoBlusa",
                            e.target.value
                          )
                        }
                      />

                      <input
                        style={inputSpacing}
                        placeholder="Busto"
                        value={
                          form.busto || ""
                        }
                        onChange={e =>
                          atualizarForm(
                            "busto",
                            e.target.value
                          )
                        }
                      />

                      <input
                        style={inputSpacing}
                        placeholder="Quadril"
                        value={
                          form.quadril || ""
                        }
                        onChange={e =>
                          atualizarForm(
                            "quadril",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </>
                )}

                <div style={modalActions}>
                  <button
                    style={secondaryBtn}
                    onClick={() => {
                      setEditing(false)
                      setSecaoEdicao(null)
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    style={primaryBtnSmall}
                    onClick={salvarEdicao}
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
                    <h2 style={modalTitle}>
                      Novo cliente
                    </h2>

                    <span style={modalSubtitle}>
                      Cadastro CamiDuda
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <div style={sectionHeader}>
                  <span>
                    Dados pessoais
                  </span>
                </div>

                <input
                  style={inputSpacing}
                  placeholder="Nome"
                  value={novo.nome || ""}
                  onChange={e =>
                    atualizarNovo(
                      "nome",
                      e.target.value
                    )
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="CPF"
                  value={novo.cpf || ""}
                  onChange={e =>
                    atualizarNovo(
                      "cpf",
                      e.target.value
                    )
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Celular"
                  value={
                    novo.celular || ""
                  }
                  onChange={e =>
                    atualizarNovo(
                      "celular",
                      e.target.value
                    )
                  }
                />

                <input
                  style={inputSpacing}
                  placeholder="Rua"
                  value={novo.rua || ""}
                  onChange={e =>
                    atualizarNovo(
                      "rua",
                      e.target.value
                    )
                  }
                />

                <div style={editTwoColumns}>
                  <input
                    style={inputSpacing}
                    placeholder="Cidade"
                    value={
                      novo.cidade || ""
                    }
                    onChange={e =>
                      atualizarNovo(
                        "cidade",
                        e.target.value
                      )
                    }
                  />

                  <input
                    style={inputSpacing}
                    placeholder="Estado"
                    value={
                      novo.estado || ""
                    }
                    onChange={e =>
                      atualizarNovo(
                        "estado",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div style={sectionHeader}>
                  <span>
                    Medidas e tamanhos
                  </span>
                </div>

                <div style={editTwoColumns}>
                  <input
                    style={inputSpacing}
                    placeholder="Tamanho saia"
                    value={
                      novo.tamanhoSaia ||
                      ""
                    }
                    onChange={e =>
                      atualizarNovo(
                        "tamanhoSaia",
                        e.target.value
                      )
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
                      atualizarNovo(
                        "tamanhoVestido",
                        e.target.value
                      )
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
                      atualizarNovo(
                        "tamanhoBlusa",
                        e.target.value
                      )
                    }
                  />

                  <input
                    style={inputSpacing}
                    placeholder="Busto"
                    value={
                      novo.busto || ""
                    }
                    onChange={e =>
                      atualizarNovo(
                        "busto",
                        e.target.value
                      )
                    }
                  />

                  <input
                    style={inputSpacing}
                    placeholder="Quadril"
                    value={
                      novo.quadril || ""
                    }
                    onChange={e =>
                      atualizarNovo(
                        "quadril",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div style={createActions}>
                  <button
                    style={primaryBtnCreate}
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

      {/* MOBILE */}

      <style>
        {`
          @media (max-width: 600px) {
            .clientes-header {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 10px !important;
              margin-bottom: 18px !important;
            }

            .clientes-header h1 {
              font-size: 27px !important;
            }

            .clientes-novo-btn {
              padding: 10px 13px !important;
              font-size: 13px !important;
              border-radius: 12px !important;
              flex-shrink: 0 !important;
            }

            .clientes-filtros {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 9px !important;
              margin-bottom: 20px !important;
              width: 100% !important;
            }

            .clientes-filtros input,
            .clientes-filtros select {
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              font-size: 13px !important;
              padding: 11px 10px !important;
            }

            .clientes-busca {
              grid-column: 1 !important;
            }

            .clientes-cidade {
              grid-column: 2 !important;
            }

            .clientes-estado {
              grid-column: 1 !important;
            }

            .clientes-ranking {
              grid-column: 2 !important;
            }

            .clientes-grid {
              grid-template-columns: 1fr 1fr !important;
              gap: 10px !important;
            }

            .cliente-card {
              padding: 14px !important;
              border-radius: 15px !important;
            }

            .cliente-card .cliente-nome {
              font-size: 14px !important;
            }

            .clientes-overlay {
              padding: 10px !important;
              align-items: flex-end !important;
            }

            .clientes-modal {
              width: 100% !important;
              max-width: 100% !important;
              max-height: calc(100vh - 20px) !important;
              padding: 18px !important;
              border-radius: 20px !important;
              overflow-y: auto !important;
            }

            .clientes-modal-actions {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              width: 100% !important;
            }

            .clientes-modal-actions button {
              width: 100% !important;
              min-width: 0 !important;
            }

            .clientes-modal-actions button:first-child {
              grid-column: 1 / -1 !important;
            }

            .clientes-modal-actions button:last-child {
              grid-column: 1 / -1 !important;
            }
          }

          @media (max-width: 380px) {
            .clientes-grid {
              grid-template-columns: 1fr !important;
            }

            .clientes-header h1 {
              font-size: 25px !important;
            }

            .clientes-novo-btn {
              font-size: 12px !important;
              padding: 9px 10px !important;
            }
          }
        `}
      </style>
    </div>
  )
}

/* =========================
   COMPONENTE INFO
========================= */

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

/* =========================
   CONTAINER
========================= */

const container = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#f6f6f7",
  fontFamily: "Inter, Arial, sans-serif"
}

/* =========================
   HEADER
========================= */

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
  color: "#222"
}

/* =========================
   BOTÕES
========================= */

const primaryBtn = {
  padding: "11px 18px",
  borderRadius: 14,
  border: "1px solid #d4af37",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4b12",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "0 4px 12px rgba(212,175,55,0.20)",
  whiteSpace: "nowrap" as const
}

const secondaryBtn = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  color: "#555",
  cursor: "pointer",
  fontWeight: 500
}

const primaryBtnSmall = {
  padding: "11px 16px",
  borderRadius: 12,
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4b12",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  boxShadow:
    "0 5px 15px rgba(212,175,55,0.20)"
}

const primaryBtnCreate = {
  padding: "12px 25px",
  borderRadius: 14,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  color: "#5f4b12",
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
  color: "#80691d",
  cursor: "pointer",
  fontWeight: 500
}

/* =========================
   FILTROS
========================= */

const filters = {
  display: "flex",
  gap: 12,
  marginBottom: 30,
  flexWrap: "wrap" as const,
  width: "100%"
}

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
  boxSizing: "border-box" as const,
  outline: "none"
}

/* =========================
   GRID
========================= */

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(240px,1fr))",
  gap: 20,
  width: "100%"
}

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
  fontWeight: 600,
  fontSize: 13
}

const name = {
  fontWeight: 600,
  color: "#333",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  paddingRight: 35
}

const muted = {
  color: "#888",
  fontSize: 13,
  marginTop: 4
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
  background: "#eee",
  borderRadius: 999,
  overflow: "hidden" as const
}

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)"
}

/* =========================
   MODAL
========================= */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.30)",
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
  maxWidth: 480,
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto" as const,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.16)",
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 20
}

const modalTitle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: "#292929"
}

const modalSubtitle = {
  display: "block",
  marginTop: 3,
  fontSize: 12,
  color: "#999"
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
  cursor: "pointer",
  flexShrink: 0
}

/* =========================
   SEÇÕES DO POPUP
========================= */

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 6,
  marginBottom: 14,
  paddingBottom: 8,
  borderBottom: "1px solid #eee",
  color: "#b8962e",
  fontSize: 14,
  fontWeight: 600
}

const editIcon = {
  width: 30,
  height: 30,
  borderRadius: 9,
  border: "1px solid #eadfbf",
  background: "#fffbe6",
  color: "#a58222",
  cursor: "pointer",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}

const infoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  columnGap: 20
}

const measureGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  columnGap: 16
}

const info = {
  marginBottom: 13,
  minWidth: 0
}

const infoValue = {
  marginTop: 3,
  wordBreak: "break-word" as const,
  color: "#333",
  fontSize: 14
}

const pointsBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  padding: 14,
  marginTop: 8,
  marginBottom: 4,
  background: "#fcfbf7",
  border: "1px solid #f1ead7",
  borderRadius: 14
}

const pointsLabel = {
  display: "block",
  fontSize: 11,
  color: "#999",
  marginBottom: 3
}

const pointsValue = {
  color: "#b8962e",
  fontSize: 16
}

const couponValue = {
  color: "#b8962e",
  fontSize: 16
}

/* =========================
   AÇÕES
========================= */

const modalActions = {
  display: "flex",
  gap: 10,
  marginTop: 20,
  justifyContent: "center",
  flexWrap: "wrap" as const
}

const createActions = {
  display: "flex",
  justifyContent: "center",
  marginTop: 8
}

const editTwoColumns = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  columnGap: 10
}