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

  if (ordenacao === "ranking" || ordenacao === "pontos") {
    lista.sort((a, b) => b.pontos - a.pontos)
  }

  if (ordenacao === "alfabetica") {
    lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  lista = lista
    .filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase())
    )
    .filter(c => !cidadeFiltro || c.cidade === cidadeFiltro)
    .filter(c => !estadoFiltro || c.estado === estadoFiltro)

  function fecharModal() {
    setSelected(null)
    setCreating(false)
    setEditing(false)
  }

  return (
    <div style={container} className="clientes-container">
      {/* HEADER */}

      <div style={header} className="clientes-header">
        <div className="clientes-header-left">
          <h1 style={title}>Clientes</h1>

          <div className="clientes-search">
            <span style={searchIcon}>⌕</span>

            <input
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={searchInput}
            />
          </div>
        </div>

        <button
          style={primaryBtn}
          className="novo-cliente-btn"
          onClick={() => {
            setNovo({})
            setCreating(true)
          }}
        >
          + Novo cliente
        </button>
      </div>

      {/* FILTROS */}

      <div style={filters} className="clientes-filters">
        <select
          value={cidadeFiltro}
          onChange={e => setCidadeFiltro(e.target.value)}
          style={select}
        >
          <option value="">Todas as cidades</option>

          {cidades.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value)}
          style={select}
        >
          <option value="">Todos os estados</option>

          {estados.map(e => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <select
          value={ordenacao}
          onChange={e => setOrdenacao(e.target.value)}
          style={select}
        >
          <option value="ranking">Ranking</option>
          <option value="alfabetica">A–Z</option>
          <option value="pontos">Pontos</option>
        </select>
      </div>

      {/* CONTADOR */}

      <div style={resultInfo}>
        <span>
          {lista.length}{" "}
          {lista.length === 1 ? "cliente encontrado" : "clientes encontrados"}
        </span>
      </div>

      {/* CLIENTES */}

      <div style={grid} className="clientes-grid">
        {lista.map((c, index) => {
          const { cupons, resto } = calc(c.pontos)
          const pct = (resto / 10) * 100

          return (
            <div
              key={c.id}
              style={card}
              className="cliente-card"
              onClick={() => {
                setSelected(c)
                setForm(c)
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform =
                  "translateY(-3px)"

                e.currentTarget.style.boxShadow =
                  "0 12px 30px rgba(0,0,0,0.07)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform =
                  "translateY(0)"

                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.03)"
              }}
            >
              {ordenacao === "ranking" && index < 3 && (
                <span style={rank}>
                  #{index + 1}
                </span>
              )}

              <div style={avatar}>
                {c.nome
                  ? c.nome.charAt(0).toUpperCase()
                  : "?"}
              </div>

              <div style={name}>
                {c.nome}
              </div>

              <div style={muted}>
                {c.cidade || "Cidade não informada"}
              </div>

              <div style={cardBottom}>
                <div style={coupon}>
                  🎟 {cupons} cupom{cupons !== 1 ? "s" : ""}
                </div>

                <span style={points}>
                  {resto}/10 pts
                </span>
              </div>

              <div style={progressBg}>
                <div
                  style={{
                    ...progressFill,
                    width: `${pct}%`
                  }}
                />
              </div>
            </div>
          )
        })}

        {lista.length === 0 && (
          <div style={emptyState}>
            <div style={emptyIcon}>⌕</div>

            <strong>Nenhum cliente encontrado</strong>

            <span>
              Tente alterar os filtros ou a busca.
            </span>
          </div>
        )}
      </div>

      {/* MODAL */}

      {(selected || creating) && (
        <div
          style={overlay}
          onClick={fecharModal}
        >
          <div
            style={modal}
            className="cliente-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* VISUALIZAÇÃO */}

            {selected && !editing && (
              <>
                <div style={modalHeader}>
                  <div style={profileHeader}>
                    <div style={modalAvatar}>
                      {selected.nome
                        ? selected.nome
                            .charAt(0)
                            .toUpperCase()
                        : "?"}
                    </div>

                    <div>
                      <h2 style={modalTitle}>
                        {selected.nome}
                      </h2>

                      <span style={modalSubtitle}>
                        Cliente desde{" "}
                        {formatarData(
                          selected.criadoEm
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <div style={pointsBox}>
                  <div>
                    <span style={pointsBoxLabel}>
                      Pontos disponíveis
                    </span>

                    <strong style={pointsBoxValue}>
                      ⭐ {selected.pontos}
                    </strong>
                  </div>

                  <div style={couponBox}>
                    🎟 {calc(selected.pontos).cupons} cupons
                  </div>
                </div>

                <div style={sectionTitle}>
                  Dados pessoais
                </div>

                <div style={infoGrid}>
                  <Info
                    label="CPF"
                    value={selected.cpf || "-"}
                  />

                  <Info
                    label="Celular"
                    value={selected.celular || "-"}
                  />

                  <Info
                    label="Cidade"
                    value={selected.cidade || "-"}
                  />

                  <Info
                    label="Estado"
                    value={selected.estado || "-"}
                  />
                </div>

                <Info
                  label="Endereço"
                  value={
                    [
                      selected.rua,
                      selected.CEP,
                      selected.Complemento
                    ]
                      .filter(Boolean)
                      .join(" • ") || "-"
                  }
                />

                <div style={sectionTitle}>
                  Medidas e tamanhos
                </div>

                <div style={measureGrid}>
                  <Measure
                    label="Saia"
                    value={selected.tamanhoSaia}
                  />

                  <Measure
                    label="Vestido"
                    value={selected.tamanhoVestido}
                  />

                  <Measure
                    label="Blusa"
                    value={selected.tamanhoBlusa}
                  />

                  <Measure
                    label="Busto"
                    value={selected.busto}
                  />

                  <Measure
                    label="Quadril"
                    value={selected.quadril}
                  />

                  <Measure
                    label="Cintura"
                    value={selected.cintura}
                  />
                </div>

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
                      Atualize os dados abaixo
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <FormInput
                  placeholder="Nome"
                  value={form.nome}
                  onChange={value =>
                    setForm({
                      ...form,
                      nome: value
                    })
                  }
                />

                <FormInput
                  placeholder="CPF"
                  value={form.cpf}
                  onChange={value =>
                    setForm({
                      ...form,
                      cpf: value
                    })
                  }
                />

                <FormInput
                  placeholder="Celular"
                  value={form.celular}
                  onChange={value =>
                    setForm({
                      ...form,
                      celular: value
                    })
                  }
                />

                <FormInput
                  placeholder="Rua"
                  value={form.rua}
                  onChange={value =>
                    setForm({
                      ...form,
                      rua: value
                    })
                  }
                />

                <div style={formGrid}>
                  <FormInput
                    placeholder="Cidade"
                    value={form.cidade}
                    onChange={value =>
                      setForm({
                        ...form,
                        cidade: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Estado"
                    value={form.estado}
                    onChange={value =>
                      setForm({
                        ...form,
                        estado: value
                      })
                    }
                  />
                </div>

                <div style={sectionTitle}>
                  Medidas e tamanhos
                </div>

                <div style={formGrid}>
                  <FormInput
                    placeholder="Tamanho saia"
                    value={form.tamanhoSaia}
                    onChange={value =>
                      setForm({
                        ...form,
                        tamanhoSaia: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Tamanho vestido"
                    value={form.tamanhoVestido}
                    onChange={value =>
                      setForm({
                        ...form,
                        tamanhoVestido: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Tamanho blusa"
                    value={form.tamanhoBlusa}
                    onChange={value =>
                      setForm({
                        ...form,
                        tamanhoBlusa: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Busto"
                    value={form.busto}
                    onChange={value =>
                      setForm({
                        ...form,
                        busto: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Quadril"
                    value={form.quadril}
                    onChange={value =>
                      setForm({
                        ...form,
                        quadril: value
                      })
                    }
                  />
                </div>

                <div style={modalActions}>
                  <button
                    style={secondaryBtn}
                    onClick={() =>
                      setEditing(false)
                    }
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
                      Cadastre um novo cliente
                    </span>
                  </div>

                  <button
                    style={closeBtn}
                    onClick={fecharModal}
                  >
                    ×
                  </button>
                </div>

                <FormInput
                  placeholder="Nome *"
                  value={novo.nome}
                  onChange={value =>
                    setNovo({
                      ...novo,
                      nome: value
                    })
                  }
                />

                <FormInput
                  placeholder="CPF"
                  value={novo.cpf}
                  onChange={value =>
                    setNovo({
                      ...novo,
                      cpf: value
                    })
                  }
                />

                <FormInput
                  placeholder="Celular"
                  value={novo.celular}
                  onChange={value =>
                    setNovo({
                      ...novo,
                      celular: value
                    })
                  }
                />

                <FormInput
                  placeholder="Rua"
                  value={novo.rua}
                  onChange={value =>
                    setNovo({
                      ...novo,
                      rua: value
                    })
                  }
                />

                <div style={formGrid}>
                  <FormInput
                    placeholder="Cidade"
                    value={novo.cidade}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        cidade: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Estado"
                    value={novo.estado}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        estado: value
                      })
                    }
                  />
                </div>

                <div style={sectionTitle}>
                  Medidas e tamanhos
                </div>

                <div style={formGrid}>
                  <FormInput
                    placeholder="Tamanho saia"
                    value={novo.tamanhoSaia}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        tamanhoSaia: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Tamanho vestido"
                    value={novo.tamanhoVestido}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        tamanhoVestido: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Tamanho blusa"
                    value={novo.tamanhoBlusa}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        tamanhoBlusa: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Busto"
                    value={novo.busto}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        busto: value
                      })
                    }
                  />

                  <FormInput
                    placeholder="Quadril"
                    value={novo.quadril}
                    onChange={value =>
                      setNovo({
                        ...novo,
                        quadril: value
                      })
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

      {/* RESPONSIVIDADE */}

      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .clientes-container {
            overflow-x: hidden;
          }

          .clientes-header-left {
            display: flex;
            align-items: center;
            gap: 18px;
            min-width: 0;
          }

          .clientes-search {
            display: flex;
            align-items: center;
            width: 230px;
            height: 40px;
            background: #fff;
            border: 1px solid #e5e5e5;
            border-radius: 12px;
            padding: 0 11px;
          }

          .clientes-search:focus-within {
            border-color: #d4af37;
            box-shadow: 0 0 0 3px rgba(212,175,55,0.10);
          }

          .novo-cliente-btn {
            color: #7d641c;
            font-weight: 600;
          }

          .clientes-filters {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
          }

          .cliente-card {
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          }

          @media (max-width: 700px) {

            .clientes-header {
              align-items: flex-start !important;
              gap: 14px !important;
              margin-bottom: 18px !important;
            }

            .clientes-header-left {
              width: 100%;
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 12px;
            }

            .clientes-search {
              width: 100%;
              min-width: 0;
            }

            .novo-cliente-btn {
              width: 100%;
              height: 44px;
            }

            .clientes-filters {
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              margin-bottom: 18px !important;
            }

            .clientes-filters select {
              min-width: 0 !important;
              width: 100%;
            }

            .clientes-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }

            .cliente-card {
              padding: 16px !important;
            }

            .cliente-modal {
              width: calc(100vw - 24px) !important;
              max-height: calc(100vh - 24px) !important;
              padding: 18px !important;
              border-radius: 18px !important;
            }
          }

          @media (max-width: 420px) {

            .clientes-header-left {
              grid-template-columns: 1fr;
            }

            .clientes-header-left h1 {
              font-size: 28px !important;
            }

            .clientes-filters {
              grid-template-columns: 1fr !important;
            }

            .cliente-modal {
              width: calc(100vw - 16px) !important;
              max-height: calc(100vh - 16px) !important;
              padding: 16px !important;
            }
          }
        `}
      </style>
    </div>
  )
}

/* =========================
   COMPONENTES
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

function Measure({
  label,
  value
}: {
  label: string
  value?: string
}) {
  return (
    <div style={measure}>
      <span style={measureLabel}>
        {label}
      </span>

      <strong style={measureValue}>
        {value || "-"}
      </strong>
    </div>
  )
}

function FormInput({
  placeholder,
  value,
  onChange
}: {
  placeholder: string
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <input
      style={inputSpacing}
      placeholder={placeholder}
      value={value || ""}
      onChange={e =>
        onChange(e.target.value)
      }
    />
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
  marginBottom: 24,
  flexWrap: "wrap" as const
}

const title = {
  fontSize: 32,
  fontWeight: 500,
  margin: 0,
  color: "#222"
}

const searchIcon = {
  color: "#999",
  fontSize: 20,
  marginRight: 5,
  lineHeight: 1
}

const searchInput = {
  border: "none",
  outline: "none",
  width: "100%",
  minWidth: 0,
  background: "transparent",
  fontSize: 13,
  color: "#333"
}

const resultInfo = {
  color: "#888",
  fontSize: 12,
  marginBottom: 14
}

/* =========================
   BOTÕES
========================= */

const primaryBtn = {
  padding: "11px 18px",
  borderRadius: 13,
  border: "1px solid #d4af37",
  background:
    "linear-gradient(135deg,#d4af37,#f3d76b)",
  cursor: "pointer",
  boxShadow:
    "0 5px 15px rgba(212,175,55,0.20)",
  whiteSpace: "nowrap" as const,
  transition: "0.2s",
  color: "#6f5715",
  fontWeight: 600
}

const secondaryBtn = {
  padding: "10px 15px",
  borderRadius: 11,
  border: "1px solid #ddd",
  background: "#fafafa",
  cursor: "pointer",
  color: "#555"
}

const primaryBtnSmall = {
  padding: "10px 16px",
  borderRadius: 11,
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  border: "none",
  cursor: "pointer",
  color: "#604d10",
  fontWeight: 600
}

const primaryBtnCreate = {
  width: "100%",
  padding: "13px 24px",
  borderRadius: 12,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  boxShadow:
    "0 7px 18px rgba(212,175,55,0.23)",
  cursor: "pointer",
  color: "#604d10",
  fontWeight: 600
}

const whatsBtn = {
  padding: "10px 15px",
  borderRadius: 11,
  border: "1px solid #e6e0c9",
  background: "#fffbe6",
  cursor: "pointer",
  color: "#75601e"
}

/* =========================
   FILTROS
========================= */

const filters = {
  display: "grid",
  gridTemplateColumns: "repeat(3,1fr)",
  gap: 10,
  marginBottom: 18,
  width: "100%"
}

const inputSpacing = {
  padding: 12,
  borderRadius: 11,
  border: "1px solid #e5e5e5",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box" as const,
  background: "#fff",
  outline: "none",
  marginBottom: 10,
  fontSize: 13
}

const select = {
  padding: 11,
  borderRadius: 11,
  border: "1px solid #e5e5e5",
  width: "100%",
  minWidth: 0,
  background: "#fff",
  boxSizing: "border-box" as const,
  color: "#555",
  outline: "none"
}

/* =========================
   GRID
========================= */

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill,minmax(240px,1fr))",
  gap: 16,
  width: "100%"
}

const card = {
  background: "#fff",
  padding: 18,
  borderRadius: 17,
  border: "1px solid #eee",
  cursor: "pointer",
  transition: "0.25s",
  position: "relative" as const,
  minWidth: 0,
  boxSizing: "border-box" as const
}

const avatar = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  background:
    "linear-gradient(135deg,#f8edbc,#d4af37)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#715914",
  fontWeight: 600,
  marginBottom: 12
}

const rank = {
  position: "absolute" as const,
  top: 14,
  right: 14,
  color: "#b8962e",
  fontSize: 12,
  fontWeight: 600
}

const name = {
  fontWeight: 600,
  fontSize: 16,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  paddingRight: 35,
  color: "#222"
}

const muted = {
  color: "#888",
  fontSize: 13,
  marginTop: 4
}

const mutedSmall = {
  fontSize: 11,
  color: "#999"
}

const cardBottom = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 14
}

const coupon = {
  color: "#b8962e",
  fontSize: 13,
  fontWeight: 500
}

const points = {
  color: "#999",
  fontSize: 11
}

const progressBg = {
  height: 6,
  background: "#eee",
  borderRadius: 999,
  overflow: "hidden" as const,
  marginTop: 8
}

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  borderRadius: 999,
  transition: "width 0.3s"
}

const emptyState = {
  gridColumn: "1 / -1",
  background: "#fff",
  borderRadius: 16,
  padding: 45,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "#777",
  border: "1px solid #eee"
}

const emptyIcon = {
  fontSize: 30,
  color: "#d4af37",
  marginBottom: 5
}

/* =========================
   MODAL
========================= */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(20,20,20,0.35)",
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
    "0 25px 70px rgba(0,0,0,0.18)",
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 20
}

const profileHeader = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0
}

const modalAvatar = {
  width: 48,
  height: 48,
  minWidth: 48,
  borderRadius: "50%",
  background:
    "linear-gradient(135deg,#f8edbc,#d4af37)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#715914",
  fontWeight: 600,
  fontSize: 18
}

const modalTitle = {
  margin: 0,
  fontSize: 21,
  fontWeight: 600,
  color: "#222",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const
}

const modalSubtitle = {
  display: "block",
  marginTop: 3,
  fontSize: 11,
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
  fontSize: 23,
  lineHeight: 1,
  cursor: "pointer"
}

const pointsBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: 15,
  borderRadius: 14,
  background: "#fffbe9",
  border: "1px solid #f1e5b9",
  marginBottom: 20
}

const pointsBoxLabel = {
  display: "block",
  fontSize: 11,
  color: "#9a823d",
  marginBottom: 4
}

const pointsBoxValue = {
  fontSize: 20,
  color: "#8b6d1d"
}

const couponBox = {
  padding: "8px 11px",
  borderRadius: 10,
  background: "#fff",
  color: "#9b7b2f",
  fontSize: 12,
  border: "1px solid #eadfb9"
}

const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#b8962e",
  marginTop: 20,
  marginBottom: 13,
  paddingBottom: 8,
  borderBottom: "1px solid #eee"
}

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8
}

const info = {
  marginBottom: 10,
  minWidth: 0
}

const infoValue = {
  marginTop: 3,
  wordBreak: "break-word" as const,
  color: "#333",
  fontSize: 13
}

const measureGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,1fr)",
  gap: 8
}

const measure = {
  background: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 11,
  padding: 10,
  minWidth: 0
}

const measureLabel = {
  display: "block",
  fontSize: 10,
  color: "#999",
  marginBottom: 4
}

const measureValue = {
  fontSize: 13,
  color: "#444",
  wordBreak: "break-word" as const
}

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
}

const modalActions = {
  display: "flex",
  gap: 8,
  marginTop: 20,
  justifyContent: "flex-end",
  flexWrap: "wrap" as const
}

const createActions = {
  display: "flex",
  justifyContent: "center",
  marginTop: 8
}