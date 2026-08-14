import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  pontos: number
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

type Props = {
  compraSelecionada?: {
    clienteid: string
    cliente: string
  } | null
}

export default function Compras({ compraSelecionada }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])

  const [modal, setModal] = useState(false)
  const [modalInativos, setModalInativos] = useState(false)

  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)

  const [buscaCliente, setBuscaCliente] = useState("")
  const [buscaVenda, setBuscaVenda] = useState("")
  const [filtroMes, setFiltroMes] = useState("todos")
  const [filtroPagamento, setFiltroPagamento] = useState("todos")

  const [valor, setValor] = useState(0)
  const [pagamento, setPagamento] = useState("Pix")
  const [parcelas, setParcelas] = useState(1)

  const [usarCupom, setUsarCupom] = useState(false)

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,cpf,pontos")
      .order("nome")

    if (error) {
      alert("Erro clientes: " + error.message)
      return
    }

    if (data) {
      setClientes(
        data.map((c: any) => ({
          id: String(c.id),
          nome: c.nome || "",
          cpf: c.cpf || "",
          pontos: Number(c.pontos || 0)
        }))
      )
    }
  }

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", { ascending: false })

    if (error) {
      alert("Erro compras: " + error.message)
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

  useEffect(() => {
    if (compraSelecionada && clientes.length > 0) {
      const cliente = clientes.find(
        c => c.id === compraSelecionada.clienteid
      )

      if (cliente) {
        setClienteSel(cliente)
        setModal(true)
      }
    }
  }, [compraSelecionada, clientes])

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  )

  const cupomsDisponiveis = clienteSel
    ? Math.floor(clienteSel.pontos / 10)
    : 0

  const saldoCupom = cupomsDisponiveis * 150

  const valorCupom = usarCupom
    ? Math.min(saldoCupom, valor)
    : 0

  const valorRestante = valor - valorCupom

  const pontosGerados = Math.floor(valor / 150)

  const precisaOutroPagamento = valorRestante > 0

  async function registrarCompra() {
    if (!clienteSel) {
      alert("Selecione um cliente")
      return
    }

    if (valor <= 0) {
      alert("Digite um valor válido")
      return
    }

    const pagamentoFinal =
      valorCupom > 0
        ? precisaOutroPagamento
          ? `${pagamento} + Cupom`
          : "Cupom"
        : pagamento

    const { data: compraCriada, error } = await supabase
      .from("compras")
      .insert([
        {
          clienteid: clienteSel.id,
          cliente: clienteSel.nome,
          cpf: clienteSel.cpf,
          valor: valor,
          pagamento: pagamentoFinal,
          parcelas: parcelas,
          pontosgerados: pontosGerados,
          cupomusado: valorCupom,
          criadoem: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      alert("Erro compra: " + error.message)
      return
    }

    const pontosUsados = Math.ceil(valorCupom / 150) * 10

    const novosPontos =
      clienteSel.pontos - pontosUsados + pontosGerados

    const { error: erroCliente } = await supabase
      .from("clientes")
      .update({
        pontos: novosPontos
      })
      .eq("id", clienteSel.id)

    if (erroCliente) {
      alert("Erro ao atualizar cliente: " + erroCliente.message)
      return
    }

    if (valorCupom > 0) {
      const quantidadeCupons = Math.ceil(valorCupom / 150)

      const {
        count: cuponsAnteriores,
        error: countError
      } = await supabase
        .from("trocas")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq("clienteid", clienteSel.id)

      if (countError) {
        alert(
          "Erro ao contar cupons anteriores: " +
            countError.message
        )
        return
      }

      const trocas = Array.from(
        { length: quantidadeCupons },
        (_, i) => ({
          clienteid: clienteSel.id,
          cliente: clienteSel.nome,
          cpf: clienteSel.cpf,
          compraid: compraCriada.id,
          cupomnumero: (cuponsAnteriores || 0) + i + 1,
          valorcupom: 150,
          tipo: "Cupom Fidelidade",
          status: "Concluído",
          criadoem: new Date().toISOString()
        })
      )

      const { error: erroTrocas } = await supabase
        .from("trocas")
        .insert(trocas)

      if (erroTrocas) {
        alert(
          "Compra salva, mas erro ao registrar trocas: " +
            erroTrocas.message
        )
      }
    }

    alert("Compra registrada com sucesso!")

    setModal(false)
    setClienteSel(null)
    setValor(0)
    setPagamento("Pix")
    setParcelas(1)
    setUsarCupom(false)
    setBuscaCliente("")

    fetchClientes()
    fetchCompras()
  }

  const comprasFiltradas = useMemo(() => {
    return compras.filter(compra => {
      const nomeMatch =
        compra.cliente
          .toLowerCase()
          .includes(buscaVenda.toLowerCase()) ||
        compra.cpf.includes(buscaVenda)

      const data = new Date(compra.criadoem)

      const mesCompra = String(
        data.getMonth() + 1
      ).padStart(2, "0")

      const mesMatch =
        filtroMes === "todos" ||
        filtroMes === mesCompra

      const pagamentoMatch =
        filtroPagamento === "todos" ||
        compra.pagamento.includes(filtroPagamento)

      return (
        nomeMatch &&
        mesMatch &&
        pagamentoMatch
      )
    })
  }, [
    compras,
    buscaVenda,
    filtroMes,
    filtroPagamento
  ])

  const vendasPorMes = useMemo(() => {
    const mapa: Record<string, number> = {}

    compras.forEach(compra => {
      const data = new Date(compra.criadoem)

      const mes = String(
        data.getMonth() + 1
      ).padStart(2, "0")

      if (
        filtroMes !== "todos" &&
        mes !== filtroMes
      ) {
        return
      }

      const chave =
        `${mes}/${data.getFullYear()}`

      mapa[chave] =
        (mapa[chave] || 0) + compra.valor
    })

    return Object.entries(mapa).sort((a, b) =>
      b[0].localeCompare(a[0])
    )
  }, [compras, filtroMes])

  const hoje = new Date()

  const clientesInativos = clientes.filter(c => {
    const ult = compras.find(
      x => x.cpf === c.cpf
    )

    if (!ult) return true

    const dias =
      (hoje.getTime() -
        new Date(ult.criadoem).getTime()) /
      86400000

    return dias > 30
  })

  function getUltimaCompra(cpf: string) {
    return compras.find(c => c.cpf === cpf)
  }

  return (
    <div style={container}>

      {clientesInativos.length > 0 && (
        <div style={notifBar}>
          <span>
            🔔 {clientesInativos.length} clientes inativos
          </span>

          <button
            style={notifBtn}
            onClick={() =>
              setModalInativos(true)
            }
          >
            ver
          </button>
        </div>
      )}

      <div style={header}>
        <div>
          <h1 style={title}>Compras</h1>
        </div>

        <button
          style={btnSmall}
          onClick={() => setModal(true)}
        >
          Nova compra
        </button>
      </div>

      {/* KPIs */}
      <div style={dashGrid}>
        <Dash
          label="Faturamento"
          value={`R$ ${comprasFiltradas
            .reduce(
              (a, c) => a + c.valor,
              0
            )
            .toFixed(2)}`}
        />

        <Dash
          label="Vendas"
          value={comprasFiltradas.length}
        />

        <Dash
          label="Clientes"
          value={
            new Set(
              comprasFiltradas.map(
                c => c.cpf
              )
            ).size
          }
        />
      </div>

      {/* FATURAMENTO POR MÊS */}
      <div style={section}>
        <h3 style={sectionTitle}>
          Faturamento por mês
        </h3>

        <div style={mesGrid}>
          {vendasPorMes.map(
            ([mes, total]) => (
              <div
                key={mes}
                style={mesCard}
              >
                <strong>{mes}</strong>

                <div style={mesValor}>
                  R$ {total.toFixed(2)}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div style={filtrosBar}>

        <input
          placeholder="Buscar por cliente ou CPF"
          value={buscaVenda}
          onChange={e =>
            setBuscaVenda(e.target.value)
          }
          style={inputFiltro}
        />

        <select
          value={filtroMes}
          onChange={e =>
            setFiltroMes(e.target.value)
          }
          style={selectFiltro}
        >
          <option value="todos">
            Todos os meses
          </option>
          <option value="01">Janeiro</option>
          <option value="02">Fevereiro</option>
          <option value="03">Março</option>
          <option value="04">Abril</option>
          <option value="05">Maio</option>
          <option value="06">Junho</option>
          <option value="07">Julho</option>
          <option value="08">Agosto</option>
          <option value="09">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>

        <select
          value={filtroPagamento}
          onChange={e =>
            setFiltroPagamento(
              e.target.value
            )
          }
          style={selectFiltro}
        >
          <option value="todos">
            Todos pagamentos
          </option>
          <option value="Pix">
            Pix
          </option>
          <option value="Dinheiro">
            Dinheiro
          </option>
          <option value="Cartão">
            Cartão
          </option>
          <option value="Cupom">
            Cupom
          </option>
        </select>

      </div>

      {/* HISTÓRICO */}
      <div style={section}>
        <h3 style={sectionTitle}>
          Histórico de vendas
        </h3>

        <div style={listaCompras}>

          {comprasFiltradas.length === 0 && (
            <div style={emptyState}>
              Nenhuma venda encontrada.
            </div>
          )}

          {comprasFiltradas.map(
            compra => (
              <div
                key={compra.id}
                style={compraCard}
              >

                <div style={compraCliente}>
                  <strong>
                    {compra.cliente}
                  </strong>

                  <div style={muted}>
                    {compra.cpf}
                  </div>
                </div>

                <div style={compraInfo}>
                  <span style={mobileLabel}>
                    Valor
                  </span>

                  <strong>
                    R$ {compra.valor.toFixed(2)}
                  </strong>

                  <div style={muted}>
                    {new Date(
                      compra.criadoem
                    ).toLocaleDateString(
                      "pt-BR"
                    )}
                  </div>
                </div>

                <div style={compraInfo}>
                  <span style={mobileLabel}>
                    Pagamento
                  </span>

                  <div>
                    {compra.pagamento}
                  </div>

                  <div style={muted}>
                    {compra.parcelas}x
                  </div>
                </div>

                <div style={compraInfo}>
                  <span style={mobileLabel}>
                    Fidelidade
                  </span>

                  <div>
                    +{compra.pontosgerados} pts
                  </div>

                  <div style={muted}>
                    Cupom: R${" "}
                    {compra.cupomusado.toFixed(2)}
                  </div>
                </div>

              </div>
            )
          )}

        </div>
      </div>

      {/* MODAL NOVA COMPRA */}
      {modal && (
        <div
          style={overlay}
          onClick={() => setModal(false)}
        >
          <div
            style={modalCard}
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div style={modalHeader}>
              <h2 style={modalTitle}>
                Nova compra
              </h2>

              <button
                style={closeBtn}
                onClick={() =>
                  setModal(false)
                }
              >
                ×
              </button>
            </div>

            <input
              placeholder="Buscar cliente"
              value={buscaCliente}
              onChange={e =>
                setBuscaCliente(
                  e.target.value
                )
              }
              style={input}
            />

            <div style={clienteGrid}>
              {clientesFiltrados.map(c => (
                <div
                  key={c.id}
                  style={{
                    ...clienteCard,
                    border:
                      clienteSel?.id === c.id
                        ? "2px solid #d4af37"
                        : "1px solid #eee"
                  }}
                  onClick={() =>
                    setClienteSel(c)
                  }
                >
                  {c.nome}
                </div>
              ))}
            </div>

            {clienteSel && (
              <>
                <div style={cupomRow}>

                  <span>
                    Cupons disponíveis:{" "}
                    <strong>
                      {cupomsDisponiveis}
                    </strong>{" "}
                    (R$ {saldoCupom})
                  </span>

                  {cupomsDisponiveis > 0 && (
                    <label style={cupomLabel}>
                      usar cupom

                      <input
                        type="checkbox"
                        checked={usarCupom}
                        onChange={() =>
                          setUsarCupom(
                            !usarCupom
                          )
                        }
                      />
                    </label>
                  )}

                </div>

                <input
                  type="number"
                  placeholder="Valor"
                  style={input}
                  value={valor || ""}
                  onChange={e =>
                    setValor(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

                <select
                  style={input}
                  value={pagamento}
                  onChange={e =>
                    setPagamento(
                      e.target.value
                    )
                  }
                >
                  <option>Pix</option>
                  <option>Dinheiro</option>
                  <option>Cartão</option>
                </select>

                {pagamento === "Cartão" && (
                  <select
                    style={input}
                    value={parcelas}
                    onChange={e =>
                      setParcelas(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >
                    <option value={1}>
                      1x
                    </option>
                    <option value={2}>
                      2x
                    </option>
                    <option value={3}>
                      3x
                    </option>
                    <option value={4}>
                      4x
                    </option>
                    <option value={5}>
                      5x
                    </option>
                  </select>
                )}

                <div style={resumo}>
                  Valor final:{" "}
                  <strong>
                    R${" "}
                    {valorRestante.toFixed(
                      2
                    )}
                  </strong>

                  <br />

                  Cupom usado:{" "}
                  <strong>
                    R${" "}
                    {valorCupom.toFixed(
                      2
                    )}
                  </strong>

                  <br />

                  Pontos gerados:{" "}
                  <strong>
                    {pontosGerados}
                  </strong>
                </div>

                <button
                  style={btnPrimary}
                  onClick={
                    registrarCompra
                  }
                >
                  Finalizar compra
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL INATIVOS */}
      {modalInativos && (
        <div
          style={overlay}
          onClick={() =>
            setModalInativos(false)
          }
        >
          <div
            style={modalCard}
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div style={modalHeader}>
              <h3 style={modalTitle}>
                Clientes inativos
              </h3>

              <button
                style={closeBtn}
                onClick={() =>
                  setModalInativos(false)
                }
              >
                ×
              </button>
            </div>

            {clientesInativos.map(c => {
              const ult =
                getUltimaCompra(c.cpf)

              return (
                <div
                  key={c.id}
                  style={inativoRow}
                >
                  <strong>
                    {c.nome}
                  </strong>

                  <div style={muted}>
                    Última compra:{" "}
                    {ult
                      ? new Date(
                          ult.criadoem
                        ).toLocaleDateString(
                          "pt-BR"
                        )
                      : "Nunca"}
                  </div>
                </div>
              )
            })}

          </div>
        </div>
      )}

    </div>
  )
}

/* =========================
   COMPONENTE KPI
========================= */

function Dash({
  label,
  value
}: any) {
  return (
    <div style={dash}>
      <div style={dashLabel}>
        {label}
      </div>

      <strong style={dashValue}>
        {value}
      </strong>
    </div>
  )
}

/* =========================
   ESTILOS
========================= */

const container = {
  width: "100%",
  minWidth: 0,
  minHeight: "100%",
  padding: 40,
  background: "#f6f6f7",
  fontFamily: "Inter",
  overflowX: "hidden" as const
}

const section = {
  width: "100%",
  minWidth: 0,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  overflow: "hidden" as const
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 18
}

const notifBar = {
  width: "100%",
  background: "#fff6d6",
  padding: "10px 14px",
  borderRadius: 10,
  marginBottom: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  flexWrap: "wrap" as const
}

const notifBtn = {
  border: "none",
  background: "transparent",
  color: "#b8962e",
  cursor: "pointer",
  fontWeight: 600
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 20,
  flexWrap: "wrap" as const
}

const title = {
  fontSize: 30,
  margin: 0
}

const btnSmall = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 10,
  marginBottom: 20
}

const dash = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  minWidth: 0,
  overflow: "hidden" as const
}

const dashLabel = {
  color: "#777",
  fontSize: 12,
  marginBottom: 5
}

const dashValue = {
  fontSize: 24,
  wordBreak: "break-word" as const
}

const filtrosBar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(200px,2fr) minmax(140px,1fr) minmax(140px,1fr)",
  gap: 10,
  marginBottom: 20,
  width: "100%",
  minWidth: 0
}

const inputFiltro = {
  width: "100%",
  minWidth: 0,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14
}

const selectFiltro = {
  width: "100%",
  minWidth: 0,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14
}

const listaCompras = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  width: "100%",
  minWidth: 0
}

const compraCard = {
  display: "grid",
  gridTemplateColumns:
    "minmax(180px,2fr) minmax(110px,1fr) minmax(100px,1fr) minmax(110px,1fr)",
  gap: 16,
  padding: 16,
  borderRadius: 12,
  background: "#f9f9f9",
  alignItems: "center",
  minWidth: 0,
  overflow: "hidden" as const
}

const compraCliente = {
  minWidth: 0,
  overflowWrap: "anywhere" as const
}

const compraInfo = {
  minWidth: 0,
  overflowWrap: "anywhere" as const
}

const mobileLabel = {
  display: "none",
  color: "#999",
  fontSize: 11,
  marginBottom: 3
}

const mesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(120px,1fr))",
  gap: 10,
  minWidth: 0
}

const mesCard = {
  background: "#f9f9f9",
  padding: 14,
  borderRadius: 12,
  textAlign: "center" as const,
  minWidth: 0,
  overflow: "hidden" as const
}

const mesValor = {
  marginTop: 5,
  fontSize: 14,
  overflowWrap: "anywhere" as const
}

const emptyState = {
  padding: 30,
  textAlign: "center" as const,
  color: "#999",
  fontSize: 14
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 2000,
  overflowY: "auto" as const
}

const modalCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  width: "100%",
  maxWidth: 420,
  maxHeight: "90vh",
  overflowY: "auto" as const,
  overflowX: "hidden" as const
}

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 10
}

const modalTitle = {
  margin: 0
}

const closeBtn = {
  width: 34,
  height: 34,
  border: "none",
  borderRadius: "50%",
  background: "#f5f5f5",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0
}

const clienteGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
  marginTop: 10
}

const clienteCard = {
  padding: 12,
  borderRadius: 10,
  cursor: "pointer",
  background: "#fff",
  wordBreak: "break-word" as const
}

const cupomRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 10,
  flexWrap: "wrap" as const,
  fontSize: 14
}

const cupomLabel = {
  display: "flex",
  alignItems: "center",
  gap: 6
}

const resumo = {
  marginTop: 10,
  padding: 12,
  background: "#faf8f1",
  borderRadius: 10,
  lineHeight: 1.7
}

const btnPrimary = {
  width: "100%",
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  cursor: "pointer",
  fontWeight: 600
}

const inativoRow = {
  padding: 12,
  borderBottom: "1px solid #eee",
  overflowWrap: "anywhere" as const
}

const input = {
  width: "100%",
  minWidth: 0,
  padding: 10,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14
}

const muted = {
  fontSize: 12,
  color: "#888",
  marginTop: 3
}