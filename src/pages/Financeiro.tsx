
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Receita = {
  id: string
  tipo: "VENDA" | "PAGAMENTO_FIADO" | "OUTRA_RECEITA" | "OUTROS"
  descricao: string
  valor: number
  dataCompetencia: string
  dataRecebimento: string | null
  status: "PENDENTE" | "RECEBIDA" | "CANCELADA"
  observacao: string
  criadoem: string
  compraId: string | null
}

type Despesa = {
  id: string
  descricao: string
  valor: number
  dataCompetencia: string
  dataPagamento: string | null
  recorrente: boolean
  status: "PENDENTE" | "PAGA" | "CANCELADA"
  observacao: string
  categoria: string
  criadoem: string
}

type Compra = {
  id: string
  clienteid: string | null
  cliente: string
  cpf: string
  valor: number
  pagamento: string
  criadoem: string
  status: "PENDENTE" | "CONCLUIDA" | "CANCELADA"
}

type VendaItem = {
  id: string
  compraId: string
  quantidade: number
  custoUnitario: number
}

type Fiado = {
  compra: Compra
  recebido: number
  pendente: number
}

const categoriasDespesas = [
  "Aluguel",
  "Marketing",
  "Embalagens",
  "Transporte",
  "Taxas",
  "Fornecedores",
  "Operacional",
  "Outros"
]

const meses = [
  { value: "todos", label: "Todos os meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" }
]

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function dataBR(data: string | null | undefined) {
  if (!data) return "-"

  const d = new Date(data)

  if (Number.isNaN(d.getTime())) return "-"

  return d.toLocaleDateString("pt-BR")
}

function mesDaData(data: string | null | undefined) {
  if (!data) return ""

  const d = new Date(data)

  if (Number.isNaN(d.getTime())) return ""

  return String(d.getMonth() + 1).padStart(2, "0")
}

function inicioDoMesAtual() {
  const hoje = new Date()

  return `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1
  ).padStart(2, "0")}-01`
}

export default function Financeiro() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [vendaItens, setVendaItens] = useState<VendaItem[]>([])

  const [aba, setAba] = useState<
    "resumo" | "receitas" | "despesas" | "fiado"
  >("resumo")

  const [filtroMes, setFiltroMes] = useState("todos")
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")

  const [modalReceita, setModalReceita] = useState(false)
  const [modalDespesa, setModalDespesa] = useState(false)
  const [modalFiado, setModalFiado] = useState(false)

  const [fiadoSelecionado, setFiadoSelecionado] =
    useState<Fiado | null>(null)

  const [valorPagamentoFiado, setValorPagamentoFiado] =
    useState(0)

  const [descricaoReceita, setDescricaoReceita] =
    useState("")

  const [valorReceita, setValorReceita] =
    useState(0)

  const [tipoReceita, setTipoReceita] =
    useState<Receita["tipo"]>("OUTRA_RECEITA")

  const [observacaoReceita, setObservacaoReceita] =
    useState("")

  const [descricaoDespesa, setDescricaoDespesa] =
    useState("")

  const [valorDespesa, setValorDespesa] =
    useState(0)

  const [categoriaDespesa, setCategoriaDespesa] =
    useState("Outros")

  const [dataCompetenciaDespesa, setDataCompetenciaDespesa] =
    useState(inicioDoMesAtual())

  const [dataPagamentoDespesa, setDataPagamentoDespesa] =
    useState(inicioDoMesAtual())

  const [despesaRecorrente, setDespesaRecorrente] =
    useState(false)

  const [statusDespesa, setStatusDespesa] =
    useState<Despesa["status"]>("PAGA")

  const [observacaoDespesa, setObservacaoDespesa] =
    useState("")

  const [carregando, setCarregando] =
    useState(false)

  async function fetchFinanceiro() {
    setCarregando(true)

    const [
      receitasResult,
      despesasResult,
      comprasResult,
      itensResult
    ] = await Promise.all([
      supabase
        .from("receitas")
        .select("*")
        .order("dataCompetencia", {
          ascending: false
        }),

      supabase
        .from("despesas")
        .select("*")
        .order("dataCompetencia", {
          ascending: false
        }),

      supabase
        .from("compras")
        .select(
          "id,clienteid,cliente,cpf,valor,pagamento,criadoem,status"
        )
        .order("criadoem", {
          ascending: false
        }),

      supabase
        .from("vendaItens")
        .select(
          "id,compraId,quantidade,custoUnitario"
        )
    ])

    if (receitasResult.error) {
      alert(
        "Erro ao carregar receitas: " +
          receitasResult.error.message
      )
    }

    if (despesasResult.error) {
      alert(
        "Erro ao carregar despesas: " +
          despesasResult.error.message
      )
    }

    if (comprasResult.error) {
      alert(
        "Erro ao carregar vendas: " +
          comprasResult.error.message
      )
    }

    if (itensResult.error) {
      alert(
        "Erro ao carregar itens das vendas: " +
          itensResult.error.message
      )
    }

    if (receitasResult.data) {
      setReceitas(
        receitasResult.data.map((r: any) => ({
          id: String(r.id),
          tipo: r.tipo,
          descricao: r.descricao || "",
          valor: Number(r.valor || 0),
          dataCompetencia:
            r.dataCompetencia || "",
          dataRecebimento:
            r.dataRecebimento || null,
          status: r.status,
          observacao:
            r.observacao || "",
          criadoem:
            r.criadoem || "",
          compraId:
            r.compraId
              ? String(r.compraId)
              : null
        }))
      )
    }

    if (despesasResult.data) {
      setDespesas(
        despesasResult.data.map((d: any) => ({
          id: String(d.id),
          descricao:
            d.descricao || "",
          valor:
            Number(d.valor || 0),
          dataCompetencia:
            d.dataCompetencia || "",
          dataPagamento:
            d.dataPagamento || null,
          recorrente:
            Boolean(d.recorrente),
          status: d.status,
          observacao:
            d.observacao || "",
          categoria:
            d.categoria || "Outros",
          criadoem:
            d.criadoem || ""
        }))
      )
    }

    if (comprasResult.data) {
      setCompras(
        comprasResult.data.map((c: any) => ({
          id: String(c.id),
          clienteid:
            c.clienteid
              ? String(c.clienteid)
              : null,
          cliente:
            c.cliente || "",
          cpf:
            c.cpf || "",
          valor:
            Number(c.valor || 0),
          pagamento:
            c.pagamento || "",
          criadoem:
            c.criadoem || "",
          status:
            c.status || "CONCLUIDA"
        }))
      )
    }

    if (itensResult.data) {
      setVendaItens(
        itensResult.data.map((item: any) => ({
          id: String(item.id),
          compraId:
            String(item.compraId),
          quantidade:
            Number(item.quantidade || 0),
          custoUnitario:
            Number(item.custoUnitario || 0)
        }))
      )
    }

    setCarregando(false)
  }

  useEffect(() => {
    fetchFinanceiro()
  }, [])

  /*
   * =========================
   * VENDAS
   * =========================
   */

  const vendasValidas = useMemo(() => {
    return compras.filter(
      compra =>
        compra.status !== "CANCELADA" &&
        compra.status !== "PENDENTE" &&
        compra.pagamento !== "Receita"
    )
  }, [compras])

  const faturamento = useMemo(() => {
    return vendasValidas
      .filter(compra => {
        if (filtroMes === "todos") {
          return true
        }

        return (
          mesDaData(compra.criadoem) ===
          filtroMes
        )
      })
      .reduce(
        (total, compra) =>
          total + compra.valor,
        0
      )
  }, [
    vendasValidas,
    filtroMes
  ])

  /*
   * =========================
   * RECEITAS
   * =========================
   */

  const receitasRecebidas = useMemo(() => {
    return receitas
      .filter(
        receita =>
          receita.status ===
          "RECEBIDA"
      )
      .filter(receita => {
        if (filtroMes === "todos") {
          return true
        }

        const data =
          receita.dataRecebimento ||
          receita.dataCompetencia

        return (
          mesDaData(data) ===
          filtroMes
        )
      })
  }, [
    receitas,
    filtroMes
  ])

  const totalRecebido = useMemo(() => {
    return receitasRecebidas.reduce(
      (total, receita) =>
        total + receita.valor,
      0
    )
  }, [receitasRecebidas])

  const recebidoFiado = useMemo(() => {
    return receitasRecebidas
      .filter(
        receita =>
          receita.tipo ===
          "PAGAMENTO_FIADO"
      )
      .reduce(
        (total, receita) =>
          total + receita.valor,
        0
      )
  }, [receitasRecebidas])

  /*
   * =========================
   * DESPESAS
   * =========================
   */

  const despesasPagas = useMemo(() => {
    return despesas
      .filter(
        despesa =>
          despesa.status ===
          "PAGA"
      )
      .filter(despesa => {
        if (filtroMes === "todos") {
          return true
        }

        const data =
          despesa.dataPagamento ||
          despesa.dataCompetencia

        return (
          mesDaData(data) ===
          filtroMes
        )
      })
  }, [
    despesas,
    filtroMes
  ])

  const totalDespesas = useMemo(() => {
    return despesasPagas.reduce(
      (total, despesa) =>
        total + despesa.valor,
      0
    )
  }, [despesasPagas])

  /*
   * =========================
   * CMV
   * =========================
   */

  const custoProdutosVendidos =
    useMemo(() => {
      const vendasIds = new Set(
        vendasValidas
          .filter(compra => {
            if (
              filtroMes ===
              "todos"
            ) {
              return true
            }

            return (
              mesDaData(
                compra.criadoem
              ) === filtroMes
            )
          })
          .map(compra => compra.id)
      )

      return vendaItens
        .filter(item =>
          vendasIds.has(
            item.compraId
          )
        )
        .reduce(
          (total, item) =>
            total +
            item.quantidade *
              item.custoUnitario,
          0
        )
    }, [
      vendaItens,
      vendasValidas,
      filtroMes
    ])

  /*
   * =========================
   * RESULTADO
   * =========================
   */

  const lucroBruto =
    faturamento -
    custoProdutosVendidos

  const resultadoLiquido =
    lucroBruto -
    totalDespesas

  const resultadoCaixa =
    totalRecebido -
    totalDespesas

  /*
   * =========================
   * FIADO
   * =========================
   */

  const fiado = useMemo(() => {
    const vendasFiado =
      compras.filter(
        compra =>
          compra.status !==
            "CANCELADA" &&
          compra.pagamento.includes(
            "Em aberto"
          )
      )

    return vendasFiado
      .map(compra => {
        const recebido =
          receitas
            .filter(
              receita =>
                receita.compraId ===
                  compra.id &&
                receita.tipo ===
                  "PAGAMENTO_FIADO" &&
                receita.status ===
                  "RECEBIDA"
            )
            .reduce(
              (total, receita) =>
                total +
                receita.valor,
              0
            )

        return {
          compra,
          recebido,
          pendente: Math.max(
            compra.valor -
              recebido,
            0
          )
        }
      })
      .filter(
        item =>
          item.pendente > 0
      )
  }, [
    compras,
    receitas
  ])

  const totalAReceber =
    useMemo(() => {
      return fiado
        .filter(item => {
          if (
            filtroMes ===
            "todos"
          ) {
            return true
          }

          return (
            mesDaData(
              item.compra.criadoem
            ) === filtroMes
          )
        })
        .reduce(
          (total, item) =>
            total + item.pendente,
          0
        )
    }, [
      fiado,
      filtroMes
    ])

  /*
   * =========================
   * FILTROS DE RECEITAS
   * =========================
   */

  const receitasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .toLowerCase()
          .trim()

      return receitas.filter(
        receita => {
          const data =
            receita.dataCompetencia

          const mesMatch =
            filtroMes ===
              "todos" ||
            mesDaData(data) ===
              filtroMes

          const statusMatch =
            filtroStatus ===
              "todos" ||
            receita.status ===
              filtroStatus

          const texto =
            `${receita.descricao} ${receita.tipo}`
              .toLowerCase()

          const buscaMatch =
            texto.includes(termo)

          return (
            mesMatch &&
            statusMatch &&
            buscaMatch
          )
        }
      )
    }, [
      receitas,
      busca,
      filtroMes,
      filtroStatus
    ])

  /*
   * =========================
   * FILTROS DE DESPESAS
   * =========================
   */

  const despesasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .toLowerCase()
          .trim()

      return despesas.filter(
        despesa => {
          const mesMatch =
            filtroMes ===
              "todos" ||
            mesDaData(
              despesa.dataCompetencia
            ) === filtroMes

          const statusMatch =
            filtroStatus ===
              "todos" ||
            despesa.status ===
              filtroStatus

          const texto =
            `${despesa.descricao} ${despesa.categoria}`
              .toLowerCase()

          return (
            mesMatch &&
            statusMatch &&
            texto.includes(termo)
          )
        }
      )
    }, [
      despesas,
      busca,
      filtroMes,
      filtroStatus
    ])

  /*
   * =========================
   * CRIAR RECEITA
   * =========================
   */

  async function criarReceita() {
    if (
      descricaoReceita.trim() ===
      ""
    ) {
      alert(
        "Digite uma descrição para a receita."
      )
      return
    }

    if (valorReceita <= 0) {
      alert(
        "Digite um valor válido para a receita."
      )
      return
    }

    const hoje =
      new Date()
        .toISOString()
        .split("T")[0]

    const { error } =
      await supabase
        .from("receitas")
        .insert({
          tipo: tipoReceita,
          descricao:
            descricaoReceita.trim(),
          valor: valorReceita,
          dataCompetencia:
            hoje,
          dataRecebimento:
            hoje,
          status: "RECEBIDA",
          observacao:
            observacaoReceita.trim() ||
            null
        })

    if (error) {
      alert(
        "Erro ao cadastrar receita: " +
          error.message
      )
      return
    }

    alert(
      "Receita cadastrada com sucesso!"
    )

    setModalReceita(false)
    setDescricaoReceita("")
    setValorReceita(0)
    setTipoReceita(
      "OUTRA_RECEITA"
    )
    setObservacaoReceita("")

    await fetchFinanceiro()
  }

  /*
   * =========================
   * CRIAR DESPESA
   * =========================
   */

  async function criarDespesa() {
    if (
      descricaoDespesa.trim() ===
      ""
    ) {
      alert(
        "Digite uma descrição para a despesa."
      )
      return
    }

    if (valorDespesa <= 0) {
      alert(
        "Digite um valor válido para a despesa."
      )
      return
    }

    const { error } =
      await supabase
        .from("despesas")
        .insert({
          descricao:
            descricaoDespesa.trim(),
          valor: valorDespesa,
          dataCompetencia:
            dataCompetenciaDespesa,
          dataPagamento:
            statusDespesa ===
            "PAGA"
              ? dataPagamentoDespesa
              : null,
          recorrente:
            despesaRecorrente,
          status:
            statusDespesa,
          observacao:
            observacaoDespesa.trim() ||
            null,
          categoria:
            categoriaDespesa
        })

    if (error) {
      alert(
        "Erro ao cadastrar despesa: " +
          error.message
      )
      return
    }

    alert(
      "Despesa cadastrada com sucesso!"
    )

    setModalDespesa(false)
    setDescricaoDespesa("")
    setValorDespesa(0)
    setCategoriaDespesa("Outros")
    setDataCompetenciaDespesa(
      inicioDoMesAtual()
    )
    setDataPagamentoDespesa(
      inicioDoMesAtual()
    )
    setDespesaRecorrente(false)
    setStatusDespesa("PAGA")
    setObservacaoDespesa("")

    await fetchFinanceiro()
  }

  /*
   * =========================
   * RECEBER FIADO
   * =========================
   */

  async function registrarPagamentoFiado() {
    if (!fiadoSelecionado) {
      return
    }

    if (
      valorPagamentoFiado <= 0
    ) {
      alert(
        "Digite um valor válido."
      )
      return
    }

    if (
      valorPagamentoFiado >
      fiadoSelecionado.pendente
    ) {
      alert(
        "O pagamento não pode ser maior que o valor pendente."
      )
      return
    }

    const hoje =
      new Date()
        .toISOString()
        .split("T")[0]

    const { error } =
      await supabase
        .from("receitas")
        .insert({
          tipo:
            "PAGAMENTO_FIADO",
          descricao:
            `Pagamento de fiado - ${
              fiadoSelecionado
                .compra.cliente ||
              "Cliente"
            }`,
          valor:
            valorPagamentoFiado,
          dataCompetencia:
            hoje,
          dataRecebimento:
            hoje,
          status:
            "RECEBIDA",
          observacao:
            `Pagamento referente à venda ${fiadoSelecionado.compra.id}`,
          compraId:
            fiadoSelecionado.compra.id
        })

    if (error) {
      alert(
        "Erro ao registrar pagamento: " +
          error.message
      )
      return
    }

    alert(
      "Pagamento registrado com sucesso!"
    )

    setModalFiado(false)
    setFiadoSelecionado(null)
    setValorPagamentoFiado(0)

    await fetchFinanceiro()
  }

  /*
   * =========================
   * EXCLUIR / CANCELAR RECEITA
   * =========================
   */

  async function cancelarReceita(
    receita: Receita
  ) {
    const confirmar =
      window.confirm(
        `Deseja cancelar esta receita?\n\n${receita.descricao}\n${moeda(
          receita.valor
        )}`
      )

    if (!confirmar) return

    const { error } =
      await supabase
        .from("receitas")
        .update({
          status:
            "CANCELADA"
        })
        .eq(
          "id",
          receita.id
        )

    if (error) {
      alert(
        "Erro ao cancelar receita: " +
          error.message
      )
      return
    }

    await fetchFinanceiro()
  }

  /*
   * =========================
   * CANCELAR DESPESA
   * =========================
   */

  async function cancelarDespesa(
    despesa: Despesa
  ) {
    const confirmar =
      window.confirm(
        `Deseja cancelar esta despesa?\n\n${despesa.descricao}\n${moeda(
          despesa.valor
        )}`
      )

    if (!confirmar) return

    const { error } =
      await supabase
        .from("despesas")
        .update({
          status:
            "CANCELADA"
        })
        .eq(
          "id",
          despesa.id
        )

    if (error) {
      alert(
        "Erro ao cancelar despesa: " +
          error.message
      )
      return
    }

    await fetchFinanceiro()
  }

  function abrirPagamentoFiado(
    item: Fiado
  ) {
    setFiadoSelecionado(item)
    setValorPagamentoFiado(0)
    setModalFiado(true)
  }

  /*
   * =========================
   * RENDER
   * =========================
   */

  return (
    <div style={container}>
      <style>
        {`
          @media (max-width: 900px) {
            .financeiro-filtros {
              grid-template-columns: 1fr 1fr !important;
            }

            .financeiro-cards {
              grid-template-columns: 1fr 1fr !important;
            }

            .financeiro-row {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 600px) {
            .financeiro-container {
              padding: 18px !important;
            }

            .financeiro-filtros {
              grid-template-columns: 1fr !important;
            }

            .financeiro-cards {
              grid-template-columns: 1fr !important;
            }

            .financeiro-row {
              grid-template-columns: 1fr !important;
            }

            .financeiro-header-buttons {
              width: 100%;
            }

            .financeiro-header-buttons button {
              flex: 1;
            }

            .financeiro-tabs {
              overflow-x: auto;
            }

            .financeiro-tabs button {
              white-space: nowrap;
            }
          }
        `}
      </style>

      {/* CABEÇALHO */}

      <div style={header}>
        <div>
          <h1 style={title}>
            Financeiro
          </h1>

          <div style={subtitle}>
            Controle de receitas, despesas e valores a receber.
          </div>
        </div>

        <div
          className="financeiro-header-buttons"
          style={headerButtons}
        >
          <button
            style={btnSecondary}
            onClick={() =>
              setModalDespesa(true)
            }
          >
            Nova despesa
          </button>

          <button
            style={btnSmall}
            onClick={() =>
              setModalReceita(true)
            }
          >
            Nova receita
          </button>
        </div>
      </div>

      {/* CARDS */}

      <div
        className="financeiro-cards"
        style={dashGrid}
      >
        <Dash
          label="Faturamento"
          value={moeda(
            faturamento
          )}
        />

        <Dash
          label="Recebido"
          value={moeda(
            totalRecebido
          )}
        />

        <Dash
          label="A receber"
          value={moeda(
            totalAReceber
          )}
        />

        <Dash
          label="Despesas"
          value={moeda(
            totalDespesas
          )}
        />

        <Dash
          label="Resultado"
          value={moeda(
            resultadoLiquido
          )}
        />

        <Dash
          label="Vendas"
          value={
            vendasValidas.filter(
              compra =>
                filtroMes ===
                  "todos" ||
                mesDaData(
                  compra.criadoem
                ) === filtroMes
            ).length
          }
        />
      </div>

      {/* FILTROS */}

      <div
        className="financeiro-filtros"
        style={filtrosBar}
      >
        <input
          placeholder="Buscar por descrição..."
          value={busca}
          onChange={e =>
            setBusca(
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
          {meses.map(mes => (
            <option
              key={mes.value}
              value={mes.value}
            >
              {mes.label}
            </option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={e =>
            setFiltroStatus(
              e.target.value
            )
          }
          style={selectFiltro}
        >
          <option value="todos">
            Todos os status
          </option>

          <option value="RECEBIDA">
            Recebida
          </option>

          <option value="PENDENTE">
            Pendente
          </option>

          <option value="PAGA">
            Paga
          </option>

          <option value="CANCELADA">
            Cancelada
          </option>
        </select>

        <button
          style={refreshBtn}
          onClick={fetchFinanceiro}
          disabled={carregando}
        >
          {carregando
            ? "Atualizando..."
            : "Atualizar"}
        </button>
      </div>

      {/* ABAS */}

      <div
        className="financeiro-tabs"
        style={tabs}
      >
        <button
          style={
            aba === "resumo"
              ? tabAtiva
              : tab
          }
          onClick={() => {
            setAba("resumo")
            setBusca("")
            setFiltroStatus(
              "todos"
            )
          }}
        >
          Resumo
        </button>

        <button
          style={
            aba === "receitas"
              ? tabAtiva
              : tab
          }
          onClick={() =>
            setAba("receitas")
          }
        >
          Receitas
        </button>

        <button
          style={
            aba === "despesas"
              ? tabAtiva
              : tab
          }
          onClick={() =>
            setAba("despesas")
          }
        >
          Despesas
        </button>

        <button
          style={
            aba === "fiado"
              ? tabAtiva
              : tab
          }
          onClick={() =>
            setAba("fiado")
          }
        >
          A receber
          {fiado.length > 0 && (
            <span style={tabBadge}>
              {fiado.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================
          RESUMO
      ========================= */}

      {aba === "resumo" && (
        <>
          <div style={section}>
            <h3 style={sectionTitle}>
              Resumo financeiro
            </h3>

            <div style={resumoGrid}>
              <ResumoLinha
                label="Faturamento"
                valor={moeda(
                  faturamento
                )}
              />

              <ResumoLinha
                label="Custo dos produtos vendidos"
                valor={moeda(
                  custoProdutosVendidos
                )}
              />

              <ResumoLinha
                label="Lucro bruto"
                valor={moeda(
                  lucroBruto
                )}
              />

              <ResumoLinha
                label="Despesas pagas"
                valor={moeda(
                  totalDespesas
                )}
              />

              <ResumoLinha
                label="Resultado líquido"
                valor={moeda(
                  resultadoLiquido
                )}
                destaque
              />

              <ResumoLinha
                label="Recebido no período"
                valor={moeda(
                  totalRecebido
                )}
              />

              <ResumoLinha
                label="Pagamentos de fiado"
                valor={moeda(
                  recebidoFiado
                )}
              />

              <ResumoLinha
                label="Resultado de caixa"
                valor={moeda(
                  resultadoCaixa
                )}
              />
            </div>
          </div>

          <div style={section}>
            <h3 style={sectionTitle}>
              Últimas movimentações
            </h3>

            {receitas
              .slice(0, 5)
              .map(receita => (
                <div
                  key={receita.id}
                  style={movimentoRow}
                >
                  <div>
                    <strong>
                      {
                        receita.descricao
                      }
                    </strong>

                    <div
                      style={muted}
                    >
                      {tipoReceitaLabel(
                        receita.tipo
                      )}{" "}
                      •{" "}
                      {dataBR(
                        receita.dataCompetencia
                      )}
                    </div>
                  </div>

                  <strong
                    style={valorReceitaStyle}
                  >
                    +{" "}
                    {moeda(
                      receita.valor
                    )}
                  </strong>
                </div>
              ))}

            {despesas
              .slice(0, 5)
              .map(despesa => (
                <div
                  key={despesa.id}
                  style={movimentoRow}
                >
                  <div>
                    <strong>
                      {
                        despesa.descricao
                      }
                    </strong>

                    <div
                      style={muted}
                    >
                      {
                        despesa.categoria
                      }{" "}
                      •{" "}
                      {dataBR(
                        despesa.dataCompetencia
                      )}
                    </div>
                  </div>

                  <strong
                    style={valorDespesaStyle}
                  >
                    -{" "}
                    {moeda(
                      despesa.valor
                    )}
                  </strong>
                </div>
              ))}

            {receitas.length ===
              0 &&
              despesas.length ===
                0 && (
                <div
                  style={emptyText}
                >
                  Nenhuma movimentação
                  encontrada.
                </div>
              )}
          </div>
        </>
      )}

      {/* =========================
          RECEITAS
      ========================= */}

      {aba === "receitas" && (
        <div style={section}>
          <div style={sectionHeader}>
            <div>
              <h3
                style={
                  sectionTitleNoMargin
                }
              >
                Receitas
              </h3>

              <div
                style={muted}
              >
                Entradas financeiras
                registradas.
              </div>
            </div>

            <button
              style={btnSmall}
              onClick={() =>
                setModalReceita(true)
              }
            >
              + Nova receita
            </button>
          </div>

          <div style={lista}>
            {receitasFiltradas.map(
              receita => (
                <div
                  key={receita.id}
                  className="financeiro-row"
                  style={financeiroRow}
                >
                  <div>
                    <strong>
                      {
                        receita.descricao
                      }
                    </strong>

                    <div
                      style={muted}
                    >
                      {tipoReceitaLabel(
                        receita.tipo
                      )}
                    </div>
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Competência
                    </span>

                    {
                      dataBR(
                        receita.dataCompetencia
                      )
                    }
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Recebimento
                    </span>

                    {
                      dataBR(
                        receita.dataRecebimento
                      )
                    }
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Status
                    </span>

                    <StatusBadge
                      status={
                        receita.status
                      }
                    />
                  </div>

                  <div
                    style={
                      rowValorReceita
                    }
                  >
                    {moeda(
                      receita.valor
                    )}
                  </div>

                  <button
                    style={
                      deleteBtn
                    }
                    disabled={
                      receita.status ===
                      "CANCELADA"
                    }
                    onClick={() =>
                      cancelarReceita(
                        receita
                      )
                    }
                  >
                    Cancelar
                  </button>
                </div>
              )
            )}

            {receitasFiltradas.length ===
              0 && (
              <div
                style={emptyText}
              >
                Nenhuma receita
                encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          DESPESAS
      ========================= */}

      {aba === "despesas" && (
        <div style={section}>
          <div style={sectionHeader}>
            <div>
              <h3
                style={
                  sectionTitleNoMargin
                }
              >
                Despesas
              </h3>

              <div
                style={muted}
              >
                Contas e gastos da
                operação.
              </div>
            </div>

            <button
              style={btnExpense}
              onClick={() =>
                setModalDespesa(true)
              }
            >
              + Nova despesa
            </button>
          </div>

          <div style={lista}>
            {despesasFiltradas.map(
              despesa => (
                <div
                  key={despesa.id}
                  className="financeiro-row"
                  style={financeiroRow}
                >
                  <div>
                    <strong>
                      {
                        despesa.descricao
                      }
                    </strong>

                    <div
                      style={muted}
                    >
                      {
                        despesa.categoria
                      }

                      {despesa.recorrente &&
                        " • Recorrente"}
                    </div>
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Competência
                    </span>

                    {
                      dataBR(
                        despesa.dataCompetencia
                      )
                    }
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Pagamento
                    </span>

                    {
                      dataBR(
                        despesa.dataPagamento
                      )
                    }
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Status
                    </span>

                    <StatusBadge
                      status={
                        despesa.status
                      }
                    />
                  </div>

                  <div
                    style={
                      rowValorDespesa
                    }
                  >
                    {moeda(
                      despesa.valor
                    )}
                  </div>

                  <button
                    style={
                      deleteBtn
                    }
                    disabled={
                      despesa.status ===
                      "CANCELADA"
                    }
                    onClick={() =>
                      cancelarDespesa(
                        despesa
                      )
                    }
                  >
                    Cancelar
                  </button>
                </div>
              )
            )}

            {despesasFiltradas.length ===
              0 && (
              <div
                style={emptyText}
              >
                Nenhuma despesa
                encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          FIADO
      ========================= */}

      {aba === "fiado" && (
        <div style={section}>
          <div style={sectionHeader}>
            <div>
              <h3
                style={
                  sectionTitleNoMargin
                }
              >
                Valores a receber
              </h3>

              <div
                style={muted}
              >
                Vendas realizadas no
                fiado que ainda possuem
                saldo pendente.
              </div>
            </div>

            <div
              style={fiadoTotal}
            >
              {moeda(
                totalAReceber
              )}
            </div>
          </div>

          <div style={lista}>
            {fiado
              .filter(item => {
                if (
                  filtroMes ===
                  "todos"
                ) {
                  return true
                }

                return (
                  mesDaData(
                    item.compra.criadoem
                  ) === filtroMes
                )
              })
              .map(item => (
                <div
                  key={
                    item.compra.id
                  }
                  className="financeiro-row"
                  style={fiadoRow}
                >
                  <div>
                    <strong>
                      {
                        item.compra
                          .cliente
                      }
                    </strong>

                    <div
                      style={muted}
                    >
                      {
                        item.compra
                          .cpf
                      }
                    </div>
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Venda
                    </span>

                    {
                      dataBR(
                        item.compra
                          .criadoem
                      )
                    }
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Valor original
                    </span>

                    <strong>
                      {moeda(
                        item.compra
                          .valor
                      )}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Recebido
                    </span>

                    <span
                      style={
                        recebidoStyle
                      }
                    >
                      {moeda(
                        item.recebido
                      )}
                    </span>
                  </div>

                  <div>
                    <span
                      style={infoLabel}
                    >
                      Pendente
                    </span>

                    <strong
                      style={
                        pendenteStyle
                      }
                    >
                      {moeda(
                        item.pendente
                      )}
                    </strong>
                  </div>

                  <button
                    style={btnSmall}
                    onClick={() =>
                      abrirPagamentoFiado(
                        item
                      )
                    }
                  >
                    Receber
                  </button>
                </div>
              ))}

            {fiado.filter(item => {
              if (
                filtroMes ===
                "todos"
              ) {
                return true
              }

              return (
                mesDaData(
                  item.compra.criadoem
                ) === filtroMes
              )
            }).length === 0 && (
              <div
                style={emptyText}
              >
                Nenhum valor pendente.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          MODAL RECEITA
      ========================= */}

      {modalReceita && (
        <Modal
          titulo="Nova receita"
          subtitulo="Cadastre uma entrada financeira."
          onClose={() =>
            setModalReceita(false)
          }
        >
          <label style={fieldLabel}>
            Descrição
          </label>

          <input
            style={input}
            placeholder="Ex.: receita extra"
            value={
              descricaoReceita
            }
            onChange={e =>
              setDescricaoReceita(
                e.target.value
              )
            }
          />

          <label style={fieldLabel}>
            Tipo
          </label>

          <select
            style={input}
            value={tipoReceita}
            onChange={e =>
              setTipoReceita(
                e.target.value as Receita["tipo"]
              )
            }
          >
            <option value="OUTRA_RECEITA">
              Outra receita
            </option>

            <option value="OUTROS">
              Outros
            </option>
          </select>

          <label style={fieldLabel}>
            Valor
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            style={input}
            value={
              valorReceita || ""
            }
            onChange={e =>
              setValorReceita(
                Number(
                  e.target.value
                )
              )
            }
          />

          <label style={fieldLabel}>
            Observação
          </label>

          <textarea
            style={textarea}
            placeholder="Opcional"
            value={
              observacaoReceita
            }
            onChange={e =>
              setObservacaoReceita(
                e.target.value
              )
            }
          />

          <div style={resumo}>
            Receita:{" "}
            <strong>
              {moeda(
                valorReceita
              )}
            </strong>
          </div>

          <button
            style={btnPrimary}
            onClick={
              criarReceita
            }
          >
            Cadastrar receita
          </button>
        </Modal>
      )}

      {/* =========================
          MODAL DESPESA
      ========================= */}

      {modalDespesa && (
        <Modal
          titulo="Nova despesa"
          subtitulo="Registre um gasto da operação."
          onClose={() =>
            setModalDespesa(false)
          }
        >
          <label style={fieldLabel}>
            Descrição
          </label>

          <input
            style={input}
            placeholder="Ex.: aluguel"
            value={
              descricaoDespesa
            }
            onChange={e =>
              setDescricaoDespesa(
                e.target.value
              )
            }
          />

          <label style={fieldLabel}>
            Categoria
          </label>

          <select
            style={input}
            value={
              categoriaDespesa
            }
            onChange={e =>
              setCategoriaDespesa(
                e.target.value
              )
            }
          >
            {categoriasDespesas.map(
              categoria => (
                <option
                  key={categoria}
                  value={categoria}
                >
                  {categoria}
                </option>
              )
            )}
          </select>

          <label style={fieldLabel}>
            Valor
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            style={input}
            value={
              valorDespesa || ""
            }
            onChange={e =>
              setValorDespesa(
                Number(
                  e.target.value
                )
              )
            }
          />

          <label style={fieldLabel}>
            Data de competência
          </label>

          <input
            type="date"
            style={input}
            value={
              dataCompetenciaDespesa
            }
            onChange={e =>
              setDataCompetenciaDespesa(
                e.target.value
              )
            }
          />

          <label style={fieldLabel}>
            Status
          </label>

          <select
            style={input}
            value={
              statusDespesa
            }
            onChange={e =>
              setStatusDespesa(
                e.target.value as Despesa["status"]
              )
            }
          >
            <option value="PAGA">
              Paga
            </option>

            <option value="PENDENTE">
              Pendente
            </option>
          </select>

          {statusDespesa ===
            "PAGA" && (
            <>
              <label
                style={fieldLabel}
              >
                Data de pagamento
              </label>

              <input
                type="date"
                style={input}
                value={
                  dataPagamentoDespesa
                }
                onChange={e =>
                  setDataPagamentoDespesa(
                    e.target.value
                  )
                }
              />
            </>
          )}

          <label
            style={checkboxLabel}
          >
            <input
              type="checkbox"
              checked={
                despesaRecorrente
              }
              onChange={e =>
                setDespesaRecorrente(
                  e.target.checked
                )
              }
            />

            Despesa recorrente
          </label>

          <label style={fieldLabel}>
            Observação
          </label>

          <textarea
            style={textarea}
            placeholder="Opcional"
            value={
              observacaoDespesa
            }
            onChange={e =>
              setObservacaoDespesa(
                e.target.value
              )
            }
          />

          <div style={resumo}>
            Despesa:{" "}
            <strong>
              {moeda(
                valorDespesa
              )}
            </strong>
          </div>

          <button
            style={btnExpensePrimary}
            onClick={
              criarDespesa
            }
          >
            Cadastrar despesa
          </button>
        </Modal>
      )}

      {/* =========================
          MODAL PAGAMENTO FIADO
      ========================= */}

      {modalFiado &&
        fiadoSelecionado && (
          <Modal
            titulo="Receber fiado"
            subtitulo={`Venda de ${
              fiadoSelecionado
                .compra.cliente ||
              "cliente"
            }`}
            onClose={() => {
              setModalFiado(false)
              setFiadoSelecionado(
                null
              )
            }}
          >
            <div
              style={
                clienteSelecionado
              }
            >
              <div>
                <strong>
                  {
                    fiadoSelecionado
                      .compra
                      .cliente
                  }
                </strong>

                <div
                  style={muted}
                >
                  {
                    fiadoSelecionado
                      .compra
                      .cpf
                  }
                </div>
              </div>

              <div
                style={
                  clientePontos
                }
              >
                Venda:{" "}
                {moeda(
                  fiadoSelecionado
                    .compra
                    .valor
                )}
              </div>
            </div>

            <div style={resumo}>
              <div>
                Já recebido:{" "}
                <strong>
                  {moeda(
                    fiadoSelecionado
                      .recebido
                  )}
                </strong>
              </div>

              <div>
                Pendente:{" "}
                <strong>
                  {moeda(
                    fiadoSelecionado
                      .pendente
                  )}
                </strong>
              </div>
            </div>

            <label style={fieldLabel}>
              Valor recebido
            </label>

            <input
              type="number"
              min="0"
              max={
                fiadoSelecionado
                  .pendente
              }
              step="0.01"
              style={input}
              value={
                valorPagamentoFiado ||
                ""
              }
              onChange={e =>
                setValorPagamentoFiado(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <button
              style={btnPrimary}
              onClick={
                registrarPagamentoFiado
              }
            >
              Registrar pagamento
            </button>
          </Modal>
        )}
    </div>
  )
}

/*
 * =========================
 * COMPONENTES
 * =========================
 */

function Dash({
  label,
  value
}: {
  label: string
  value: string | number
}) {
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

function ResumoLinha({
  label,
  valor,
  destaque = false
}: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div
      style={{
        ...resumoLinha,
        ...(destaque
          ? resumoLinhaDestaque
          : {})
      }}
    >
      <span>{label}</span>

      <strong>{valor}</strong>
    </div>
  )
}

function StatusBadge({
  status
}: {
  status: string
}) {
  const cancelado =
    status ===
    "CANCELADA"

  const pendente =
    status ===
      "PENDENTE"

  return (
    <span
      style={{
        ...statusBadge,
        ...(cancelado
          ? statusCancelado
          : pendente
          ? statusPendente
          : statusRecebido)
      }}
    >
      {status ===
      "RECEBIDA"
        ? "Recebida"
        : status ===
          "PAGA"
        ? "Paga"
        : status ===
          "PENDENTE"
        ? "Pendente"
        : "Cancelada"}
    </span>
  )
}

function Modal({
  titulo,
  subtitulo,
  children,
  onClose
}: {
  titulo: string
  subtitulo?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={overlay}
      onClick={onClose}
    >
      <div
        style={modalCard}
        onClick={e =>
          e.stopPropagation()
        }
      >
        <div
          style={modalHeader}
        >
          <div>
            <h2
              style={{
                margin: 0
              }}
            >
              {titulo}
            </h2>

            {subtitulo && (
              <div
                style={muted}
              >
                {subtitulo}
              </div>
            )}
          </div>

          <button
            style={closeBtn}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

function tipoReceitaLabel(
  tipo: Receita["tipo"]
) {
  switch (tipo) {
    case "VENDA":
      return "Venda"

    case "PAGAMENTO_FIADO":
      return "Pagamento de fiado"

    case "OUTRA_RECEITA":
      return "Outra receita"

    default:
      return "Outros"
  }
}

/*
 * =========================
 * ESTILOS
 * =========================
 */

const container = {
  width: "100%",
  minWidth: 0,
  minHeight: "100%",
  padding: 40,
  background: "#f6f6f7",
  fontFamily: "Inter",
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const
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
  margin: 0,
  fontWeight: 600
}

const subtitle = {
  marginTop: 5,
  color: "#888",
  fontSize: 13
}

const headerButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const
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
  border: "1px solid #eadfbf",
  background: "#fff",
  color: "#80691f",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
  marginBottom: 20,
  width: "100%"
}

const dash = {
  background: "#fff",
  padding: 18,
  borderRadius: 14,
  minWidth: 0,
  overflow: "hidden" as const,
  border: "1px solid #eeeeee",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
}

const dashLabel = {
  color: "#777",
  fontSize: 13,
  marginBottom: 5
}

const dashValue = {
  fontSize: 22,
  display: "block",
  wordBreak: "break-word" as const
}

const filtrosBar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto",
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
  ...inputFiltro
}

const refreshBtn = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#555",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const tabs = {
  display: "flex",
  gap: 5,
  background: "#fff",
  borderRadius: 12,
  padding: 5,
  marginBottom: 20,
  border: "1px solid #eee",
  overflowX: "auto" as const
}

const tab = {
  border: "none",
  background: "transparent",
  padding: "10px 15px",
  borderRadius: 9,
  color: "#777",
  cursor: "pointer",
  fontWeight: 500,
  whiteSpace: "nowrap" as const
}

const tabAtiva = {
  ...tab,
  background: "#faf8f1",
  color: "#80691f",
  fontWeight: 600
}

const tabBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 19,
  height: 19,
  marginLeft: 6,
  padding: "0 5px",
  borderRadius: 10,
  background: "#d4af37",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700
}

const section = {
  width: "100%",
  minWidth: 0,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  overflow: "hidden" as const,
  boxSizing: "border-box" as const
}

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 16,
  flexWrap: "wrap" as const
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 18
}

const sectionTitleNoMargin = {
  margin: 0,
  fontSize: 18
}

const resumoGrid = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 0
}

const resumoLinha = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: "13px 0",
  borderBottom: "1px solid #eee",
  fontSize: 14
}

const resumoLinhaDestaque = {
  color: "#80691f",
  fontSize: 15
}

const lista = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  width: "100%",
  minWidth: 0
}

const financeiroRow = {
  display: "grid",
  gridTemplateColumns:
    "minmax(180px,2fr) minmax(110px,1fr) minmax(110px,1fr) minmax(100px,1fr) minmax(100px,1fr) auto",
  gap: 15,
  padding: 15,
  borderRadius: 12,
  background: "#f9f9f9",
  alignItems: "center",
  minWidth: 0,
  boxSizing: "border-box" as const
}

const fiadoRow = {
  ...financeiroRow,
  background: "#faf8f1",
  border: "1px solid #eee6c9"
}

const movimentoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  padding: "13px 0",
  borderBottom: "1px solid #eee",
  minWidth: 0
}

const infoLabel = {
  display: "block",
  color: "#999",
  fontSize: 11,
  marginBottom: 3
}

const muted = {
  fontSize: 12,
  color: "#888",
  marginTop: 3
}

const emptyText = {
  color: "#888",
  fontSize: 14,
  padding: 10
}

const valorReceitaStyle = {
  color: "#6d8d50",
  whiteSpace: "nowrap" as const
}

const valorDespesaStyle = {
  color: "#c45a5a",
  whiteSpace: "nowrap" as const
}

const rowValorReceita = {
  color: "#6d8d50",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const rowValorDespesa = {
  color: "#c45a5a",
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const fiadoTotal = {
  padding: "9px 13px",
  borderRadius: 9,
  background: "#faf8f1",
  color: "#80691f",
  fontWeight: 700,
  whiteSpace: "nowrap" as const
}

const recebidoStyle = {
  color: "#6d8d50",
  fontWeight: 600
}

const pendenteStyle = {
  color: "#c45a5a"
}

const statusBadge = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: 7,
  fontSize: 10,
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const statusRecebido = {
  background: "#edf5e7",
  color: "#66834e"
}

const statusPendente = {
  background: "#fff6d6",
  color: "#9b7b2f"
}

const statusCancelado = {
  background: "#fff0f0",
  color: "#c45a5a"
}

const deleteBtn = {
  padding: "8px 11px",
  borderRadius: 8,
  border: "1px solid #efcaca",
  background: "#fff5f5",
  color: "#c45a5a",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap" as const
}

const btnExpense = {
  padding: "11px 18px",
  borderRadius: 10,
  border: "1px solid #efcaca",
  background: "#fff5f5",
  color: "#c45a5a",
  cursor: "pointer",
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
  overflowY: "auto" as const,
  boxSizing: "border-box" as const
}

const modalCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 15,
  marginBottom: 10
}

const closeBtn = {
  width: 34,
  height: 34,
  border: "none",
  background: "#f5f5f5",
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 22,
  lineHeight: 1,
  color: "#666",
  flexShrink: 0
}

const fieldLabel = {
  display: "block",
  marginTop: 12,
  marginBottom: 4,
  color: "#555",
  fontSize: 12,
  fontWeight: 600
}

const input = {
  width: "100%",
  minWidth: 0,
  padding: 10,
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  boxSizing: "border-box" as const,
  outline: "none"
}

const textarea = {
  ...input,
  minHeight: 80,
  resize: "vertical" as const,
  fontFamily: "inherit"
}

const checkboxLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 14,
  fontSize: 13,
  color: "#555",
  cursor: "pointer"
}

const resumo = {
  marginTop: 12,
  padding: 13,
  background: "#faf8f1",
  borderRadius: 10,
  lineHeight: 1.8,
  fontSize: 13
}

const btnPrimary = {
  width: "100%",
  marginTop: 12,
  padding: 13,
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  cursor: "pointer",
  fontWeight: 600
}

const btnExpensePrimary = {
  ...btnPrimary,
  background:
    "linear-gradient(90deg,#c45a5a,#e58a8a)",
  color: "#fff"
}

const clienteSelecionado = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: 12,
  marginTop: 12,
  borderRadius: 10,
  background: "#faf8f1",
  flexWrap: "wrap" as const
}

const clientePontos = {
  color: "#9b7b2f",
  fontSize: 12,
  fontWeight: 600
}

