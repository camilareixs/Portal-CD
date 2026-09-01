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
  clienteid: string | null
  cliente: string
  cpf: string
  valor: number
  pagamento: string
  parcelas: number
  pontosGerados: number
  criadoem: string
  cupomusado: number
}

type Props = {
  compraSelecionada?: {
    clienteid: string
    cliente: string
  } | null
}

const VALOR_CUPOM = 60
const PONTOS_POR_CUPOM = 10
const PONTOS_POR_REAIS = 60

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function formatarData(data: string) {
  if (!data) return "-"

  return new Date(data).toLocaleDateString("pt-BR")
}

export default function Compras({
  compraSelecionada
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])

  const [modal, setModal] = useState(false)
  const [modalInativos, setModalInativos] = useState(false)

  const [clienteSel, setClienteSel] =
    useState<Cliente | null>(null)

  const [buscaCliente, setBuscaCliente] = useState("")
  const [buscaVenda, setBuscaVenda] = useState("")
  const [filtroMes, setFiltroMes] = useState("todos")
  const [filtroPagamento, setFiltroPagamento] =
    useState("todos")

  const [valor, setValor] = useState(0)
  const [pagamento, setPagamento] = useState("Pix")
  const [parcelas, setParcelas] = useState(1)

  const [quantidadeCupons, setQuantidadeCupons] =
    useState(0)

  const [tipoCadastro, setTipoCadastro] =
    useState<"venda" | "receita">("venda")

  /* =========================
     FETCH CLIENTES
  ========================= */

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,cpf,pontos")
      .order("nome")

    if (error) {
      alert("Erro ao carregar clientes: " + error.message)
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

  /* =========================
     FETCH COMPRAS
  ========================= */

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", {
        ascending: false
      })

    if (error) {
      alert("Erro ao carregar vendas: " + error.message)
      return
    }

    if (data) {
      setCompras(
        data.map((c: any) => ({
          id: String(c.id),
          clienteid: c.clienteid
            ? String(c.clienteid)
            : null,
          cliente: c.cliente || "",
          cpf: c.cpf || "",
          valor: Number(c.valor || 0),
          pagamento: c.pagamento || "",
          parcelas: Number(c.parcelas || 1),
          pontosgerados: Number(
            c.pontosgerados || 0
          ),
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

  /* =========================
     CLIENTE VINDO DE OUTRA PÁGINA
  ========================= */

  useEffect(() => {
    if (
      compraSelecionada &&
      clientes.length > 0
    ) {
      const cliente = clientes.find(
        c =>
          c.id ===
          compraSelecionada.clienteid
      )

      if (cliente) {
        setTipoCadastro("venda")
        setClienteSel(cliente)
        setModal(true)
      }
    }
  }, [compraSelecionada, clientes])

  /* =========================
     CLIENTES FILTRADOS
  ========================= */

  const clientesFiltrados = clientes.filter(
    c =>
      c.nome
        .toLowerCase()
        .includes(
          buscaCliente.toLowerCase()
        ) ||
      c.cpf.includes(buscaCliente)
  )

  /* =========================
     CUPONS
  ========================= */

  const cuponsDisponiveis = clienteSel
    ? Math.floor(
        clienteSel.pontos /
          PONTOS_POR_CUPOM
      )
    : 0

  const quantidadeCuponsValida =
    Math.min(
      quantidadeCupons,
      cuponsDisponiveis
    )

  const valorCupom =
    tipoCadastro === "venda"
      ? Math.min(
          quantidadeCuponsValida *
            VALOR_CUPOM,
          valor
        )
      : 0

  const valorRestante =
    Math.max(
      0,
      valor - valorCupom
    )

  /* =========================
     PONTOS GERADOS
     
     A cada R$ 60 = 1 cupom = 10 pontos
  ========================= */

  const pontosGerados =
    tipoCadastro === "venda"
      ? Math.floor(
          valor / PONTOS_POR_REAIS
        )
      : 0

  /* =========================
     ABRIR NOVO CADASTRO
  ========================= */

  function abrirNovaCompra() {
    setTipoCadastro("venda")
    setClienteSel(null)
    setBuscaCliente("")
    setValor(0)
    setPagamento("Pix")
    setParcelas(1)
    setQuantidadeCupons(0)
    setModal(true)
  }

  function abrirNovaReceita() {
    setTipoCadastro("receita")
    setClienteSel(null)
    setBuscaCliente("")
    setValor(0)
    setPagamento("Receita")
    setParcelas(1)
    setQuantidadeCupons(0)
    setModal(true)
  }

  /* =========================
     FECHAR MODAL
  ========================= */

  function fecharModal() {
    setModal(false)
    setClienteSel(null)
    setBuscaCliente("")
    setValor(0)
    setPagamento("Pix")
    setParcelas(1)
    setQuantidadeCupons(0)
    setTipoCadastro("venda")
  }

  /* =========================
     REGISTRAR VENDA / RECEITA
  ========================= */

  async function registrarCompra() {
    if (valor <= 0) {
      alert("Digite um valor válido.")
      return
    }

    if (
      tipoCadastro === "venda" &&
      !clienteSel
    ) {
      alert("Selecione um cliente.")
      return
    }

    if (
      tipoCadastro === "venda" &&
      quantidadeCuponsValida >
        cuponsDisponiveis
    ) {
      alert(
        "A quantidade de cupons selecionada é maior que a disponível."
      )
      return
    }

    let pagamentoFinal = pagamento

    if (
      tipoCadastro === "venda" &&
      valorCupom > 0
    ) {
      if (valorRestante > 0) {
        pagamentoFinal =
          `${pagamento} + Cupom`
      } else {
        pagamentoFinal = "Cupom"
      }
    }

    /* =========================
       INSERIR VENDA / RECEITA
    ========================= */

    const { data: cadastroCriado, error } =
      await supabase
        .from("compras")
        .insert([
          {
            clienteid:
              tipoCadastro === "venda"
                ? clienteSel?.id
                : null,

            cliente:
              tipoCadastro === "venda"
                ? clienteSel?.nome
                : "Receita sem venda",

            cpf:
              tipoCadastro === "venda"
                ? clienteSel?.cpf
                : "",

            valor,

            pagamento:
              tipoCadastro === "receita"
                ? "Receita"
                : pagamentoFinal,

            parcelas:
              tipoCadastro === "venda"
                ? parcelas
                : 1,

            pontosgerados,

            cupomusado:
              tipoCadastro === "venda"
                ? valorCupom
                : 0,

            criadoem:
              new Date().toISOString()
          }
        ])
        .select()
        .single()

    if (error) {
      alert(
        "Erro ao registrar: " +
          error.message
      )
      return
    }

    /* =========================
       ATUALIZAR PONTOS DO CLIENTE
    ========================= */

    if (
      tipoCadastro === "venda" &&
      clienteSel
    ) {
      const pontosUsados =
        quantidadeCuponsValida *
        PONTOS_POR_CUPOM

      const novosPontos = Math.max(
        0,
        clienteSel.pontos -
          pontosUsados +
          pontosGerados
      )

      const {
        error: erroCliente
      } = await supabase
        .from("clientes")
        .update({
          pontos: novosPontos
        })
        .eq(
          "id",
          clienteSel.id
        )

      if (erroCliente) {
        alert(
          "A venda foi registrada, mas houve erro ao atualizar os pontos: " +
            erroCliente.message
        )
        return
      }

      /* =========================
         REGISTRAR CUPONS UTILIZADOS
      ========================= */

      if (
        quantidadeCuponsValida > 0
      ) {
        const {
          count: cuponsAnteriores,
          error: countError
        } = await supabase
          .from("trocas")
          .select("*", {
            count: "exact",
            head: true
          })
          .eq(
            "clienteid",
            clienteSel.id
          )

        if (countError) {
          alert(
            "A venda foi salva, mas não foi possível registrar os cupons: " +
              countError.message
          )
        } else {
          const trocas =
            Array.from(
              {
                length:
                  quantidadeCuponsValida
              },
              (_, i) => ({
                clienteid:
                  clienteSel.id,

                cliente:
                  clienteSel.nome,

                cpf:
                  clienteSel.cpf,

                compraid:
                  cadastroCriado.id,

                cupomnumero:
                  (cuponsAnteriores ||
                    0) +
                  i +
                  1,

                valorcupom:
                  VALOR_CUPOM,

                tipo:
                  "Cupom Fidelidade",

                status:
                  "Concluído",

                criadoem:
                  new Date().toISOString()
              })
            )

          const {
            error: erroTrocas
          } = await supabase
            .from("trocas")
            .insert(trocas)

          if (erroTrocas) {
            alert(
              "A venda foi salva, mas houve erro ao registrar os cupons: " +
                erroTrocas.message
            )
          }
        }
      }
    }

    alert(
      tipoCadastro === "receita"
        ? "Receita registrada com sucesso!"
        : "Venda registrada com sucesso!"
    )

    fecharModal()

    await fetchClientes()
    await fetchCompras()
  }

  /* =========================
     EXCLUIR VENDA / RECEITA
  ========================= */

  async function excluirCompra(
    compra: Compra
  ) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este registro?\n\n` +
        `${compra.cliente || "Receita sem venda"}\n` +
        `${formatarMoeda(compra.valor)}\n` +
        `${formatarData(compra.criadoem)}\n\n` +
        `Essa ação não poderá ser desfeita.`
    )

    if (!confirmar) return

    /* =========================
       DEVOLVER PONTOS AO CLIENTE
    ========================= */

    if (compra.clienteid) {
      const cliente = clientes.find(
        c =>
          c.id ===
          compra.clienteid
      )

      if (cliente) {
        const pontosDevolvidos =
          Math.floor(
            compra.cupomusado /
              VALOR_CUPOM
          ) *
          PONTOS_POR_CUPOM

        const novosPontos =
          Math.max(
            0,
            cliente.pontos -
              compra.pontosgerados +
              pontosDevolvidos
          )

        const {
          error: erroPontos
        } = await supabase
          .from("clientes")
          .update({
            pontos: novosPontos
          })
          .eq(
            "id",
            cliente.id
          )

        if (erroPontos) {
          alert(
            "Não foi possível atualizar os pontos do cliente: " +
              erroPontos.message
          )
          return
        }
      }
    }

    /* =========================
       EXCLUIR TROCAS/CUPONS
    ========================= */

    const {
      error: erroTrocas
    } = await supabase
      .from("trocas")
      .delete()
      .eq(
        "compraid",
        compra.id
      )

    if (erroTrocas) {
      alert(
        "Não foi possível excluir os cupons vinculados: " +
          erroTrocas.message
      )
      return
    }

    /* =========================
       EXCLUIR VENDA
    ========================= */

    const {
      error: erroCompra
    } = await supabase
      .from("compras")
      .delete()
      .eq(
        "id",
        compra.id
      )

    if (erroCompra) {
      alert(
        "Erro ao excluir registro: " +
          erroCompra.message
      )
      return
    }

    alert(
      "Registro excluído com sucesso!"
    )

    await fetchClientes()
    await fetchCompras()
  }

  /* =========================
     FILTROS
  ========================= */

  const comprasFiltradas =
    useMemo(() => {
      return compras.filter(
        compra => {
          const busca =
            buscaVenda
              .toLowerCase()

          const nomeMatch =
            compra.cliente
              .toLowerCase()
              .includes(busca) ||
            compra.cpf
              .toLowerCase()
              .includes(busca)

          const data =
            new Date(
              compra.criadoem
            )

          const mesCompra =
            String(
              data.getMonth() + 1
            ).padStart(2, "0")

          const mesMatch =
            filtroMes ===
              "todos" ||
            filtroMes ===
              mesCompra

          const pagamentoMatch =
            filtroPagamento ===
              "todos" ||
            compra.pagamento
              .includes(
                filtroPagamento
              )

          return (
            nomeMatch &&
            mesMatch &&
            pagamentoMatch
          )
        }
      )
    }, [
      compras,
      buscaVenda,
      filtroMes,
      filtroPagamento
    ])

  /* =========================
     FATURAMENTO POR MÊS
  ========================= */

  const vendasPorMes =
    useMemo(() => {
      const mapa: Record<
        string,
        number
      > = {}

      compras.forEach(
        compra => {
          const data =
            new Date(
              compra.criadoem
            )

          const mes =
            String(
              data.getMonth() + 1
            ).padStart(2, "0")

          if (
            filtroMes !==
              "todos" &&
            mes !== filtroMes
          ) {
            return
          }

          const chave =
            `${mes}/${data.getFullYear()}`

          mapa[chave] =
            (mapa[chave] || 0) +
            compra.valor
        }
      )

      return Object.entries(
        mapa
      ).sort((a, b) =>
        b[0].localeCompare(
          a[0]
        )
      )
    }, [
      compras,
      filtroMes
    ])

  /* =========================
     CLIENTES INATIVOS
  ========================= */

  const hoje = new Date()

  const clientesInativos =
    clientes.filter(c => {
      const comprasCliente =
        compras
          .filter(
            x =>
              x.clienteid ===
              c.id
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

      const ultima =
        comprasCliente[0]

      if (!ultima) return true

      const dias =
        (hoje.getTime() -
          new Date(
            ultima.criadoem
          ).getTime()) /
        86400000

      return dias > 30
    })

  function getUltimaCompra(
    clienteId: string
  ) {
    return compras
      .filter(
        c =>
          c.clienteid ===
          clienteId
      )
      .sort(
        (a, b) =>
          new Date(
            b.criadoem
          ).getTime() -
          new Date(
            a.criadoem
          ).getTime()
      )[0]
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div style={container}>

      {/* =========================
          CLIENTES INATIVOS
      ========================= */}

      {clientesInativos.length >
        0 && (
        <div
          style={notifBar}
        >
          <span>
            🔔{" "}
            {
              clientesInativos.length
            }{" "}
            clientes inativos
          </span>

          <button
            style={notifBtn}
            onClick={() =>
              setModalInativos(
                true
              )
            }
          >
            Ver
          </button>
        </div>
      )}

      {/* =========================
          CABEÇALHO
      ========================= */}

      <div style={header}>

        <h1 style={title}>
          Compras
        </h1>

        <div
          style={headerButtons}
        >
          <button
            style={btnSecondary}
            onClick={
              abrirNovaReceita
            }
          >
            Nova receita
          </button>

          <button
            style={btnSmall}
            onClick={
              abrirNovaCompra
            }
          >
            Nova compra
          </button>
        </div>

      </div>

      {/* =========================
          DASHBOARD
      ========================= */}

      <div style={dashGrid}>

        <Dash
          label="Faturamento"
          value={formatarMoeda(
            comprasFiltradas.reduce(
              (total, compra) =>
                total +
                compra.valor,
              0
            )
          )}
        />

        <Dash
          label="Vendas"
          value={
            comprasFiltradas.filter(
              compra =>
                compra.pagamento !==
                "Receita"
            ).length
          }
        />

        <Dash
          label="Clientes"
          value={
            new Set(
              comprasFiltradas
                .filter(
                  c =>
                    c.clienteid
                )
                .map(
                  c =>
                    c.cpf
                )
            ).size
          }
        />

      </div>

      {/* =========================
          FATURAMENTO POR MÊS
      ========================= */}

      <div style={section}>

        <h3
          style={sectionTitle}
        >
          Faturamento por mês
        </h3>

        <div style={mesGrid}>

          {vendasPorMes.length ===
            0 && (
            <div
              style={emptyText}
            >
              Nenhum registro
              encontrado.
            </div>
          )}

          {vendasPorMes.map(
            ([mes, total]) => (
              <div
                key={mes}
                style={mesCard}
              >
                <strong>
                  {mes}
                </strong>

                <div
                  style={mesValor}
                >
                  {formatarMoeda(
                    total
                  )}
                </div>
              </div>
            )
          )}

        </div>

      </div>

      {/* =========================
          FILTROS
      ========================= */}

      <div style={filtrosBar}>

        <input
          placeholder="Buscar por cliente ou CPF"
          value={buscaVenda}
          onChange={e =>
            setBuscaVenda(
              e.target.value
            )
          }
          style={inputFiltro}
        />

        <select
          value={filtroMes}
          onChange={e =>
            setFiltroMes(
              e.target.value
            )
          }
          style={selectFiltro}
        >
          <option value="todos">
            Todos os meses
          </option>

          <option value="01">
            Janeiro
          </option>

          <option value="02">
            Fevereiro
          </option>

          <option value="03">
            Março
          </option>

          <option value="04">
            Abril
          </option>

          <option value="05">
            Maio
          </option>

          <option value="06">
            Junho
          </option>

          <option value="07">
            Julho
          </option>

          <option value="08">
            Agosto
          </option>

          <option value="09">
            Setembro
          </option>

          <option value="10">
            Outubro
          </option>

          <option value="11">
            Novembro
          </option>

          <option value="12">
            Dezembro
          </option>
        </select>

        <select
          value={
            filtroPagamento
          }
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

          <option value="Fiado">
            Em aberto (Fiado)
          </option>

          <option value="Receita">
            Receita
          </option>
        </select>

      </div>

      {/* =========================
          HISTÓRICO
      ========================= */}

      <div style={section}>

        <h3
          style={sectionTitle}
        >
          Histórico de vendas
        </h3>

        <div
          style={listaCompras}
        >

          {comprasFiltradas.length ===
            0 && (
            <div
              style={emptyText}
            >
              Nenhum registro
              encontrado.
            </div>
          )}

          {comprasFiltradas.map(
            compra => (
              <div
                key={compra.id}
                style={compraCard}
              >

                {/* CLIENTE */}

                <div
                  style={
                    compraCliente
                  }
                >
                  <strong>
                    {compra.cliente ||
                      "Receita sem venda"}
                  </strong>

                  {compra.cpf && (
                    <div
                      style={muted}
                    >
                      {compra.cpf}
                    </div>
                  )}

                  {compra.pagamento ===
                    "Receita" && (
                    <div
                      style={
                        receitaTag
                      }
                    >
                      Receita
                    </div>
                  )}
                </div>

                {/* VALOR */}

                <div
                  style={
                    compraInfo
                  }
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Valor
                  </span>

                  <strong>
                    {formatarMoeda(
                      compra.valor
                    )}
                  </strong>

                  <div
                    style={muted}
                  >
                    {formatarData(
                      compra.criadoem
                    )}
                  </div>
                </div>

                {/* PAGAMENTO */}

                <div
                  style={
                    compraInfo
                  }
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Pagamento
                  </span>

                  <div>
                    {compra.pagamento ===
                    "Fiado"
                      ? "Em aberto (Fiado)"
                      : compra.pagamento}
                  </div>

                  {compra.pagamento !==
                    "Receita" && (
                    <div
                      style={muted}
                    >
                      {compra.parcelas}x
                    </div>
                  )}
                </div>

                {/* PONTOS */}

                <div
                  style={
                    compraInfo
                  }
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Fidelidade
                  </span>

                  {compra.pontosgerados >
                    0 && (
                    <div
                      style={pontos}
                    >
                      +
                      {
                        compra.pontosgerados
                      }{" "}
                      pts
                    </div>
                  )}

                  {compra.cupomusado >
                    0 && (
                    <div
                      style={muted}
                    >
                      Cupom:{" "}
                      {formatarMoeda(
                        compra.cupomusado
                      )}
                    </div>
                  )}

                  {compra.pontosgerados ===
                    0 &&
                    compra.cupomusado ===
                      0 && (
                      <div
                        style={muted}
                      >
                        -
                      </div>
                    )}
                </div>

                {/* EXCLUIR */}

                <div
                  style={
                    excluirContainer
                  }
                >
                  <button
                    style={
                      btnExcluir
                    }
                    onClick={() =>
                      excluirCompra(
                        compra
                      )
                    }
                    title="Excluir registro"
                  >
                    Excluir
                  </button>
                </div>

              </div>
            )
          )}

        </div>

      </div>

      {/* =========================
          MODAL NOVA COMPRA / RECEITA
      ========================= */}

      {modal && (
        <div
          style={overlay}
          onClick={
            fecharModal
          }
        >
          <div
            style={modalCard}
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div
              style={
                modalHeader
              }
            >
              <h2
                style={{
                  margin: 0
                }}
              >
                {tipoCadastro ===
                "receita"
                  ? "Nova receita"
                  : "Nova compra"}
              </h2>

              <button
                style={
                  fecharBtn
                }
                onClick={
                  fecharModal
                }
              >
                ×
              </button>
            </div>

            {/* TIPO */}

            <div
              style={
                tipoToggle
              }
            >
              <button
                style={
                  tipoCadastro ===
                  "venda"
                    ? tipoAtivo
                    : tipoInativo
                }
                onClick={() =>
                  setTipoCadastro(
                    "venda"
                  )
                }
              >
                Venda
              </button>

              <button
                style={
                  tipoCadastro ===
                  "receita"
                    ? tipoAtivo
                    : tipoInativo
                }
                onClick={() =>
                  setTipoCadastro(
                    "receita"
                  )
                }
              >
                Receita sem venda
              </button>
            </div>

            {/* CLIENTE */}

            {tipoCadastro ===
              "venda" && (
              <>
                <input
                  placeholder="Buscar cliente por nome ou CPF"
                  value={
                    buscaCliente
                  }
                  onChange={e =>
                    setBuscaCliente(
                      e.target.value
                    )
                  }
                  style={input}
                />

                <div
                  style={
                    clienteGrid
                  }
                >
                  {clientesFiltrados.map(
                    c => (
                      <div
                        key={c.id}
                        style={{
                          ...clienteCard,
                          border:
                            clienteSel?.id ===
                            c.id
                              ? "2px solid #d4af37"
                              : "1px solid #eee"
                        }}
                        onClick={() =>
                          setClienteSel(
                            c
                          )
                        }
                      >
                        <strong>
                          {c.nome}
                        </strong>

                        <div
                          style={
                            muted
                          }
                        >
                          {c.cpf}
                        </div>

                        <div
                          style={
                            pontosCliente
                          }
                        >
                          {
                            c.pontos
                          }{" "}
                          pontos
                        </div>
                      </div>
                    )
                  )}
                </div>

                {clienteSel && (
                  <div
                    style={
                      cupomBox
                    }
                  >
                    <div>
                      <strong>
                        Programa de
                        fidelidade
                      </strong>

                      <div
                        style={
                          muted
                        }
                      >
                        Cupons disponíveis:{" "}
                        {
                          cuponsDisponiveis
                        }
                      </div>

                      <div
                        style={
                          muted
                        }
                      >
                        Cada cupom vale{" "}
                        {formatarMoeda(
                          VALOR_CUPOM
                        )}
                      </div>
                    </div>

                    {cuponsDisponiveis >
                      0 && (
                      <div>
                        <label
                          style={
                            cupomLabel
                          }
                        >
                          Quantidade de
                          cupons
                        </label>

                        <select
                          style={
                            input
                          }
                          value={
                            quantidadeCupons
                          }
                          onChange={e =>
                            setQuantidadeCupons(
                              Number(
                                e
                                  .target
                                  .value
                              )
                            )
                          }
                        >
                          <option value={0}>
                            Não usar cupom
                          </option>

                          {Array.from(
                            {
                              length:
                                cuponsDisponiveis
                            },
                            (
                              _,
                              index
                            ) => {
                              const qtd =
                                index +
                                1

                              return (
                                <option
                                  key={
                                    qtd
                                  }
                                  value={
                                    qtd
                                  }
                                >
                                  {qtd}{" "}
                                  {qtd ===
                                  1
                                    ? "cupom"
                                    : "cupons"}{" "}
                                  -{" "}
                                  {formatarMoeda(
                                    Math.min(
                                      qtd *
                                        VALOR_CUPOM,
                                      valor ||
                                        qtd *
                                          VALOR_CUPOM
                                    )
                                  )}
                                </option>
                              )
                            }
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* VALOR */}

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor"
              style={input}
              value={
                valor === 0
                  ? ""
                  : valor
              }
              onChange={e =>
                setValor(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            {/* PAGAMENTO */}

            {tipoCadastro ===
              "venda" && (
              <>
                <select
                  style={input}
                  value={
                    pagamento
                  }
                  onChange={e =>
                    setPagamento(
                      e.target.value
                    )
                  }
                >
                  <option value="Pix">
                    Pix
                  </option>

                  <option value="Dinheiro">
                    Dinheiro
                  </option>

                  <option value="Cartão">
                    Cartão
                  </option>

                  <option value="Fiado">
                    Em aberto (Fiado)
                  </option>
                </select>

                {pagamento ===
                  "Cartão" && (
                  <select
                    style={input}
                    value={
                      parcelas
                    }
                    onChange={e =>
                      setParcelas(
                        Number(
                          e
                            .target
                            .value
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
              </>
            )}

            {/* RESUMO */}

            <div
              style={
                resumo
              }
            >
              {tipoCadastro ===
                "venda" && (
                <>
                  <div>
                    Valor da compra:{" "}
                    <strong>
                      {formatarMoeda(
                        valor
                      )}
                    </strong>
                  </div>

                  <div>
                    Cupons utilizados:{" "}
                    <strong>
                      {
                        quantidadeCuponsValida
                      }
                    </strong>
                  </div>

                  <div>
                    Desconto dos
                    cupons:{" "}
                    <strong>
                      {formatarMoeda(
                        valorCupom
                      )}
                    </strong>
                  </div>

                  <div>
                    Valor final:{" "}
                    <strong>
                      {formatarMoeda(
                        valorRestante
                      )}
                    </strong>
                  </div>

                  <div>
                    Pontos gerados:{" "}
                    <strong>
                      {
                        pontosGerados
                      }{" "}
                      pontos
                    </strong>
                  </div>
                </>
              )}

              {tipoCadastro ===
                "receita" && (
                <div>
                  Valor da receita:{" "}
                  <strong>
                    {formatarMoeda(
                      valor
                    )}
                  </strong>
                </div>
              )}
            </div>

            {/* BOTÃO */}

            <button
              style={
                btnPrimary
              }
              onClick={
                registrarCompra
              }
            >
              {tipoCadastro ===
              "receita"
                ? "Registrar receita"
                : "Finalizar compra"}
            </button>

          </div>
        </div>
      )}

      {/* =========================
          MODAL INATIVOS
      ========================= */}

      {modalInativos && (
        <div
          style={overlay}
          onClick={() =>
            setModalInativos(
              false
            )
          }
        >
          <div
            style={modalCard}
            onClick={e =>
              e.stopPropagation()
            }
          >
            <div
              style={
                modalHeader
              }
            >
              <h3
                style={{
                  margin: 0
                }}
              >
                Clientes inativos
              </h3>

              <button
                style={
                  fecharBtn
                }
                onClick={() =>
                  setModalInativos(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            {clientesInativos.map(
              c => {
                const ultima =
                  getUltimaCompra(
                    c.id
                  )

                return (
                  <div
                    key={c.id}
                    style={
                      inativoRow
                    }
                  >
                    <strong>
                      {c.nome}
                    </strong>

                    <div
                      style={
                        muted
                      }
                    >
                      Última compra:{" "}
                      {ultima
                        ? formatarData(
                            ultima.criadoem
                          )
                        : "Nunca"}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================
   COMPONENTE DASH
========================= */

function Dash({
  label,
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div style={dash}>
      <div
        style={dashLabel}
      >
        {label}
      </div>

      <strong
        style={dashValue}
      >
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
  fontFamily: "Inter, Arial, sans-serif",
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const
}

const section = {
  width: "100%",
  minWidth: 0,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  overflow: "hidden",
  boxSizing: "border-box" as const
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 18
}

const notifBar = {
  width: "100%",
  background: "#fff6d6",
  padding: "12px 16px",
  borderRadius: 12,
  marginBottom: 16,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  flexWrap: "wrap" as const,
  boxSizing: "border-box" as const
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

const headerButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const
}

const title = {
  fontSize: 30,
  margin: 0,
  fontWeight: 600
}

const btnSmall = {
  padding: "11px 18px",
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const btnSecondary = {
  padding: "11px 18px",
  borderRadius: 10,
  border: "1px solid #d4af37",
  background: "#fff",
  color: "#8c7221",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12,
  marginBottom: 20,
  width: "100%"
}

const dash = {
  background: "#fff",
  padding: 18,
  borderRadius: 14,
  minWidth: 0,
  overflow: "hidden"
}

const dashLabel = {
  color: "#777",
  fontSize: 13,
  marginBottom: 5
}

const dashValue = {
  fontSize: 24,
  display: "block",
  wordBreak:
    "break-word" as const
}

const mesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(120px,1fr))",
  gap: 10,
  width: "100%"
}

const mesCard = {
  background: "#f9f9f9",
  padding: 14,
  borderRadius: 12,
  minWidth: 0,
  overflow: "hidden",
  textAlign: "center" as const
}

const mesValor = {
  marginTop: 5,
  fontWeight: 600,
  wordBreak:
    "break-word" as const
}

const emptyText = {
  color: "#888",
  fontSize: 14,
  padding: 10
}

const filtrosBar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)",
  gap: 10,
  marginBottom: 20,
  width: "100%",
  minWidth: 0
}

const inputFiltro = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const
}

const selectFiltro = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const
}

const listaCompras = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 10,
  width: "100%",
  minWidth: 0
}

const compraCard = {
  display: "grid",
  gridTemplateColumns:
    "minmax(160px,2fr) minmax(120px,1fr) minmax(120px,1fr) minmax(110px,1fr) auto",
  gap: 16,
  padding: 16,
  borderRadius: 12,
  background: "#f9f9f9",
  alignItems: "center",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box" as const
}

const compraCliente = {
  minWidth: 0,
  overflow: "hidden",
  wordBreak:
    "break-word" as const
}

const compraInfo = {
  minWidth: 0,
  overflow: "hidden",
  wordBreak:
    "break-word" as const
}

const infoLabel = {
  display: "block",
  color: "#999",
  fontSize: 11,
  marginBottom: 3
}

const pontos = {
  fontWeight: 600,
  color: "#b08d3c"
}

const receitaTag = {
  display: "inline-block",
  marginTop: 5,
  padding: "3px 7px",
  borderRadius: 6,
  background: "#eee",
  color: "#666",
  fontSize: 10,
  fontWeight: 600
}

const excluirContainer = {
  display: "flex",
  justifyContent: "flex-end"
}

const btnExcluir = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e0b4b4",
  background: "#fff",
  color: "#b44",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap" as const
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
  maxWidth: 500,
  maxHeight: "90vh",
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10
}

const fecharBtn = {
  border: "none",
  background: "transparent",
  fontSize: 28,
  color: "#777",
  cursor: "pointer",
  lineHeight: 1
}

const tipoToggle = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 8,
  marginBottom: 10
}

const tipoAtivo = {
  padding: 10,
  borderRadius: 9,
  border: "1px solid #d4af37",
  background: "#faf5df",
  color: "#8c7221",
  cursor: "pointer",
  fontWeight: 600
}

const tipoInativo = {
  padding: 10,
  borderRadius: 9,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#777",
  cursor: "pointer",
  fontWeight: 500
}

const clienteGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(140px,1fr))",
  gap: 8,
  marginTop: 10,
  maxHeight: 220,
  overflowY: "auto" as const
}

const clienteCard = {
  padding: 12,
  borderRadius: 10,
  cursor: "pointer",
  background: "#fff",
  wordBreak:
    "break-word" as const
}

const pontosCliente = {
  marginTop: 4,
  fontSize: 11,
  color: "#b08d3c",
  fontWeight: 600
}

const cupomBox = {
  marginTop: 10,
  padding: 12,
  borderRadius: 10,
  background: "#faf8f1",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap" as const
}

const cupomLabel = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4
}

const resumo = {
  marginTop: 10,
  padding: 12,
  background: "#faf8f1",
  borderRadius: 10,
  lineHeight: 1.8,
  fontSize: 14
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
  borderBottom: "1px solid #eee"
}

const input = {
  width: "100%",
  minWidth: 0,
  padding: 10,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  boxSizing: "border-box" as const
}

const muted = {
  fontSize: 12,
  color: "#888",
  marginTop: 3
}