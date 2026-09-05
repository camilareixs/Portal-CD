
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Produto = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  tecido: string | null
  comprimento: string | null
  modelagem: string | null
  categoria: string | null
  subcategoria: string | null
}

type Variante = {
  id: string
  produtoId: string
  sku: string
  precoVenda: number
  custoUnitario: number
  margemAlvo: number | null
  estoqueAtual: number
  estoqueMinimo: number
  estoqueMaximo: number | null
  ativo: boolean
  cor: string | null
  tamanho: string | null
}

type Movimentacao = {
  id: string
  varianteId: string
  tipo: string
  quantidade: number
  custoUnitario: number | null
  saldoAnterior: number
  saldoPosterior: number
  motivo: string | null
  observacao: string | null
  criadoem: string
}

const CATEGORIAS = [
  "Camiseta",
  "Moletom",
  "Caneca",
  "Tube Top",
  "Vestido",
  "Saia",
  "Blusa",
  "Outro"
]

const SUBCATEGORIAS = [
  "Feminino",
  "Masculino",
  "Unissex",
  "Acessório",
  "Outro"
]

const TECIDOS = [
  "Algodão",
  "Malha",
  "Moletom",
  "Poliéster",
  "Viscose",
  "Linho",
  "Outro"
]

const COMPRIMENTOS = [
  "Curto",
  "Médio",
  "Longo",
  "Único"
]

const MODELAGENS = [
  "Tradicional",
  "Oversized",
  "Cropped",
  "Slim",
  "Solto",
  "Único"
]

const CORES = [
  "Preto",
  "Branco",
  "Cinza",
  "Bege",
  "Marrom",
  "Azul",
  "Rosa",
  "Vermelho",
  "Verde",
  "Amarelo",
  "Outra"
]

const TAMANHOS = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "Único"
]

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function dataFormatada(data: string) {
  return new Date(data).toLocaleString("pt-BR")
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])

  const [produtoSelecionado, setProdutoSelecionado] =
    useState<Produto | null>(null)

  const [aba, setAba] = useState<
    "produtos" | "variantes" | "movimentacoes"
  >("produtos")

  const [modalProduto, setModalProduto] = useState(false)
  const [modalVariante, setModalVariante] = useState(false)
  const [modalEstoque, setModalEstoque] = useState(false)

  const [varianteSelecionada, setVarianteSelecionada] =
    useState<Variante | null>(null)

  const [busca, setBusca] = useState("")

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [categoria, setCategoria] = useState("")
  const [subcategoria, setSubcategoria] = useState("")
  const [tecido, setTecido] = useState("")
  const [comprimento, setComprimento] = useState("")
  const [modelagem, setModelagem] = useState("")

  const [sku, setSku] = useState("")
  const [cor, setCor] = useState("")
  const [tamanho, setTamanho] = useState("")
  const [precoVenda, setPrecoVenda] = useState("")
  const [custoUnitario, setCustoUnitario] = useState("")
  const [estoqueMinimo, setEstoqueMinimo] = useState("0")
  const [estoqueMaximo, setEstoqueMaximo] = useState("")

  const [tipoMovimentacao, setTipoMovimentacao] =
    useState("ENTRADA")
  const [quantidadeMovimentacao, setQuantidadeMovimentacao] =
    useState("")
  const [custoMovimentacao, setCustoMovimentacao] =
    useState("")
  const [motivoMovimentacao, setMotivoMovimentacao] =
    useState("")
  const [observacaoMovimentacao, setObservacaoMovimentacao] =
    useState("")

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [
      produtosResponse,
      variantesResponse,
      movimentacoesResponse
    ] = await Promise.all([
      supabase
        .from("produtos")
        .select(
          "id,nome,descricao,ativo,tecido,comprimento,modelagem,categoria,subcategoria"
        )
        .order("nome", { ascending: true }),

      supabase
        .from("produtoVariantes")
        .select(
          "id,produtoId,sku,precoVenda,custoUnitario,margemAlvo,estoqueAtual,estoqueMinimo,estoqueMaximo,ativo,cor,tamanho"
        )
        .order("criadoem", { ascending: false }),

      supabase
        .from("estoqueMovimentacoes")
        .select(
          "id,varianteId,tipo,quantidade,custoUnitario,saldoAnterior,saldoPosterior,motivo,observacao,criadoem"
        )
        .order("criadoem", { ascending: false })
        .limit(200)
    ])

    if (produtosResponse.error) {
      console.error(produtosResponse.error)
      alert("Erro ao carregar os produtos.")
    }

    if (variantesResponse.error) {
      console.error(variantesResponse.error)
      alert("Erro ao carregar as variantes.")
    }

    if (movimentacoesResponse.error) {
      console.error(movimentacoesResponse.error)
      alert("Erro ao carregar o estoque.")
    }

    setProdutos(
      (produtosResponse.data || []) as Produto[]
    )

    setVariantes(
      (variantesResponse.data || []) as Variante[]
    )

    setMovimentacoes(
      (movimentacoesResponse.data || []) as Movimentacao[]
    )

    setCarregando(false)
  }

  function limparProdutoForm() {
    setNome("")
    setDescricao("")
    setCategoria("")
    setSubcategoria("")
    setTecido("")
    setComprimento("")
    setModelagem("")
    setProdutoSelecionado(null)
  }

  function abrirNovoProduto() {
    limparProdutoForm()
    setModalProduto(true)
  }

  function abrirEditarProduto(produto: Produto) {
    setProdutoSelecionado(produto)

    setNome(produto.nome)
    setDescricao(produto.descricao || "")
    setCategoria(produto.categoria || "")
    setSubcategoria(produto.subcategoria || "")
    setTecido(produto.tecido || "")
    setComprimento(produto.comprimento || "")
    setModelagem(produto.modelagem || "")

    setModalProduto(true)
  }

  async function salvarProduto() {
    if (!nome.trim()) {
      alert("Informe o nome do produto.")
      return
    }

    setSalvando(true)

    const dados = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      categoria: categoria || null,
      subcategoria: subcategoria || null,
      tecido: tecido || null,
      comprimento: comprimento || null,
      modelagem: modelagem || null
    }

    let error = null

    if (produtoSelecionado) {
      const response = await supabase
        .from("produtos")
        .update(dados)
        .eq("id", produtoSelecionado.id)

      error = response.error
    } else {
      const response = await supabase
        .from("produtos")
        .insert(dados)

      error = response.error
    }

    setSalvando(false)

    if (error) {
      console.error(error)
      alert("Não foi possível salvar o produto.")
      return
    }

    setModalProduto(false)
    limparProdutoForm()
    await carregarDados()
  }

  async function alternarProduto(produto: Produto) {
    const novoStatus = !produto.ativo

    const { error } = await supabase
      .from("produtos")
      .update({
        ativo: novoStatus
      })
      .eq("id", produto.id)

    if (error) {
      console.error(error)
      alert("Não foi possível alterar o status do produto.")
      return
    }

    await carregarDados()
  }

  function limparVarianteForm() {
    setSku("")
    setCor("")
    setTamanho("")
    setPrecoVenda("")
    setCustoUnitario("")
    setEstoqueMinimo("0")
    setEstoqueMaximo("")
    setVarianteSelecionada(null)
  }

  function abrirNovaVariante(produto?: Produto) {
    if (produto) {
      setProdutoSelecionado(produto)
    }

    limparVarianteForm()
    setModalVariante(true)
  }

  function abrirEditarVariante(variante: Variante) {
    const produto = produtos.find(
      p => p.id === variante.produtoId
    )

    if (produto) {
      setProdutoSelecionado(produto)
    }

    setVarianteSelecionada(variante)
    setSku(variante.sku)
    setCor(variante.cor || "")
    setTamanho(variante.tamanho || "")
    setPrecoVenda(String(variante.precoVenda))
    setCustoUnitario(String(variante.custoUnitario))
    setEstoqueMinimo(String(variante.estoqueMinimo))
    setEstoqueMaximo(
      variante.estoqueMaximo === null
        ? ""
        : String(variante.estoqueMaximo)
    )

    setModalVariante(true)
  }

  async function salvarVariante() {
    if (!produtoSelecionado) {
      alert("Selecione um produto.")
      return
    }

    if (!sku.trim()) {
      alert("Informe o SKU.")
      return
    }

    const preco = Number(
      precoVenda.replace(",", ".")
    )

    const custo = Number(
      custoUnitario.replace(",", ".")
    )

    const minimo = Number(
      estoqueMinimo.replace(",", ".")
    )

    const maximo =
      estoqueMaximo.trim() === ""
        ? null
        : Number(
            estoqueMaximo.replace(",", ".")
          )

    if (
      Number.isNaN(preco) ||
      Number.isNaN(custo) ||
      Number.isNaN(minimo)
    ) {
      alert("Verifique os valores informados.")
      return
    }

    if (preco < 0 || custo < 0 || minimo < 0) {
      alert("Os valores não podem ser negativos.")
      return
    }

    if (
      maximo !== null &&
      (Number.isNaN(maximo) || maximo < minimo)
    ) {
      alert(
        "O estoque máximo precisa ser maior ou igual ao estoque mínimo."
      )
      return
    }

    setSalvando(true)

    const dados = {
      produtoId: produtoSelecionado.id,
      sku: sku.trim(),
      precoVenda: preco,
      custoUnitario: custo,
      estoqueMinimo: minimo,
      estoqueMaximo: maximo,
      cor: cor || null,
      tamanho: tamanho || null
    }

    let error = null

    if (varianteSelecionada) {
      const response = await supabase
        .from("produtoVariantes")
        .update(dados)
        .eq("id", varianteSelecionada.id)

      error = response.error
    } else {
      const response = await supabase
        .from("produtoVariantes")
        .insert({
          ...dados,
          estoqueAtual: 0
        })

      error = response.error
    }

    setSalvando(false)

    if (error) {
      console.error(error)

      if (
        error.message?.toLowerCase().includes("uqprodutovariante")
      ) {
        alert(
          "Já existe uma variante com esse produto, cor e tamanho."
        )
      } else if (
        error.message?.toLowerCase().includes("sku")
      ) {
        alert("Esse SKU já está cadastrado.")
      } else {
        alert("Não foi possível salvar a variante.")
      }

      return
    }

    setModalVariante(false)
    limparVarianteForm()
    await carregarDados()
  }

  async function alternarVariante(variante: Variante) {
    const { error } = await supabase
      .from("produtoVariantes")
      .update({
        ativo: !variante.ativo
      })
      .eq("id", variante.id)

    if (error) {
      console.error(error)
      alert("Não foi possível alterar o status da variante.")
      return
    }

    await carregarDados()
  }

  function abrirEstoque(variante: Variante) {
    setVarianteSelecionada(variante)

    setTipoMovimentacao("ENTRADA")
    setQuantidadeMovimentacao("")
    setCustoMovimentacao(
      String(variante.custoUnitario)
    )
    setMotivoMovimentacao("")
    setObservacaoMovimentacao("")

    setModalEstoque(true)
  }

  async function movimentarEstoque() {
    if (!varianteSelecionada) {
      alert("Selecione uma variante.")
      return
    }

    const quantidade = Number(
      quantidadeMovimentacao.replace(",", ".")
    )

    const custo =
      custoMovimentacao.trim() === ""
        ? null
        : Number(
            custoMovimentacao.replace(",", ".")
          )

    if (
      Number.isNaN(quantidade) ||
      quantidade <= 0 ||
      !Number.isInteger(quantidade)
    ) {
      alert("A quantidade deve ser um número inteiro maior que zero.")
      return
    }

    if (
      custo !== null &&
      (Number.isNaN(custo) || custo < 0)
    ) {
      alert("Informe um custo válido.")
      return
    }

    if (!motivoMovimentacao.trim()) {
      alert("Informe o motivo da movimentação.")
      return
    }

    setSalvando(true)

    const { error } = await supabase.rpc(
      "movimentarEstoque",
      {
        p_variante_id: varianteSelecionada.id,
        p_tipo: tipoMovimentacao,
        p_quantidade: quantidade,
        p_motivo: motivoMovimentacao.trim(),
        p_custo_unitario: custo,
        p_origem_tipo: null,
        p_origem_id: null,
        p_observacao:
          observacaoMovimentacao.trim() || null
      }
    )

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(
        error.message ||
          "Não foi possível movimentar o estoque."
      )
      return
    }

    setModalEstoque(false)
    await carregarDados()
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    if (!termo) {
      return produtos
    }

    return produtos.filter(produto =>
      [
        produto.nome,
        produto.categoria,
        produto.subcategoria
      ]
        .filter(Boolean)
        .some(valor =>
          String(valor)
            .toLowerCase()
            .includes(termo)
        )
    )
  }, [produtos, busca])

  const variantesDoProduto = useMemo(() => {
    if (!produtoSelecionado) {
      return []
    }

    return variantes.filter(
      variante =>
        variante.produtoId === produtoSelecionado.id
    )
  }, [variantes, produtoSelecionado])

  const estoqueTotal = useMemo(() => {
    return variantes.reduce(
      (total, variante) =>
        total + variante.estoqueAtual,
      0
    )
  }, [variantes])

  const variantesEstoqueBaixo = useMemo(() => {
    return variantes.filter(
      variante =>
        variante.ativo &&
        variante.estoqueAtual <=
          variante.estoqueMinimo
    )
  }, [variantes])

  const valorEstoque = useMemo(() => {
    return variantes.reduce(
      (total, variante) =>
        total +
        variante.estoqueAtual *
          variante.custoUnitario,
      0
    )
  }, [variantes])

  function nomeProduto(varianteId: string) {
    const variante = variantes.find(
      v => v.id === varianteId
    )

    if (!variante) {
      return "-"
    }

    const produto = produtos.find(
      p => p.id === variante.produtoId
    )

    if (!produto) {
      return "-"
    }

    return produto.nome
  }

  function descricaoVariante(variante: Variante) {
    const partes = [
      variante.cor,
      variante.tamanho
    ].filter(Boolean)

    return partes.length
      ? partes.join(" / ")
      : "Variante única"
  }

  if (carregando) {
    return (
      <div style={loadingContainer}>
        <div style={loadingText}>
          Carregando produtos e estoque...
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>
            Produtos e Estoque
          </h1>

          <p style={subtitle}>
            Cadastre seus produtos e acompanhe o estoque da Cami&Duda.
          </p>
        </div>

        <button
          style={primaryButton}
          onClick={abrirNovoProduto}
        >
          + Novo produto
        </button>
      </div>

      {/* RESUMO */}
      <div style={cardsGrid}>
        <div style={summaryCard}>
          <span style={summaryLabel}>
            Produtos
          </span>

          <strong style={summaryValue}>
            {produtos.length}
          </strong>

          <span style={summaryDescription}>
            {produtos.filter(p => p.ativo).length} ativos
          </span>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>
            Variantes
          </span>

          <strong style={summaryValue}>
            {variantes.length}
          </strong>

          <span style={summaryDescription}>
            {variantes.filter(v => v.ativo).length} ativas
          </span>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>
            Unidades em estoque
          </span>

          <strong style={summaryValue}>
            {estoqueTotal}
          </strong>

          <span style={summaryDescription}>
            unidades disponíveis
          </span>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>
            Valor do estoque
          </span>

          <strong style={summaryValue}>
            {moeda(valorEstoque)}
          </strong>

          <span style={summaryDescription}>
            considerando o custo
          </span>
        </div>

        <div
          style={{
            ...summaryCard,
            border:
              variantesEstoqueBaixo.length > 0
                ? "1px solid #e6c98b"
                : "1px solid #eee7d8"
          }}
        >
          <span style={summaryLabel}>
            Estoque baixo
          </span>

          <strong
            style={{
              ...summaryValue,
              color:
                variantesEstoqueBaixo.length > 0
                  ? "#a77724"
                  : "#6d685f"
            }}
          >
            {variantesEstoqueBaixo.length}
          </strong>

          <span style={summaryDescription}>
            variantes precisam de atenção
          </span>
        </div>
      </div>

      {/* ABAS */}
      <div style={tabsContainer}>
        <button
          style={{
            ...tabButton,
            ...(aba === "produtos"
              ? activeTab
              : {})
          }}
          onClick={() => setAba("produtos")}
        >
          Produtos
        </button>

        <button
          style={{
            ...tabButton,
            ...(aba === "variantes"
              ? activeTab
              : {})
          }}
          onClick={() => setAba("variantes")}
        >
          Variantes e Estoque
        </button>

        <button
          style={{
            ...tabButton,
            ...(aba === "movimentacoes"
              ? activeTab
              : {})
          }}
          onClick={() => setAba("movimentacoes")}
        >
          Movimentações
        </button>
      </div>

      {/* PRODUTOS */}
      {aba === "produtos" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Produtos cadastrados
              </h2>

              <p style={sectionSubtitle}>
                Gerencie os produtos disponíveis na loja.
              </p>
            </div>

            <input
              value={busca}
              onChange={e =>
                setBusca(e.target.value)
              }
              placeholder="Buscar produto..."
              style={searchInput}
            />
          </div>

          {produtosFiltrados.length === 0 ? (
            <div style={emptyState}>
              <strong>
                Nenhum produto encontrado
              </strong>

              <span>
                Cadastre seu primeiro produto para começar.
              </span>
            </div>
          ) : (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>
                      Produto
                    </th>

                    <th style={th}>
                      Categoria
                    </th>

                    <th style={th}>
                      Características
                    </th>

                    <th style={th}>
                      Variantes
                    </th>

                    <th style={th}>
                      Status
                    </th>

                    <th style={th}>
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {produtosFiltrados.map(produto => {
                    const qtdVariantes =
                      variantes.filter(
                        variante =>
                          variante.produtoId ===
                          produto.id
                      ).length

                    return (
                      <tr key={produto.id}>
                        <td style={td}>
                          <strong>
                            {produto.nome}
                          </strong>

                          {produto.descricao && (
                            <div style={smallText}>
                              {produto.descricao}
                            </div>
                          )}
                        </td>

                        <td style={td}>
                          {produto.categoria || "-"}
                          {produto.subcategoria && (
                            <div style={smallText}>
                              {produto.subcategoria}
                            </div>
                          )}
                        </td>

                        <td style={td}>
                          <div>
                            {produto.tecido || "-"}
                          </div>

                          <div style={smallText}>
                            {produto.comprimento || ""}
                            {produto.comprimento &&
                            produto.modelagem
                              ? " · "
                              : ""}
                            {produto.modelagem || ""}
                          </div>
                        </td>

                        <td style={td}>
                          {qtdVariantes}
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              ...statusBadge,
                              background:
                                produto.ativo
                                  ? "#f1f7ee"
                                  : "#f3f1ed",
                              color:
                                produto.ativo
                                  ? "#557448"
                                  : "#777066"
                            }}
                          >
                            {produto.ativo
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </td>

                        <td style={td}>
                          <div style={actions}>
                            <button
                              style={secondaryButton}
                              onClick={() =>
                                abrirEditarProduto(
                                  produto
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              style={secondaryButton}
                              onClick={() => {
                                setProdutoSelecionado(
                                  produto
                                )
                                setAba("variantes")
                              }}
                            >
                              Estoque
                            </button>

                            <button
                              style={secondaryButton}
                              onClick={() =>
                                abrirNovaVariante(
                                  produto
                                )
                              }
                            >
                              + Variante
                            </button>

                            <button
                              style={textButton}
                              onClick={() =>
                                alternarProduto(
                                  produto
                                )
                              }
                            >
                              {produto.ativo
                                ? "Inativar"
                                : "Ativar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* VARIANTES */}
      {aba === "variantes" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Variantes e Estoque
              </h2>

              <p style={sectionSubtitle}>
                Controle preço, custo e quantidade disponível.
              </p>
            </div>

            <div style={variantHeaderActions}>
              <select
                value={
                  produtoSelecionado?.id || ""
                }
                onChange={e => {
                  const produto =
                    produtos.find(
                      p =>
                        p.id === e.target.value
                    )

                  setProdutoSelecionado(
                    produto || null
                  )
                }}
                style={select}
              >
                <option value="">
                  Todos os produtos
                </option>

                {produtos.map(produto => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.nome}
                  </option>
                ))}
              </select>

              <button
                style={primaryButton}
                onClick={() =>
                  abrirNovaVariante(
                    produtoSelecionado || undefined
                  )
                }
                disabled={!produtoSelecionado}
              >
                + Nova variante
              </button>
            </div>
          </div>

          {!produtoSelecionado ? (
            <div style={emptyState}>
              <strong>
                Selecione um produto
              </strong>

              <span>
                Escolha um produto acima para visualizar suas variantes.
              </span>
            </div>
          ) : variantesDoProduto.length === 0 ? (
            <div style={emptyState}>
              <strong>
                Nenhuma variante cadastrada
              </strong>

              <span>
                Cadastre cor, tamanho, SKU, preço e custo.
              </span>

              <button
                style={primaryButton}
                onClick={() =>
                  abrirNovaVariante(
                    produtoSelecionado
                  )
                }
              >
                Cadastrar variante
              </button>
            </div>
          ) : (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>
                      SKU
                    </th>

                    <th style={th}>
                      Cor
                    </th>

                    <th style={th}>
                      Tamanho
                    </th>

                    <th style={th}>
                      Venda
                    </th>

                    <th style={th}>
                      Custo
                    </th>

                    <th style={th}>
                      Estoque
                    </th>

                    <th style={th}>
                      Status
                    </th>

                    <th style={th}>
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {variantesDoProduto.map(
                    variante => {
                      const estoqueBaixo =
                        variante.ativo &&
                        variante.estoqueAtual <=
                          variante.estoqueMinimo

                      return (
                        <tr key={variante.id}>
                          <td style={td}>
                            <strong>
                              {variante.sku}
                            </strong>
                          </td>

                          <td style={td}>
                            {variante.cor || "-"}
                          </td>

                          <td style={td}>
                            {variante.tamanho ||
                              "-"}
                          </td>

                          <td style={td}>
                            {moeda(
                              variante.precoVenda
                            )}
                          </td>

                          <td style={td}>
                            {moeda(
                              variante.custoUnitario
                            )}
                          </td>

                          <td style={td}>
                            <strong
                              style={{
                                color:
                                  estoqueBaixo
                                    ? "#a77724"
                                    : "#403d38"
                              }}
                            >
                              {
                                variante.estoqueAtual
                              }
                            </strong>

                            <div style={smallText}>
                              mínimo:{" "}
                              {
                                variante.estoqueMinimo
                              }
                            </div>
                          </td>

                          <td style={td}>
                            <span
                              style={{
                                ...statusBadge,
                                background:
                                  variante.ativo
                                    ? "#f1f7ee"
                                    : "#f3f1ed",
                                color:
                                  variante.ativo
                                    ? "#557448"
                                    : "#777066"
                              }}
                            >
                              {variante.ativo
                                ? "Ativa"
                                : "Inativa"}
                            </span>
                          </td>

                          <td style={td}>
                            <div style={actions}>
                              <button
                                style={primarySmallButton}
                                onClick={() =>
                                  abrirEstoque(
                                    variante
                                  )
                                }
                              >
                                Estoque
                              </button>

                              <button
                                style={
                                  secondaryButton
                                }
                                onClick={() =>
                                  abrirEditarVariante(
                                    variante
                                  )
                                }
                              >
                                Editar
                              </button>

                              <button
                                style={
                                  textButton
                                }
                                onClick={() =>
                                  alternarVariante(
                                    variante
                                  )
                                }
                              >
                                {variante.ativo
                                  ? "Inativar"
                                  : "Ativar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MOVIMENTAÇÕES */}
      {aba === "movimentacoes" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Histórico de estoque
              </h2>

              <p style={sectionSubtitle}>
                Registro das entradas, saídas, ajustes, perdas e devoluções.
              </p>
            </div>
          </div>

          {movimentacoes.length === 0 ? (
            <div style={emptyState}>
              <strong>
                Nenhuma movimentação registrada
              </strong>

              <span>
                As movimentações aparecerão aqui conforme o estoque for alterado.
              </span>
            </div>
          ) : (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>
                      Data
                    </th>

                    <th style={th}>
                      Produto
                    </th>

                    <th style={th}>
                      Tipo
                    </th>

                    <th style={th}>
                      Quantidade
                    </th>

                    <th style={th}>
                      Saldo
                    </th>

                    <th style={th}>
                      Motivo
                    </th>

                    <th style={th}>
                      Observação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movimentacoes.map(
                    movimentacao => (
                      <tr key={movimentacao.id}>
                        <td style={td}>
                          {dataFormatada(
                            movimentacao.criadoem
                          )}
                        </td>

                        <td style={td}>
                          <strong>
                            {nomeProduto(
                              movimentacao.varianteId
                            )}
                          </strong>

                          <div style={smallText}>
                            {(() => {
                              const variante =
                                variantes.find(
                                  v =>
                                    v.id ===
                                    movimentacao.varianteId
                                )

                              return variante
                                ? `${variante.sku} · ${descricaoVariante(
                                    variante
                                  )}`
                                : "-"
                            })()}
                          </div>
                        </td>

                        <td style={td}>
                          <span
                            style={{
                              ...movementBadge,
                              background:
                                movimentacao.tipo ===
                                  "ENTRADA" ||
                                movimentacao.tipo ===
                                  "DEVOLUCAO" ||
                                movimentacao.tipo ===
                                  "AJUSTE_ENTRADA"
                                  ? "#f1f7ee"
                                  : "#faf1e7",
                              color:
                                movimentacao.tipo ===
                                  "ENTRADA" ||
                                movimentacao.tipo ===
                                  "DEVOLUCAO" ||
                                movimentacao.tipo ===
                                  "AJUSTE_ENTRADA"
                                  ? "#557448"
                                  : "#956a36"
                            }}
                          >
                            {
                              movimentacao.tipo
                            }
                          </span>
                        </td>

                        <td style={td}>
                          {movimentacao.quantidade}
                        </td>

                        <td style={td}>
                          {
                            movimentacao.saldoAnterior
                          }{" "}
                          →{" "}
                          {
                            movimentacao.saldoPosterior
                          }
                        </td>

                        <td style={td}>
                          {movimentacao.motivo ||
                            "-"}
                        </td>

                        <td style={td}>
                          {movimentacao.observacao ||
                            "-"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODAL PRODUTO */}
      {modalProduto && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  {produtoSelecionado
                    ? "Editar produto"
                    : "Novo produto"}
                </h2>

                <p style={modalSubtitle}>
                  Cadastre as informações principais do produto.
                </p>
              </div>

              <button
                style={closeButton}
                onClick={() =>
                  setModalProduto(false)
                }
              >
                ×
              </button>
            </div>

            <div style={formGrid}>
              <div style={fieldFull}>
                <label style={label}>
                  Nome do produto *
                </label>

                <input
                  value={nome}
                  onChange={e =>
                    setNome(e.target.value)
                  }
                  style={input}
                  placeholder="Ex.: Camiseta FEI"
                />
              </div>

              <div style={fieldFull}>
                <label style={label}>
                  Descrição
                </label>

                <textarea
                  value={descricao}
                  onChange={e =>
                    setDescricao(
                      e.target.value
                    )
                  }
                  style={textarea}
                  placeholder="Descrição do produto..."
                  rows={3}
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Categoria
                </label>

                <select
                  value={categoria}
                  onChange={e =>
                    setCategoria(
                      e.target.value
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {CATEGORIAS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Subcategoria
                </label>

                <select
                  value={subcategoria}
                  onChange={e =>
                    setSubcategoria(
                      e.target.value
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {SUBCATEGORIAS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Tecido
                </label>

                <select
                  value={tecido}
                  onChange={e =>
                    setTecido(e.target.value)
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {TECIDOS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Comprimento
                </label>

                <select
                  value={comprimento}
                  onChange={e =>
                    setComprimento(
                      e.target.value
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {COMPRIMENTOS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Modelagem
                </label>

                <select
                  value={modelagem}
                  onChange={e =>
                    setModelagem(
                      e.target.value
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {MODELAGENS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={modalFooter}>
              <button
                style={cancelButton}
                onClick={() =>
                  setModalProduto(false)
                }
              >
                Cancelar
              </button>

              <button
                style={primaryButton}
                onClick={salvarProduto}
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VARIANTE */}
      {modalVariante && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  {varianteSelecionada
                    ? "Editar variante"
                    : "Nova variante"}
                </h2>

                <p style={modalSubtitle}>
                  {produtoSelecionado?.nome ||
                    "Produto"}
                </p>
              </div>

              <button
                style={closeButton}
                onClick={() =>
                  setModalVariante(false)
                }
              >
                ×
              </button>
            </div>

            <div style={formGrid}>
              <div style={fieldFull}>
                <label style={label}>
                  Produto
                </label>

                <select
                  value={
                    produtoSelecionado?.id ||
                    ""
                  }
                  onChange={e => {
                    const produto =
                      produtos.find(
                        p =>
                          p.id ===
                          e.target.value
                      )

                    setProdutoSelecionado(
                      produto || null
                    )
                  }}
                  style={input}
                  disabled={
                    !!varianteSelecionada
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {produtos.map(produto => (
                    <option
                      key={produto.id}
                      value={produto.id}
                    >
                      {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldFull}>
                <label style={label}>
                  SKU *
                </label>

                <input
                  value={sku}
                  onChange={e =>
                    setSku(e.target.value)
                  }
                  style={input}
                  placeholder="Ex.: CAM-PT-M"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Cor
                </label>

                <select
                  value={cor}
                  onChange={e =>
                    setCor(e.target.value)
                  }
                  style={input}
                >
                  <option value="">
                    Sem cor
                  </option>

                  {CORES.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Tamanho
                </label>

                <select
                  value={tamanho}
                  onChange={e =>
                    setTamanho(
                      e.target.value
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Sem tamanho
                  </option>

                  {TAMANHOS.map(item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Preço de venda *
                </label>

                <div style={inputPrefix}>
                  <span>R$</span>

                  <input
                    value={precoVenda}
                    onChange={e =>
                      setPrecoVenda(
                        e.target.value
                      )
                    }
                    style={inputNoBorder}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div style={field}>
                <label style={label}>
                  Custo unitário *
                </label>

                <div style={inputPrefix}>
                  <span>R$</span>

                  <input
                    value={custoUnitario}
                    onChange={e =>
                      setCustoUnitario(
                        e.target.value
                      )
                    }
                    style={inputNoBorder}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div style={field}>
                <label style={label}>
                  Estoque mínimo
                </label>

                <input
                  value={estoqueMinimo}
                  onChange={e =>
                    setEstoqueMinimo(
                      e.target.value
                    )
                  }
                  style={input}
                  type="number"
                  min="0"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Estoque máximo
                </label>

                <input
                  value={estoqueMaximo}
                  onChange={e =>
                    setEstoqueMaximo(
                      e.target.value
                    )
                  }
                  style={input}
                  type="number"
                  min="0"
                  placeholder="Opcional"
                />
              </div>
            </div>

            {varianteSelecionada && (
              <div style={currentStockBox}>
                <span>
                  Estoque atual
                </span>

                <strong>
                  {
                    varianteSelecionada.estoqueAtual
                  }{" "}
                  unidades
                </strong>

                <small>
                  Para alterar a quantidade, use o botão
                  {" "}
                  <strong>Estoque</strong>.
                </small>
              </div>
            )}

            <div style={modalFooter}>
              <button
                style={cancelButton}
                onClick={() =>
                  setModalVariante(false)
                }
              >
                Cancelar
              </button>

              <button
                style={primaryButton}
                onClick={salvarVariante}
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar variante"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTOQUE */}
      {modalEstoque &&
        varianteSelecionada && (
          <div style={modalOverlay}>
            <div style={modal}>
              <div style={modalHeader}>
                <div>
                  <h2 style={modalTitle}>
                    Movimentar estoque
                  </h2>

                  <p style={modalSubtitle}>
                    {nomeProduto(
                      varianteSelecionada.id
                    )}
                    {" · "}
                    {varianteSelecionada.sku}
                  </p>
                </div>

                <button
                  style={closeButton}
                  onClick={() =>
                    setModalEstoque(false)
                  }
                >
                  ×
                </button>
              </div>

              <div style={currentStockLarge}>
                <span>
                  Estoque atual
                </span>

                <strong>
                  {
                    varianteSelecionada.estoqueAtual
                  }{" "}
                  unidades
                </strong>
              </div>

              <div style={formGrid}>
                <div style={fieldFull}>
                  <label style={label}>
                    Tipo de movimentação *
                  </label>

                  <select
                    value={tipoMovimentacao}
                    onChange={e =>
                      setTipoMovimentacao(
                        e.target.value
                      )
                    }
                    style={input}
                  >
                    <option value="ENTRADA">
                      Entrada
                    </option>

                    <option value="SAIDA">
                      Saída
                    </option>

                    <option value="AJUSTE_ENTRADA">
                      Ajuste de entrada
                    </option>

                    <option value="AJUSTE_SAIDA">
                      Ajuste de saída
                    </option>

                    <option value="DEVOLUCAO">
                      Devolução
                    </option>

                    <option value="PERDA">
                      Perda
                    </option>
                  </select>
                </div>

                <div style={field}>
                  <label style={label}>
                    Quantidade *
                  </label>

                  <input
                    value={
                      quantidadeMovimentacao
                    }
                    onChange={e =>
                      setQuantidadeMovimentacao(
                        e.target.value
                      )
                    }
                    style={input}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                  />
                </div>

                <div style={field}>
                  <label style={label}>
                    Custo unitário
                  </label>

                  <div style={inputPrefix}>
                    <span>R$</span>

                    <input
                      value={custoMovimentacao}
                      onChange={e =>
                        setCustoMovimentacao(
                          e.target.value
                        )
                      }
                      style={inputNoBorder}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div style={fieldFull}>
                  <label style={label}>
                    Motivo *
                  </label>

                  <input
                    value={motivoMovimentacao}
                    onChange={e =>
                      setMotivoMovimentacao(
                        e.target.value
                      )
                    }
                    style={input}
                    placeholder="Ex.: Reposição de estoque"
                  />
                </div>

                <div style={fieldFull}>
                  <label style={label}>
                    Observação
                  </label>

                  <textarea
                    value={
                      observacaoMovimentacao
                    }
                    onChange={e =>
                      setObservacaoMovimentacao(
                        e.target.value
                      )
                    }
                    style={textarea}
                    rows={3}
                    placeholder="Informações adicionais..."
                  />
                </div>
              </div>

              <div style={modalFooter}>
                <button
                  style={cancelButton}
                  onClick={() =>
                    setModalEstoque(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  style={primaryButton}
                  onClick={movimentarEstoque}
                  disabled={salvando}
                >
                  {salvando
                    ? "Processando..."
                    : "Confirmar movimentação"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

/* =========================
   ESTILOS
========================= */

const page = {
  width: "100%",
  maxWidth: 1500,
  margin: "0 auto"
}

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 28
}

const title = {
  margin: 0,
  fontFamily: "Playfair Display, serif",
  fontSize: 32,
  color: "#3f3b34",
  fontWeight: 700
}

const subtitle = {
  margin: "7px 0 0",
  color: "#777168",
  fontSize: 14
}

const primaryButton = {
  border: "none",
  background: "#b9974f",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 5px 14px rgba(185,151,79,0.18)"
}

const primarySmallButton = {
  ...primaryButton,
  padding: "8px 13px",
  fontSize: 13
}

const secondaryButton = {
  border: "1px solid #e5dcc8",
  background: "#fffdfa",
  color: "#665f53",
  padding: "8px 13px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer"
}

const textButton = {
  border: "none",
  background: "transparent",
  color: "#8b6f3d",
  padding: "8px 5px",
  fontSize: 13,
  cursor: "pointer"
}

const cardsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 28
}

const summaryCard = {
  background: "#fffdfa",
  border: "1px solid #eee7d8",
  borderRadius: 14,
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
  gap: 5,
  boxShadow:
    "0 4px 14px rgba(120,100,60,0.04)"
}

const summaryLabel = {
  fontSize: 12,
  color: "#8b857a",
  fontWeight: 500
}

const summaryValue = {
  fontSize: 24,
  color: "#403d38",
  fontWeight: 700,
  marginTop: 3
}

const summaryDescription = {
  fontSize: 12,
  color: "#99938a"
}

const tabsContainer = {
  display: "flex",
  gap: 5,
  borderBottom: "1px solid #e8e0d0",
  marginBottom: 20,
  overflowX: "auto" as const
}

const tabButton = {
  border: "none",
  background: "transparent",
  color: "#777168",
  padding: "13px 18px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  borderBottom: "3px solid transparent"
}

const activeTab = {
  color: "#8b6f3d",
  fontWeight: 600,
  borderBottom:
    "3px solid #d8bf7a"
}

const section = {
  background: "#fffdfa",
  border: "1px solid #eee7d8",
  borderRadius: 15,
  padding: 24,
  boxShadow:
    "0 4px 15px rgba(120,100,60,0.035)"
}

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 22,
  flexWrap: "wrap" as const
}

const sectionTitle = {
  margin: 0,
  color: "#464139",
  fontSize: 19,
  fontWeight: 650
}

const sectionSubtitle = {
  margin: "5px 0 0",
  color: "#898278",
  fontSize: 13
}

const searchInput = {
  width: 260,
  maxWidth: "100%",
  border: "1px solid #ddd5c6",
  borderRadius: 9,
  padding: "10px 13px",
  background: "#fff",
  color: "#464139",
  fontSize: 13,
  outline: "none"
}

const variantHeaderActions = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap" as const
}

const select = {
  border: "1px solid #ddd5c6",
  borderRadius: 9,
  padding: "10px 13px",
  background: "#fff",
  color: "#464139",
  fontSize: 13,
  minWidth: 200,
  outline: "none"
}

const tableWrapper = {
  width: "100%",
  overflowX: "auto" as const,
  border: "1px solid #eee8dc",
  borderRadius: 10
}

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 850
}

const th = {
  textAlign: "left" as const,
  padding: "13px 14px",
  background: "#faf7ef",
  color: "#746d61",
  fontSize: 12,
  fontWeight: 650,
  borderBottom: "1px solid #eee8dc",
  whiteSpace: "nowrap" as const
}

const td = {
  padding: "14px",
  borderBottom: "1px solid #f0ece4",
  color: "#4f4a42",
  fontSize: 13,
  verticalAlign: "middle" as const
}

const smallText = {
  marginTop: 4,
  color: "#969087",
  fontSize: 11
}

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600
}

const movementBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 9px",
  borderRadius: 20,
  fontSize: 10,
  fontWeight: 650
}

const actions = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap" as const
}

const emptyState = {
  minHeight: 220,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textAlign: "center" as const,
  color: "#777168",
  padding: 30
}

const loadingContainer = {
  minHeight: 400,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}

const loadingText = {
  color: "#8b6f3d",
  fontSize: 14
}

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(35,31,25,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 2000
}

const modal = {
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  overflowY: "auto" as const,
  background: "#fffdfa",
  borderRadius: 17,
  boxShadow:
    "0 20px 60px rgba(30,25,15,0.2)",
  padding: 28,
  boxSizing: "border-box" as const
}

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  alignItems: "flex-start",
  marginBottom: 25
}

const modalTitle = {
  margin: 0,
  color: "#403c35",
  fontSize: 21,
  fontWeight: 650
}

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#898278",
  fontSize: 13
}

const closeButton = {
  width: 34,
  height: 34,
  border: "none",
  background: "#f6f2e9",
  color: "#6f685c",
  borderRadius: "50%",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer"
}

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 17
}

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 7
}

const fieldFull = {
  ...field,
  gridColumn: "1 / -1"
}

const label = {
  color: "#625c52",
  fontSize: 12,
  fontWeight: 600
}

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #ddd5c6",
  borderRadius: 9,
  background: "#fff",
  color: "#454038",
  padding: "11px 12px",
  fontSize: 13,
  outline: "none"
}

const textarea = {
  ...input,
  resize: "vertical" as const,
  fontFamily: "inherit"
}

const inputPrefix = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid #ddd5c6",
  borderRadius: 9,
  background: "#fff",
  paddingLeft: 12,
  color: "#8b6f3d",
  fontSize: 13,
  fontWeight: 600
}

const inputNoBorder = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#454038",
  padding: "11px 12px 11px 0",
  fontSize: 13
}

const currentStockBox = {
  marginTop: 20,
  padding: 15,
  borderRadius: 10,
  background: "#faf7ef",
  border: "1px solid #eee3c9",
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  color: "#6e675c",
  fontSize: 12
}

const currentStockLarge = {
  marginBottom: 22,
  padding: 18,
  borderRadius: 11,
  background: "#faf7ef",
  border: "1px solid #eee3c9",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#746d61",
  fontSize: 13
}

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid #eee8dc"
}

const cancelButton = {
  border: "1px solid #ddd5c6",
  background: "#fff",
  color: "#6c665c",
  padding: "11px 18px",
  borderRadius: 9,
  fontSize: 13,
  cursor: "pointer"
}

