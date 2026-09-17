import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Periodo = "7" | "30" | "90" | "365" | "all"

type Cliente = {
  id: string
  nome: string
  cpf?: string | null
  pontos?: number | null
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
          .select("id,nome,cpf,pontos"),

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

  const valorEstoque = useMemo(() => {
    return variantes.reduce((total, variante) => {
      if (variante.ativo === false) return total

      return (
        total +
        numero(variante.estoqueAtual) *
          numero(variante.custoUnitario)
      )
    }, 0)
  }, [variantes])

  const estoqueBaixo = useMemo(() => {
    return variantes.filter(variante => {
      if (variante.ativo === false) return false

      const estoque = numero(variante.estoqueAtual)
      const minimo = numero(variante.estoqueMinimo)

      return estoque > 0 && estoque <= minimo
    }).length
  }, [variantes])

  const estoqueZerado = useMemo(() => {
    return variantes.filter(variante => {
      if (variante.ativo === false) return false

      return numero(variante.estoqueAtual) <= 0
    }).length
  }, [variantes])

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

  const vendasUltimos7Dias = useMemo(() => {
    const mapa = new Map<string, number>()

    for (let i = 6; i >= 0; i--) {
      const data = new Date()

      data.setHours(0, 0, 0, 0)
      data.setDate(data.getDate() - i)

      const chave = data
        .toISOString()
        .slice(0, 10)

      mapa.set(chave, 0)
    }

    compras.forEach(compra => {
      const status = normalizarTexto(compra.status)

      if (
        status === "cancelada" ||
        status === "cancelado"
      ) {
        return
      }

      const data = new Date(compra.criadoem)

      if (Number.isNaN(data.getTime())) return

      const chave = data
        .toISOString()
        .slice(0, 10)

      if (mapa.has(chave)) {
        mapa.set(
          chave,
          (mapa.get(chave) ?? 0) +
            numero(compra.valor),
        )
      }
    })

    return Array.from(mapa.entries()).map(
      ([data, total]) => ({
        data,
        total,
      }),
    )
  }, [compras])

  const maiorVendaDia = Math.max(
    ...vendasUltimos7Dias.map(venda => venda.total),
    0,
  )

  const vendasPorMes = useMemo(() => {
    const mapa = new Map<string, number>()

    compras.forEach(compra => {
      const status = normalizarTexto(compra.status)

      if (
        status === "cancelada" ||
        status === "cancelado"
      ) {
        return
      }

      if (!estaNoPeriodo(compra.criadoem, periodo)) {
        return
      }

      const data = new Date(compra.criadoem)

      if (Number.isNaN(data.getTime())) return

      const chave = data.toLocaleDateString(
        "pt-BR",
        {
          month: "short",
          year: "numeric",
        },
      )

      mapa.set(
        chave,
        (mapa.get(chave) ?? 0) +
          numero(compra.valor),
      )
    })

    return Array.from(mapa.entries())
  }, [compras, periodo])

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
      tipo: "estoque" | "financeiro" | "cliente"
      titulo: string
      texto: string
    }> = []

    if (estoqueZerado > 0) {
      lista.push({
        tipo: "estoque",
        titulo: "Produtos sem estoque",
        texto: `${estoqueZerado} variante(s) estão sem estoque.`,
      })
    }

    if (estoqueBaixo > 0) {
      lista.push({
        tipo: "estoque",
        titulo: "Estoque baixo",
        texto: `${estoqueBaixo} variante(s) estão abaixo do estoque mínimo.`,
      })
    }

    if (totalReceitasPendentes > 0) {
      lista.push({
        tipo: "financeiro",
        titulo: "Valores a receber",
        texto: `${moeda(
          totalReceitasPendentes,
        )} em receitas pendentes.`,
      })
    }

    if (totalDespesasPendentes > 0) {
      lista.push({
        tipo: "financeiro",
        titulo: "Despesas pendentes",
        texto: `${moeda(
          totalDespesasPendentes,
        )} em despesas pendentes.`,
      })
    }

    if (clientesComCupom.length > 0) {
      lista.push({
        tipo: "cliente",
        titulo: "Cupons disponíveis",
        texto: `${clientesComCupom.length} cliente(s) possuem cupom.`,
      })
    }

    return lista
  }, [
    estoqueZerado,
    estoqueBaixo,
    totalReceitasPendentes,
    totalDespesasPendentes,
    clientesComCupom.length,
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
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 14px;
          }

          .dashboard-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
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
          }

          @media (max-width: 900px) {
            .dashboard-kpis {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .dashboard-grid-2,
            .dashboard-grid-3 {
              grid-template-columns: 1fr;
            }

            .dashboard-months {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 600px) {
            .dashboard-kpis {
              grid-template-columns: 1fr;
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
              Dashboard
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
            label="Faturamento"
            value={moeda(faturamento)}
            detalhe={`${pedidos} pedido(s)`}
          />

          <Kpi
            label="Resultado líquido"
            value={moeda(resultadoLiquido)}
            detalhe={`${margemLiquida.toFixed(1)}% de margem`}
          />

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

          <Kpi
            label="Estoque"
            value={moeda(valorEstoque)}
            detalhe={`${estoqueBaixo} baixo / ${estoqueZerado} zerado`}
          />
        </div>

        {/* VENDAS + META */}

        <div
          className="dashboard-grid-2"
          style={grid2Fallback}
        >
          <section style={card}>
            <div style={cardTitulo}>
              Vendas dos últimos 7 dias
            </div>

            <div style={cardSubtitulo}>
              Evolução diária do faturamento
            </div>

            <div className="dashboard-chart-scroll">
              <div
                className="dashboard-chart"
                style={grafico}
              >
                {vendasUltimos7Dias.map(
                  (venda) => {
                    const altura =
                      maiorVendaDia > 0
                        ? Math.max(
                            8,
                            (venda.total /
                              maiorVendaDia) *
                              150,
                          )
                        : 8

                    const data = new Date(
                      `${venda.data}T12:00:00`,
                    )

                    return (
                      <div
                        key={venda.data}
                        style={barraColuna}
                      >
                        <div
                          style={{
                            ...barra,
                            height: `${altura}px`,
                          }}
                          title={moeda(
                            venda.total,
                          )}
                        />

                        <span
                          style={barraValor}
                        >
                          {venda.total > 0
                            ? moeda(
                                venda.total,
                              ).replace(
                                "R$",
                                "",
                              )
                            : "0"}
                        </span>

                        <span
                          style={barraData}
                        >
                          {data.toLocaleDateString(
                            "pt-BR",
                            {
                              weekday:
                                "short",
                            },
                          ).replace(
                            ".",
                            "",
                          )}
                        </span>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          </section>

          <section style={card}>
            <div style={cardTopoLinha}>
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <div style={cardTitulo}>
                  Meta de faturamento
                </div>

                <div style={cardSubtitulo}>
                  Acompanhamento do período
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNovaMeta(
                    String(meta),
                  )
                  setEditandoMeta(true)
                }}
                style={botaoPequeno}
              >
                Editar
              </button>
            </div>

            <div style={metaValor}>
              <strong className="dashboard-money">
                {moeda(faturamento)}
              </strong>

              <span>
                de {moeda(meta)}
              </span>
            </div>

            <div style={barraMetaFundo}>
              <div
                style={{
                  ...barraMeta,
                  width: `${progressoMeta}%`,
                }}
              />
            </div>

            <div style={metaRodape}>
              <span>
                {progressoMeta.toFixed(0)}%
              </span>

              <span className="dashboard-money">
                Falta{" "}
                {moeda(
                  Math.max(
                    0,
                    meta - faturamento,
                  ),
                )}
              </span>
            </div>

            {editandoMeta && (
              <div style={metaEdicao}>
                <input
                  value={novaMeta}
                  onChange={e =>
                    setNovaMeta(
                      e.target.value,
                    )
                  }
                  style={input}
                  placeholder="Meta em R$"
                />

                <div style={botoesLinha}>
                  <button
                    type="button"
                    onClick={salvarMeta}
                    style={botaoPrincipal}
                  >
                    Salvar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditandoMeta(false)
                    }
                    style={botaoSecundario}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* PRODUTOS */}

        <section style={card}>
          <div style={cardTitulo}>
            Produtos
          </div>

          <div style={cardSubtitulo}>
            O que está movimentando as vendas
          </div>

          <div
            className="dashboard-grid-3"
            style={grid3Fallback}
          >
            <div style={destaqueCard}>
              <span style={destaqueLabel}>
                Produto mais vendido
              </span>

              <strong style={destaqueTitulo}>
                {produtoMaisVendido?.nome ||
                  "Nenhuma venda"}
              </strong>

              {produtoMaisVendido && (
                <>
                  <span style={destaqueNumero}>
                    {produtoMaisVendido.quantidade}{" "}
                    unidade(s)
                  </span>

                  <span
                    className="dashboard-money"
                    style={destaqueValor}
                  >
                    {moeda(
                      produtoMaisVendido.faturamento,
                    )}
                  </span>
                </>
              )}
            </div>

            <div style={destaqueCard}>
              <span style={destaqueLabel}>
                Produto que mais faturou
              </span>

              <strong style={destaqueTitulo}>
                {produtoMaisFaturado?.nome ||
                  "Nenhuma venda"}
              </strong>

              {produtoMaisFaturado && (
                <>
                  <span style={destaqueNumero}>
                    {produtoMaisFaturado.quantidade}{" "}
                    unidade(s)
                  </span>

                  <span
                    className="dashboard-money"
                    style={destaqueValor}
                  >
                    {moeda(
                      produtoMaisFaturado.faturamento,
                    )}
                  </span>
                </>
              )}
            </div>

            <div style={destaqueCard}>
              <span style={destaqueLabel}>
                Margem bruta
              </span>

              <strong style={destaqueNumeroGrande}>
                {margemBruta.toFixed(1)}%
              </strong>

              <span style={destaqueNumero}>
                Lucro bruto{" "}
                <span className="dashboard-money">
                  {moeda(lucroBruto)}
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* TOP PRODUTOS + CLIENTES */}

        <div
          className="dashboard-grid-2"
          style={grid2Fallback}
        >
          <section style={card}>
            <div style={cardTitulo}>
              Top 5 produtos
            </div>

            <div style={cardSubtitulo}>
              Produtos mais vendidos no período
            </div>

            <div
              className="dashboard-list"
              style={lista}
            >
              {vendasPorProduto
                .slice(0, 5)
                .map(
                  (produto, index) => (
                    <div
                      key={`${produto.nome}-${index}`}
                      className="dashboard-list-row"
                      style={listaLinha}
                    >
                      <div
                        className="dashboard-list-main"
                        style={listaPrincipal}
                      >
                        <span style={ranking}>
                          {index + 1}
                        </span>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={listaTitulo}
                          >
                            {produto.nome}
                          </strong>

                          <div
                            style={listaSubtitulo}
                          >
                            {produto.quantidade}{" "}
                            unidade(s)
                          </div>
                        </div>
                      </div>

                      <strong
                        className="dashboard-list-value dashboard-money"
                        style={listaValor}
                      >
                        {moeda(
                          produto.faturamento,
                        )}
                      </strong>
                    </div>
                  ),
                )}

              {vendasPorProduto.length ===
                0 && (
                <div style={vazio}>
                  Nenhuma venda encontrada.
                </div>
              )}
            </div>
          </section>

          <section style={card}>
            <div style={cardTopoLinha}>
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <div style={cardTitulo}>
                  Principais clientes
                </div>

                <div style={cardSubtitulo}>
                  Clientes por valor comprado
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPopupCupons(true)
                }
                style={botaoPequeno}
              >
                {clientesComCupom.length} com cupom
              </button>
            </div>

            <div
              className="dashboard-list"
              style={lista}
            >
              {topClientes.map(
                (item, index) => (
                  <div
                    key={item.cliente.id}
                    className="dashboard-list-row"
                    style={listaLinha}
                  >
                    <div
                      className="dashboard-list-main"
                      style={listaPrincipal}
                    >
                      <span style={ranking}>
                        {index + 1}
                      </span>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={listaTitulo}
                        >
                          {item.cliente.nome}
                        </strong>

                        <div
                          style={listaSubtitulo}
                        >
                          {item.compras} compra(s)
                        </div>
                      </div>
                    </div>

                    <strong
                      className="dashboard-list-value dashboard-money"
                      style={listaValor}
                    >
                      {moeda(item.total)}
                    </strong>
                  </div>
                ),
              )}

              {topClientes.length === 0 && (
                <div style={vazio}>
                  Nenhum cliente encontrado.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ESTOQUE + PAGAMENTOS */}

        <div
          className="dashboard-grid-2"
          style={grid2Fallback}
        >
          <section style={card}>
            <div style={cardTitulo}>
              Atenção ao estoque
            </div>

            <div style={cardSubtitulo}>
              Situação atual das variantes
            </div>

            <div style={estoqueResumo}>
              <div style={estoqueItem}>
                <span style={estoqueNumero}>
                  {estoqueZerado}
                </span>

                <span style={estoqueLabel}>
                  Sem estoque
                </span>
              </div>

              <div style={estoqueItem}>
                <span style={estoqueNumero}>
                  {estoqueBaixo}
                </span>

                <span style={estoqueLabel}>
                  Estoque baixo
                </span>
              </div>

              <div style={estoqueItem}>
                <span
                  className="dashboard-money"
                  style={estoqueNumeroPequeno}
                >
                  {moeda(valorEstoque)}
                </span>

                <span style={estoqueLabel}>
                  Valor em estoque
                </span>
              </div>
            </div>

            <div style={lista}>
              {variantes
                .filter(variante => {
                  const estoque =
                    numero(
                      variante.estoqueAtual,
                    )

                  const minimo =
                    numero(
                      variante.estoqueMinimo,
                    )

                  return (
                    variante.ativo !== false &&
                    estoque <= minimo
                  )
                })
                .slice(0, 5)
                .map(variante => {
                  const produto =
                    variante.produtoId
                      ? produtosMap.get(
                          variante.produtoId,
                        )
                      : undefined

                  return (
                    <div
                      key={variante.id}
                      className="dashboard-list-row"
                      style={listaLinha}
                    >
                      <div
                        className="dashboard-list-main"
                        style={listaPrincipal}
                      >
                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={listaTitulo}
                          >
                            {produto?.nome ||
                              variante.sku ||
                              "Variante"}
                          </strong>

                          <div
                            style={listaSubtitulo}
                          >
                            {[
                              variante.cor,
                              variante.tamanho,
                            ]
                              .filter(Boolean)
                              .join(
                                " • ",
                              ) ||
                              variante.sku ||
                              "Sem identificação"}
                          </div>
                        </div>
                      </div>

                      <strong
                        style={{
                          ...listaValor,
                          fontSize: 14,
                        }}
                      >
                        {numero(
                          variante.estoqueAtual,
                        )}{" "}
                        un.
                      </strong>
                    </div>
                  )
                })}
            </div>
          </section>

          <section style={card}>
            <div style={cardTitulo}>
              Formas de pagamento
            </div>

            <div style={cardSubtitulo}>
              Faturamento por forma de pagamento
            </div>

            <div style={lista}>
              {vendasPorPagamento.map(
                ([pagamento, total]) => {
                  const porcentagem =
                    percentual(
                      total,
                      faturamento,
                    )

                  return (
                    <div
                      key={pagamento}
                      style={pagamentoItem}
                    >
                      <div
                        className="dashboard-list-row"
                        style={{
                          ...listaLinha,
                          borderBottom: "none",
                        }}
                      >
                        <strong
                          style={{
                            minWidth: 0,
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {pagamento}
                        </strong>

                        <strong
                          className="dashboard-money dashboard-list-value"
                          style={{
                            color:
                              "#171717",
                          }}
                        >
                          {moeda(total)}
                        </strong>
                      </div>

                      <div
                        style={barraMetaFundo}
                      >
                        <div
                          style={{
                            ...barraMeta,
                            width: `${porcentagem}%`,
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          color: "#777",
                        }}
                      >
                        {porcentagem.toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                  )
                },
              )}

              {vendasPorPagamento.length ===
                0 && (
                <div style={vazio}>
                  Nenhuma venda encontrada.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* FINANCEIRO */}

        <section style={card}>
          <div style={cardTitulo}>
            Resumo financeiro
          </div>

          <div style={cardSubtitulo}>
            Visão rápida do período selecionado
          </div>

          <div
            className="dashboard-grid-3"
            style={grid3Fallback}
          >
            <ResumoFinanceiro
              label="Receitas recebidas"
              valor={totalReceitasRecebidas}
            />

            <ResumoFinanceiro
              label="Receitas pendentes"
              valor={totalReceitasPendentes}
            />

            <ResumoFinanceiro
              label="Despesas pagas"
              valor={totalDespesasPagas}
            />

            <ResumoFinanceiro
              label="Despesas pendentes"
              valor={totalDespesasPendentes}
            />

            <ResumoFinanceiro
              label="Custo dos produtos"
              valor={custoProdutosVendidos}
            />

            <ResumoFinanceiro
              label="Resultado líquido"
              valor={resultadoLiquido}
              destaque
            />
          </div>
        </section>

        {/* ALERTAS + MOVIMENTAÇÕES */}

        <div
          className="dashboard-grid-2"
          style={grid2Fallback}
        >
          <section style={card}>
            <div style={cardTitulo}>
              Alertas
            </div>

            <div style={cardSubtitulo}>
              Pontos que merecem atenção
            </div>

            <div style={lista}>
              {alertas.map(
                (alerta, index) => (
                  <div
                    key={`${alerta.titulo}-${index}`}
                    style={alertaItem}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: 14,
                        marginBottom: 4,
                        color: "#222",
                      }}
                    >
                      {alerta.titulo}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        color: "#666",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      {alerta.texto}
                    </span>
                  </div>
                ),
              )}

              {alertas.length === 0 && (
                <div style={vazio}>
                  Nenhum alerta no momento.
                </div>
              )}
            </div>
          </section>

          <section style={card}>
            <div style={cardTitulo}>
              Últimas movimentações
            </div>

            <div style={cardSubtitulo}>
              Atividades mais recentes
            </div>

            <div
              className="dashboard-list"
              style={lista}
            >
              {movimentacoesRecentes.map(
                movimento => (
                  <div
                    key={movimento.id}
                    className="dashboard-list-row"
                    style={listaLinha}
                  >
                    <div
                      className="dashboard-list-main"
                      style={listaPrincipal}
                    >
                      <strong
                        style={listaTitulo}
                      >
                        {movimento.descricao}
                      </strong>

                      <div
                        style={listaSubtitulo}
                      >
                        {formatarDataHora(
                          movimento.data,
                        )}
                      </div>
                    </div>

                    <strong
                      className="dashboard-list-value dashboard-money"
                      style={{
                        ...listaValor,
                        color:
                          movimento.tipo ===
                          "despesa"
                            ? "#a33"
                            : "#222",
                      }}
                    >
                      {movimento.tipo ===
                      "despesa"
                        ? "- "
                        : "+ "}
                      {moeda(
                        movimento.valor,
                      )}
                    </strong>
                  </div>
                ),
              )}

              {movimentacoesRecentes.length ===
                0 && (
                <div style={vazio}>
                  Nenhuma movimentação encontrada.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* VENDAS POR MÊS */}

        <section style={card}>
          <div style={cardTitulo}>
            Vendas por mês
          </div>

          <div style={cardSubtitulo}>
            Faturamento mensal considerando o filtro
            selecionado
          </div>

          <div
            className="dashboard-months"
            style={mesesGrid}
          >
            {vendasPorMes.map(
              ([mes, total]) => (
                <div
                  key={mes}
                  style={mesCard}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "#777",
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {mes}
                  </span>

                  <strong
                    className="dashboard-money"
                    style={mesValor}
                  >
                    {moeda(total)}
                  </strong>
                </div>
              ),
            )}

            {vendasPorMes.length === 0 && (
              <div style={vazio}>
                Nenhuma venda encontrada.
              </div>
            )}
          </div>
        </section>

        {/* RESUMO OPERACIONAL */}

        <section style={card}>
          <div style={cardTitulo}>
            Resumo operacional
          </div>

          <div style={cardSubtitulo}>
            Indicadores principais da operação
          </div>

          <div
            className="dashboard-grid-3"
            style={grid3Fallback}
          >
            <Indicador
              label="Produtos cadastrados"
              valor={String(produtos.length)}
            />

            <Indicador
              label="Variantes cadastradas"
              valor={String(
                variantes.length,
              )}
            />

            <Indicador
              label="Clientes cadastrados"
              valor={String(
                clientes.length,
              )}
            />

            <Indicador
              label="Vendas registradas"
              valor={String(compras.length)}
            />

            <Indicador
              label="Receitas registradas"
              valor={String(
                receitas.length,
              )}
            />

            <Indicador
              label="Despesas registradas"
              valor={String(
                despesas.length,
              )}
            />
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

const estoqueResumo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 12,
}

const estoqueItem: React.CSSProperties = {
  minWidth: 0,
  padding: 12,
  background: "#faf8f3",
  borderRadius: 9,
}

const estoqueNumero: React.CSSProperties = {
  display: "block",
  fontSize: 22,
  fontWeight: 700,
  color: "#222",
}

const estoqueNumeroPequeno: React.CSSProperties = {
  display: "block",
  fontSize: 16,
  fontWeight: 700,
  overflowWrap: "anywhere",
}

const estoqueLabel: React.CSSProperties = {
  display: "block",
  marginTop: 3,
  fontSize: 10,
  color: "#888",
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