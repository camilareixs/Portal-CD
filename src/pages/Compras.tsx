import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  pontos: number
}

type Variante = {
  id: string
  produtoId: string
  produtoNome: string
  sku: string
  precoVenda: number
  custoUnitario: number
  estoqueAtual: number
  cor: string
  tamanho: string
}

type Compra = {
  id: string
  clienteid: string | null
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

/*
 * REGRA DO PROGRAMA DE FIDELIDADE
 *
 * 10 pontos = R$ 60,00 em cupom
 *
 * A geração dos pontos continua sendo:
 * R$ 150,00 em compras = 1 ponto
 */
const VALOR_CUPOM = 60
const PONTOS_POR_CUPOM = 10
const VALOR_PARA_GERAR_PONTO = 150

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

export default function Compras({
  compraSelecionada
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])

  const [modal, setModal] = useState(false)
  const [modalInativos, setModalInativos] = useState(false)
  const [modalReceita, setModalReceita] = useState(false)

  const [clienteSel, setClienteSel] =
    useState<Cliente | null>(null)

  const [buscaCliente, setBuscaCliente] =
    useState("")

  const [buscaVenda, setBuscaVenda] =
    useState("")

  const [filtroMes, setFiltroMes] =
    useState("todos")

  const [filtroPagamento, setFiltroPagamento] =
    useState("todos")

  const [valor, setValor] = useState(0)

  const [varianteSel, setVarianteSel] =
    useState<Variante | null>(null)

  const [quantidade, setQuantidade] =
    useState(1)

  const [pagamento, setPagamento] =
    useState("Pix")

  const [parcelas, setParcelas] =
    useState(1)

  const [usarCupom, setUsarCupom] =
    useState(false)

  const [quantidadeCupons, setQuantidadeCupons] =
    useState(0)

  const [valorReceita, setValorReceita] =
    useState(0)

  const [descricaoReceita, setDescricaoReceita] =
    useState("")

  const [excluindo, setExcluindo] =
    useState<string | null>(null)

  /*
   * =========================
   * FETCH CLIENTES
   * =========================
   */

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

  /*
   * =========================
   * FETCH PRODUTOS / VARIANTES
   * =========================
   */

  async function fetchVariantes() {
    const { data, error } = await supabase
      .from("produtoVariantes")
      .select(`
        id,
        produtoId,
        sku,
        precoVenda,
        custoUnitario,
        estoqueAtual,
        cor,
        tamanho,
        produtos(nome)
      `)
      .eq("ativo", true)
      .order("produtoId")

    if (error) {
      alert("Erro ao carregar produtos: " + error.message)
      return
    }

    if (data) {
      setVariantes(
        data.map((v: any) => ({
          id: String(v.id),
          produtoId: String(v.produtoId),
          produtoNome: v.produtos?.nome || "Produto",
          sku: v.sku || "",
          precoVenda: Number(v.precoVenda || 0),
          custoUnitario: Number(v.custoUnitario || 0),
          estoqueAtual: Number(v.estoqueAtual || 0),
          cor: v.cor || "",
          tamanho: v.tamanho || ""
        }))
      )
    }
  }

  /*
   * =========================
   * FETCH COMPRAS
   * =========================
   */

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", {
        ascending: false
      })

    if (error) {
      alert("Erro ao carregar compras: " + error.message)
      return
    }

    if (data) {
      setCompras(
        data.map((c: any) => ({
          id: String(c.id),

          clienteid:
            c.clienteid === null ||
            c.clienteid === undefined
              ? null
              : String(c.clienteid),

          cliente: c.cliente || "",

          cpf: c.cpf || "",

          valor: Number(c.valor || 0),

          pagamento: c.pagamento || "",

          parcelas: Number(c.parcelas || 1),

          pontosgerados:
            Number(c.pontosgerados || 0),

          criadoem: c.criadoem || "",

          cupomusado:
            Number(c.cupomusado || 0)
        }))
      )
    }
  }

  /*
   * =========================
   * CARREGAMENTO INICIAL
   * =========================
   */

  useEffect(() => {
    fetchClientes()
    fetchCompras()
    fetchVariantes()
  }, [])

  /*
   * =========================
   * CLIENTE VINDO DA PÁGINA
   * =========================
   */

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
        setClienteSel(cliente)
        setModal(true)
      }
    }
  }, [
    compraSelecionada,
    clientes
  ])

  /*
   * =========================
   * CLIENTES FILTRADOS
   * =========================
   */

  const clientesFiltrados =
    clientes.filter(c =>
      c.nome
        .toLowerCase()
        .includes(
          buscaCliente.toLowerCase()
        )
    )

  /*
   * =========================
   * CUPONS
   * =========================
   */

  const cuponsDisponiveis = clienteSel
    ? Math.floor(
        clienteSel.pontos /
          PONTOS_POR_CUPOM
      )
    : 0

  const saldoCupom =
    cuponsDisponiveis *
    VALOR_CUPOM

  const valorCupom =
    usarCupom
      ? Math.min(
          quantidadeCupons *
            VALOR_CUPOM,
          valor
        )
      : 0

  const valorRestante =
    Math.max(
      valor - valorCupom,
      0
    )

  /*
   * R$ 150,00 = 1 ponto
   */
  const pontosGerados = Math.min(
    PONTOS_POR_CUPOM,
    Math.floor(
      valor /
        VALOR_PARA_GERAR_PONTO
    )
  )

  const pontosUsados =
    usarCupom
      ? quantidadeCupons *
        PONTOS_POR_CUPOM
      : 0

  /*
   * =========================
   * REGISTRAR COMPRA
   * =========================
   */

  async function registrarCompra() {
    if (!clienteSel) {
      alert("Selecione um cliente.")
      return
    }

    if (!varianteSel) {
      alert("Selecione um produto.")
      return
    }

    if (quantidade <= 0) {
      alert("Digite uma quantidade válida.")
      return
    }

    if (quantidade > varianteSel.estoqueAtual) {
      alert(
        `Estoque insuficiente. Disponível: ${varianteSel.estoqueAtual} unidade(s).`
      )
      return
    }

    const valorCompra =
      varianteSel.precoVenda * quantidade

    if (valorCompra <= 0) {
      alert("O produto selecionado não possui preço de venda válido.")
      return
    }

    if (
      quantidadeCupons >
      cuponsDisponiveis
    ) {
      alert(
        "O cliente não possui cupons suficientes."
      )
      return
    }

    if (
      usarCupom &&
      quantidadeCupons <= 0
    ) {
      alert(
        "Selecione a quantidade de cupons."
      )
      return
    }

    const pagamentoFinal =
      valorCupom > 0
        ? valorRestante > 0
          ? `${pagamento} + Cupom`
          : "Cupom"
        : pagamento

    const novosPontos =
      clienteSel.pontos -
      pontosUsados +
      pontosGerados

    if (novosPontos < 0) {
      alert(
        "Os pontos do cliente não podem ficar negativos."
      )
      return
    }

    /*
     * =========================
     * CRIA A COMPRA
     * =========================
     */

    const {
      data: compraCriada,
      error
    } = await supabase
      .from("compras")
      .insert([
        {
          clienteid:
            clienteSel.id,

          cliente:
            clienteSel.nome,

          cpf:
            clienteSel.cpf,

          valor: valorCompra,

          pagamento:
            pagamentoFinal,

          parcelas,

          pontosgerados:
            pontosGerados,

          cupomusado:
            valorCupom,

          criadoem:
            new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error || !compraCriada) {
      alert(
        "Erro ao registrar compra: " +
          (error?.message || "Compra não criada.")
      )
      return
    }

    /*
     * =========================
     * REGISTRA ITEM DA VENDA
     * =========================
     */

    const {
      error: erroItem
    } = await supabase
      .from("vendaItens")
      .insert([
        {
          compraId:
            compraCriada.id,

          varianteId:
            varianteSel.id,

          quantidade,

          precoUnitario:
            varianteSel.precoVenda,

          custoUnitario:
            varianteSel.custoUnitario,

          desconto:
            0
        }
      ])

    if (erroItem) {
      await supabase
        .from("compras")
        .delete()
        .eq("id", compraCriada.id)

      alert(
        "Erro ao registrar o item da venda: " +
          erroItem.message
      )
      return
    }

    /*
     * =========================
     * BAIXA NO ESTOQUE
     * =========================
     */

    const novoEstoque =
      varianteSel.estoqueAtual -
      quantidade

    const {
      error: erroEstoque
    } = await supabase
      .from("produtoVariantes")
      .update({
        estoqueAtual:
          novoEstoque,
        atualizadoem:
          new Date().toISOString()
      })
      .eq(
        "id",
        varianteSel.id
      )

    if (erroEstoque) {
      await supabase
        .from("vendaItens")
        .delete()
        .eq(
          "compraId",
          compraCriada.id
        )

      await supabase
        .from("compras")
        .delete()
        .eq(
          "id",
          compraCriada.id
        )

      alert(
        "Erro ao baixar o estoque: " +
          erroEstoque.message
      )
      return
    }

    /*
     * REGISTRA MOVIMENTAÇÃO DE ESTOQUE
     */

    const {
      error: erroMovimentacao
    } = await supabase
      .from("estoqueMovimentacoes")
      .insert([
        {
          varianteId:
            varianteSel.id,

          tipo:
            "SAIDA",

          quantidade,

          custoUnitario:
            varianteSel.custoUnitario,

          saldoAnterior:
            varianteSel.estoqueAtual,

          saldoPosterior:
            novoEstoque,

          motivo:
            "Venda",

          origemTipo:
            "COMPRA",

          origemId:
            compraCriada.id,

          observacao:
            `Venda para ${clienteSel.nome}`
        }
      ])

    if (erroMovimentacao) {
      /*
       * Reverte a baixa se o histórico
       * de estoque não puder ser salvo.
       */
      await supabase
        .from("produtoVariantes")
        .update({
          estoqueAtual:
            varianteSel.estoqueAtual,
          atualizadoem:
            new Date().toISOString()
        })
        .eq(
          "id",
          varianteSel.id
        )

      await supabase
        .from("vendaItens")
        .delete()
        .eq(
          "compraId",
          compraCriada.id
        )

      await supabase
        .from("compras")
        .delete()
        .eq(
          "id",
          compraCriada.id
        )

      alert(
        "Erro ao registrar a movimentação de estoque: " +
          erroMovimentacao.message
      )
      return
    }

    /*
     * =========================
     * ATUALIZA PONTOS
     * =========================
     */

    const {
      error: erroCliente
    } = await supabase
      .from("clientes")
      .update({
        pontos:
          novosPontos
      })
      .eq(
        "id",
        clienteSel.id
      )

    if (erroCliente) {
      /*
       * Reverte estoque, item e compra
       * caso a atualização da fidelidade falhe.
       */
      await supabase
        .from("produtoVariantes")
        .update({
          estoqueAtual:
            varianteSel.estoqueAtual,
          atualizadoem:
            new Date().toISOString()
        })
        .eq(
          "id",
          varianteSel.id
        )

      await supabase
        .from("estoqueMovimentacoes")
        .delete()
        .eq(
          "origemId",
          compraCriada.id
        )

      await supabase
        .from("vendaItens")
        .delete()
        .eq(
          "compraId",
          compraCriada.id
        )

      await supabase
        .from("compras")
        .delete()
        .eq(
          "id",
          compraCriada.id
        )

      alert(
        "Erro ao atualizar os pontos do cliente: " +
          erroCliente.message
      )

      return
    }

    /*
     * =========================
     * REGISTRAR CUPONS UTILIZADOS
     * =========================
     */

    if (quantidadeCupons > 0) {
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
          "Compra salva, mas não foi possível registrar os cupons: " +
            countError.message
        )
      } else {
        const trocas =
          Array.from(
            {
              length:
                quantidadeCupons
            },
            (_, i) => ({
              clienteid:
                clienteSel.id,

              cliente:
                clienteSel.nome,

              cpf:
                clienteSel.cpf,

              compraid:
                compraCriada.id,

              cupomnumero:
                (cuponsAnteriores || 0) +
                i +
                1,

              valorcupom:
                VALOR_CUPOM,

              pontosUtilizados:
                PONTOS_POR_CUPOM,

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
            "Compra salva, mas ocorreu um erro ao registrar os cupons: " +
              erroTrocas.message
          )
        }
      }
    }

    alert(
      "Compra registrada com sucesso!"
    )

    setVariantes(
      variantes.map(v =>
        v.id === varianteSel.id
          ? {
              ...v,
              estoqueAtual:
                novoEstoque
            }
          : v
      )
    )

    fecharModalCompra()

    await fetchClientes()
    await fetchCompras()
  }

  /*
   * =========================
   * REGISTRAR RECEITA SEM VENDA
   * =========================
   */

  async function registrarReceita() {
    if (valorReceita <= 0) {
      alert(
        "Digite um valor válido para a receita."
      )
      return
    }

    if (
      descricaoReceita.trim() === ""
    ) {
      alert(
        "Digite uma descrição para a receita."
      )
      return
    }

    /*
     * Como a tabela atual utiliza
     * o campo "cliente" para exibição,
     * a descrição é armazenada nele.
     *
     * A receita:
     * - não possui cliente
     * - não gera pontos
     * - não utiliza cupom
     */

    const {
      error
    } = await supabase
      .from("compras")
      .insert([
        {
          clienteid:
            null,

          cliente:
            descricaoReceita.trim(),

          cpf:
            "",

          valor:
            valorReceita,

          pagamento:
            "Receita",

          parcelas:
            1,

          pontosgerados:
            0,

          cupomusado:
            0,

          criadoem:
            new Date().toISOString()
        }
      ])

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

    setValorReceita(0)

    setDescricaoReceita("")

    await fetchCompras()
  }

  /*
   * =========================
   * FECHAR MODAL COMPRA
   * =========================
   */

  function fecharModalCompra() {
    setModal(false)

    setClienteSel(null)

    setValor(0)

    setVarianteSel(null)

    setQuantidade(1)

    setPagamento("Pix")

    setParcelas(1)

    setUsarCupom(false)

    setQuantidadeCupons(0)

    setBuscaCliente("")
  }

  /*
   * =========================
   * EXCLUIR COMPRA / RECEITA
   * =========================
   */

  async function excluirCompra(
    compra: Compra
  ) {
    const confirmacao =
      window.confirm(
        `Tem certeza que deseja excluir esta venda?\n\nCliente: ${
          compra.cliente ||
          "Sem cliente"
        }\nValor: ${moeda(
          compra.valor
        )}\nData: ${new Date(
          compra.criadoem
        ).toLocaleDateString(
          "pt-BR"
        )}\n\nO estoque será devolvido e os pontos/cupons serão estornados.\n\nEssa ação não poderá ser desfeita.`
      )

    if (!confirmacao) {
      return
    }

    setExcluindo(compra.id)

    /*
     * =========================
     * BUSCAR CLIENTE
     * =========================
     */

    let clienteAtual =
      compra.clienteid
        ? clientes.find(
            c =>
              c.id ===
              compra.clienteid
          )
        : null

    if (
      compra.clienteid &&
      !clienteAtual
    ) {
      const {
        data
      } = await supabase
        .from("clientes")
        .select(
          "id,nome,cpf,pontos"
        )
        .eq(
          "id",
          compra.clienteid
        )
        .single()

      if (data) {
        clienteAtual = {
          id: String(data.id),
          nome: data.nome || "",
          cpf: data.cpf || "",
          pontos:
            Number(
              data.pontos || 0
            )
        }
      }
    }

    /*
     * =========================
     * CALCULAR ESTORNO DE PONTOS
     * =========================
     */

    let novosPontos =
      clienteAtual
        ? clienteAtual.pontos
        : 0

    if (clienteAtual) {
      const cuponsUsados =
        compra.cupomusado > 0
          ? Math.ceil(
              compra.cupomusado /
                VALOR_CUPOM
            )
          : 0

      const pontosADevolver =
        cuponsUsados *
        PONTOS_POR_CUPOM

      novosPontos =
        clienteAtual.pontos -
        compra.pontosgerados +
        pontosADevolver

      if (novosPontos < 0) {
        alert(
          "Não foi possível excluir a venda porque os pontos atuais do cliente não permitem desfazer essa operação."
        )

        setExcluindo(null)

        return
      }
    }

    /*
     * =========================
     * BUSCAR ITENS DA VENDA
     * =========================
     */

    const {
      data: itens,
      error: erroItens
    } = await supabase
      .from("vendaItens")
      .select(
        "id,varianteId,quantidade,custoUnitario"
      )
      .eq(
        "compraId",
        compra.id
      )

    if (erroItens) {
      alert(
        "Erro ao buscar os itens da venda: " +
          erroItens.message
      )

      setExcluindo(null)

      return
    }

    /*
     * =========================
     * DEVOLVER ESTOQUE
     * =========================
     */

    for (const item of itens || []) {
      const {
        data: variante,
        error: erroVariante
      } = await supabase
        .from("produtoVariantes")
        .select(
          "id,estoqueAtual"
        )
        .eq(
          "id",
          item.varianteId
        )
        .single()

      if (
        erroVariante ||
        !variante
      ) {
        alert(
          "Não foi possível localizar um produto da venda. A exclusão foi interrompida para não deixar o estoque incorreto."
        )

        setExcluindo(null)

        return
      }

      const saldoAnterior =
        Number(
          variante.estoqueAtual || 0
        )

      const saldoPosterior =
        saldoAnterior +
        Number(
          item.quantidade || 0
        )

      const {
        error: erroEstoque
      } = await supabase
        .from("produtoVariantes")
        .update({
          estoqueAtual:
            saldoPosterior,
          atualizadoem:
            new Date().toISOString()
        })
        .eq(
          "id",
          item.varianteId
        )

      if (erroEstoque) {
        alert(
          "Erro ao devolver o produto ao estoque: " +
            erroEstoque.message
        )

        setExcluindo(null)

        return
      }

      const {
        error: erroMov
      } = await supabase
        .from("estoqueMovimentacoes")
        .insert([
          {
            varianteId:
              item.varianteId,

            tipo:
              "DEVOLUCAO",

            quantidade:
              Number(
                item.quantidade || 0
              ),

            custoUnitario:
              Number(
                item.custoUnitario || 0
              ),

            saldoAnterior,

            saldoPosterior,

            motivo:
              "Exclusão de venda",

            origemTipo:
              "COMPRA",

            origemId:
              compra.id,

            observacao:
              `Estorno da venda de ${compra.cliente || "cliente"}`
          }
        ])

      if (erroMov) {
        /*
         * Reverte a alteração do estoque
         * se o histórico não puder ser salvo.
         */
        await supabase
          .from("produtoVariantes")
          .update({
            estoqueAtual:
              saldoAnterior,
            atualizadoem:
              new Date().toISOString()
          })
          .eq(
            "id",
            item.varianteId
          )

        alert(
          "Erro ao registrar a devolução no estoque: " +
            erroMov.message
        )

        setExcluindo(null)

        return
      }
    }

    /*
     * =========================
     * ESTORNAR PONTOS
     * =========================
     */

    if (clienteAtual) {
      const {
        error: erroPontos
      } = await supabase
        .from("clientes")
        .update({
          pontos:
            novosPontos
        })
        .eq(
          "id",
          clienteAtual.id
        )

      if (erroPontos) {
        alert(
          "O estoque foi devolvido, mas não foi possível estornar os pontos: " +
            erroPontos.message
        )

        setExcluindo(null)

        await fetchClientes()
        await fetchCompras()

        return
      }
    }

    /*
     * =========================
     * EXCLUIR CUPONS E ITENS
     * =========================
     */

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
        "Erro ao excluir os cupons relacionados: " +
          erroTrocas.message
      )

      setExcluindo(null)

      return
    }

    const {
      error: erroVendaItens
    } = await supabase
      .from("vendaItens")
      .delete()
      .eq(
        "compraId",
        compra.id
      )

    if (erroVendaItens) {
      alert(
        "Erro ao excluir os itens da venda: " +
          erroVendaItens.message
      )

      setExcluindo(null)

      return
    }

    /*
     * =========================
     * EXCLUIR COMPRA
     * =========================
     */

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
        "Erro ao excluir venda: " +
          erroCompra.message
      )

      setExcluindo(null)

      return
    }

    alert(
      "Venda excluída com sucesso!"
    )

    setExcluindo(null)

    await fetchClientes()
    await fetchCompras()
    await fetchVariantes()
  }

  /*
   * =========================
   * FILTROS
   * =========================
   */

  const comprasFiltradas =
    useMemo(() => {
      return compras.filter(
        compra => {
          const busca =
            buscaVenda
              .toLowerCase()
              .trim()

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
            ).padStart(
              2,
              "0"
            )

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

  /*
   * =========================
   * FATURAMENTO POR MÊS
   * =========================
   */

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
            ).padStart(
              2,
              "0"
            )

          if (
            filtroMes !==
              "todos" &&
            mes !==
              filtroMes
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
      ).sort(
        (a, b) =>
          b[0].localeCompare(
            a[0]
          )
      )
    }, [
      compras,
      filtroMes
    ])

  /*
   * =========================
   * CLIENTES INATIVOS
   * =========================
   */

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

      if (!ultima) {
        return true
      }

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

  /*
   * =========================
   * RENDER
   * =========================
   */

  return (
    <div className="compras-page" style={container}>
      <style>
        {`
          .compras-page {
            width: 100%;
            max-width: 100%;
          }

          @media (max-width: 900px) {
            .compras-page {
              padding: 22px !important;
            }

            .compras-filtros {
              grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
            }

            .compras-filtros input {
              grid-column: 1 / -1 !important;
            }

            .compra-card {
              grid-template-columns: minmax(0, 1.4fr) repeat(3, minmax(0, 1fr)) auto !important;
              gap: 10px !important;
              padding: 12px !important;
            }
          }

          @media (max-width: 600px) {
            .compras-page {
              padding: 10px !important;
            }

            .compras-page > * {
              max-width: 100% !important;
            }

            .header {
              align-items: stretch !important;
              gap: 10px !important;
              margin-bottom: 12px !important;
            }

            .title {
              font-size: 25px !important;
            }

            .header-buttons {
              width: 100% !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
            }

            .header-buttons button {
              width: 100% !important;
              min-width: 0 !important;
              padding: 10px 7px !important;
              font-size: 12px !important;
            }

            .dashGrid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 7px !important;
              margin-bottom: 10px !important;
            }

            .dashGrid > div {
              padding: 12px 9px !important;
              border-radius: 11px !important;
            }

            .dashLabel {
              font-size: 10px !important;
              white-space: nowrap !important;
              margin-bottom: 4px !important;
            }

            .dashValue {
              font-size: 17px !important;
              line-height: 1.15 !important;
            }

            .section {
              padding: 13px !important;
              border-radius: 13px !important;
              margin-bottom: 10px !important;
            }

            .section h3 {
              font-size: 15px !important;
              margin-bottom: 10px !important;
            }

            .mesGrid {
              display: flex !important;
              overflow-x: auto !important;
              gap: 7px !important;
              padding-bottom: 2px !important;
            }

            .mesCard {
              flex: 0 0 125px !important;
              padding: 11px !important;
            }

            .mesValor {
              font-size: 12px !important;
            }

            .compras-filtros {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 7px !important;
              margin-bottom: 10px !important;
            }

            .compras-filtros input {
              grid-column: 1 / -1 !important;
            }

            .compras-filtros input,
            .compras-filtros select {
              height: 42px !important;
              padding: 9px !important;
              font-size: 13px !important;
            }

            .listaCompras {
              gap: 8px !important;
            }

            .compra-card {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 0 !important;
              padding: 0 !important;
              border-radius: 12px !important;
              position: relative !important;
            }

            .compra-card > div:first-child {
              grid-column: 1 / -1 !important;
              width: 100% !important;
              padding: 13px 48px 10px 13px !important;
              border-bottom: 1px solid #eeeeee !important;
            }

            .compra-card > div:nth-child(2),
            .compra-card > div:nth-child(3),
            .compra-card > div:nth-child(4) {
              width: 100% !important;
              padding: 10px 8px !important;
              min-width: 0 !important;
              border-bottom: none !important;
              background: transparent !important;
            }

            .compra-card > div:nth-child(2) {
              grid-column: 1 !important;
            }

            .compra-card > div:nth-child(3) {
              grid-column: 2 !important;
            }

            .compra-card > div:nth-child(4) {
              grid-column: 3 !important;
            }

            .compra-card > div:nth-child(2) strong,
            .compra-card > div:nth-child(3) div,
            .compra-card > div:nth-child(4) div {
              font-size: 12px !important;
            }

            .compra-card > div:nth-child(2) .infoLabel,
            .compra-card > div:nth-child(3) .infoLabel,
            .compra-card > div:nth-child(4) .infoLabel {
              font-size: 9px !important;
              margin-bottom: 3px !important;
            }

            .compra-card > div:nth-child(5) {
              position: absolute !important;
              top: 9px !important;
              right: 9px !important;
              width: auto !important;
              padding: 0 !important;
              border: none !important;
              background: transparent !important;
            }

            .deleteBtn {
              padding: 6px 7px !important;
              font-size: 9px !important;
              border-radius: 6px !important;
            }

            .notifBar {
              padding: 10px 12px !important;
              margin-bottom: 10px !important;
            }

            .modalCard {
              width: calc(100vw - 20px) !important;
              max-height: calc(100vh - 20px) !important;
              padding: 15px !important;
              border-radius: 14px !important;
            }

            .clienteGrid {
              grid-template-columns: 1fr !important;
              max-height: 170px !important;
            }
          }

          @media (max-width: 420px) {
            .compras-page {
              padding: 8px !important;
            }

            .dashGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .dashGrid > div:first-child {
              grid-column: 1 / -1 !important;
            }

            .dashValue {
              font-size: 19px !important;
            }

            .header-buttons {
              grid-template-columns: 1fr 1fr !important;
            }

            .compra-card > div:nth-child(2),
            .compra-card > div:nth-child(3),
            .compra-card > div:nth-child(4) {
              padding-left: 7px !important;
              padding-right: 7px !important;
            }
          }
        `}
      </style>

      {/* =========================
          CLIENTES INATIVOS
      ========================= */}

      {clientesInativos.length > 0 && (
        <div style={notifBar}>
          <span>
            🔔{" "}
            {clientesInativos.length}{" "}
            clientes inativos
          </span>

          <button
            style={notifBtn}
            onClick={() =>
              setModalInativos(true)
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
          className="header-buttons"
          style={headerButtons}
        >
          <button
            style={btnSecondary}
            onClick={() =>
              setModalReceita(true)
            }
          >
            Nova receita
          </button>

          <button
            style={btnSmall}
            onClick={() =>
              setModal(true)
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
          className="dash-faturamento"
          label="Faturamento"
          value={moeda(
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
            comprasFiltradas.length
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
                    c.clienteid
                )
            ).size
          }
        />
      </div>

      {/* =========================
          FATURAMENTO POR MÊS
      ========================= */}

      <div style={section}>
        <h3 style={sectionTitle}>
          Faturamento por mês
        </h3>

        <div style={mesGrid}>
          {vendasPorMes.length ===
            0 && (
            <div
              style={emptyText}
            >
              Nenhuma venda
              encontrada.
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
                  {moeda(
                    Number(total)
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

      <div
        className="compras-filtros"
        style={filtrosBar}
      >
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

          <option value="Em aberto">
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
        <h3 style={sectionTitle}>
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
              Nenhuma venda
              encontrada.
            </div>
          )}

          {comprasFiltradas.map(
            compra => (
              <div
                key={compra.id}
                className="compra-card"
                style={compraCard}
              >
                {/* CLIENTE / RECEITA */}

                <div
                  style={
                    compraCliente
                  }
                >
                  <strong>
                    {compra.pagamento ===
                    "Receita"
                      ? "Receita"
                      : compra.cliente ||
                        "Sem cliente"}
                  </strong>

                  {compra.pagamento ===
                    "Receita" ? (
                    <div
                      style={muted}
                    >
                      {
                        compra.cliente
                      }
                    </div>
                  ) : (
                    compra.cpf && (
                      <div
                        style={muted}
                      >
                        {
                          compra.cpf
                        }
                      </div>
                    )
                  )}

                  {compra.pagamento ===
                    "Receita" && (
                    <span
                      style={
                        receitaBadge
                      }
                    >
                      Receita
                    </span>
                  )}
                </div>

                {/* VALOR */}

                <div
                  style={compraInfo}
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Valor
                  </span>

                  <strong>
                    {moeda(
                      compra.valor
                    )}
                  </strong>

                  <div
                    style={muted}
                  >
                    {new Date(
                      compra.criadoem
                    ).toLocaleDateString(
                      "pt-BR"
                    )}
                  </div>
                </div>

                {/* PAGAMENTO */}

                <div
                  style={compraInfo}
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
                    "Em aberto"
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
                  style={compraInfo}
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Fidelidade
                  </span>

                  {compra.pagamento ===
                  "Receita" ? (
                    <div
                      style={muted}
                    >
                      Sem pontos
                    </div>
                  ) : (
                    <>
                      <div
                        style={pontos}
                      >
                        {compra.pontosgerados >
                        0
                          ? `+${compra.pontosgerados} pts`
                          : "Sem pontos"}
                      </div>

                      {compra.cupomusado >
                        0 && (
                        <div
                          style={muted}
                        >
                          Cupom:{" "}
                          {moeda(
                            compra.cupomusado
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* EXCLUIR */}

                <div
                  style={
                    deleteContainer
                  }
                >
                  <button
                    type="button"
                    style={
                      deleteBtn
                    }
                    disabled={
                      excluindo ===
                      compra.id
                    }
                    onClick={() =>
                      excluirCompra(
                        compra
                      )
                    }
                  >
                    {excluindo ===
                    compra.id
                      ? "Excluindo..."
                      : "Excluir"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* =========================
          MODAL NOVA COMPRA
      ========================= */}

      {modal && (
        <div
          style={overlay}
          onClick={
            fecharModalCompra
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
                Nova compra
              </h2>

              <button
                style={closeBtn}
                onClick={
                  fecharModalCompra
                }
              >
                ×
              </button>
            </div>

            {/* BUSCAR CLIENTE */}

            <input
              placeholder="Buscar cliente"
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
                      {c.pontos}{" "}
                      pontos
                    </div>
                  </div>
                )
              )}

              {clientesFiltrados.length ===
                0 && (
                <div
                  style={
                    emptyText
                  }
                >
                  Nenhum cliente
                  encontrado.
                </div>
              )}
            </div>

            {/* CLIENTE SELECIONADO */}

            {clienteSel && (
              <>
                <div
                  style={
                    clienteSelecionado
                  }
                >
                  <strong>
                    {
                      clienteSel.nome
                    }
                  </strong>

                  <span
                    style={
                      clientePontos
                    }
                  >
                    {
                      clienteSel.pontos
                    }{" "}
                    pontos
                  </span>
                </div>

                {/* CUPONS */}

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
                      {
                        cuponsDisponiveis
                      }{" "}
                      cupons disponíveis
                      {" • "}
                      crédito de{" "}
                      {moeda(
                        saldoCupom
                      )}
                    </div>

                    <div
                      style={
                        cupomRegra
                      }
                    >
                      10 pontos =
                      R$ 60,00
                    </div>
                  </div>

                  {cuponsDisponiveis >
                    0 && (
                    <label
                      style={
                        cupomLabel
                      }
                    >
                      <span>
                        Usar cupom
                      </span>

                      <input
                        type="checkbox"
                        checked={
                          usarCupom
                        }
                        onChange={e => {
                          const ativo =
                            e.target
                              .checked

                          setUsarCupom(
                            ativo
                          )

                          if (!ativo) {
                            setQuantidadeCupons(
                              0
                            )
                          } else if (
                            quantidadeCupons ===
                            0
                          ) {
                            setQuantidadeCupons(
                              1
                            )
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* QUANTIDADE DE CUPONS */}

                {usarCupom &&
                  cuponsDisponiveis >
                    0 && (
                    <div
                      style={
                        cupomQuantidadeBox
                      }
                    >
                      <label
                        style={
                          fieldLabel
                        }
                      >
                        Quantidade de
                        cupons
                      </label>

                      <select
                        style={input}
                        value={
                          quantidadeCupons
                        }
                        onChange={e =>
                          setQuantidadeCupons(
                            Number(
                              e.target
                                .value
                            )
                          )
                        }
                      >
                        {Array.from(
                          {
                            length:
                              cuponsDisponiveis
                          },
                          (
                            _,
                            index
                          ) => {
                            const quantidade =
                              index +
                              1

                            return (
                              <option
                                key={
                                  quantidade
                                }
                                value={
                                  quantidade
                                }
                              >
                                {
                                  quantidade
                                }{" "}
                                {quantidade ===
                                1
                                  ? "cupom"
                                  : "cupons"}{" "}
                                —{" "}
                                {moeda(
                                  quantidade *
                                    VALOR_CUPOM
                                )}
                              </option>
                            )
                          }
                        )}
                      </select>
                    </div>
                  )}

                {/* PRODUTO */}

                <label
                  style={
                    fieldLabel
                  }
                >
                  Produto
                </label>

                <select
                  style={input}
                  value={
                    varianteSel?.id || ""
                  }
                  onChange={e => {
                    const variante =
                      variantes.find(
                        v =>
                          v.id ===
                          e.target.value
                      ) || null

                    setVarianteSel(
                      variante
                    )
                    setQuantidade(1)
                    setValor(
                      variante
                        ? variante.precoVenda
                        : 0
                    )
                  }}
                >
                  <option value="">
                    Selecione o produto
                  </option>

                  {variantes.map(
                    v => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={
                          v.estoqueAtual <=
                          0
                        }
                      >
                        {v.produtoNome}
                        {v.cor
                          ? ` • ${v.cor}`
                          : ""}
                        {v.tamanho
                          ? ` • ${v.tamanho}`
                          : ""}
                        {" — "}
                        {moeda(
                          v.precoVenda
                        )}
                        {" — estoque: "}
                        {
                          v.estoqueAtual
                        }
                      </option>
                    )
                  )}
                </select>

                {varianteSel && (
                  <>
                    <label
                      style={
                        fieldLabel
                      }
                    >
                      Quantidade
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={
                        varianteSel.estoqueAtual
                      }
                      step="1"
                      style={input}
                      value={
                        quantidade
                      }
                      onChange={e => {
                        const novaQuantidade =
                          Math.max(
                            1,
                            Math.min(
                              Number(
                                e.target
                                  .value
                              ) || 1,
                              varianteSel.estoqueAtual
                            )
                          )

                        setQuantidade(
                          novaQuantidade
                        )

                        setValor(
                          varianteSel.precoVenda *
                            novaQuantidade
                        )
                      }}
                    />

                    <div
                      style={muted}
                    >
                      Preço unitário:{" "}
                      {moeda(
                        varianteSel.precoVenda
                      )}{" "}
                      • Estoque disponível:{" "}
                      {
                        varianteSel.estoqueAtual
                      }
                    </div>
                  </>
                )}

                {/* VALOR */}

                <div
                  style={{
                    ...resumo,
                    marginTop: 12
                  }}
                >
                  Valor da compra:{" "}
                  <strong>
                    {moeda(valor)}
                  </strong>
                </div>

                {/* PAGAMENTO */}

                <label
                  style={
                    fieldLabel
                  }
                >
                  Forma de pagamento
                </label>

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

                  <option value="Em aberto">
                    Em aberto (Fiado)
                  </option>
                </select>

                {/* PARCELAS */}

                {pagamento ===
                  "Cartão" && (
                  <>
                    <label
                      style={
                        fieldLabel
                      }
                    >
                      Parcelas
                    </label>

                    <select
                      style={input}
                      value={
                        parcelas
                      }
                      onChange={e =>
                        setParcelas(
                          Number(
                            e.target
                              .value
                          )
                        )
                      }
                    >
                      <option
                        value={1}
                      >
                        1x
                      </option>

                      <option
                        value={2}
                      >
                        2x
                      </option>

                      <option
                        value={3}
                      >
                        3x
                      </option>

                      <option
                        value={4}
                      >
                        4x
                      </option>

                      <option
                        value={5}
                      >
                        5x
                      </option>
                    </select>
                  </>
                )}

                {/* RESUMO */}

                <div
                  style={
                    resumo
                  }
                >
                  <div>
                    Valor da compra:{" "}
                    <strong>
                      {moeda(
                        valor
                      )}
                    </strong>
                  </div>

                  <div>
                    Cupom usado:{" "}
                    <strong>
                      {moeda(
                        valorCupom
                      )}
                    </strong>
                  </div>

                  <div>
                    Valor a pagar:{" "}
                    <strong>
                      {moeda(
                        valorRestante
                      )}
                    </strong>
                  </div>

                  <div>
                    Pontos gerados:{" "}
                    <strong>
                      {
                        pontosGerados
                      }
                    </strong>
                  </div>

                  {usarCupom && (
                    <div>
                      Pontos utilizados:{" "}
                      <strong>
                        {
                          pontosUsados
                        }
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  style={
                    btnPrimary
                  }
                  onClick={
                    registrarCompra
                  }
                >
                  Finalizar compra
                </button>
              </>
            )}

            {!clienteSel && (
              <div
                style={
                  escolhaCliente
                }
              >
                Selecione um cliente
                para continuar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          MODAL RECEITA
      ========================= */}

      {modalReceita && (
        <div
          style={overlay}
          onClick={() =>
            setModalReceita(
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
              <div>
                <h2
                  style={{
                    margin: 0
                  }}
                >
                  Nova receita
                </h2>

                <div
                  style={
                    muted
                  }
                >
                  Cadastre uma receita
                  sem vincular a uma
                  venda ou cliente.
                </div>
              </div>

              <button
                style={closeBtn}
                onClick={() =>
                  setModalReceita(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <label
              style={
                fieldLabel
              }
            >
              Descrição
            </label>

            <input
              type="text"
              placeholder="Ex.: receita extra"
              value={
                descricaoReceita
              }
              onChange={e =>
                setDescricaoReceita(
                  e.target.value
                )
              }
              style={input}
            />

            <label
              style={
                fieldLabel
              }
            >
              Valor da receita
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="R$ 0,00"
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
              style={input}
            />

            <div
              style={
                resumo
              }
            >
              Receita:{" "}
              <strong>
                {moeda(
                  valorReceita
                )}
              </strong>
            </div>

            <button
              style={
                btnPrimary
              }
              onClick={
                registrarReceita
              }
            >
              Cadastrar receita
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
                style={closeBtn}
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
                const ult =
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
              }
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/*
 * =========================
 * COMPONENTE DASH
 * =========================
 */

function Dash({
  label,
  value,
  className = ""
}: {
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div
      className={className}
      style={dash}
    >
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
  overflowX:
    "hidden" as const,
  boxSizing:
    "border-box" as const
}

const section = {
  width: "100%",
  minWidth: 0,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  overflow:
    "hidden" as const,
  boxSizing:
    "border-box" as const
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 18
}

const notifBar = {
  width: "100%",
  background: "#fff6d6",
  padding:
    "12px 16px",
  borderRadius: 12,
  marginBottom: 16,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  flexWrap:
    "wrap" as const,
  boxSizing:
    "border-box" as const
}

const notifBtn = {
  border: "none",
  background:
    "transparent",
  color: "#b8962e",
  cursor: "pointer",
  fontWeight: 600
}

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 20,
  flexWrap:
    "wrap" as const
}

const headerButtons = {
  display: "flex",
  gap: 10,
  flexWrap:
    "wrap" as const
}

const title = {
  fontSize: 30,
  margin: 0,
  fontWeight: 600
}

const btnSmall = {
  padding:
    "11px 18px",
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg,#d4af37,#f6e27a)",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace:
    "nowrap" as const
}

const btnSecondary = {
  padding:
    "11px 18px",
  borderRadius: 10,
  border:
    "1px solid #eadfbf",
  background: "#fff",
  color: "#80691f",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace:
    "nowrap" as const
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
  overflow:
    "hidden" as const,
  border:
    "1px solid #eeeeee",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
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
  overflow:
    "hidden" as const
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
  border:
    "1px solid #ddd",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing:
    "border-box" as const
}

const selectFiltro = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  padding: 12,
  borderRadius: 10,
  border:
    "1px solid #ddd",
  background: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing:
    "border-box" as const
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
    "minmax(160px,2fr) minmax(120px,1fr) minmax(110px,1fr) minmax(110px,1fr) auto",
  gap: 18,
  padding: 16,
  borderRadius: 12,
  background: "#f9f9f9",
  alignItems: "center",
  minWidth: 0,
  width: "100%",
  overflow:
    "hidden" as const,
  boxSizing:
    "border-box" as const
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

const receitaBadge = {
  display: "inline-block",
  marginTop: 6,
  padding:
    "3px 7px",
  borderRadius: 6,
  background: "#eee",
  color: "#777",
  fontSize: 10,
  fontWeight: 600
}

const deleteContainer = {
  display: "flex",
  justifyContent:
    "flex-end",
  alignItems: "center"
}

const deleteBtn = {
  padding:
    "8px 11px",
  borderRadius: 8,
  border:
    "1px solid #efcaca",
  background: "#fff5f5",
  color: "#c45a5a",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace:
    "nowrap" as const
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background:
    "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  padding: 16,
  zIndex: 2000,
  overflowY:
    "auto" as const,
  boxSizing:
    "border-box" as const
}

const modalCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  overflowY:
    "auto" as const,
  overflowX:
    "hidden" as const,
  boxSizing:
    "border-box" as const
}

const modalHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
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

const clienteGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
  marginTop: 10,
  maxHeight: 190,
  overflowY:
    "auto" as const
}

const clienteCard = {
  padding: 12,
  borderRadius: 10,
  cursor: "pointer",
  background: "#fff",
  wordBreak:
    "break-word" as const
}

const clienteSelecionado = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  padding: 12,
  marginTop: 12,
  borderRadius: 10,
  background: "#faf8f1",
  flexWrap:
    "wrap" as const
}

const clientePontos = {
  color: "#9b7b2f",
  fontSize: 12,
  fontWeight: 600
}

const cupomBox = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 12,
  padding: 13,
  borderRadius: 12,
  background: "#faf8f1",
  border:
    "1px solid #eee6c9",
  flexWrap:
    "wrap" as const
}

const cupomRegra = {
  marginTop: 5,
  color: "#9b7b2f",
  fontSize: 11,
  fontWeight: 600
}

const cupomQuantidadeBox = {
  marginTop: 10
}

const cupomLabel = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer"
}

const fieldLabel = {
  display: "block",
  marginTop: 12,
  marginBottom: 4,
  color: "#555",
  fontSize: 12,
  fontWeight: 600
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

const escolhaCliente = {
  marginTop: 15,
  padding: 15,
  background: "#fafafa",
  borderRadius: 10,
  color: "#888",
  textAlign:
    "center" as const,
  fontSize: 13
}

const inativoRow = {
  padding: 12,
  borderBottom:
    "1px solid #eee"
}

const input = {
  width: "100%",
  minWidth: 0,
  padding: 10,
  marginTop: 6,
  borderRadius: 10,
  border:
    "1px solid #ddd",
  background: "#fff",
  boxSizing:
    "border-box" as const,
  outline: "none"
}

const muted = {
  fontSize: 12,
  color: "#888",
  marginTop: 3
}