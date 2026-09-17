import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Periodo = "dia" | "mes" | "trimestre" | "ano" | "todos"

type Cliente = {
  id: string
  nome: string
  cpf: string | null
  pontos: number | null
}

type Compra = {
  id: string
  clienteid: string | null
  valor: number | null
  criadoem: string
  pagamento?: string | null
  status?: string | null
}

type Receita = {
  id: string
  tipo: string | null
  descricao: string | null
  valor: number | null
  dataCompetencia: string | null
  dataRecebimento: string | null
  status: string | null
  compraId: string | null
}

type Despesa = {
  id: string
  descricao: string | null
  valor: number | null
  dataCompetencia: string | null
  dataPagamento: string | null
  categoria: string | null
  status: string | null
}

type Produto = {
  id: string
  nome: string
  categoria: string | null
  subcategoria: string | null
  codigoProduto: number | null
  ativo: boolean
}

type Variante = {
  id: string
  produtoId: string | null
  sku: string | null
  precoVenda: number | null
  custoUnitario: number | null
  estoqueAtual: number | null
  estoqueMinimo: number | null
  ativo: boolean
  cor: string | null
  tamanho: string | null
  codigoVariante: number | null
}

type VendaItem = {
  id: string
  compraId: string | null
  quantidade: number | null
  custoUnitario: number | null
  [key: string]: unknown
}

type VendaProduto = {
  nome: string
  quantidade: number
  faturamento: number
  custo: number
}

type VendaDia = {
  data: string
  valor: number
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function numero(valor: unknown) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function formatarData(data: string | null | undefined) {
  if (!data) return "—"

  const d = new Date(data)

  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleDateString("pt-BR")
}

function formatarDataHora(data: string | null | undefined) {
  if (!data) return "—"

  const d = new Date(data)

  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
}

function pegarCampo(
  objeto: Record<string, unknown>,
  nomes: string[],
): unknown {
  for (const nome of nomes) {
    if (
      Object.prototype.hasOwnProperty.call(objeto, nome) &&
      objeto[nome] !== null &&
      objeto[nome] !== undefined &&
      objeto[nome] !== ""
    ) {
      return objeto[nome]
    }
  }

  return null
}

function obterIdProdutoDoItem(item: VendaItem) {
  return pegarCampo(item, [
    "produtoId",
    "produtoid",
    "produto_id",
    "idProduto",
    "idproduto",
  ])
}

function obterIdVarianteDoItem(item: VendaItem) {
  return pegarCampo(item, [
    "produtoVarianteId",
    "produtovarianteid",
    "produto_variante_id",
    "varianteId",
    "varianteid",
    "variante_id",
    "idVariante",
    "idvariante",
  ])
}

function inicioDoPeriodo(periodo: Periodo) {
  const agora = new Date()

  if (periodo === "dia") {
    return new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
    )
  }

  if (periodo === "mes") {
    return new Date(
      agora.getFullYear(),
      agora.getMonth(),
      1,
    )
  }

  if (periodo === "trimestre") {
    return new Date(
      agora.getFullYear(),
      agora.getMonth() - 2,
      1,
    )
  }

  if (periodo === "ano") {
    return new Date(
      agora.getFullYear(),
      0,
      1,
    )
  }

  return null
}

function estaNoPeriodo(data: string, periodo: Periodo) {
  if (periodo === "todos") return true

  const inicio = inicioDoPeriodo(periodo)

  if (!inicio) return true

  return new Date(data) >= inicio
}

function percentual(valor: number, total: number) {
  if (!total) return 0
  return (valor / total) * 100
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("mes")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [vendaItens, setVendaItens] = useState<VendaItem[]>([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)

  const [meta, setMeta] = useState(30000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaInput, setMetaInput] = useState("30000")

  const [popupCupons, setPopupCupons] = useState(false)

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
          .select("id,nome,cpf,pontos")
          .order("nome"),

        supabase
          .from("compras")
          .select("id,clienteid,valor,criadoem,pagamento,status")
          .order("criadoem", { ascending: false }),

        supabase
          .from("receitas")
          .select(
            "id,tipo,descricao,valor,dataCompetencia,dataRecebimento,status,compraId",
          )
          .order("criadoem", { ascending: false }),

        supabase
          .from("despesas")
          .select(
            "id,descricao,valor,dataCompetencia,dataPagamento,categoria,status",
          )
          .order("criadoem", { ascending: false }),

        supabase
          .from("produtos")
          .select(
            "id,nome,categoria,subcategoria,codigoProduto,ativo",
          )
          .order("nome"),

        supabase
          .from("produtoVariantes")
          .select(
            "id,produtoId,sku,precoVenda,custoUnitario,estoqueAtual,estoqueMinimo,ativo,cor,tamanho,codigoVariante",
          )
          .order("criadoem", { ascending: false }),

        supabase
          .from("vendaItens")
          .select("*"),
      ])

      if (clientesResult.error) {
        throw clientesResult.error
      }

      if (comprasResult.error) {
        throw comprasResult.error
      }

      if (receitasResult.error) {
        throw receitasResult.error
      }

      if (despesasResult.error) {
        throw despesasResult.error
      }

      if (produtosResult.error) {
        throw produtosResult.error
      }

      if (variantesResult.error) {
        throw variantesResult.error
      }

      if (vendaItensResult.error) {
        throw vendaItensResult.error
      }

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

      setAtualizadoEm(new Date())
    } catch (error) {
      console.error(error)
      setErro(
        "Não foi possível carregar os dados do dashboard.",
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

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

  const comprasPeriodo = useMemo(() => {
    return compras.filter((compra) =>
      estaNoPeriodo(compra.criadoem, periodo),
    )
  }, [compras, periodo])

  const receitasPeriodo = useMemo(() => {
    return receitas.filter((receita) => {
      const data =
        receita.dataCompetencia ||
        receita.dataRecebimento

      if (!data) return periodo === "todos"

      return estaNoPeriodo(data, periodo)
    })
  }, [receitas, periodo])

  const despesasPeriodo = useMemo(() => {
    return despesas.filter((despesa) => {
      const data =
        despesa.dataCompetencia ||
        despesa.dataPagamento

      if (!data) return periodo === "todos"

      return estaNoPeriodo(data, periodo)
    })
  }, [despesas, periodo])

  const faturamento = useMemo(() => {
    return comprasPeriodo.reduce(
      (total, compra) => total + numero(compra.valor),
      0,
    )
  }, [comprasPeriodo])

  const pedidos = comprasPeriodo.length

  const ticketMedio = pedidos
    ? faturamento / pedidos
    : 0

  const clientesAtendidos = useMemo(() => {
    const ids = new Set<string>()

    comprasPeriodo.forEach((compra) => {
      if (compra.clienteid) {
        ids.add(compra.clienteid)
      }
    })

    return ids.size
  }, [comprasPeriodo])

  const totalReceitasRecebidas = useMemo(() => {
    return receitasPeriodo
      .filter(
        (receita) =>
          normalizarTexto(receita.status) === "recebida",
      )
      .reduce(
        (total, receita) => total + numero(receita.valor),
        0,
      )
  }, [receitasPeriodo])

  const totalReceitasPendentes = useMemo(() => {
    return receitasPeriodo
      .filter(
        (receita) =>
          normalizarTexto(receita.status) === "pendente",
      )
      .reduce(
        (total, receita) => total + numero(receita.valor),
        0,
      )
  }, [receitasPeriodo])

  const totalDespesasPagas = useMemo(() => {
    return despesasPeriodo
      .filter(
        (despesa) =>
          normalizarTexto(despesa.status) === "paga",
      )
      .reduce(
        (total, despesa) => total + numero(despesa.valor),
        0,
      )
  }, [despesasPeriodo])

  const totalDespesasPendentes = useMemo(() => {
    return despesasPeriodo
      .filter(
        (despesa) =>
          normalizarTexto(despesa.status) === "pendente",
      )
      .reduce(
        (total, despesa) => total + numero(despesa.valor),
        0,
      )
  }, [despesasPeriodo])

  const custoProdutosVendidos = useMemo(() => {
    return vendaItens
      .filter((item) => {
        if (!item.compraId) return false

        return comprasPeriodo.some(
          (compra) => compra.id === item.compraId,
        )
      })
      .reduce((total, item) => {
        const quantidade = numero(item.quantidade)
        const custo = numero(item.custoUnitario)

        return total + quantidade * custo
      }, 0)
  }, [vendaItens, comprasPeriodo])

  const lucroBruto = faturamento - custoProdutosVendidos

  const resultadoLiquido =
    lucroBruto - totalDespesasPagas

  const margemBruta = percentual(
    lucroBruto,
    faturamento,
  )

  const margemLiquida = percentual(
    resultadoLiquido,
    faturamento,
  )

  const valorEstoque = useMemo(() => {
    return variantes.reduce((total, variante) => {
      const estoque = numero(variante.estoqueAtual)
      const custo = numero(variante.custoUnitario)

      return total + estoque * custo
    }, 0)
  }, [variantes])

  const estoqueBaixo = useMemo(() => {
    return variantes.filter((variante) => {
      if (!variante.ativo) return false

      const estoque = numero(variante.estoqueAtual)
      const minimo = numero(variante.estoqueMinimo)

      return estoque <= minimo
    })
  }, [variantes])

  const estoqueZerado = useMemo(() => {
    return variantes.filter((variante) => {
      if (!variante.ativo) return false

      return numero(variante.estoqueAtual) <= 0
    })
  }, [variantes])

  const vendasPorProduto = useMemo(() => {
    const mapa = new Map<string, VendaProduto>()

    vendaItens.forEach((item) => {
      if (!item.compraId) return

      const compra = comprasPeriodo.find(
        (c) => c.id === item.compraId,
      )

      if (!compra) return

      const idVariante = obterIdVarianteDoItem(item)
      const idProduto = obterIdProdutoDoItem(item)

      let produto: Produto | undefined

      if (idVariante) {
        const variante = variantesMap.get(
          String(idVariante),
        )

        if (variante?.produtoId) {
          produto = produtosMap.get(
            variante.produtoId,
          )
        }
      }

      if (!produto && idProduto) {
        produto = produtosMap.get(String(idProduto))
      }

      if (!produto) return

      const chave = produto.id
      const quantidade = numero(item.quantidade)

      let precoVenda = 0

      if (idVariante) {
        const variante = variantesMap.get(
          String(idVariante),
        )

        precoVenda = numero(variante?.precoVenda)
      }

      const custo = numero(item.custoUnitario)

      const atual = mapa.get(chave)

      if (atual) {
        atual.quantidade += quantidade
        atual.faturamento +=
          quantidade * precoVenda
        atual.custo += quantidade * custo
      } else {
        mapa.set(chave, {
          nome: produto.nome,
          quantidade,
          faturamento:
            quantidade * precoVenda,
          custo: quantidade * custo,
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.quantidade - a.quantidade,
    )
  }, [
    vendaItens,
    comprasPeriodo,
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

  const vendasPorCategoria = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; quantidade: number; faturamento: number }
    >()

    vendaItens.forEach((item) => {
      if (!item.compraId) return

      const compra = comprasPeriodo.find(
        (c) => c.id === item.compraId,
      )

      if (!compra) return

      const idVariante = obterIdVarianteDoItem(item)
      const idProduto = obterIdProdutoDoItem(item)

      let produto: Produto | undefined

      if (idVariante) {
        const variante = variantesMap.get(
          String(idVariante),
        )

        if (variante?.produtoId) {
          produto = produtosMap.get(
            variante.produtoId,
          )
        }
      }

      if (!produto && idProduto) {
        produto = produtosMap.get(String(idProduto))
      }

      if (!produto) return

      const categoria =
        produto.categoria || "Sem categoria"

      const quantidade = numero(item.quantidade)

      const atual = mapa.get(categoria)

      if (atual) {
        atual.quantidade += quantidade
      } else {
        mapa.set(categoria, {
          nome: categoria,
          quantidade,
          faturamento: 0,
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.quantidade - a.quantidade,
    )
  }, [
    vendaItens,
    comprasPeriodo,
    variantesMap,
    produtosMap,
  ])

  const vendasPorPagamento = useMemo(() => {
    const mapa = new Map<string, number>()

    comprasPeriodo.forEach((compra) => {
      const pagamento =
        compra.pagamento || "Não informado"

      mapa.set(
        pagamento,
        (mapa.get(pagamento) ?? 0) +
          numero(compra.valor),
      )
    })

    return Array.from(mapa.entries())
      .map(([nome, valor]) => ({
        nome,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [comprasPeriodo])

  const clientesRanking = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string
        nome: string
        compras: number
        valor: number
      }
    >()

    compras.forEach((compra) => {
      if (!compra.clienteid) return

      const cliente =
        clientesMap.get(compra.clienteid)

      if (!cliente) return

      const atual = mapa.get(cliente.id)

      if (atual) {
        atual.compras += 1
        atual.valor += numero(compra.valor)
      } else {
        mapa.set(cliente.id, {
          id: cliente.id,
          nome: cliente.nome,
          compras: 1,
          valor: numero(compra.valor),
        })
      }
    })

    return Array.from(mapa.values()).sort(
      (a, b) => b.valor - a.valor,
    )
  }, [compras, clientesMap])

  const topClientes = clientesRanking.slice(0, 5)

  const clientesComCupom = useMemo(() => {
    return clientes.filter(
      (cliente) => numero(cliente.pontos) >= 10,
    )
  }, [clientes])

  const clientesInativos = useMemo(() => {
    const agora = new Date()

    const clientesComUltimaCompra = clientes
      .map((cliente) => {
        const comprasCliente = compras.filter(
          (compra) =>
            compra.clienteid === cliente.id,
        )

        if (!comprasCliente.length) {
          return {
            ...cliente,
            ultimaCompra: null,
            diasSemComprar: null,
          }
        }

        const ultimaCompra =
          comprasCliente
            .sort(
              (a, b) =>
                new Date(b.criadoem).getTime() -
                new Date(a.criadoem).getTime(),
            )[0]

        const diasSemComprar = Math.floor(
          (agora.getTime() -
            new Date(
              ultimaCompra.criadoem,
            ).getTime()) /
            86400000,
        )

        return {
          ...cliente,
          ultimaCompra: ultimaCompra.criadoem,
          diasSemComprar,
        }
      })
      .filter(
        (cliente) =>
          cliente.diasSemComprar === null ||
          cliente.diasSemComprar >= 60,
      )
      .sort(
        (a, b) =>
          numero(b.diasSemComprar) -
          numero(a.diasSemComprar),
      )

    return clientesComUltimaCompra
  }, [clientes, compras])

  const vendasUltimos7Dias = useMemo(() => {
    const hoje = new Date()
    const dias: VendaDia[] = []

    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje)
      data.setHours(0, 0, 0, 0)
      data.setDate(data.getDate() - i)

      const inicio = new Date(data)
      const fim = new Date(data)
      fim.setDate(fim.getDate() + 1)

      const valor = compras.filter((compra) => {
        const dataCompra = new Date(compra.criadoem)

        return (
          dataCompra >= inicio &&
          dataCompra < fim
        )
      }).reduce(
        (total, compra) =>
          total + numero(compra.valor),
        0,
      )

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

  const maiorVenda7Dias = Math.max(
    ...vendasUltimos7Dias.map((item) => item.valor),
    1,
  )

  const vendasPorMes = useMemo(() => {
    const mapa = new Map<
      string,
      { chave: string; nome: string; valor: number }
    >()

    compras.forEach((compra) => {
      const data = new Date(compra.criadoem)

      if (Number.isNaN(data.getTime())) return

      const chave = `${data.getFullYear()}-${String(
        data.getMonth() + 1,
      ).padStart(2, "0")}`

      const nome = data.toLocaleDateString(
        "pt-BR",
        {
          month: "short",
          year: "2-digit",
        },
      )

      const atual = mapa.get(chave)

      if (atual) {
        atual.valor += numero(compra.valor)
      } else {
        mapa.set(chave, {
          chave,
          nome,
          valor: numero(compra.valor),
        })
      }
    })

    return Array.from(mapa.values())
      .sort((a, b) =>
        a.chave.localeCompare(b.chave),
      )
      .slice(-6)
  }, [compras])

  const maiorMes = Math.max(
    ...vendasPorMes.map((item) => item.valor),
    1,
  )

  const metaPercentual = Math.min(
    percentual(faturamento, meta),
    100,
  )

  const vendaRecente = comprasPeriodo.slice(0, 6)

  const movimentacoesRecentes = useMemo(() => {
    const receitasMov = receitasPeriodo
      .map((receita) => ({
        id: `r-${receita.id}`,
        tipo: "receita",
        descricao:
          receita.descricao ||
          receita.tipo ||
          "Receita",
        valor: numero(receita.valor),
        data:
          receita.dataRecebimento ||
          receita.dataCompetencia ||
          "",
      }))

    const despesasMov = despesasPeriodo
      .map((despesa) => ({
        id: `d-${despesa.id}`,
        tipo: "despesa",
        descricao:
          despesa.descricao || "Despesa",
        valor: numero(despesa.valor),
        data:
          despesa.dataPagamento ||
          despesa.dataCompetencia ||
          "",
      }))

    return [...receitasMov, ...despesasMov]
      .sort(
        (a, b) =>
          new Date(b.data).getTime() -
          new Date(a.data).getTime(),
      )
      .slice(0, 8)
  }, [receitasPeriodo, despesasPeriodo])

  const alertas = useMemo(() => {
    const lista: {
      titulo: string
      descricao: string
      tipo: "estoque" | "financeiro" | "cliente"
    }[] = []

    if (estoqueZerado.length > 0) {
      lista.push({
        titulo: "Produtos sem estoque",
        descricao: `${estoqueZerado.length} variante(s) estão zeradas.`,
        tipo: "estoque",
      })
    }

    if (
      estoqueBaixo.length > 0 &&
      estoqueZerado.length === 0
    ) {
      lista.push({
        titulo: "Estoque baixo",
        descricao: `${estoqueBaixo.length} variante(s) atingiram o estoque mínimo.`,
        tipo: "estoque",
      })
    }

    if (totalReceitasPendentes > 0) {
      lista.push({
        titulo: "Valores a receber",
        descricao: `${moeda(totalReceitasPendentes)} pendentes.`,
        tipo: "financeiro",
      })
    }

    if (totalDespesasPendentes > 0) {
      lista.push({
        titulo: "Contas pendentes",
        descricao: `${moeda(totalDespesasPendentes)} em despesas pendentes.`,
        tipo: "financeiro",
      })
    }

    if (clientesComCupom.length > 0) {
      lista.push({
        titulo: "Cupons disponíveis",
        descricao: `${clientesComCupom.length} cliente(s) já possuem 10 pontos.`,
        tipo: "cliente",
      })
    }

    if (clientesInativos.length > 0) {
      lista.push({
        titulo: "Clientes para reativar",
        descricao: `${clientesInativos.length} cliente(s) estão há 60 dias ou mais sem comprar.`,
        tipo: "cliente",
      })
    }

    return lista
  }, [
    estoqueZerado,
    estoqueBaixo,
    totalReceitasPendentes,
    totalDespesasPendentes,
    clientesComCupom,
    clientesInativos,
  ])

  function salvarMeta() {
    const valor = Number(
      metaInput
        .replace(/\./g, "")
        .replace(",", "."),
    )

    if (!Number.isFinite(valor) || valor <= 0) {
      setMetaInput(String(meta))
      setEditandoMeta(false)
      return
    }

    setMeta(valor)
    setMetaInput(String(valor))
    setEditandoMeta(false)
  }

  function nomeCliente(clienteid: string | null) {
    if (!clienteid) return "Cliente não identificado"

    return (
      clientesMap.get(clienteid)?.nome ||
      "Cliente não identificado"
    )
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          width: 100%;
          min-height: 100%;
          background: #f6f6f7;
          color: #181818;
          padding: 24px;
        }

        .dashboard-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .dashboard-title {
          margin: 0;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.8px;
        }

        .dashboard-subtitle {
          margin: 6px 0 0;
          color: #777;
          font-size: 14px;
        }

        .dashboard-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .period-selector {
          display: flex;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 3px 12px rgba(0,0,0,.03);
        }

        .period-button {
          border: 0;
          background: transparent;
          padding: 9px 13px;
          border-radius: 9px;
          cursor: pointer;
          color: #777;
          font-size: 13px;
          font-weight: 600;
        }

        .period-button.active {
          background: #e6c35c;
          color: #181818;
        }

        .refresh-button {
          border: 1px solid #dedede;
          background: #fff;
          color: #222;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 600;
        }

        .refresh-button:hover {
          background: #fafafa;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .kpi-card {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 16px;
          padding: 18px;
          min-width: 0;
          box-shadow: 0 5px 20px rgba(0,0,0,.035);
        }

        .kpi-label {
          color: #777;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .kpi-value {
          font-size: 23px;
          font-weight: 750;
          letter-spacing: -0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-small {
          color: #999;
          font-size: 11px;
          margin-top: 7px;
        }

        .gold {
          color: #a37a00;
        }

        .green {
          color: #39794f;
        }

        .red {
          color: #a84646;
        }

        .dashboard-grid-main {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(320px, .8fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .dashboard-grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }

        .dashboard-grid-three {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }

        .card {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 18px;
          padding: 20px;
          min-width: 0;
          box-shadow: 0 5px 20px rgba(0,0,0,.035);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .card-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .card-description {
          color: #888;
          font-size: 12px;
          margin-top: 4px;
        }

        .link-button {
          border: 0;
          background: transparent;
          color: #9a7400;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px;
        }

        .chart {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          height: 190px;
          padding-top: 12px;
        }

        .chart-column {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          min-width: 0;
        }

        .chart-bar {
          width: 100%;
          max-width: 52px;
          min-height: 4px;
          background: #e6c35c;
          border-radius: 8px 8px 3px 3px;
          transition: height .2s ease;
        }

        .chart-value {
          font-size: 10px;
          color: #777;
          margin-bottom: 5px;
          white-space: nowrap;
        }

        .chart-label {
          font-size: 10px;
          color: #999;
          margin-top: 7px;
        }

        .meta-box {
          background: #faf7e9;
          border: 1px solid #eee2af;
          border-radius: 14px;
          padding: 16px;
        }

        .meta-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .meta-title {
          font-size: 13px;
          font-weight: 700;
        }

        .meta-value {
          font-size: 12px;
          color: #777;
        }

        .meta-progress {
          height: 9px;
          background: #e9e9e9;
          border-radius: 99px;
          overflow: hidden;
        }

        .meta-fill {
          height: 100%;
          background: #cda82e;
          border-radius: 99px;
        }

        .meta-edit {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .meta-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 8px 10px;
        }

        .meta-save {
          border: 0;
          border-radius: 8px;
          padding: 8px 12px;
          background: #1c1c1c;
          color: #fff;
          cursor: pointer;
        }

        .icon-button {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 0;
          background: #1c1c1c;
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }

        .highlight-list {
          display: grid;
          gap: 10px;
        }

        .highlight {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 12px;
          background: #fafafa;
          border-radius: 12px;
        }

        .highlight-main {
          min-width: 0;
        }

        .highlight-title {
          font-weight: 700;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .highlight-description {
          color: #888;
          font-size: 11px;
          margin-top: 3px;
        }

        .highlight-value {
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .product-ranking {
          display: grid;
          gap: 10px;
        }

        .product-row {
          display: grid;
          grid-template-columns: 32px minmax(0,1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
        }

        .product-row:last-child {
          border-bottom: 0;
        }

        .ranking-number {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f4edcf;
          color: #876700;
          font-size: 12px;
          font-weight: 800;
        }

        .product-name {
          font-size: 13px;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-detail {
          font-size: 11px;
          color: #999;
          margin-top: 3px;
        }

        .stock-row {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid #eee;
        }

        .stock-row:last-child {
          border-bottom: 0;
        }

        .stock-name {
          font-size: 13px;
          font-weight: 650;
        }

        .stock-detail {
          color: #999;
          font-size: 11px;
          margin-top: 3px;
        }

        .stock-number {
          font-size: 13px;
          font-weight: 750;
          color: #a84646;
        }

        .finance-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px;
        }

        .finance-item {
          padding: 12px;
          background: #fafafa;
          border-radius: 12px;
        }

        .finance-item-label {
          color: #888;
          font-size: 11px;
        }

        .finance-item-value {
          margin-top: 5px;
          font-size: 15px;
          font-weight: 750;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .simple-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }

        .simple-table th {
          text-align: left;
          color: #999;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
          padding: 0 10px 10px;
          font-weight: 700;
        }

        .simple-table td {
          padding: 11px 10px;
          border-top: 1px solid #eee;
          font-size: 12px;
        }

        .simple-table td:last-child,
        .simple-table th:last-child {
          text-align: right;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          background: #f2f2f2;
          font-size: 10px;
          font-weight: 700;
        }

        .badge.gold-badge {
          background: #f5edcf;
          color: #806000;
        }

        .badge.red-badge {
          background: #f8e7e7;
          color: #9c4545;
        }

        .badge.green-badge {
          background: #e7f2e9;
          color: #39724b;
        }

        .alert-list {
          display: grid;
          gap: 10px;
        }

        .alert {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 12px;
          border-radius: 12px;
          background: #fafafa;
        }

        .alert-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex: 0 0 auto;
          background: #cda82e;
        }

        .alert-dot.estoque {
          background: #c78d2d;
        }

        .alert-dot.financeiro {
          background: #b24d4d;
        }

        .alert-dot.cliente {
          background: #777;
        }

        .alert-title {
          font-size: 12px;
          font-weight: 750;
        }

        .alert-description {
          margin-top: 3px;
          font-size: 11px;
          color: #888;
          line-height: 1.4;
        }

        .empty {
          padding: 28px 10px;
          text-align: center;
          color: #999;
          font-size: 12px;
        }

        .loading {
          padding: 60px;
          text-align: center;
          color: #888;
        }

        .error {
          padding: 16px;
          background: #fff0f0;
          border: 1px solid #f0caca;
          color: #a84646;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .popup {
          width: 100%;
          max-width: 620px;
          max-height: 80vh;
          overflow: auto;
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 25px 80px rgba(0,0,0,.22);
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: center;
          margin-bottom: 18px;
        }

        .popup-title {
          margin: 0;
          font-size: 18px;
          font-weight: 750;
        }

        .close-button {
          border: 0;
          background: #f3f3f3;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }

        .coupon-client {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }

        .coupon-client:last-child {
          border-bottom: 0;
        }

        .coupon-name {
          font-size: 13px;
          font-weight: 700;
        }

        .coupon-points {
          color: #9a7400;
          font-size: 12px;
          font-weight: 700;
        }

        @media (max-width: 1250px) {
          .kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .dashboard-grid-three {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .dashboard-page {
            padding: 16px;
          }

          .dashboard-header {
            flex-direction: column;
          }

          .dashboard-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .period-selector {
            width: 100%;
            overflow-x: auto;
          }

          .period-button {
            flex: 1;
            min-width: 70px;
          }

          .dashboard-grid-main,
          .dashboard-grid-two {
            grid-template-columns: 1fr;
          }

          .dashboard-grid-three {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .dashboard-page {
            padding: 12px;
          }

          .dashboard-title {
            font-size: 24px;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .kpi-card {
            padding: 14px;
            border-radius: 14px;
          }

          .kpi-value {
            font-size: 18px;
          }

          .card {
            padding: 15px;
            border-radius: 15px;
          }

          .dashboard-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .refresh-button {
            width: 100%;
          }

          .chart {
            height: 155px;
            gap: 6px;
          }

          .finance-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="dashboard-page">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div>
              <h1 className="dashboard-title">
                Visão geral
              </h1>

              <p className="dashboard-subtitle">
                Acompanhe as principais informações da
                Cami&Duda em um só lugar.
                {atualizadoEm && (
                  <>
                    {" "}
                    Atualizado às{" "}
                    {atualizadoEm.toLocaleTimeString(
                      "pt-BR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                    .
                  </>
                )}
              </p>
            </div>

            <div className="dashboard-actions">
              <div className="period-selector">
                {[
                  ["dia", "Hoje"],
                  ["mes", "Mês"],
                  ["trimestre", "3 meses"],
                  ["ano", "Ano"],
                  ["todos", "Tudo"],
                ].map(([valor, label]) => (
                  <button
                    key={valor}
                    className={`period-button ${
                      periodo === valor
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setPeriodo(
                        valor as Periodo,
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                className="refresh-button"
                onClick={carregarDados}
              >
                Atualizar
              </button>
            </div>
          </header>

          {erro && (
            <div className="error">
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="card loading">
              Carregando informações da loja...
            </div>
          ) : (
            <>
              <section className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">
                    FATURAMENTO
                  </div>

                  <div className="kpi-value gold">
                    {moeda(faturamento)}
                  </div>

                  <div className="kpi-small">
                    {pedidos} venda(s) no período
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    RESULTADO LÍQUIDO
                  </div>

                  <div
                    className={`kpi-value ${
                      resultadoLiquido >= 0
                        ? "green"
                        : "red"
                    }`}
                  >
                    {moeda(resultadoLiquido)}
                  </div>

                  <div className="kpi-small">
                    Margem líquida:{" "}
                    {margemLiquida.toFixed(1)}%
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    PEDIDOS
                  </div>

                  <div className="kpi-value">
                    {pedidos}
                  </div>

                  <div className="kpi-small">
                    Clientes atendidos:{" "}
                    {clientesAtendidos}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    TICKET MÉDIO
                  </div>

                  <div className="kpi-value">
                    {moeda(ticketMedio)}
                  </div>

                  <div className="kpi-small">
                    Média por venda
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    A RECEBER
                  </div>

                  <div className="kpi-value red">
                    {moeda(
                      totalReceitasPendentes,
                    )}
                  </div>

                  <div className="kpi-small">
                    Valores pendentes
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">
                    ESTOQUE BAIXO
                  </div>

                  <div className="kpi-value">
                    {estoqueBaixo.length}
                  </div>

                  <div className="kpi-small">
                    {estoqueZerado.length} zerado(s)
                  </div>
                </div>
              </section>

              <section className="dashboard-grid-main">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Vendas dos últimos 7 dias
                      </h2>

                      <div className="card-description">
                        Faturamento diário
                      </div>
                    </div>

                    <strong className="gold">
                      {moeda(
                        vendasUltimos7Dias.reduce(
                          (total, item) =>
                            total + item.valor,
                          0,
                        ),
                      )}
                    </strong>
                  </div>

                  <div className="chart">
                    {vendasUltimos7Dias.map(
                      (item) => {
                        const altura =
                          (item.valor /
                            maiorVenda7Dias) *
                          100

                        return (
                          <div
                            className="chart-column"
                            key={item.data}
                          >
                            <div className="chart-value">
                              {item.valor > 0
                                ? moeda(
                                    item.valor,
                                  )
                                : "—"}
                            </div>

                            <div
                              className="chart-bar"
                              style={{
                                height: `${Math.max(
                                  altura,
                                  item.valor > 0
                                    ? 5
                                    : 2,
                                )}%`,
                              }}
                            />

                            <div className="chart-label">
                              {item.data}
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Meta de faturamento
                      </h2>

                      <div className="card-description">
                        Acompanhe o objetivo do período
                      </div>
                    </div>

                    <button
                      className="icon-button"
                      onClick={() => {
                        if (editandoMeta) {
                          salvarMeta()
                        } else {
                          setMetaInput(
                            String(meta),
                          )
                          setEditandoMeta(true)
                        }
                      }}
                    >
                      {editandoMeta ? "×" : "+"}
                    </button>
                  </div>

                  <div className="meta-box">
                    <div className="meta-top">
                      <span className="meta-title">
                        Realizado
                      </span>

                      <span className="meta-value">
                        {moeda(faturamento)} /{" "}
                        {moeda(meta)}
                      </span>
                    </div>

                    <div className="meta-progress">
                      <div
                        className="meta-fill"
                        style={{
                          width: `${metaPercentual}%`,
                        }}
                      />
                    </div>

                    <div className="meta-top" style={{ marginTop: 10 }}>
                      <span className="meta-value">
                        {metaPercentual.toFixed(1)}%
                        atingido
                      </span>

                      <span className="meta-value">
                        Faltam{" "}
                        {moeda(
                          Math.max(
                            meta -
                              faturamento,
                            0,
                          ),
                        )}
                      </span>
                    </div>

                    {editandoMeta && (
                      <div className="meta-edit">
                        <input
                          className="meta-input"
                          value={metaInput}
                          onChange={(e) =>
                            setMetaInput(
                              e.target.value,
                            )
                          }
                          placeholder="Meta"
                        />

                        <button
                          className="meta-save"
                          onClick={salvarMeta}
                        >
                          Salvar
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="highlight-list">
                      <div className="highlight">
                        <div className="highlight-main">
                          <div className="highlight-title">
                            Margem bruta
                          </div>

                          <div className="highlight-description">
                            Depois do custo dos produtos
                          </div>
                        </div>

                        <div className="highlight-value green">
                          {margemBruta.toFixed(1)}%
                        </div>
                      </div>

                      <div className="highlight">
                        <div className="highlight-main">
                          <div className="highlight-title">
                            Valor em estoque
                          </div>

                          <div className="highlight-description">
                            Custo das variantes disponíveis
                          </div>
                        </div>

                        <div className="highlight-value">
                          {moeda(valorEstoque)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid-three">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Produto mais vendido
                      </h2>

                      <div className="card-description">
                        Maior quantidade vendida
                      </div>
                    </div>
                  </div>

                  {produtoMaisVendido ? (
                    <div className="highlight">
                      <div className="highlight-main">
                        <div className="highlight-title">
                          {produtoMaisVendido.nome}
                        </div>

                        <div className="highlight-description">
                          {produtoMaisVendido.quantidade}{" "}
                          unidade(s)
                        </div>
                      </div>

                      <div className="highlight-value gold">
                        {moeda(
                          produtoMaisVendido.faturamento,
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty">
                      Ainda não há itens de venda
                      vinculados aos produtos.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Produto que mais faturou
                      </h2>

                      <div className="card-description">
                        Maior receita gerada
                      </div>
                    </div>
                  </div>

                  {produtoMaisFaturado ? (
                    <div className="highlight">
                      <div className="highlight-main">
                        <div className="highlight-title">
                          {produtoMaisFaturado.nome}
                        </div>

                        <div className="highlight-description">
                          {produtoMaisFaturado.quantidade}{" "}
                          unidade(s)
                        </div>
                      </div>

                      <div className="highlight-value gold">
                        {moeda(
                          produtoMaisFaturado.faturamento,
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhum produto identificado.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Clientes
                      </h2>

                      <div className="card-description">
                        Fidelidade e relacionamento
                      </div>
                    </div>
                  </div>

                  <div className="highlight-list">
                    <div className="highlight">
                      <div className="highlight-main">
                        <div className="highlight-title">
                          Total de clientes
                        </div>
                      </div>

                      <div className="highlight-value">
                        {clientes.length}
                      </div>
                    </div>

                    <button
                      className="highlight"
                      style={{
                        border: 0,
                        width: "100%",
                        cursor:
                          clientesComCupom.length
                            ? "pointer"
                            : "default",
                        textAlign: "left",
                      }}
                      onClick={() =>
                        clientesComCupom.length &&
                        setPopupCupons(true)
                      }
                    >
                      <div className="highlight-main">
                        <div className="highlight-title">
                          Clientes com cupom
                        </div>

                        <div className="highlight-description">
                          10 pontos ou mais
                        </div>
                      </div>

                      <div className="highlight-value gold">
                        {clientesComCupom.length}
                      </div>
                    </button>

                    <div className="highlight">
                      <div className="highlight-main">
                        <div className="highlight-title">
                          Para reativar
                        </div>

                        <div className="highlight-description">
                          60+ dias sem comprar
                        </div>
                      </div>

                      <div className="highlight-value">
                        {clientesInativos.length}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid-two">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Produtos mais vendidos
                      </h2>

                      <div className="card-description">
                        Ranking por quantidade
                      </div>
                    </div>
                  </div>

                  {vendasPorProduto.length ? (
                    <div className="product-ranking">
                      {vendasPorProduto
                        .slice(0, 5)
                        .map(
                          (
                            produto,
                            index,
                          ) => (
                            <div
                              className="product-row"
                              key={produto.nome}
                            >
                              <div className="ranking-number">
                                {index + 1}
                              </div>

                              <div>
                                <div className="product-name">
                                  {produto.nome}
                                </div>

                                <div className="product-detail">
                                  {produto.quantidade}{" "}
                                  unidade(s)
                                </div>
                              </div>

                              <div className="highlight-value">
                                {moeda(
                                  produto.faturamento,
                                )}
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhum produto vendido no período.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Estoque que precisa de atenção
                      </h2>

                      <div className="card-description">
                        Variantes no mínimo ou abaixo dele
                      </div>
                    </div>

                    <span className="badge red-badge">
                      {estoqueBaixo.length}
                    </span>
                  </div>

                  {estoqueBaixo.length ? (
                    <div>
                      {estoqueBaixo
                        .slice(0, 7)
                        .map((variante) => {
                          const produto =
                            variante.produtoId
                              ? produtosMap.get(
                                  variante.produtoId,
                                )
                              : undefined

                          return (
                            <div
                              className="stock-row"
                              key={variante.id}
                            >
                              <div>
                                <div className="stock-name">
                                  {produto?.nome ||
                                    "Produto"}
                                </div>

                                <div className="stock-detail">
                                  {[
                                    variante.cor,
                                    variante.tamanho,
                                    variante.sku,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      " • ",
                                    ) ||
                                    "Sem detalhe da variante"}
                                </div>
                              </div>

                              <div className="stock-number">
                                {numero(
                                  variante.estoqueAtual,
                                )}{" "}
                                /{" "}
                                {numero(
                                  variante.estoqueMinimo,
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhuma variante está abaixo do
                      estoque mínimo.
                    </div>
                  )}
                </div>
              </section>

              <section className="dashboard-grid-three">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Financeiro
                      </h2>

                      <div className="card-description">
                        Resumo do período
                      </div>
                    </div>
                  </div>

                  <div className="finance-grid">
                    <div className="finance-item">
                      <div className="finance-item-label">
                        Faturamento
                      </div>

                      <div className="finance-item-value">
                        {moeda(faturamento)}
                      </div>
                    </div>

                    <div className="finance-item">
                      <div className="finance-item-label">
                        CMV
                      </div>

                      <div className="finance-item-value">
                        {moeda(
                          custoProdutosVendidos,
                        )}
                      </div>
                    </div>

                    <div className="finance-item">
                      <div className="finance-item-label">
                        Despesas pagas
                      </div>

                      <div className="finance-item-value red">
                        {moeda(
                          totalDespesasPagas,
                        )}
                      </div>
                    </div>

                    <div className="finance-item">
                      <div className="finance-item-label">
                        Resultado
                      </div>

                      <div
                        className={`finance-item-value ${
                          resultadoLiquido >= 0
                            ? "green"
                            : "red"
                        }`}
                      >
                        {moeda(
                          resultadoLiquido,
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Formas de pagamento
                      </h2>

                      <div className="card-description">
                        Faturamento por método
                      </div>
                    </div>
                  </div>

                  {vendasPorPagamento.length ? (
                    <div className="product-ranking">
                      {vendasPorPagamento
                        .slice(0, 5)
                        .map(
                          (item) => (
                            <div
                              className="highlight"
                              key={item.nome}
                            >
                              <div className="highlight-main">
                                <div className="highlight-title">
                                  {item.nome}
                                </div>

                                <div className="highlight-description">
                                  {percentual(
                                    item.valor,
                                    faturamento,
                                  ).toFixed(
                                    1,
                                  )}
                                  % do faturamento
                                </div>
                              </div>

                              <div className="highlight-value">
                                {moeda(
                                  item.valor,
                                )}
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhuma venda no período.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Alertas
                      </h2>

                      <div className="card-description">
                        Pontos que merecem atenção
                      </div>
                    </div>

                    <span className="badge">
                      {alertas.length}
                    </span>
                  </div>

                  {alertas.length ? (
                    <div className="alert-list">
                      {alertas
                        .slice(0, 5)
                        .map((alerta) => (
                          <div
                            className="alert"
                            key={`${alerta.tipo}-${alerta.titulo}`}
                          >
                            <span
                              className={`alert-dot ${alerta.tipo}`}
                            />

                            <div>
                              <div className="alert-title">
                                {alerta.titulo}
                              </div>

                              <div className="alert-description">
                                {alerta.descricao}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhum alerta importante no momento.
                    </div>
                  )}
                </div>
              </section>

              <section className="dashboard-grid-two">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Evolução do faturamento
                      </h2>

                      <div className="card-description">
                        Últimos meses registrados
                      </div>
                    </div>
                  </div>

                  {vendasPorMes.length ? (
                    <div className="chart">
                      {vendasPorMes.map(
                        (item) => {
                          const altura =
                            (item.valor /
                              maiorMes) *
                            100

                          return (
                            <div
                              className="chart-column"
                              key={item.chave}
                            >
                              <div className="chart-value">
                                {moeda(
                                  item.valor,
                                )}
                              </div>

                              <div
                                className="chart-bar"
                                style={{
                                  height: `${Math.max(
                                    altura,
                                    4,
                                  )}%`,
                                }}
                              />

                              <div className="chart-label">
                                {item.nome}
                              </div>
                            </div>
                          )
                        },
                      )}
                    </div>
                  ) : (
                    <div className="empty">
                      Sem histórico de vendas.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Melhores clientes
                      </h2>

                      <div className="card-description">
                        Ranking por valor comprado
                      </div>
                    </div>
                  </div>

                  {topClientes.length ? (
                    <div className="product-ranking">
                      {topClientes.map(
                        (cliente, index) => (
                          <div
                            className="product-row"
                            key={cliente.id}
                          >
                            <div className="ranking-number">
                              {index + 1}
                            </div>

                            <div>
                              <div className="product-name">
                                {cliente.nome}
                              </div>

                              <div className="product-detail">
                                {cliente.compras}{" "}
                                compra(s)
                              </div>
                            </div>

                            <div className="highlight-value">
                              {moeda(
                                cliente.valor,
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhuma compra vinculada a clientes.
                    </div>
                  )}
                </div>
              </section>

              <section className="dashboard-grid-two">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Vendas recentes
                      </h2>

                      <div className="card-description">
                        Últimas vendas do período
                      </div>
                    </div>
                  </div>

                  {vendaRecente.length ? (
                    <div className="table-wrap">
                      <table className="simple-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Pagamento</th>
                            <th>Valor</th>
                          </tr>
                        </thead>

                        <tbody>
                          {vendaRecente.map(
                            (compra) => (
                              <tr key={compra.id}>
                                <td>
                                  {formatarDataHora(
                                    compra.criadoem,
                                  )}
                                </td>

                                <td>
                                  {nomeCliente(
                                    compra.clienteid,
                                  )}
                                </td>

                                <td>
                                  {compra.pagamento ||
                                    "—"}
                                </td>

                                <td>
                                  {moeda(
                                    numero(
                                      compra.valor,
                                    ),
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhuma venda encontrada.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">
                        Movimentações financeiras
                      </h2>

                      <div className="card-description">
                        Receitas e despesas recentes
                      </div>
                    </div>
                  </div>

                  {movimentacoesRecentes.length ? (
                    <div className="table-wrap">
                      <table className="simple-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                          </tr>
                        </thead>

                        <tbody>
                          {movimentacoesRecentes.map(
                            (mov) => (
                              <tr key={mov.id}>
                                <td>
                                  {formatarData(
                                    mov.data,
                                  )}
                                </td>

                                <td>
                                  {mov.descricao}
                                </td>

                                <td>
                                  <span
                                    className={`badge ${
                                      mov.tipo ===
                                      "receita"
                                        ? "green-badge"
                                        : "red-badge"
                                    }`}
                                  >
                                    {mov.tipo ===
                                    "receita"
                                      ? "Receita"
                                      : "Despesa"}
                                  </span>
                                </td>

                                <td
                                  className={
                                    mov.tipo ===
                                    "receita"
                                      ? "green"
                                      : "red"
                                  }
                                >
                                  {moeda(
                                    mov.valor,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">
                      Nenhuma movimentação encontrada.
                    </div>
                  )}
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      Resumo operacional
                    </h2>

                    <div className="card-description">
                      Indicadores gerais da loja
                    </div>
                  </div>
                </div>

                <div className="finance-grid">
                  <div className="finance-item">
                    <div className="finance-item-label">
                      Produtos cadastrados
                    </div>

                    <div className="finance-item-value">
                      {produtos.length}
                    </div>
                  </div>

                  <div className="finance-item">
                    <div className="finance-item-label">
                      Variantes ativas
                    </div>

                    <div className="finance-item-value">
                      {
                        variantes.filter(
                          (v) => v.ativo,
                        ).length
                      }
                    </div>
                  </div>

                  <div className="finance-item">
                    <div className="finance-item-label">
                      Unidades em estoque
                    </div>

                    <div className="finance-item-value">
                      {variantes.reduce(
                        (total, variante) =>
                          total +
                          numero(
                            variante.estoqueAtual,
                          ),
                        0,
                      )}
                    </div>
                  </div>

                  <div className="finance-item">
                    <div className="finance-item-label">
                      Despesas pagas
                    </div>

                    <div className="finance-item-value red">
                      {moeda(
                        totalDespesasPagas,
                      )}
                    </div>
                  </div>

                  <div className="finance-item">
                    <div className="finance-item-label">
                      Receitas recebidas
                    </div>

                    <div className="finance-item-value green">
                      {moeda(
                        totalReceitasRecebidas,
                      )}
                    </div>
                  </div>

                  <div className="finance-item">
                    <div className="finance-item-label">
                      Lucro bruto
                    </div>

                    <div className="finance-item-value green">
                      {moeda(lucroBruto)}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {popupCupons && (
        <div
          className="popup-overlay"
          onClick={() =>
            setPopupCupons(false)
          }
        >
          <div
            className="popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="popup-header">
              <div>
                <h2 className="popup-title">
                  Clientes com cupom
                </h2>

                <div className="card-description">
                  Clientes com 10 pontos ou mais
                </div>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setPopupCupons(false)
                }
              >
                ×
              </button>
            </div>

            {clientesComCupom.map(
              (cliente) => (
                <div
                  className="coupon-client"
                  key={cliente.id}
                >
                  <div>
                    <div className="coupon-name">
                      {cliente.nome}
                    </div>

                    <div className="card-description">
                      {cliente.cpf || "CPF não informado"}
                    </div>
                  </div>

                  <div className="coupon-points">
                    {numero(cliente.pontos)}{" "}
                    pontos
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </>
  )
}