import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Periodo = "7" | "30" | "90" | "365"

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
  criadoem?: string | null
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
  produtoId: string
  nome: string
  quantidade: number
  faturamento: number
}

type VendaDia = {
  data: string
  valor: number
}

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

const numero = (valor: unknown) => {
  if (typeof valor === "number") return valor
  if (typeof valor === "string") {
    const normalizado = valor
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")

    const convertido = Number(normalizado)
    return Number.isFinite(convertido) ? convertido : 0
  }

  return 0
}



const formatarDataHora = (valor?: string | null) => {
  if (!valor) return "-"

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return "-"

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

const normalizarTexto = (valor: unknown) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const pegarCampo = (
  objeto: Record<string, unknown>,
  nomes: string[],
): unknown => {
  for (const nome of nomes) {
    if (objeto[nome] !== undefined && objeto[nome] !== null) {
      return objeto[nome]
    }
  }

  return undefined
}

const obterIdProdutoDoItem = (item: VendaItem) => {
  const valor = pegarCampo(item, [
    "produtoId",
    "produtoid",
    "produto_id",
    "idProduto",
    "idproduto",
  ])

  return valor ? String(valor) : null
}

const obterIdVarianteDoItem = (item: VendaItem) => {
  const valor = pegarCampo(item, [
    "produtoVarianteId",
    "produtovarianteid",
    "produto_variante_id",
    "varianteId",
    "varianteid",
    "variante_id",
    "idVariante",
    "idvariante",
  ])

  return valor ? String(valor) : null
}

const inicioDoPeriodo = (periodo: Periodo) => {
  const data = new Date()
  data.setHours(0, 0, 0, 0)

  const dias = Number(periodo) - 1

  data.setDate(data.getDate() - dias)

  return data
}

const estaNoPeriodo = (
  dataString: string | null | undefined,
  periodo: Periodo,
) => {
  if (!dataString) return false

  const data = new Date(dataString)

  if (Number.isNaN(data.getTime())) return false

  return data >= inicioDoPeriodo(periodo)
}

const percentual = (valor: number, total: number) => {
  if (!total) return 0

  return Math.max(0, Math.min(100, (valor / total) * 100))
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

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  const [meta, setMeta] = useState(10000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState("10000")

  const [popupCupons, setPopupCupons] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setErro("")

      const [
        clientesResponse,
        comprasResponse,
        receitasResponse,
        despesasResponse,
        produtosResponse,
        variantesResponse,
        vendaItensResponse,
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id,nome,cpf,pontos"),

        supabase
          .from("compras")
          .select("id,clienteid,valor,criadoem,pagamento,status"),

        supabase
          .from("receitas")
          .select(
            "id,tipo,descricao,valor,dataCompetencia,dataRecebimento,status,compraId",
          ),

        supabase
          .from("despesas")
          .select(
            "id,descricao,valor,dataCompetencia,dataPagamento,categoria,status",
          ),

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

      if (clientesResponse.error) {
        throw clientesResponse.error
      }

      if (comprasResponse.error) {
        throw comprasResponse.error
      }

      if (receitasResponse.error) {
        throw receitasResponse.error
      }

      if (despesasResponse.error) {
        throw despesasResponse.error
      }

      if (produtosResponse.error) {
        throw produtosResponse.error
      }

      if (variantesResponse.error) {
        throw variantesResponse.error
      }

      if (vendaItensResponse.error) {
        throw vendaItensResponse.error
      }

      setClientes((clientesResponse.data ?? []) as Cliente[])
      setCompras((comprasResponse.data ?? []) as Compra[])
      setReceitas((receitasResponse.data ?? []) as Receita[])
      setDespesas((despesasResponse.data ?? []) as Despesa[])
      setProdutos((produtosResponse.data ?? []) as Produto[])
      setVariantes((variantesResponse.data ?? []) as Variante[])
      setVendaItens((vendaItensResponse.data ?? []) as VendaItem[])
    } catch (error) {
      console.error(error)

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados do dashboard.",
      )
    } finally {
      setLoading(false)
    }
  }

  const clientesMap = useMemo(() => {
    const mapa = new Map<string, Cliente>()

    clientes.forEach((cliente) => {
      mapa.set(cliente.id, cliente)
    })

    return mapa
  }, [clientes])

  const produtosMap = useMemo(() => {
    const mapa = new Map<string, Produto>()

    produtos.forEach((produto) => {
      mapa.set(produto.id, produto)
    })

    return mapa
  }, [produtos])

  const variantesMap = useMemo(() => {
    const mapa = new Map<string, Variante>()

    variantes.forEach((variante) => {
      mapa.set(variante.id, variante)
    })

    return mapa
  }, [variantes])

  const comprasPeriodo = useMemo(
    () =>
      compras.filter(
        (compra) =>
          estaNoPeriodo(compra.criadoem, periodo) &&
          normalizarTexto(compra.status) !== "cancelada" &&
          normalizarTexto(compra.status) !== "cancelado",
      ),
    [compras, periodo],
  )

  const faturamento = useMemo(
    () =>
      comprasPeriodo.reduce(
        (total, compra) => total + numero(compra.valor),
        0,
      ),
    [comprasPeriodo],
  )

  const pedidos = comprasPeriodo.length

  const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0

  const clientesAtendidos = useMemo(() => {
    const ids = new Set<string>()

    comprasPeriodo.forEach((compra) => {
      if (compra.clienteid) {
        ids.add(compra.clienteid)
      }
    })

    return ids.size
  }, [comprasPeriodo])

  const receitasPeriodo = useMemo(
    () =>
      receitas.filter(
        (receita) =>
          estaNoPeriodo(
            receita.dataRecebimento ?? receita.dataCompetencia,
            periodo,
          ) &&
          normalizarTexto(receita.status) !== "cancelada" &&
          normalizarTexto(receita.status) !== "cancelado",
      ),
    [receitas, periodo],
  )

  const totalReceitasRecebidas = useMemo(
    () =>
      receitasPeriodo
        .filter((receita) => normalizarTexto(receita.status) === "recebida")
        .reduce((total, receita) => total + numero(receita.valor), 0),
    [receitasPeriodo],
  )

  const totalReceitasPendentes = useMemo(
    () =>
      receitasPeriodo
        .filter((receita) => normalizarTexto(receita.status) === "pendente")
        .reduce((total, receita) => total + numero(receita.valor), 0),
    [receitasPeriodo],
  )

  const despesasPeriodo = useMemo(
    () =>
      despesas.filter(
        (despesa) =>
          estaNoPeriodo(
            despesa.dataPagamento ?? despesa.dataCompetencia,
            periodo,
          ) &&
          normalizarTexto(despesa.status) !== "cancelada" &&
          normalizarTexto(despesa.status) !== "cancelado",
      ),
    [despesas, periodo],
  )

  const totalDespesasPagas = useMemo(
    () =>
      despesasPeriodo
        .filter((despesa) => normalizarTexto(despesa.status) === "paga")
        .reduce((total, despesa) => total + numero(despesa.valor), 0),
    [despesasPeriodo],
  )

  const totalDespesasPendentes = useMemo(
    () =>
      despesasPeriodo
        .filter((despesa) => normalizarTexto(despesa.status) === "pendente")
        .reduce((total, despesa) => total + numero(despesa.valor), 0),
    [despesasPeriodo],
  )

  const vendasPorProduto = useMemo(() => {
    const mapa = new Map<string, VendaProduto>()

    vendaItens.forEach((item) => {
      const compraId = item.compraId

      if (!compraId) return

      const compra = comprasPeriodo.find(
        (itemCompra) => itemCompra.id === compraId,
      )

      if (!compra) return

      const quantidade = numero(item.quantidade)

      if (quantidade <= 0) return

      const produtoId =
        obterIdProdutoDoItem(item) ??
        (() => {
          const varianteId = obterIdVarianteDoItem(item)

          if (!varianteId) return null

          return variantesMap.get(varianteId)?.produtoId ?? null
        })()

      if (!produtoId) return

      const produto = produtosMap.get(produtoId)

      if (!produto) return

      const precoVenda = (() => {
        const varianteId = obterIdVarianteDoItem(item)

        if (!varianteId) return 0

        const variante = variantesMap.get(varianteId)

        return numero(variante?.precoVenda)
      })()

      const faturamentoItem =
        precoVenda > 0
          ? precoVenda * quantidade
          : numero(compra.valor) > 0 && pedidos > 0
            ? (numero(compra.valor) / pedidos) * quantidade
            : 0

      const atual = mapa.get(produtoId)

      if (atual) {
        atual.quantidade += quantidade
        atual.faturamento += faturamentoItem
      } else {
        mapa.set(produtoId, {
          produtoId,
          nome: produto.nome,
          quantidade,
          faturamento: faturamentoItem,
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.quantidade - a.quantidade,
    )
  }, [
    vendaItens,
    comprasPeriodo,
    produtosMap,
    variantesMap,
    pedidos,
  ])

  const produtoMaisVendido = vendasPorProduto[0] ?? null

  const produtoMaisFaturado = useMemo(
    () =>
      [...vendasPorProduto].sort(
        (a, b) => b.faturamento - a.faturamento,
      )[0] ?? null,
    [vendasPorProduto],
  )

  const custoProdutosVendidos = useMemo(
    () =>
      vendaItens.reduce((total, item) => {
        if (!item.compraId) return total

        const compraExiste = comprasPeriodo.some(
          (compra) => compra.id === item.compraId,
        )

        if (!compraExiste) return total

        const quantidade = numero(item.quantidade)
        const custoInformado = numero(item.custoUnitario)

        if (quantidade <= 0 || custoInformado <= 0) {
          return total
        }

        return total + quantidade * custoInformado
      }, 0),
    [vendaItens, comprasPeriodo],
  )

  const lucroBruto = faturamento - custoProdutosVendidos

  const resultadoLiquido =
    faturamento + totalReceitasRecebidas - totalDespesasPagas

  const margemBruta =
    faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0

  const margemLiquida =
    faturamento > 0 ? (resultadoLiquido / faturamento) * 100 : 0

  const valorEstoque = useMemo(
    () =>
      variantes
        .filter((variante) => variante.ativo !== false)
        .reduce(
          (total, variante) =>
            total +
            numero(variante.estoqueAtual) *
              numero(variante.custoUnitario),
          0,
        ),
    [variantes],
  )

  const estoqueBaixo = useMemo(
    () =>
      variantes.filter((variante) => {
        if (variante.ativo === false) return false

        const estoque = numero(variante.estoqueAtual)
        const minimo = numero(variante.estoqueMinimo)

        return estoque > 0 && estoque <= minimo
      }).length,
    [variantes],
  )

  const estoqueZerado = useMemo(
    () =>
      variantes.filter(
        (variante) =>
          variante.ativo !== false &&
          numero(variante.estoqueAtual) <= 0,
      ).length,
    [variantes],
  )

  const vendasPorPagamento = useMemo(() => {
    const mapa = new Map<string, number>()

    comprasPeriodo.forEach((compra) => {
      const pagamento =
        compra.pagamento?.trim() || "Não informado"

      mapa.set(
        pagamento,
        (mapa.get(pagamento) ?? 0) + numero(compra.valor),
      )
    })

    return Array.from(mapa.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [comprasPeriodo])

  const clientesRanking = useMemo(() => {
    const mapa = new Map<
      string,
      {
        clienteId: string
        nome: string
        quantidade: number
        valor: number
      }
    >()

    comprasPeriodo.forEach((compra) => {
      if (!compra.clienteid) return

      const cliente = clientesMap.get(compra.clienteid)

      if (!cliente) return

      const atual = mapa.get(cliente.id)

      if (atual) {
        atual.quantidade += 1
        atual.valor += numero(compra.valor)
      } else {
        mapa.set(cliente.id, {
          clienteId: cliente.id,
          nome: cliente.nome,
          quantidade: 1,
          valor: numero(compra.valor),
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.valor - a.valor,
    )
  }, [comprasPeriodo, clientesMap])

  const topClientes = clientesRanking.slice(0, 5)

  const clientesComCupom = useMemo(
    () => clientes.filter((cliente) => numero(cliente.pontos) >= 10),
    [clientes],
  )

  const vendasUltimos7Dias = useMemo(() => {
    const dias: VendaDia[] = []

    for (let i = 6; i >= 0; i--) {
      const data = new Date()
      data.setHours(0, 0, 0, 0)
      data.setDate(data.getDate() - i)

      const inicio = new Date(data)
      const fim = new Date(data)
      fim.setHours(23, 59, 59, 999)

      const valor = compras
        .filter((compra) => {
          if (!compra.criadoem) return false

          const dataCompra = new Date(compra.criadoem)

          return (
            dataCompra >= inicio &&
            dataCompra <= fim &&
            normalizarTexto(compra.status) !== "cancelada" &&
            normalizarTexto(compra.status) !== "cancelado"
          )
        })
        .reduce((total, compra) => total + numero(compra.valor), 0)

      dias.push({
        data: data.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        valor,
      })
    }

    return dias
  }, [compras])

  const maiorVendaDia = Math.max(
    ...vendasUltimos7Dias.map((item) => item.valor),
    1,
  )

  const vendasPorMes = useMemo(() => {
    const mapa = new Map<string, number>()

    compras
      .filter(
        (compra) =>
          normalizarTexto(compra.status) !== "cancelada" &&
          normalizarTexto(compra.status) !== "cancelado",
      )
      .forEach((compra) => {
        if (!compra.criadoem) return

        const data = new Date(compra.criadoem)

        if (Number.isNaN(data.getTime())) return

        const chave = `${data.getFullYear()}-${String(
          data.getMonth() + 1,
        ).padStart(2, "0")}`

        mapa.set(
          chave,
          (mapa.get(chave) ?? 0) + numero(compra.valor),
        )
      })

    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([chave, valor]) => {
        const [ano, mes] = chave.split("-")

        const data = new Date(
          Number(ano),
          Number(mes) - 1,
          1,
        )

        return {
          nome: data.toLocaleDateString("pt-BR", {
            month: "short",
          }),
          valor,
        }
      })
  }, [compras])

  const maiorVendaMes = Math.max(
    ...vendasPorMes.map((item) => item.valor),
    1,
  )

  const movimentacoesRecentes = useMemo(() => {
    const lista = [
      ...compras.map((compra) => ({
        id: `compra-${compra.id}`,
        tipo: "Venda",
        descricao:
          clientesMap.get(compra.clienteid ?? "")?.nome ??
          "Cliente não identificado",
        valor: numero(compra.valor),
        data: compra.criadoem,
      })),

      ...receitas.map((receita) => ({
        id: `receita-${receita.id}`,
        tipo: "Receita",
        descricao:
          receita.descricao || receita.tipo || "Receita",
        valor: numero(receita.valor),
        data:
          receita.dataRecebimento ??
          receita.dataCompetencia,
      })),

      ...despesas.map((despesa) => ({
        id: `despesa-${despesa.id}`,
        tipo: "Despesa",
        descricao: despesa.descricao || "Despesa",
        valor: numero(despesa.valor),
        data:
          despesa.dataPagamento ??
          despesa.dataCompetencia,
      })),
    ]

    return lista
      .sort((a, b) => {
        const dataA = a.data
          ? new Date(a.data).getTime()
          : 0

        const dataB = b.data
          ? new Date(b.data).getTime()
          : 0

        return dataB - dataA
      })
      .slice(0, 8)
  }, [compras, receitas, despesas, clientesMap])

  const alertas = useMemo(() => {
    const lista: {
      tipo: "danger" | "warning" | "info"
      titulo: string
      descricao: string
    }[] = []

    if (estoqueZerado > 0) {
      lista.push({
        tipo: "danger",
        titulo: "Produtos sem estoque",
        descricao: `${estoqueZerado} variante(s) estão sem estoque.`,
      })
    }

    if (estoqueBaixo > 0) {
      lista.push({
        tipo: "warning",
        titulo: "Estoque baixo",
        descricao: `${estoqueBaixo} variante(s) estão no estoque mínimo.`,
      })
    }

    if (totalReceitasPendentes > 0) {
      lista.push({
        tipo: "warning",
        titulo: "Valores a receber",
        descricao: `${moeda(totalReceitasPendentes)} estão pendentes.`,
      })
    }

    if (totalDespesasPendentes > 0) {
      lista.push({
        tipo: "info",
        titulo: "Despesas pendentes",
        descricao: `${moeda(totalDespesasPendentes)} ainda não foram pagas.`,
      })
    }

    if (clientesComCupom.length > 0) {
      lista.push({
        tipo: "info",
        titulo: "Cupons disponíveis",
        descricao: `${clientesComCupom.length} cliente(s) atingiram 10 pontos.`,
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

  const metaPercentual = percentual(faturamento, meta)

  const salvarMeta = () => {
    const valor = numero(novaMeta)

    if (valor <= 0) return

    setMeta(valor)
    setNovaMeta(String(valor))
    setEditandoMeta(false)
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Carregando dashboard...</p>

        <style>{`
          .dashboard-loading {
            min-height: 70vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #6b6257;
          }

          .loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #eadfcd;
            border-top-color: #b99352;
            border-radius: 50%;
            animation: girar 0.8s linear infinite;
          }

          @keyframes girar {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <style>{`
        .dashboard {
          width: 100%;
          min-height: 100%;
          background: #faf9f7;
          color: #27231f;
          padding: 28px;
          box-sizing: border-box;
        }

        .dashboard * {
          box-sizing: border-box;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 26px;
        }

        .dashboard-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 700;
          color: #29251f;
        }

        .dashboard-subtitle {
          margin: 7px 0 0;
          color: #80766b;
          font-size: 14px;
        }

        .periodos {
          display: flex;
          gap: 6px;
          background: #fff;
          padding: 5px;
          border: 1px solid #e9e2d8;
          border-radius: 10px;
        }

        .periodo-btn {
          border: 0;
          background: transparent;
          padding: 9px 14px;
          border-radius: 7px;
          color: #71685e;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .periodo-btn:hover {
          background: #f8f3eb;
        }

        .periodo-btn.ativo {
          background: #d4b16d;
          color: #fff;
        }

        .erro-box {
          background: #fff2f0;
          border: 1px solid #e6b8b0;
          color: #9b4034;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .grid-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .kpi-card {
          background: #fff;
          border: 1px solid #ebe5dc;
          border-radius: 12px;
          padding: 18px;
          min-height: 120px;
        }

        .kpi-label {
          color: #877d72;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .kpi-value {
          margin-top: 9px;
          font-size: 23px;
          font-weight: 700;
          color: #2c2721;
          white-space: nowrap;
        }

        .kpi-description {
          margin-top: 7px;
          color: #958b80;
          font-size: 12px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 18px;
        }

        .painel {
          background: #fff;
          border: 1px solid #ebe5dc;
          border-radius: 12px;
          padding: 20px;
          min-width: 0;
        }

        .col-4 {
          grid-column: span 4;
        }

        .col-5 {
          grid-column: span 5;
        }

        .col-6 {
          grid-column: span 6;
        }

        .col-7 {
          grid-column: span 7;
        }

        .col-8 {
          grid-column: span 8;
        }

        .col-12 {
          grid-column: span 12;
        }

        .painel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .painel-titulo {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #302a24;
        }

        .painel-subtitulo {
          margin: 5px 0 0;
          color: #92877b;
          font-size: 12px;
        }

        .link-btn {
          border: 0;
          background: transparent;
          color: #ad8749;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .produto-destaque {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .destaque-item {
          border: 1px solid #eee7dd;
          background: #fcfbf9;
          border-radius: 10px;
          padding: 15px;
        }

        .destaque-label {
          font-size: 11px;
          color: #958b80;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .destaque-nome {
          margin-top: 8px;
          font-size: 16px;
          font-weight: 700;
          color: #312b24;
        }

        .destaque-numero {
          margin-top: 5px;
          font-size: 13px;
          color: #776d62;
        }

        .grafico-barras {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 180px;
          padding-top: 10px;
        }

        .barra-coluna {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          min-width: 0;
        }

        .barra {
          width: 100%;
          max-width: 42px;
          min-height: 3px;
          border-radius: 5px 5px 2px 2px;
          background: #d4b16d;
        }

        .barra-valor {
          font-size: 9px;
          color: #8c8174;
          margin-bottom: 5px;
          white-space: nowrap;
        }

        .barra-label {
          font-size: 10px;
          color: #81766a;
          margin-top: 7px;
        }

        .meta-container {
          margin-top: 8px;
        }

        .meta-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .meta-valor {
          font-size: 24px;
          font-weight: 700;
          color: #302a24;
        }

        .meta-percentual {
          color: #aa8243;
          font-size: 13px;
          font-weight: 700;
        }

        .progress-bg {
          height: 9px;
          background: #eee9e2;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 13px;
        }

        .progress-fill {
          height: 100%;
          background: #d4b16d;
          border-radius: 999px;
        }

        .meta-info {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          color: #8d8276;
          font-size: 11px;
        }

        .meta-edit {
          margin-top: 16px;
          display: flex;
          gap: 8px;
        }

        .input {
          width: 100%;
          border: 1px solid #ddd5c9;
          border-radius: 8px;
          padding: 9px 10px;
          outline: none;
          font-size: 13px;
          background: #fff;
        }

        .input:focus {
          border-color: #c8a15d;
        }

        .btn {
          border: 0;
          border-radius: 8px;
          padding: 9px 13px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .btn-primary {
          background: #c9a15b;
          color: #fff;
        }

        .btn-secondary {
          background: #f0ece6;
          color: #655c53;
        }

        .lista {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .lista-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid #f0ece6;
        }

        .lista-item:last-child {
          border-bottom: 0;
        }

        .lista-esquerda {
          min-width: 0;
        }

        .lista-nome {
          font-size: 13px;
          font-weight: 600;
          color: #39322a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lista-detalhe {
          margin-top: 3px;
          color: #91867a;
          font-size: 11px;
        }

        .lista-valor {
          font-size: 13px;
          font-weight: 700;
          color: #4a4035;
          white-space: nowrap;
        }

        .estoque-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 7px;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 700;
          margin-left: 5px;
        }

        .estoque-tag.zero {
          background: #fbe7e4;
          color: #a54136;
        }

        .estoque-tag.baixo {
          background: #fdf1d9;
          color: #98702e;
        }

        .financeiro-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .financeiro-item {
          border: 1px solid #eee7de;
          border-radius: 9px;
          padding: 13px;
        }

        .financeiro-label {
          color: #91867b;
          font-size: 11px;
        }

        .financeiro-value {
          margin-top: 6px;
          color: #332c25;
          font-size: 16px;
          font-weight: 700;
        }

        .positivo {
          color: #4d7957;
        }

        .negativo {
          color: #a14b40;
        }

        .alertas {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .alerta {
          padding: 12px;
          border-radius: 9px;
          border: 1px solid #ece5dc;
        }

        .alerta.danger {
          background: #fff4f2;
          border-color: #efd2cd;
        }

        .alerta.warning {
          background: #fffaf0;
          border-color: #efe0bb;
        }

        .alerta.info {
          background: #f7f7f4;
        }

        .alerta-titulo {
          font-size: 12px;
          font-weight: 700;
          color: #40382f;
        }

        .alerta-descricao {
          margin-top: 4px;
          color: #8a7f73;
          font-size: 11px;
          line-height: 1.4;
        }

        .tabela-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .tabela {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
        }

        .tabela th {
          text-align: left;
          color: #94897d;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: 0 10px 11px;
          border-bottom: 1px solid #ece6dd;
        }

        .tabela td {
          padding: 12px 10px;
          border-bottom: 1px solid #f1ede8;
          color: #4a4138;
          font-size: 12px;
        }

        .tabela td.valor {
          font-weight: 700;
          text-align: right;
        }

        .tabela th:last-child {
          text-align: right;
        }

        .sem-dados {
          padding: 25px 10px;
          text-align: center;
          color: #988d81;
          font-size: 12px;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(30, 25, 20, .45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .popup {
          width: min(520px, 100%);
          max-height: 80vh;
          overflow: auto;
          background: #fff;
          border-radius: 14px;
          padding: 22px;
          box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .popup-title {
          margin: 0;
          font-size: 18px;
          color: #302a24;
        }

        .fechar {
          border: 0;
          background: #f3efe9;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          color: #6d6359;
        }

        .cupom-cliente {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee8df;
        }

        .cupom-nome {
          font-size: 13px;
          font-weight: 600;
        }

        .cupom-pontos {
          color: #ad8444;
          font-size: 12px;
          font-weight: 700;
        }

        @media (max-width: 1250px) {
          .grid-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .col-4,
          .col-5 {
            grid-column: span 6;
          }
        }

        @media (max-width: 850px) {
          .dashboard {
            padding: 18px;
          }

          .dashboard-header {
            flex-direction: column;
          }

          .periodos {
            width: 100%;
            overflow-x: auto;
          }

          .periodo-btn {
            flex: 1;
            white-space: nowrap;
          }

          .grid-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .col-4,
          .col-5,
          .col-6,
          .col-7,
          .col-8 {
            grid-column: span 12;
          }
        }

        @media (max-width: 520px) {
          .dashboard {
            padding: 13px;
          }

          .dashboard-title {
            font-size: 24px;
          }

          .grid-kpis {
            grid-template-columns: 1fr;
          }

          .kpi-card {
            min-height: auto;
          }

          .produto-destaque {
            grid-template-columns: 1fr;
          }

          .financeiro-grid {
            grid-template-columns: 1fr;
          }

          .painel {
            padding: 16px;
          }
        }
      `}</style>

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Visão geral do desempenho da loja
          </p>
        </div>

        <div className="periodos">
          <button
            className={`periodo-btn ${
              periodo === "7" ? "ativo" : ""
            }`}
            onClick={() => setPeriodo("7")}
          >
            7 dias
          </button>

          <button
            className={`periodo-btn ${
              periodo === "30" ? "ativo" : ""
            }`}
            onClick={() => setPeriodo("30")}
          >
            30 dias
          </button>

          <button
            className={`periodo-btn ${
              periodo === "90" ? "ativo" : ""
            }`}
            onClick={() => setPeriodo("90")}
          >
            90 dias
          </button>

          <button
            className={`periodo-btn ${
              periodo === "365" ? "ativo" : ""
            }`}
            onClick={() => setPeriodo("365")}
          >
            1 ano
          </button>
        </div>
      </div>

      {erro && <div className="erro-box">{erro}</div>}

      <div className="grid-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Faturamento</div>
          <div className="kpi-value">{moeda(faturamento)}</div>
          <div className="kpi-description">
            Vendas no período selecionado
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Resultado</div>
          <div
            className={`kpi-value ${
              resultadoLiquido >= 0 ? "positivo" : "negativo"
            }`}
          >
            {moeda(resultadoLiquido)}
          </div>
          <div className="kpi-description">
            Resultado operacional calculado
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Pedidos</div>
          <div className="kpi-value">{pedidos}</div>
          <div className="kpi-description">
            Pedidos realizados no período
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Ticket médio</div>
          <div className="kpi-value">{moeda(ticketMedio)}</div>
          <div className="kpi-description">
            Média por pedido
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Clientes</div>
          <div className="kpi-value">{clientesAtendidos}</div>
          <div className="kpi-description">
            Clientes que compraram
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Estoque baixo</div>
          <div className="kpi-value">
            {estoqueBaixo + estoqueZerado}
          </div>
          <div className="kpi-description">
            {estoqueZerado} sem estoque
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="painel col-8">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Vendas dos últimos 7 dias
              </h2>
              <p className="painel-subtitulo">
                Acompanhamento diário do faturamento
              </p>
            </div>
          </div>

          <div className="grafico-barras">
            {vendasUltimos7Dias.map((item) => (
              <div className="barra-coluna" key={item.data}>
                <div className="barra-valor">
                  {item.valor > 0 ? moeda(item.valor) : ""}
                </div>

                <div
                  className="barra"
                  style={{
                    height: `${Math.max(
                      3,
                      (item.valor / maiorVendaDia) * 135,
                    )}px`,
                  }}
                />

                <div className="barra-label">{item.data}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="painel col-4">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">Meta de vendas</h2>
              <p className="painel-subtitulo">
                Acompanhamento do objetivo
              </p>
            </div>

            <button
              className="link-btn"
              onClick={() => {
                setNovaMeta(String(meta))
                setEditandoMeta(!editandoMeta)
              }}
            >
              {editandoMeta ? "Fechar" : "Editar"}
            </button>
          </div>

          <div className="meta-container">
            <div className="meta-top">
              <div className="meta-valor">
                {moeda(faturamento)}
              </div>

              <div className="meta-percentual">
                {metaPercentual.toFixed(0)}%
              </div>
            </div>

            <div className="progress-bg">
              <div
                className="progress-fill"
                style={{
                  width: `${metaPercentual}%`,
                }}
              />
            </div>

            <div className="meta-info">
              <span>Atual</span>
              <span>Meta: {moeda(meta)}</span>
            </div>

            {editandoMeta && (
              <div className="meta-edit">
                <input
                  className="input"
                  value={novaMeta}
                  onChange={(event) =>
                    setNovaMeta(event.target.value)
                  }
                  placeholder="Ex.: 15000"
                />

                <button
                  className="btn btn-primary"
                  onClick={salvarMeta}
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="painel col-6">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Destaques de vendas
              </h2>
              <p className="painel-subtitulo">
                Produtos que mais se destacaram
              </p>
            </div>
          </div>

          <div className="produto-destaque">
            <div className="destaque-item">
              <div className="destaque-label">
                Mais vendido
              </div>

              <div className="destaque-nome">
                {produtoMaisVendido?.nome ?? "Sem dados"}
              </div>

              <div className="destaque-numero">
                {produtoMaisVendido
                  ? `${produtoMaisVendido.quantidade} unidade(s)`
                  : "Nenhuma venda identificada"}
              </div>
            </div>

            <div className="destaque-item">
              <div className="destaque-label">
                Maior faturamento
              </div>

              <div className="destaque-nome">
                {produtoMaisFaturado?.nome ?? "Sem dados"}
              </div>

              <div className="destaque-numero">
                {produtoMaisFaturado
                  ? moeda(produtoMaisFaturado.faturamento)
                  : "Nenhum valor identificado"}
              </div>
            </div>
          </div>
        </section>

        <section className="painel col-6">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Clientes em destaque
              </h2>
              <p className="painel-subtitulo">
                Maiores valores comprados no período
              </p>
            </div>
          </div>

          <div className="lista">
            {topClientes.length === 0 ? (
              <div className="sem-dados">
                Nenhuma compra com cliente identificado.
              </div>
            ) : (
              topClientes.map((cliente, index) => (
                <div
                  className="lista-item"
                  key={cliente.clienteId}
                >
                  <div className="lista-esquerda">
                    <div className="lista-nome">
                      {index + 1}. {cliente.nome}
                    </div>

                    <div className="lista-detalhe">
                      {cliente.quantidade} pedido(s)
                    </div>
                  </div>

                  <div className="lista-valor">
                    {moeda(cliente.valor)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="painel col-6">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Produtos mais vendidos
              </h2>
              <p className="painel-subtitulo">
                Ranking por quantidade
              </p>
            </div>
          </div>

          <div className="lista">
            {vendasPorProduto.length === 0 ? (
              <div className="sem-dados">
                Não foi possível identificar os produtos vendidos.
              </div>
            ) : (
              vendasPorProduto.slice(0, 5).map((produto, index) => (
                <div
                  className="lista-item"
                  key={produto.produtoId}
                >
                  <div className="lista-esquerda">
                    <div className="lista-nome">
                      {index + 1}. {produto.nome}
                    </div>

                    <div className="lista-detalhe">
                      Faturamento: {moeda(produto.faturamento)}
                    </div>
                  </div>

                  <div className="lista-valor">
                    {produto.quantidade} un.
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="painel col-6">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Atenção no estoque
              </h2>
              <p className="painel-subtitulo">
                Produtos que precisam de reposição
              </p>
            </div>
          </div>

          <div className="lista">
            {variantes.filter(
              (variante) =>
                variante.ativo !== false &&
                numero(variante.estoqueAtual) <=
                  numero(variante.estoqueMinimo),
            ).length === 0 ? (
              <div className="sem-dados">
                Nenhuma variante abaixo do estoque mínimo.
              </div>
            ) : (
              variantes
                .filter(
                  (variante) =>
                    variante.ativo !== false &&
                    numero(variante.estoqueAtual) <=
                      numero(variante.estoqueMinimo),
                )
                .sort(
                  (a, b) =>
                    numero(a.estoqueAtual) -
                    numero(b.estoqueAtual),
                )
                .slice(0, 7)
                .map((variante) => {
                  const produto = variante.produtoId
                    ? produtosMap.get(variante.produtoId)
                    : null

                  const estoque = numero(
                    variante.estoqueAtual,
                  )

                  return (
                    <div
                      className="lista-item"
                      key={variante.id}
                    >
                      <div className="lista-esquerda">
                        <div className="lista-nome">
                          {produto?.nome ??
                            "Produto não identificado"}
                        </div>

                        <div className="lista-detalhe">
                          {variante.cor || "Sem cor"}{" "}
                          {variante.tamanho
                            ? `• ${variante.tamanho}`
                            : ""}
                        </div>
                      </div>

                      <div className="lista-valor">
                        {estoque}
                        <span
                          className={`estoque-tag ${
                            estoque <= 0
                              ? "zero"
                              : "baixo"
                          }`}
                        >
                          {estoque <= 0
                            ? "ZERADO"
                            : "BAIXO"}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </section>

        <section className="painel col-5">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Financeiro
              </h2>
              <p className="painel-subtitulo">
                Resumo financeiro do período
              </p>
            </div>
          </div>

          <div className="financeiro-grid">
            <div className="financeiro-item">
              <div className="financeiro-label">
                Receitas recebidas
              </div>

              <div className="financeiro-value positivo">
                {moeda(totalReceitasRecebidas)}
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Receitas pendentes
              </div>

              <div className="financeiro-value">
                {moeda(totalReceitasPendentes)}
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Despesas pagas
              </div>

              <div className="financeiro-value negativo">
                {moeda(totalDespesasPagas)}
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Despesas pendentes
              </div>

              <div className="financeiro-value">
                {moeda(totalDespesasPendentes)}
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Lucro bruto
              </div>

              <div
                className={`financeiro-value ${
                  lucroBruto >= 0
                    ? "positivo"
                    : "negativo"
                }`}
              >
                {moeda(lucroBruto)}
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Margem bruta
              </div>

              <div className="financeiro-value">
                {margemBruta.toFixed(1)}%
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Margem líquida
              </div>

              <div className="financeiro-value">
                {margemLiquida.toFixed(1)}%
              </div>
            </div>

            <div className="financeiro-item">
              <div className="financeiro-label">
                Valor do estoque
              </div>

              <div className="financeiro-value">
                {moeda(valorEstoque)}
              </div>
            </div>
          </div>
        </section>

        <section className="painel col-7">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Formas de pagamento
              </h2>
              <p className="painel-subtitulo">
                Distribuição do faturamento por pagamento
              </p>
            </div>
          </div>

          <div className="lista">
            {vendasPorPagamento.length === 0 ? (
              <div className="sem-dados">
                Nenhuma venda no período.
              </div>
            ) : (
              vendasPorPagamento.slice(0, 6).map((item) => {
                const percentualPagamento =
                  faturamento > 0
                    ? (item.valor / faturamento) * 100
                    : 0

                return (
                  <div
                    className="lista-item"
                    key={item.nome}
                  >
                    <div
                      className="lista-esquerda"
                      style={{ width: "100%" }}
                    >
                      <div className="lista-nome">
                        {item.nome}
                      </div>

                      <div
                        className="progress-bg"
                        style={{
                          marginTop: 7,
                          height: 5,
                        }}
                      >
                        <div
                          className="progress-fill"
                          style={{
                            width: `${percentualPagamento}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="lista-valor">
                      {moeda(item.valor)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="painel col-4">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Alertas
              </h2>
              <p className="painel-subtitulo">
                Pontos que merecem atenção
              </p>
            </div>
          </div>

          <div className="alertas">
            {alertas.length === 0 ? (
              <div className="sem-dados">
                Nenhum alerta no momento.
              </div>
            ) : (
              alertas.slice(0, 5).map((alerta, index) => (
                <div
                  className={`alerta ${alerta.tipo}`}
                  key={`${alerta.titulo}-${index}`}
                >
                  <div className="alerta-titulo">
                    {alerta.titulo}
                  </div>

                  <div className="alerta-descricao">
                    {alerta.descricao}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="painel col-8">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Faturamento mensal
              </h2>
              <p className="painel-subtitulo">
                Evolução das vendas nos últimos meses
              </p>
            </div>
          </div>

          <div className="grafico-barras">
            {vendasPorMes.length === 0 ? (
              <div className="sem-dados">
                Ainda não existem vendas suficientes para exibir
                o histórico.
              </div>
            ) : (
              vendasPorMes.map((item) => (
                <div
                  className="barra-coluna"
                  key={`${item.nome}-${item.valor}`}
                >
                  <div className="barra-valor">
                    {moeda(item.valor)}
                  </div>

                  <div
                    className="barra"
                    style={{
                      height: `${Math.max(
                        3,
                        (item.valor / maiorVendaMes) * 135,
                      )}px`,
                    }}
                  />

                  <div className="barra-label">
                    {item.nome}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="painel col-8">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Clientes com cupom
              </h2>
              <p className="painel-subtitulo">
                Clientes que atingiram 10 pontos
              </p>
            </div>

            <button
              className="link-btn"
              onClick={() => setPopupCupons(true)}
            >
              Ver clientes
            </button>
          </div>

          <div className="produto-destaque">
            <div className="destaque-item">
              <div className="destaque-label">
                Clientes elegíveis
              </div>

              <div className="destaque-nome">
                {clientesComCupom.length}
              </div>

              <div className="destaque-numero">
                Cada cliente recebe um cupom de R$ 60,00
              </div>
            </div>

            <div className="destaque-item">
              <div className="destaque-label">
                Regra de fidelidade
              </div>

              <div className="destaque-nome">
                10 pontos
              </div>

              <div className="destaque-numero">
                A cada R$ 150,00 em compras = 1 ponto
              </div>
            </div>
          </div>
        </section>

        <section className="painel col-4">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Resumo operacional
              </h2>
              <p className="painel-subtitulo">
                Indicadores atuais
              </p>
            </div>
          </div>

          <div className="lista">
            <div className="lista-item">
              <div className="lista-esquerda">
                <div className="lista-nome">
                  Produtos cadastrados
                </div>
              </div>

              <div className="lista-valor">
                {produtos.filter(
                  (produto) => produto.ativo !== false,
                ).length}
              </div>
            </div>

            <div className="lista-item">
              <div className="lista-esquerda">
                <div className="lista-nome">
                  Variantes cadastradas
                </div>
              </div>

              <div className="lista-valor">
                {variantes.filter(
                  (variante) => variante.ativo !== false,
                ).length}
              </div>
            </div>

            <div className="lista-item">
              <div className="lista-esquerda">
                <div className="lista-nome">
                  Estoque zerado
                </div>
              </div>

              <div className="lista-valor negativo">
                {estoqueZerado}
              </div>
            </div>

            <div className="lista-item">
              <div className="lista-esquerda">
                <div className="lista-nome">
                  Estoque baixo
                </div>
              </div>

              <div className="lista-valor">
                {estoqueBaixo}
              </div>
            </div>

            <div className="lista-item">
              <div className="lista-esquerda">
                <div className="lista-nome">
                  Margem bruta
                </div>
              </div>

              <div className="lista-valor">
                {margemBruta.toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        <section className="painel col-12">
          <div className="painel-header">
            <div>
              <h2 className="painel-titulo">
                Movimentações recentes
              </h2>
              <p className="painel-subtitulo">
                Últimas vendas, receitas e despesas registradas
              </p>
            </div>
          </div>

          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>
                {movimentacoesRecentes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="sem-dados"
                    >
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                ) : (
                  movimentacoesRecentes.map((movimento) => (
                    <tr key={movimento.id}>
                      <td>{movimento.tipo}</td>

                      <td>{movimento.descricao}</td>

                      <td>
                        {formatarDataHora(movimento.data)}
                      </td>

                      <td className="valor">
                        {moeda(movimento.valor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {popupCupons && (
        <div
          className="popup-overlay"
          onClick={() => setPopupCupons(false)}
        >
          <div
            className="popup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="popup-header">
              <h2 className="popup-title">
                Clientes com cupom
              </h2>

              <button
                className="fechar"
                onClick={() => setPopupCupons(false)}
              >
                ×
              </button>
            </div>

            {clientesComCupom.length === 0 ? (
              <div className="sem-dados">
                Nenhum cliente atingiu 10 pontos.
              </div>
            ) : (
              clientesComCupom.map((cliente) => (
                <div
                  className="cupom-cliente"
                  key={cliente.id}
                >
                  <div className="cupom-nome">
                    {cliente.nome}
                  </div>

                  <div className="cupom-pontos">
                    {numero(cliente.pontos)} pontos
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}