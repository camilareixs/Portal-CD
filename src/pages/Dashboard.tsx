import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Periodo = "7" | "30" | "90" | "365" | "all"

type Cliente = {
  id: string
  nome: string
  cpf?: string | null
  pontos?: number | null
  dataNascimento?: string | null
  celular?: string | null
}

type Compra = {
  id: string
  clienteid?: string | null
  valor?: number | null
  criadoem: string
  pagamento?: string | null
  status?: string | null
}

type Receita = {
  id: string
  tipo?: string | null
  descricao?: string | null
  valor?: number | null
  dataCompetencia?: string | null
  dataRecebimento?: string | null
  status?: string | null
  compraId?: string | null
}

type Despesa = {
  id: string
  descricao?: string | null
  valor?: number | null
  dataCompetencia?: string | null
  dataPagamento?: string | null
  categoria?: string | null
  status?: string | null
}

type Produto = {
  id: string
  nome: string
  categoria?: string | null
  subcategoria?: string | null
  codigoProduto?: number | null
  ativo?: boolean | null
}

type Variante = {
  id: string
  produtoId?: string | null
  sku?: string | null
  precoVenda?: number | null
  custoUnitario?: number | null
  estoqueAtual?: number | null
  estoqueMinimo?: number | null
  ativo?: boolean | null
  cor?: string | null
  tamanho?: string | null
  codigoVariante?: number | null
}

type VendaItem = {
  id: string
  compraId?: string | null
  quantidade?: number | null
  custoUnitario?: number | null
  [key: string]: unknown
}

type VendaProduto = {
  produtoId: string | null
  varianteId: string | null
  nome: string
  quantidade: number
  faturamento: number
  custo: number
}



const moeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  })

const numero = (valor: unknown) => {
  if (typeof valor === "number") return valor

  if (typeof valor === "string") {
    const limpo = valor
      .replace(/[^\d,-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")

    const resultado = Number(limpo)

    return Number.isNaN(resultado) ? 0 : resultado
  }

  return 0
}

const formatarDataHora = (data?: string | null) => {
  if (!data) return "-"

  const objeto = new Date(data)

  if (Number.isNaN(objeto.getTime())) return "-"

  return objeto.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const normalizarTexto = (valor: unknown) =>
  String(valor ?? "")
    .trim()
    .toLowerCase()

const pegarCampo = (
  item: Record<string, unknown>,
  campos: string[],
) => {
  for (const campo of campos) {
    if (
      item[campo] !== undefined &&
      item[campo] !== null &&
      item[campo] !== ""
    ) {
      return item[campo]
    }
  }

  return null
}

const obterIdProdutoDoItem = (item: VendaItem) => {
  return String(
    pegarCampo(item, [
      "produtoId",
      "produtoid",
      "produto_id",
      "idProduto",
      "idproduto",
    ]) ?? "",
  )
}

const obterIdVarianteDoItem = (item: VendaItem) => {
  return String(
    pegarCampo(item, [
      "produtoVarianteId",
      "produtovarianteid",
      "produto_variante_id",
      "varianteId",
      "varianteid",
      "variante_id",
      "idVariante",
      "idvariante",
    ]) ?? "",
  )
}

const inicioDoPeriodo = (periodo: Periodo) => {
  const agora = new Date()

  if (periodo === "all") {
    return new Date(0)
  }

  const dias = Number(periodo)

  const inicio = new Date(agora)
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - dias + 1)

  return inicio
}

const estaNoPeriodo = (
  data: string | null | undefined,
  periodo: Periodo,
) => {
  if (periodo === "all") return true
  if (!data) return false

  const dataObj = new Date(data)

  if (Number.isNaN(dataObj.getTime())) return false

  return dataObj >= inicioDoPeriodo(periodo)
}

const percentual = (valor: number, total: number) => {
  if (!total) return 0

  return Math.min(100, Math.max(0, (valor / total) * 100))
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("30")

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [vendaItens, setVendaItens] = useState<VendaItem[]>([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  const [meta, setMeta] = useState(10000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState("10000")

  const [popupCupons, setPopupCupons] = useState(false)
  const [mensagemAniversario, setMensagemAniversario] = useState(
    "Olá, {nome}! A equipe Cami&Duda deseja um feliz aniversário, com muita saúde, alegria e um novo ciclo cheio de coisas boas. Esperamos te ver em breve!"
  )

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setCarregando(true)
      setErro("")

      const [
        clientesResult,
        comprasResult,
        receitasResult,
        despesasResult,
        produtosResult,
        variantesResult,
        vendaItensResult,
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id,nome,cpf,pontos,dataNascimento,celular"),

        supabase
          .from("compras")
          .select(
            "id,clienteid,valor,criadoem,pagamento,status",
          )
          .order("criadoem", { ascending: false }),

        supabase
          .from("receitas")
          .select(
            "id,tipo,descricao,valor,dataCompetencia,dataRecebimento,status,compraId",
          )
          .order("dataCompetencia", { ascending: false }),

        supabase
          .from("despesas")
          .select(
            "id,descricao,valor,dataCompetencia,dataPagamento,categoria,status",
          )
          .order("dataCompetencia", { ascending: false }),

        supabase
          .from("produtos")
          .select(
            "id,nome,categoria,subcategoria,codigoProduto,ativo",
          ),

        supabase
          .from("produtoVariantes")
          .select(
            "id,produtoId,sku,precoVenda,custoUnitario,estoqueAtual,estoqueMinimo,ativo,cor,tamanho,codigoVariante",
          ),

        supabase
          .from("vendaItens")
          .select("*"),
      ])

      if (clientesResult.error) throw clientesResult.error
      if (comprasResult.error) throw comprasResult.error
      if (receitasResult.error) throw receitasResult.error
      if (despesasResult.error) throw despesasResult.error
      if (produtosResult.error) throw produtosResult.error
      if (variantesResult.error) throw variantesResult.error
      if (vendaItensResult.error) throw vendaItensResult.error

      setClientes(
        (clientesResult.data ?? []) as Cliente[],
      )

      setCompras(
        (comprasResult.data ?? []) as Compra[],
      )

      setReceitas(
        (receitasResult.data ?? []) as Receita[],
      )

      setDespesas(
        (despesasResult.data ?? []) as Despesa[],
      )

      setProdutos(
        (produtosResult.data ?? []) as Produto[],
      )

      setVariantes(
        (variantesResult.data ?? []) as Variante[],
      )

      setVendaItens(
        (vendaItensResult.data ?? []) as VendaItem[],
      )
    } catch (error) {
      console.error(error)

      setErro(
        "Não foi possível carregar os dados do dashboard.",
      )
    } finally {
      setCarregando(false)
    }
  }

  const clientesMap = useMemo(() => {
    const mapa = new Map<string, Cliente>()

    clientes.forEach(cliente => {
      mapa.set(cliente.id, cliente)
    })

    return mapa
  }, [clientes])

  const produtosMap = useMemo(() => {
    const mapa = new Map<string, Produto>()

    produtos.forEach(produto => {
      mapa.set(produto.id, produto)
    })

    return mapa
  }, [produtos])

  const variantesMap = useMemo(() => {
    const mapa = new Map<string, Variante>()

    variantes.forEach(variante => {
      mapa.set(variante.id, variante)
    })

    return mapa
  }, [variantes])

  const comprasPeriodo = useMemo(() => {
    return compras.filter(compra =>
      estaNoPeriodo(compra.criadoem, periodo),
    )
  }, [compras, periodo])

  const receitasPeriodo = useMemo(() => {
    return receitas.filter(receita =>
      estaNoPeriodo(
        receita.dataCompetencia,
        periodo,
      ),
    )
  }, [receitas, periodo])

  const despesasPeriodo = useMemo(() => {
    return despesas.filter(despesa =>
      estaNoPeriodo(
        despesa.dataCompetencia,
        periodo,
      ),
    )
  }, [despesas, periodo])

  const faturamento = useMemo(() => {
    return comprasPeriodo
      .filter(compra => {
        const status = normalizarTexto(compra.status)

        return (
          status !== "cancelada" &&
          status !== "cancelado"
        )
      })
      .reduce(
        (total, compra) =>
          total + numero(compra.valor),
        0,
      )
  }, [comprasPeriodo])

  const pedidos = comprasPeriodo.filter(compra => {
    const status = normalizarTexto(compra.status)

    return (
      status !== "cancelada" &&
      status !== "cancelado"
    )
  }).length

  const ticketMedio =
    pedidos > 0 ? faturamento / pedidos : 0

  const clientesAtendidos = useMemo(() => {
    const ids = new Set<string>()

    comprasPeriodo.forEach(compra => {
      if (compra.clienteid) {
        ids.add(compra.clienteid)
      }
    })

    return ids.size
  }, [comprasPeriodo])

  const totalReceitasRecebidas = useMemo(() => {
    return receitasPeriodo
      .filter(
        receita =>
          normalizarTexto(receita.status) ===
            "recebida" ||
          normalizarTexto(receita.status) ===
            "recebido",
      )
      .reduce(
        (total, receita) =>
          total + numero(receita.valor),
        0,
      )
  }, [receitasPeriodo])

  const totalReceitasPendentes = useMemo(() => {
    return receitasPeriodo
      .filter(
        receita =>
          normalizarTexto(receita.status) ===
          "pendente",
      )
      .reduce(
        (total, receita) =>
          total + numero(receita.valor),
        0,
      )
  }, [receitasPeriodo])

  const totalDespesasPagas = useMemo(() => {
    return despesasPeriodo
      .filter(
        despesa =>
          normalizarTexto(despesa.status) ===
          "paga",
      )
      .reduce(
        (total, despesa) =>
          total + numero(despesa.valor),
        0,
      )
  }, [despesasPeriodo])

  const totalDespesasPendentes = useMemo(() => {
    return despesasPeriodo
      .filter(
        despesa =>
          normalizarTexto(despesa.status) ===
          "pendente",
      )
      .reduce(
        (total, despesa) =>
          total + numero(despesa.valor),
        0,
      )
  }, [despesasPeriodo])

  const custoProdutosVendidos = useMemo(() => {
    return vendaItens.reduce((total, item) => {
      const compra = compras.find(
        venda => venda.id === item.compraId,
      )

      if (
        !compra ||
        !estaNoPeriodo(compra.criadoem, periodo)
      ) {
        return total
      }

      const quantidade =
        numero(item.quantidade) || 1

      return (
        total +
        numero(item.custoUnitario) * quantidade
      )
    }, 0)
  }, [vendaItens, compras, periodo])

  const lucroBruto =
    faturamento - custoProdutosVendidos

  const resultadoLiquido =
    lucroBruto - totalDespesasPagas

  const margemBruta =
    faturamento > 0
      ? (lucroBruto / faturamento) * 100
      : 0

  const margemLiquida =
    faturamento > 0
      ? (resultadoLiquido / faturamento) * 100
      : 0

  const vendasPorProduto = useMemo(() => {
    const mapa = new Map<string, VendaProduto>()

    vendaItens.forEach(item => {
      const compra = compras.find(
        venda => venda.id === item.compraId,
      )

      if (
        !compra ||
        !estaNoPeriodo(compra.criadoem, periodo)
      ) {
        return
      }

      const quantidade =
        numero(item.quantidade) || 1

      const produtoId = obterIdProdutoDoItem(item)
      const varianteId = obterIdVarianteDoItem(item)

      const variante = varianteId
        ? variantesMap.get(varianteId)
        : undefined

      const produto =
        produtoId
          ? produtosMap.get(produtoId)
          : variante?.produtoId
            ? produtosMap.get(variante.produtoId)
            : undefined

      const chave =
        produtoId ||
        variante?.produtoId ||
        varianteId ||
        produto?.id ||
        "sem-produto"

      const preco = numero(
        variante?.precoVenda,
      )

      const custo = numero(
        item.custoUnitario ??
          variante?.custoUnitario,
      )

      const atual = mapa.get(chave)

      if (atual) {
        atual.quantidade += quantidade
        atual.faturamento +=
          quantidade * preco
        atual.custo += quantidade * custo
      } else {
        mapa.set(chave, {
          produtoId:
            produto?.id ||
            produtoId ||
            null,
          varianteId:
            varianteId || null,
          nome:
            produto?.nome ||
            variante?.sku ||
            "Produto não identificado",
          quantidade,
          faturamento: quantidade * preco,
          custo: quantidade * custo,
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.quantidade - a.quantidade,
    )
  }, [
    vendaItens,
    compras,
    periodo,
    variantesMap,
    produtosMap,
  ])

  const produtoMaisVendido =
    vendasPorProduto[0] ?? null

  const produtoMaisFaturado = useMemo(() => {
    return [...vendasPorProduto].sort(
      (a, b) => b.faturamento - a.faturamento,
    )[0] ?? null
  }, [vendasPorProduto])

  const vendasPorPagamento = useMemo(() => {
    const mapa = new Map<string, number>()

    comprasPeriodo.forEach(compra => {
      const status = normalizarTexto(compra.status)

      if (
        status === "cancelada" ||
        status === "cancelado"
      ) {
        return
      }

      const pagamento =
        compra.pagamento?.trim() ||
        "Não informado"

      mapa.set(
        pagamento,
        (mapa.get(pagamento) ?? 0) +
          numero(compra.valor),
      )
    })

    return Array.from(mapa.entries()).sort(
      (a, b) => b[1] - a[1],
    )
  }, [comprasPeriodo])

  const clientesRanking = useMemo(() => {
    const mapa = new Map<
      string,
      {
        cliente: Cliente
        total: number
        compras: number
      }
    >()

    comprasPeriodo.forEach(compra => {
      if (!compra.clienteid) return

      const cliente =
        clientesMap.get(compra.clienteid)

      if (!cliente) return

      const atual = mapa.get(cliente.id)

      if (atual) {
        atual.total += numero(compra.valor)
        atual.compras += 1
      } else {
        mapa.set(cliente.id, {
          cliente,
          total: numero(compra.valor),
          compras: 1,
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.total - a.total,
    )
  }, [comprasPeriodo, clientesMap])

  const topClientes = clientesRanking.slice(0, 5)

  const clientesComCupom = clientes.filter(
    cliente => numero(cliente.pontos) >= 10,
  )


  const inicioMesAtual = useMemo(() => {
    const data = new Date()
    return new Date(data.getFullYear(), data.getMonth(), 1)
  }, [])

  const aniversariantesDoMes = useMemo(() => {
    const mesAtual = inicioMesAtual.getMonth()

    return clientes
      .filter(cliente => {
        if (!cliente.dataNascimento) return false

        const data = new Date(`${cliente.dataNascimento}T12:00:00`)
        if (Number.isNaN(data.getTime())) return false

        return data.getMonth() === mesAtual
      })
      .sort((a, b) => {
        const dataA = new Date(`${a.dataNascimento}T12:00:00`)
        const dataB = new Date(`${b.dataNascimento}T12:00:00`)
        return dataA.getDate() - dataB.getDate()
      })
  }, [clientes, inicioMesAtual])

  const clientesParaReativar = useMemo(() => {
    const ultimaCompraPorCliente = new Map<string, number>()

    compras
      .filter(compra => {
        const status = normalizarTexto(compra.status)
        return (
          compra.clienteid &&
          status !== "cancelada" &&
          status !== "cancelado"
        )
      })
      .forEach(compra => {
        if (!compra.clienteid) return

        const data = new Date(compra.criadoem).getTime()
        if (Number.isNaN(data)) return

        const atual = ultimaCompraPorCliente.get(compra.clienteid)
        if (!atual || data > atual) {
          ultimaCompraPorCliente.set(compra.clienteid, data)
        }
      })

    const limite = new Date()
    limite.setDate(limite.getDate() - 90)

    return clientes
      .map(cliente => {
        const ultimaCompra = ultimaCompraPorCliente.get(cliente.id)

        return {
          cliente,
          ultimaCompra: ultimaCompra
            ? new Date(ultimaCompra)
            : null,
        }
      })
      .filter(item => {
        if (!item.ultimaCompra) return true
        return item.ultimaCompra < limite
      })
      .sort((a, b) => {
        if (!a.ultimaCompra && !b.ultimaCompra) return 0
        if (!a.ultimaCompra) return -1
        if (!b.ultimaCompra) return 1
        return a.ultimaCompra.getTime() - b.ultimaCompra.getTime()
      })
      .slice(0, 5)
  }, [clientes, compras])


  const vendasPorMes = useMemo(() => {
    const mapa = new Map<string, { rotulo: string; total: number; ordem: number }>()
    const agora = new Date()

    // Sempre exibe os seis meses mais recentes, inclusive meses sem vendas.
    for (let i = 5; i >= 0; i--) {
      const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
      const rotulo = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      mapa.set(chave, { rotulo, total: 0, ordem: data.getTime() })
    }

    compras.forEach(compra => {
      const status = normalizarTexto(compra.status)
      if (status === "cancelada" || status === "cancelado") return
      if (!compra.criadoem) return

      const data = new Date(compra.criadoem)
      if (Number.isNaN(data.getTime())) return
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
      const mes = mapa.get(chave)
      if (mes) mes.total += numero(compra.valor)
    })

    return Array.from(mapa.entries()).map(([chave, item]) => ({
      chave,
      mes: item.rotulo,
      total: item.total,
      ordem: item.ordem,
    }))
  }, [compras])

  const maiorVendaMes = Math.max(...vendasPorMes.map(mes => mes.total), 0)

  const movimentacoesRecentes = useMemo(() => {
    const movimentacoes: Array<{
      id: string
      tipo: "venda" | "receita" | "despesa"
      descricao: string
      valor: number
      data: string
    }> = []

    compras.slice(0, 10).forEach(compra => {
      const cliente = compra.clienteid
        ? clientesMap.get(compra.clienteid)
        : undefined

      movimentacoes.push({
        id: `venda-${compra.id}`,
        tipo: "venda",
        descricao: `Venda ${
          cliente?.nome
            ? `para ${cliente.nome}`
            : ""
        }`,
        valor: numero(compra.valor),
        data: compra.criadoem,
      })
    })

    receitas.slice(0, 10).forEach(receita => {
      movimentacoes.push({
        id: `receita-${receita.id}`,
        tipo: "receita",
        descricao:
          receita.descricao ||
          receita.tipo ||
          "Receita",
        valor: numero(receita.valor),
        data:
          receita.dataCompetencia ||
          receita.dataRecebimento ||
          "",
      })
    })

    despesas.slice(0, 10).forEach(despesa => {
      movimentacoes.push({
        id: `despesa-${despesa.id}`,
        tipo: "despesa",
        descricao:
          despesa.descricao ||
          despesa.categoria ||
          "Despesa",
        valor: numero(despesa.valor),
        data:
          despesa.dataCompetencia ||
          despesa.dataPagamento ||
          "",
      })
    })

    return movimentacoes
      .sort(
        (a, b) =>
          new Date(b.data).getTime() -
          new Date(a.data).getTime(),
      )
      .slice(0, 8)
  }, [
    compras,
    receitas,
    despesas,
    clientesMap,
  ])

  const alertas = useMemo(() => {
    const lista: Array<{
      tipo: "financeiro" | "cliente"
      titulo: string
      texto: string
    }> = []

    if (totalReceitasPendentes > 0) {
      lista.push({
        tipo: "financeiro",
        titulo: "Valores a receber",
        texto: `${moeda(totalReceitasPendentes)} em receitas pendentes.`,
      })
    }

    if (totalDespesasPendentes > 0) {
      lista.push({
        tipo: "financeiro",
        titulo: "Despesas pendentes",
        texto: `${moeda(totalDespesasPendentes)} em despesas pendentes.`,
      })
    }

    if (clientesComCupom.length > 0) {
      lista.push({
        tipo: "cliente",
        titulo: "Cupons disponíveis",
        texto: `${clientesComCupom.length} cliente(s) possuem cupom.`,
      })
    }

    if (aniversariantesDoMes.length > 0) {
      lista.push({
        tipo: "cliente",
        titulo: "Aniversariantes do mês",
        texto: `${aniversariantesDoMes.length} cliente(s) fazem aniversário este mês.`,
      })
    }

    if (clientesParaReativar.length > 0) {
      lista.push({
        tipo: "cliente",
        titulo: "Clientes para reativar",
        texto: `${clientesParaReativar.length} cliente(s) estão há pelo menos 90 dias sem comprar ou ainda não possuem compra.`,
      })
    }

    return lista
  }, [
    totalReceitasPendentes,
    totalDespesasPendentes,
    clientesComCupom.length,
    aniversariantesDoMes.length,
    clientesParaReativar.length,
  ])

  const progressoMeta = percentual(
    faturamento,
    meta,
  )

  const periodoLabel =
    periodo === "7"
      ? "Últimos 7 dias"
      : periodo === "30"
        ? "Últimos 30 dias"
        : periodo === "90"
          ? "Últimos 90 dias"
          : periodo === "365"
            ? "Último ano"
            : "Todos os meses"

  function salvarMeta() {
    const valor = numero(novaMeta)

    if (valor > 0) {
      setMeta(valor)
    }

    setEditandoMeta(false)
  }

  // Auxiliares legados mantidos para evitar mudanças desnecessárias no restante do módulo.
  void [
    totalReceitasRecebidas, margemBruta, margemLiquida,
    produtoMaisVendido, produtoMaisFaturado, vendasPorPagamento,
    movimentacoesRecentes, alertas, ResumoFinanceiro, Indicador,
    destaqueCard, destaqueLabel, destaqueTitulo, destaqueNumero,
    destaqueNumeroGrande, destaqueValor, botaoAcaoDesabilitado,
    tagInformativa, pagamentoItem, alertaItem, mesesGrid, mesCard, mesValor,
  ]

  if (carregando) {
    return (
      <div style={pagina}>
        <div style={loading}>
          Carregando dashboard...
        </div>
      </div>
    )
  }

  return (
    <div style={pagina}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .dashboard-page {
            width: 100%;
            min-width: 0;
            overflow-x: hidden;
          }

          .dashboard-kpis {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: clamp(8px, 1.2vw, 14px);
            width: 100%;
            min-width: 0;
          }

          .dashboard-kpis > .dashboard-card {
            min-width: 0;
            max-width: 100%;
            padding: clamp(9px, 1.2vw, 17px);
          }

          .dashboard-kpis > .dashboard-card > span,
          .dashboard-kpis > .dashboard-card > strong {
            display: block;
            min-width: 0;
            max-width: 100%;
            overflow-wrap: anywhere;
            word-break: normal;
          }

          .dashboard-kpis > .dashboard-card > span:first-child {
            font-size: clamp(10px, 0.9vw, 12px);
            line-height: 1.35;
          }

          .dashboard-kpis > .dashboard-card > strong {
            font-size: clamp(12px, 1.35vw, 25px) !important;
            line-height: 1.2;
            letter-spacing: -0.03em;
          }

          .dashboard-kpis > .dashboard-card > span:last-child {
            font-size: clamp(9px, 0.8vw, 11px);
            line-height: 1.4;
          }

          .dashboard-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .dashboard-sales-grid {
            grid-template-columns: minmax(0, 1.65fr) minmax(230px, 0.75fr);
          }

          .dashboard-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
          }

          .dashboard-card {
            min-width: 0;
            overflow: hidden;
          }

          .dashboard-money {
            min-width: 0;
            max-width: 100%;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .dashboard-list {
            min-width: 0;
            max-width: 100%;
            overflow-x: auto;
          }

          .dashboard-list-row {
            min-width: 0;
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }

          .dashboard-list-main {
            min-width: 0;
            flex: 1;
            overflow: hidden;
          }

          .dashboard-list-value {
            flex: 0 1 auto;
            min-width: 0;
            max-width: 48%;
            text-align: right;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .dashboard-months {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .dashboard-chart-scroll {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding-bottom: 4px;
          }

          .dashboard-chart {
            min-width: 560px;
          }

          @media (max-width: 1250px) {
            .dashboard-kpis {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .dashboard-kpis > .dashboard-card > strong {
              font-size: clamp(15px, 1.8vw, 23px) !important;
            }
          }

          @media (max-width: 900px) {
            .dashboard-kpis {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .dashboard-kpis > .dashboard-card > strong {
              font-size: clamp(14px, 2.5vw, 21px) !important;
            }

            .dashboard-grid-2,
            .dashboard-grid-3,
            .dashboard-sales-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-months {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 600px) {
            .dashboard-kpis {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .dashboard-kpis > .dashboard-card {
              padding: 10px;
            }

            .dashboard-kpis > .dashboard-card > strong {
              font-size: clamp(12px, 3.5vw, 18px) !important;
              letter-spacing: -0.04em;
            }

            .dashboard-kpis > .dashboard-card > span:first-child {
              font-size: 10px;
            }

            .dashboard-kpis > .dashboard-card > span:last-child {
              font-size: 9px;
            }

            .dashboard-months {
              grid-template-columns: 1fr;
            }

            .dashboard-list-row {
              align-items: flex-start;
            }

            .dashboard-list-value {
              max-width: 45%;
            }
          }

          @media (max-width: 360px) {
            .dashboard-kpis {
              gap: 6px;
            }

            .dashboard-kpis > .dashboard-card {
              padding: 8px;
            }

            .dashboard-kpis > .dashboard-card > strong {
              font-size: 12px !important;
            }
          }

          @media (max-width: 600px) {
            .dashboard-action-row {
              flex-direction: column;
              align-items: stretch;
            }

            .dashboard-action-button {
              width: 100%;
            }
          }

          @media (max-width: 420px) {
            .dashboard-list-row {
              flex-direction: column;
              gap: 5px;
            }

            .dashboard-list-value {
              max-width: 100%;
              text-align: left;
            }
          }
        `}
      </style>

      <div className="dashboard-page">
        <div style={cabecalho}>
          <div style={cabecalhoTexto}>
            <div style={titulo}>
              Dashboard - Fazer levantamento do que deseja
            </div>

            <div style={subtitulo}>
              Visão geral da operação da loja
            </div>
          </div>

          <div style={filtroContainer}>
            <span style={filtroLabel}>
              Período
            </span>

            <select
              value={periodo}
              onChange={e =>
                setPeriodo(
                  e.target.value as Periodo,
                )
              }
              style={select}
            >
              <option value="7">
                7 dias
              </option>

              <option value="30">
                30 dias
              </option>

              <option value="90">
                90 dias
              </option>

              <option value="365">
                1 ano
              </option>

              <option value="all">
                Todos os meses
              </option>
            </select>
          </div>
        </div>

        {erro && (
          <div style={erroBox}>
            {erro}
          </div>
        )}

        <div style={periodoAtual}>
          Dados exibidos:{" "}
          <strong>{periodoLabel}</strong>
        </div>

        {/* KPIs */}

        <div
          className="dashboard-kpis"
          style={kpisFallback}
        >

          <Kpi
            label="Pedidos"
            value={String(pedidos)}
            detalhe={`Ticket ${moeda(ticketMedio)}`}
          />

          <Kpi
            label="Clientes atendidos"
            value={String(clientesAtendidos)}
            detalhe="Clientes com compra"
          />

          <Kpi
            label="A receber"
            value={moeda(totalReceitasPendentes)}
            detalhe="Receitas pendentes"
          />
        </div>

        {/* VENDAS MENSAIS + META */}

        <div
          className="dashboard-grid-2 dashboard-sales-grid"
          style={grid2Fallback}
        >
          <section style={card}>
            <div style={cardTitulo}>Vendas dos últimos 6 meses</div>
            <div style={cardSubtitulo}>Acompanhe a evolução do faturamento mês a mês</div>

            <div className="dashboard-chart-scroll">
              <div className="dashboard-chart" style={{ ...grafico, minWidth: 0, gap: 12 }}>
                {vendasPorMes.map(venda => {
                  const altura = maiorVendaMes > 0
                    ? Math.max(venda.total > 0 ? 8 : 3, (venda.total / maiorVendaMes) * 145)
                    : 3

                  return (
                    <div key={venda.chave} style={barraColuna}>
                      <span style={barraValor}>{venda.total > 0 ? moeda(venda.total) : "R$ 0"}</span>
                      <div
                        style={{
                          ...barra,
                          height: `${altura}px`,
                          background: venda.total > 0 ? "#c9a227" : "#e9e4d8",
                          opacity: venda.total > 0 ? 1 : 0.75,
                        }}
                        title={`${venda.mes}: ${moeda(venda.total)}`}
                      />
                      <span style={barraData}>{venda.mes}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section style={{ ...card, padding: 16 }}>
            <div style={cardTopoLinha}>
              <div style={{ minWidth: 0 }}>
                <div style={cardTitulo}>Meta de faturamento</div>
                <div style={cardSubtitulo}>Meta do período selecionado</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNovaMeta(String(meta))
                  setEditandoMeta(true)
                }}
                style={botaoPequeno}
              >
                Editar
              </button>
            </div>

            <div style={{ ...metaValor, margin: "8px 0 10px", display: "block" }}>
              <strong className="dashboard-money" style={{ display: "block", fontSize: 22, color: "#222" }}>
                {moeda(faturamento)}
              </strong>
              <span>de {moeda(meta)}</span>
            </div>

            <div style={barraMetaFundo}>
              <div style={{ ...barraMeta, width: `${progressoMeta}%` }} />
            </div>

            <div style={metaRodape}>
              <span>{progressoMeta.toFixed(0)}%</span>
              <span className="dashboard-money">Falta {moeda(Math.max(0, meta - faturamento))}</span>
            </div>

            {editandoMeta && (
              <div style={metaEdicao}>
                <input
                  value={novaMeta}
                  onChange={e => setNovaMeta(e.target.value)}
                  style={input}
                  placeholder="Meta em R$"
                />
                <div style={botoesLinha}>
                  <button type="button" onClick={salvarMeta} style={botaoPrincipal}>Salvar</button>
                  <button type="button" onClick={() => setEditandoMeta(false)} style={botaoSecundario}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* PRINCIPAIS CLIENTES */}

        <section style={card}>
          <div style={cardTopoLinha}>
            <div style={{ minWidth: 0 }}>
              <div style={cardTitulo}>Principais clientes</div>
              <div style={cardSubtitulo}>Clientes por valor comprado no período</div>
            </div>
            <button type="button" onClick={() => setPopupCupons(true)} style={botaoPequeno}>
              {clientesComCupom.length} com cupom
            </button>
          </div>

          <div className="dashboard-list" style={lista}>
            {topClientes.map((item, index) => (
              <div key={item.cliente.id} className="dashboard-list-row" style={listaLinha}>
                <div className="dashboard-list-main" style={listaPrincipal}>
                  <span style={ranking}>{index + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={listaTitulo}>{item.cliente.nome}</strong>
                    <div style={listaSubtitulo}>{item.compras} compra(s)</div>
                  </div>
                </div>
                <strong className="dashboard-list-value dashboard-money" style={listaValor}>
                  {moeda(item.total)}
                </strong>
              </div>
            ))}
            {topClientes.length === 0 && <div style={vazio}>Nenhum cliente encontrado.</div>}
          </div>
        </section>

        {/* ATALHOS DO DIA A DIA */}

        <section style={card}>
          <div style={cardTitulo}>Facilitadores do dia a dia</div>
          <div style={cardSubtitulo}>Ações rápidas para cuidar das clientes e agilizar a rotina da loja</div>

          <div className="dashboard-grid-3" style={grid3Fallback}>
            <div style={acaoCard}>
              <div style={acaoCardTopo}>
                <span style={acaoNumero}>{aniversariantesDoMes.length}</span>
                <span style={acaoLabel}>Aniversariantes do mês</span>
              </div>
              <label style={{ ...listaSubtitulo, display: "block", margin: "12px 0 6px" }}>
                Mensagem personalizável (use {"{nome}"} para inserir o nome)
              </label>
              <textarea
                value={mensagemAniversario}
                onChange={e => setMensagemAniversario(e.target.value)}
                rows={4}
                style={{ ...input, maxWidth: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 }}
              />
              <div style={{ ...acaoLista, marginTop: 12 }}>
                {aniversariantesDoMes.slice(0, 5).map(cliente => {
                  const data = cliente.dataNascimento ? new Date(`${cliente.dataNascimento}T12:00:00`) : null
                  return (
                    <div key={cliente.id} className="dashboard-action-row" style={acaoLinha}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={listaTitulo}>{cliente.nome}</strong>
                        <div style={listaSubtitulo}>
                          {data ? `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dashboard-action-button"
                        style={botaoAcao}
                        onClick={() => {
                          const telefone = String(cliente.celular ?? "").replace(/\D/g, "")
                          if (!telefone) {
                            alert(`Cadastre o celular de ${cliente.nome} para abrir o WhatsApp.`)
                            return
                          }
                          const mensagem = mensagemAniversario.replaceAll("{nome}", cliente.nome)
                          const telefoneComPais = telefone.startsWith("55") ? telefone : `55${telefone}`
                          window.open(`https://wa.me/${telefoneComPais}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer")
                        }}
                      >
                        WhatsApp
                      </button>
                    </div>
                  )
                })}
                {aniversariantesDoMes.length === 0 && <div style={vazio}>Nenhum aniversariante cadastrado neste mês.</div>}
              </div>
            </div>

            <div style={acaoCard}>
              <div style={acaoCardTopo}>
                <span style={acaoNumero}>{clientesParaReativar.length}</span>
                <span style={acaoLabel}>Clientes para reativar</span>
              </div>
              <div style={cardSubtitulo}>Retome o contato com quem está há um tempo sem comprar.</div>
              <div style={acaoLista}>
                {clientesParaReativar.slice(0, 5).map(item => (
                  <div key={item.cliente.id} className="dashboard-action-row" style={acaoLinha}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={listaTitulo}>{item.cliente.nome}</strong>
                      <div style={listaSubtitulo}>
                        {item.ultimaCompra ? `Última compra: ${formatarDataHora(item.ultimaCompra.toISOString())}` : "Ainda não possui compra registrada"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="dashboard-action-button"
                      style={botaoAcao}
                      onClick={() => {
                        const telefone = String(item.cliente.celular ?? "").replace(/\D/g, "")
                        if (!telefone) {
                          alert(`Cadastre o celular de ${item.cliente.nome} para abrir o WhatsApp.`)
                          return
                        }
                        const mensagem = `Olá, ${item.cliente.nome}! Tudo bem? Faz um tempinho que não nos vemos por aqui na Cami&Duda. Temos novidades que acho que você vai gostar. Será muito bom te receber novamente!`
                        const telefoneComPais = telefone.startsWith("55") ? telefone : `55${telefone}`
                        window.open(`https://wa.me/${telefoneComPais}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer")
                      }}
                    >
                      Chamar
                    </button>
                  </div>
                ))}
                {clientesParaReativar.length === 0 && <div style={vazio}>Nenhuma cliente precisa de reativação no momento.</div>}
              </div>
            </div>

            <div style={acaoCard}>
              <div style={acaoCardTopo}>
                <span style={acaoNumero}>{clientesComCupom.length}</span>
                <span style={acaoLabel}>Clientes com cupom</span>
              </div>
              <div style={cardSubtitulo}>Encontre rapidamente quem já pode usar o benefício de fidelidade.</div>
              <button type="button" onClick={() => setPopupCupons(true)} className="dashboard-action-button" style={botaoAcao}>
                Ver clientes com cupom
              </button>
            </div>
          </div>
        </section>

        {/* POPUP CUPONS */}

        {popupCupons && (
          <div
            style={overlay}
            onClick={() =>
              setPopupCupons(false)
            }
          >
            <div
              style={modal}
              onClick={e =>
                e.stopPropagation()
              }
            >
              <div style={modalCabecalho}>
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <h2 style={modalTitulo}>
                    Clientes com cupom
                  </h2>

                  <p style={modalSubtitulo}>
                    Clientes com 10 ou mais pontos
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPopupCupons(false)
                  }
                  style={fechar}
                >
                  Fechar
                </button>
              </div>

              <div style={lista}>
                {clientesComCupom.map(
                  cliente => (
                    <div
                      key={cliente.id}
                      style={listaLinha}
                    >
                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={listaTitulo}
                        >
                          {cliente.nome}
                        </strong>

                        <div
                          style={listaSubtitulo}
                        >
                          {numero(
                            cliente.pontos,
                          )}{" "}
                          pontos
                        </div>
                      </div>

                      <strong
                        style={listaValor}
                      >
                        {Math.floor(
                          numero(
                            cliente.pontos,
                          ) / 10,
                        )}{" "}
                        cupom(ns)
                      </strong>
                    </div>
                  ),
                )}

                {clientesComCupom.length ===
                  0 && (
                  <div style={vazio}>
                    Nenhum cliente com cupom.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  detalhe,
}: {
  label: string
  value: string
  detalhe: string
}) {
  return (
    <div
      className="dashboard-card"
      style={kpi}
    >
      <span style={kpiLabel}>
        {label}
      </span>

      <strong
        className="dashboard-money"
        style={kpiValor}
      >
        {value}
      </strong>

      <span style={kpiDetalhe}>
        {detalhe}
      </span>
    </div>
  )
}

function ResumoFinanceiro({
  label,
  valor,
  destaque = false,
}: {
  label: string
  valor: number
  destaque?: boolean
}) {
  return (
    <div
      className="dashboard-card"
      style={{
        ...financeiroCard,
        borderColor: destaque
          ? "#c9a227"
          : "#e7e1d5",
      }}
    >
      <span style={financeiroLabel}>
        {label}
      </span>

      <strong
        className="dashboard-money"
        style={{
          ...financeiroValor,
          fontSize: destaque
            ? 22
            : 19,
        }}
      >
        {moeda(valor)}
      </strong>
    </div>
  )
}

function Indicador({
  label,
  valor,
}: {
  label: string
  valor: string
}) {
  return (
    <div
      className="dashboard-card"
      style={indicador}
    >
      <span style={indicadorLabel}>
        {label}
      </span>

      <strong style={indicadorValor}>
        {valor}
      </strong>
    </div>
  )
}

/* =========================
   ESTILOS
========================= */

const pagina: React.CSSProperties = {
  width: "100%",
  maxWidth: 1400,
  margin: "0 auto",
  padding: "24px",
  minWidth: 0,
  overflowX: "hidden",
  background: "#faf9f6",
}

const loading: React.CSSProperties = {
  minHeight: "60vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#666",
}

const cabecalho: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 20,
  marginBottom: 18,
  flexWrap: "wrap",
}

const cabecalhoTexto: React.CSSProperties = {
  minWidth: 0,
  flex: "1 1 300px",
}

const titulo: React.CSSProperties = {
  fontSize: "clamp(26px, 4vw, 34px)",
  fontWeight: 700,
  color: "#171717",
  lineHeight: 1.15,
}

const subtitulo: React.CSSProperties = {
  marginTop: 6,
  color: "#777",
  fontSize: 14,
}

const filtroContainer: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
}

const filtroLabel: React.CSSProperties = {
  fontSize: 13,
  color: "#666",
}

const select: React.CSSProperties = {
  minWidth: 150,
  maxWidth: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd5c6",
  borderRadius: 8,
  background: "#fff",
  color: "#222",
  outline: "none",
}

const periodoAtual: React.CSSProperties = {
  fontSize: 12,
  color: "#777",
  marginBottom: 14,
}

const erroBox: React.CSSProperties = {
  padding: 12,
  marginBottom: 16,
  borderRadius: 8,
  background: "#fff0f0",
  border: "1px solid #e5bcbc",
  color: "#9a3333",
  fontSize: 14,
}

const kpisFallback: React.CSSProperties = {
  marginBottom: 16,
}

const grid2Fallback: React.CSSProperties = {
  marginBottom: 16,
}

const grid3Fallback: React.CSSProperties = {
  marginBottom: 0,
}

const kpi: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e1d5",
  borderRadius: 12,
  padding: 17,
  minWidth: 0,
  overflow: "hidden",
}

const kpiLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#777",
  marginBottom: 9,
}

const kpiValor: React.CSSProperties = {
  display: "block",
  fontSize: "clamp(18px, 2vw, 25px)",
  lineHeight: 1.15,
  fontWeight: 700,
  color: "#171717",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
}

const kpiDetalhe: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "#888",
  fontSize: 11,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7e1d5",
  borderRadius: 12,
  padding: 20,
  minWidth: 0,
  overflow: "hidden",
}

const cardTitulo: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "#222",
  minWidth: 0,
}

const cardSubtitulo: React.CSSProperties = {
  marginTop: 4,
  marginBottom: 18,
  fontSize: 12,
  color: "#888",
  lineHeight: 1.4,
}

const cardTopoLinha: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
}

const botaoPequeno: React.CSSProperties = {
  border: "1px solid #d5c08b",
  background: "#fffaf0",
  color: "#735b15",
  padding: "7px 10px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "normal",
}

const grafico: React.CSSProperties = {
  height: 230,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-around",
  gap: 16,
  padding: "10px 12px 0",
}

const barraColuna: React.CSSProperties = {
  height: "100%",
  flex: "1 1 60px",
  minWidth: 50,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 5,
}

const barra: React.CSSProperties = {
  width: "min(38px, 70%)",
  minHeight: 8,
  background: "#d5b85a",
  borderRadius: "6px 6px 0 0",
}

const barraValor: React.CSSProperties = {
  fontSize: 10,
  color: "#777",
  whiteSpace: "nowrap",
}

const barraData: React.CSSProperties = {
  fontSize: 11,
  color: "#777",
  textTransform: "capitalize",
}

const metaValor: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
  margin: "20px 0 12px",
  color: "#777",
  fontSize: 13,
}

const barraMetaFundo: React.CSSProperties = {
  width: "100%",
  height: 9,
  background: "#eee9df",
  borderRadius: 20,
  overflow: "hidden",
}

const barraMeta: React.CSSProperties = {
  height: "100%",
  background: "#c9a227",
  borderRadius: 20,
  transition: "width .3s ease",
}

const metaRodape: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#777",
  fontSize: 12,
  flexWrap: "wrap",
}

const metaEdicao: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px solid #eee7dc",
}

const input: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  padding: "10px 12px",
  border: "1px solid #ddd5c6",
  borderRadius: 8,
  outline: "none",
  background: "#fff",
}

const botoesLinha: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  flexWrap: "wrap",
}

const botaoPrincipal: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #c9a227",
  background: "#d5b85a",
  color: "#171717",
  cursor: "pointer",
  fontWeight: 600,
}

const botaoSecundario: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #ddd5c6",
  background: "#fff",
  color: "#555",
  cursor: "pointer",
}

const destaqueCard: React.CSSProperties = {
  minWidth: 0,
  padding: 17,
  borderRadius: 10,
  border: "1px solid #eee6d8",
  background: "#fdfbf6",
}

const destaqueLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#8a7a51",
  marginBottom: 8,
}

const destaqueTitulo: React.CSSProperties = {
  display: "block",
  fontSize: 16,
  lineHeight: 1.3,
  color: "#222",
  overflowWrap: "anywhere",
}

const destaqueNumero: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 12,
  color: "#777",
}

const destaqueNumeroGrande: React.CSSProperties = {
  display: "block",
  fontSize: 30,
  color: "#222",
}

const destaqueValor: React.CSSProperties = {
  display: "block",
  marginTop: 10,
  fontWeight: 700,
  fontSize: 15,
  overflowWrap: "anywhere",
}

const lista: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
}

const listaLinha: React.CSSProperties = {
  padding: "12px 0",
  borderBottom: "1px solid #eee9df",
  minWidth: 0,
}

const listaPrincipal: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
}

const ranking: React.CSSProperties = {
  width: 26,
  height: 26,
  minWidth: 26,
  borderRadius: "50%",
  background: "#f1eadb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "#806b32",
}

const listaTitulo: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#222",
  overflowWrap: "anywhere",
  lineHeight: 1.35,
}

const listaSubtitulo: React.CSSProperties = {
  marginTop: 3,
  fontSize: 11,
  color: "#888",
  overflowWrap: "anywhere",
}

const listaValor: React.CSSProperties = {
  fontSize: 13,
  color: "#222",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
}

const vazio: React.CSSProperties = {
  padding: "24px 0",
  textAlign: "center",
  color: "#888",
  fontSize: 13,
}

const acaoCard: React.CSSProperties = {
  minWidth: 0,
  padding: 16,
  borderRadius: 10,
  border: "1px solid #eee6d8",
  background: "#fdfbf6",
}

const acaoCardTopo: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  marginBottom: 10,
}

const acaoNumero: React.CSSProperties = {
  fontSize: 26,
  lineHeight: 1,
  fontWeight: 700,
  color: "#222",
}

const acaoLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#777",
}

const acaoLista: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
}

const acaoLinha: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "11px 0",
  borderBottom: "1px solid #eee9df",
  minWidth: 0,
}

const botaoAcao: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "7px 10px",
  border: "1px solid #d5c08b",
  borderRadius: 7,
  background: "#fffaf0",
  color: "#735b15",
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
}

const botaoAcaoDesabilitado: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "7px 10px",
  border: "1px solid #e2ddd2",
  borderRadius: 7,
  background: "#f4f2ed",
  color: "#999",
  cursor: "not-allowed",
  fontSize: 12,
  whiteSpace: "nowrap",
}

const tagInformativa: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: 20,
  background: "#f5efdf",
  color: "#806b32",
  fontSize: 10,
  fontWeight: 600,
}

const pagamentoItem: React.CSSProperties = {
  padding: "11px 0",
  borderBottom: "1px solid #eee9df",
  minWidth: 0,
}

const financeiroCard: React.CSSProperties = {
  minWidth: 0,
  padding: 15,
  border: "1px solid #e7e1d5",
  borderRadius: 9,
  background: "#fff",
}

const financeiroLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#777",
  marginBottom: 8,
}

const financeiroValor: React.CSSProperties = {
  display: "block",
  color: "#222",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
}

const alertaItem: React.CSSProperties = {
  padding: 12,
  marginBottom: 8,
  borderRadius: 8,
  background: "#faf8f3",
  border: "1px solid #eee6d8",
  minWidth: 0,
}

const mesesGrid: React.CSSProperties = {
  marginTop: 8,
}

const mesCard: React.CSSProperties = {
  minWidth: 0,
  padding: 14,
  borderRadius: 9,
  border: "1px solid #eee6d8",
  background: "#faf8f3",
}

const mesValor: React.CSSProperties = {
  display: "block",
  marginTop: 7,
  fontSize: 17,
  fontWeight: 700,
  color: "#222",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
}

const indicador: React.CSSProperties = {
  minWidth: 0,
  padding: 15,
  borderRadius: 9,
  border: "1px solid #eee6d8",
  background: "#faf8f3",
}

const indicadorLabel: React.CSSProperties = {
  display: "block",
  color: "#777",
  fontSize: 11,
  marginBottom: 7,
}

const indicadorValor: React.CSSProperties = {
  display: "block",
  fontSize: 24,
  color: "#222",
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
}

const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 600,
  maxHeight: "80vh",
  overflowY: "auto",
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  boxShadow: "0 20px 60px rgba(0,0,0,.2)",
}

const modalCabecalho: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 15,
  marginBottom: 10,
}

const modalTitulo: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: "#222",
}

const modalSubtitulo: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: 12,
  color: "#888",
}

const fechar: React.CSSProperties = {
  border: "1px solid #ddd5c6",
  background: "#fff",
  borderRadius: 7,
  padding: "7px 10px",
  cursor: "pointer",
  color: "#555",
}