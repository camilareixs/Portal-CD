import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Produto = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  criadoem: string
  atualizadoem: string
  dataEntrada: string | null
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
  criadoem: string
  atualizadoem: string
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

type Cor = {
  nome: string
  hex: string
}

const CATEGORIAS = [
  "Roupas",
  "Acessórios"
]

const SUBCATEGORIAS: Record<string, string[]> = {
  Roupas: [
    "Vestido",
    "Camiseta",
    "Camisa",
    "Saia",
    "Blusa",
    "Moletom",
    "Suéter",
    "Short",
    "Regata",
    "Chemise",
    "Roupa de Academia",
    "Roupa Térmica",
    "Meia",
    "Meia-Calça"
  ],
  Acessórios: [
    "Cinto",
    "Bolsa"
  ]
}

const CORES_PADRAO: Cor[] = [
  { nome: "Preto", hex: "#000000" },
  { nome: "Branco", hex: "#FFFFFF" },
  { nome: "Off-White", hex: "#F8F5E9" },
  { nome: "Bege", hex: "#F5F5DC" },
  { nome: "Marrom", hex: "#8B4513" },
  { nome: "Cinza", hex: "#808080" },

  { nome: "Azul", hex: "#0000FF" },
  { nome: "Azul-Marinho", hex: "#000080" },
  { nome: "Azul Royal", hex: "#4169E1" },
  { nome: "Azul Bebê", hex: "#89CFF0" },
  { nome: "Azul Turquesa", hex: "#40E0D0" },

  { nome: "Verde", hex: "#008000" },
  { nome: "Verde Oliva", hex: "#808000" },
  { nome: "Verde Musgo", hex: "#556B2F" },
  { nome: "Verde Militar", hex: "#4B5320" },
  { nome: "Verde Água", hex: "#7FFFD4" },

  { nome: "Vermelho", hex: "#FF0000" },
  { nome: "Vinho", hex: "#722F37" },
  { nome: "Bordô", hex: "#800020" },

  { nome: "Rosa", hex: "#FFC0CB" },
  { nome: "Pink", hex: "#FF1493" },
  { nome: "Rosa Bebê", hex: "#F4C2C2" },

  { nome: "Roxo", hex: "#800080" },
  { nome: "Lilás", hex: "#C8A2C8" },

  { nome: "Amarelo", hex: "#FFFF00" },
  { nome: "Mostarda", hex: "#FFDB58" },

  { nome: "Laranja", hex: "#FFA500" },
  { nome: "Terracota", hex: "#E2725B" }
]

const TAMANHOS_PADRAO = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "Único"
]

const TECIDOS_PADRAO = [
  "Algodão",
  "Viscose",
  "Malha",
  "Ribana",
  "Jeans",
  "Moletom",
  "Tricô",
  "Linho",
  "Poliéster",
  "Suplex",
  "Tule",
  "Renda"
]

const COMPRIMENTOS_PADRAO = [
  "Curto",
  "Midi",
  "Longo"
]

const MODELAGENS_PADRAO = [
  "Justa",
  "Rodada",
  "Reta",
  "Evasê",
  "Solta",
  "Acinturada",
  "Oversized",
  "Cropped"
]

const PRECO_PADRAO: Record<string, number> = {
  Camiseta: 69,
  Moletom: 165,
  Caneca: 48,
  "Tube Top": 59
}

const TIPOS_MOVIMENTACAO = [
  "ENTRADA",
  "SAIDA",
  "AJUSTE_ENTRADA",
  "AJUSTE_SAIDA",
  "DEVOLUCAO",
  "PERDA"
]

function carregarLista<T>(chave: string, padrao: T[]): T[] {
  try {
    const salvo = localStorage.getItem(chave)

    if (!salvo) {
      return padrao
    }

    const parsed = JSON.parse(salvo)

    if (!Array.isArray(parsed)) {
      return padrao
    }

    return parsed
  } catch {
    return padrao
  }
}

function salvarLista<T>(chave: string, lista: T[]) {
  localStorage.setItem(chave, JSON.stringify(lista))
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function dataBR(data: string | null) {
  if (!data) return "-"

  const [ano, mes, dia] = data.split("-")

  if (!ano || !mes || !dia) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])

  const [aba, setAba] = useState<
    "produtos" | "variantes" | "movimentacoes"
  >("produtos")

  const [produtoSelecionado, setProdutoSelecionado] =
    useState<string>("")

  const [busca, setBusca] = useState("")

  const [modalProduto, setModalProduto] = useState(false)
  const [modalVariante, setModalVariante] = useState(false)
  const [modalEstoque, setModalEstoque] = useState(false)

  const [produtoEditando, setProdutoEditando] =
    useState<Produto | null>(null)

  const [varianteEditando, setVarianteEditando] =
    useState<Variante | null>(null)

  const [varianteEstoque, setVarianteEstoque] =
    useState<Variante | null>(null)

  const [salvando, setSalvando] = useState(false)

  const [novaOpcaoTipo, setNovaOpcaoTipo] =
    useState<
      "cor" |
      "tamanho" |
      "tecido" |
      "comprimento" |
      "modelagem" |
      null
    >(null)

  const [novaOpcaoNome, setNovaOpcaoNome] = useState("")
  const [novaOpcaoHex, setNovaOpcaoHex] = useState("#000000")

  const [cores, setCores] = useState<Cor[]>(() =>
    carregarLista("camiduda_cores", CORES_PADRAO)
  )

  const [tamanhos, setTamanhos] = useState<string[]>(() =>
    carregarLista("camiduda_tamanhos", TAMANHOS_PADRAO)
  )

  const [tecidos, setTecidos] = useState<string[]>(() =>
    carregarLista("camiduda_tecidos", TECIDOS_PADRAO)
  )

  const [comprimentos, setComprimentos] = useState<string[]>(() =>
    carregarLista(
      "camiduda_comprimentos",
      COMPRIMENTOS_PADRAO
    )
  )

  const [modelagens, setModelagens] = useState<string[]>(() =>
    carregarLista(
      "camiduda_modelagens",
      MODELAGENS_PADRAO
    )
  )

  const [formProduto, setFormProduto] = useState({
    nome: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    tecido: "",
    comprimento: "",
    modelagem: "",
    dataEntrada: "",
    ativo: true
  })

  const [formVariante, setFormVariante] = useState({
    produtoId: "",
    cor: "",
    tamanho: "",
    sku: "",
    precoVenda: "",
    custoUnitario: "",
    margemAlvo: "",
    estoqueMinimo: "0",
    estoqueMaximo: ""
  })

  const [formEstoque, setFormEstoque] = useState({
    tipo: "ENTRADA",
    quantidade: "",
    custoUnitario: "",
    motivo: "",
    observacao: ""
  })

  async function carregarDados() {
    const [
      produtosResponse,
      variantesResponse,
      movimentacoesResponse
    ] = await Promise.all([
      supabase
        .from("produtos")
        .select("*")
        .order("nome", { ascending: true }),

      supabase
        .from("produtoVariantes")
        .select("*")
        .order("criadoem", { ascending: false }),

      supabase
        .from("estoqueMovimentacoes")
        .select("*")
        .order("criadoem", { ascending: false })
    ])

    if (produtosResponse.error) {
      console.error(produtosResponse.error)
      alert("Erro ao carregar produtos.")
      return
    }

    if (variantesResponse.error) {
      console.error(variantesResponse.error)
      alert("Erro ao carregar variantes.")
      return
    }

    if (movimentacoesResponse.error) {
      console.error(movimentacoesResponse.error)
      alert("Erro ao carregar movimentações.")
      return
    }

    setProdutos(produtosResponse.data ?? [])
    setVariantes(variantesResponse.data ?? [])
    setMovimentacoes(movimentacoesResponse.data ?? [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function abrirNovoProduto() {
    setProdutoEditando(null)

    setFormProduto({
      nome: "",
      descricao: "",
      categoria: "",
      subcategoria: "",
      tecido: "",
      comprimento: "",
      modelagem: "",
      dataEntrada: new Date().toISOString().split("T")[0],
      ativo: true
    })

    setModalProduto(true)
  }

  function abrirEditarProduto(produto: Produto) {
    setProdutoEditando(produto)

    setFormProduto({
      nome: produto.nome ?? "",
      descricao: produto.descricao ?? "",
      categoria: produto.categoria ?? "",
      subcategoria: produto.subcategoria ?? "",
      tecido: produto.tecido ?? "",
      comprimento: produto.comprimento ?? "",
      modelagem: produto.modelagem ?? "",
      dataEntrada: produto.dataEntrada ?? "",
      ativo: produto.ativo
    })

    setModalProduto(true)
  }

  function abrirNovaVariante() {
    if (!produtoSelecionado) {
      alert("Selecione um produto primeiro.")
      return
    }

    const produto = produtos.find(
      p => p.id === produtoSelecionado
    )

    setVarianteEditando(null)

    setFormVariante({
      produtoId: produtoSelecionado,
      cor: "",
      tamanho: "",
      sku: "",
      precoVenda: produto
        ? PRECO_PADRAO[produto.subcategoria ?? ""]?.toString() ?? ""
        : "",
      custoUnitario: "",
      margemAlvo: "",
      estoqueMinimo: "0",
      estoqueMaximo: ""
    })

    setModalVariante(true)
  }

  function abrirEditarVariante(variante: Variante) {
    setVarianteEditando(variante)

    setFormVariante({
      produtoId: variante.produtoId,
      cor: variante.cor ?? "",
      tamanho: variante.tamanho ?? "",
      sku: variante.sku ?? "",
      precoVenda: String(variante.precoVenda ?? ""),
      custoUnitario: String(variante.custoUnitario ?? ""),
      margemAlvo:
        variante.margemAlvo !== null
          ? String(variante.margemAlvo)
          : "",
      estoqueMinimo: String(variante.estoqueMinimo ?? 0),
      estoqueMaximo:
        variante.estoqueMaximo !== null
          ? String(variante.estoqueMaximo)
          : ""
    })

    setModalVariante(true)
  }

  async function salvarProduto() {
    if (!formProduto.nome.trim()) {
      alert("Informe o nome do produto.")
      return
    }

    if (!formProduto.categoria) {
      alert("Selecione uma categoria.")
      return
    }

    setSalvando(true)

    const dados = {
      nome: formProduto.nome.trim(),
      descricao:
        formProduto.descricao.trim() || null,
      categoria: formProduto.categoria || null,
      subcategoria:
        formProduto.subcategoria || null,
      tecido: formProduto.tecido || null,
      comprimento:
        formProduto.comprimento || null,
      modelagem:
        formProduto.modelagem || null,
      dataEntrada:
        formProduto.dataEntrada || null,
      ativo: formProduto.ativo,
      atualizadoem: new Date().toISOString()
    }

    let error

    if (produtoEditando) {
      const response = await supabase
        .from("produtos")
        .update(dados)
        .eq("id", produtoEditando.id)

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
      alert(
        "Erro ao salvar produto: " +
        error.message
      )
      return
    }

    setModalProduto(false)
    await carregarDados()
  }

  async function salvarVariante() {
    if (!formVariante.produtoId) {
      alert("Selecione o produto.")
      return
    }

    if (!formVariante.sku.trim()) {
      alert("Informe o SKU.")
      return
    }

    const preco = Number(
      formVariante.precoVenda.replace(",", ".")
    )

    const custo = Number(
      formVariante.custoUnitario.replace(",", ".")
    )

    const estoqueMinimo = Number(
      formVariante.estoqueMinimo || 0
    )

    const estoqueMaximo =
      formVariante.estoqueMaximo.trim() === ""
        ? null
        : Number(
            formVariante.estoqueMaximo
          )

    if (Number.isNaN(preco) || preco < 0) {
      alert("Informe um preço de venda válido.")
      return
    }

    if (Number.isNaN(custo) || custo < 0) {
      alert("Informe um custo válido.")
      return
    }

    if (estoqueMinimo < 0) {
      alert("Estoque mínimo inválido.")
      return
    }

    if (
      estoqueMaximo !== null &&
      estoqueMaximo < estoqueMinimo
    ) {
      alert(
        "O estoque máximo não pode ser menor que o estoque mínimo."
      )
      return
    }

    setSalvando(true)

    const dados = {
      produtoId: formVariante.produtoId,
      cor: formVariante.cor || null,
      tamanho: formVariante.tamanho || null,
      sku: formVariante.sku.trim(),
      precoVenda: preco,
      custoUnitario: custo,
      margemAlvo:
        formVariante.margemAlvo.trim() === ""
          ? null
          : Number(
              formVariante.margemAlvo.replace(",", ".")
            ),
      estoqueMinimo,
      estoqueMaximo,
      ativo: true,
      atualizadoem: new Date().toISOString()
    }

    let error

    if (varianteEditando) {
      const response = await supabase
        .from("produtoVariantes")
        .update(dados)
        .eq("id", varianteEditando.id)

      error = response.error
    } else {
      const response = await supabase
        .from("produtoVariantes")
        .insert(dados)

      error = response.error
    }

    setSalvando(false)

    if (error) {
      console.error(error)

      if (
        error.message
          .toLowerCase()
          .includes("uqprodutovariantecombinacao")
      ) {
        alert(
          "Já existe uma variante com essa combinação de cor e tamanho para este produto."
        )
      } else if (
        error.message
          .toLowerCase()
          .includes("produtoVariantes_sku_key")
      ) {
        alert("Este SKU já está cadastrado.")
      } else {
        alert(
          "Erro ao salvar variante: " +
          error.message
        )
      }

      return
    }

    setModalVariante(false)
    await carregarDados()
  }

  async function alterarStatusProduto(
    produto: Produto
  ) {
    const novoStatus = !produto.ativo

    const { error } = await supabase
      .from("produtos")
      .update({
        ativo: novoStatus,
        atualizadoem: new Date().toISOString()
      })
      .eq("id", produto.id)

    if (error) {
      console.error(error)
      alert("Erro ao alterar status do produto.")
      return
    }

    await carregarDados()
  }

  async function alterarStatusVariante(
    variante: Variante
  ) {
    const { error } = await supabase
      .from("produtoVariantes")
      .update({
        ativo: !variante.ativo,
        atualizadoem: new Date().toISOString()
      })
      .eq("id", variante.id)

    if (error) {
      console.error(error)
      alert("Erro ao alterar status da variante.")
      return
    }

    await carregarDados()
  }

  function abrirEstoque(variante: Variante) {
    setVarianteEstoque(variante)

    setFormEstoque({
      tipo: "ENTRADA",
      quantidade: "",
      custoUnitario:
        variante.custoUnitario?.toString() ?? "",
      motivo: "",
      observacao: ""
    })

    setModalEstoque(true)
  }

  async function movimentarEstoque() {
    if (!varianteEstoque) {
      return
    }

    const quantidade = Number(
      formEstoque.quantidade
    )

    if (
      Number.isNaN(quantidade) ||
      quantidade <= 0
    ) {
      alert("Informe uma quantidade válida.")
      return
    }

    if (!formEstoque.motivo.trim()) {
      alert("Informe o motivo da movimentação.")
      return
    }

    const custo =
      formEstoque.custoUnitario.trim() === ""
        ? null
        : Number(
            formEstoque.custoUnitario.replace(",", ".")
          )

    if (
      custo !== null &&
      (Number.isNaN(custo) || custo < 0)
    ) {
      alert("Informe um custo válido.")
      return
    }

    setSalvando(true)

    const { error } = await supabase.rpc(
      "movimentarEstoque",
      {
        p_variante_id:
          varianteEstoque.id,
        p_tipo: formEstoque.tipo,
        p_quantidade: quantidade,
        p_motivo:
          formEstoque.motivo.trim(),
        p_custo_unitario: custo,
        p_origem_tipo: null,
        p_origem_id: null,
        p_observacao:
          formEstoque.observacao.trim() ||
          null
      }
    )

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(
        "Erro ao movimentar estoque: " +
        error.message
      )
      return
    }

    setModalEstoque(false)

    await carregarDados()
  }

  function adicionarNovaOpcao() {
    const nome = novaOpcaoNome.trim()

    if (!nome) {
      alert("Informe o nome da opção.")
      return
    }

    if (novaOpcaoTipo === "cor") {
      const existe = cores.some(
        c =>
          c.nome.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert("Essa cor já existe.")
        return
      }

      const novaCor = {
        nome,
        hex: novaOpcaoHex
      }

      const novaLista = [
        ...cores,
        novaCor
      ]

      setCores(novaLista)
      salvarLista(
        "camiduda_cores",
        novaLista
      )

      setFormVariante(prev => ({
        ...prev,
        cor: nome
      }))
    }

    if (novaOpcaoTipo === "tamanho") {
      const existe = tamanhos.some(
        item =>
          item.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert("Esse tamanho já existe.")
        return
      }

      const novaLista = [
        ...tamanhos,
        nome
      ]

      setTamanhos(novaLista)

      salvarLista(
        "camiduda_tamanhos",
        novaLista
      )

      setFormVariante(prev => ({
        ...prev,
        tamanho: nome
      }))
    }

    if (novaOpcaoTipo === "tecido") {
      const existe = tecidos.some(
        item =>
          item.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert("Esse tecido já existe.")
        return
      }

      const novaLista = [
        ...tecidos,
        nome
      ]

      setTecidos(novaLista)

      salvarLista(
        "camiduda_tecidos",
        novaLista
      )

      setFormProduto(prev => ({
        ...prev,
        tecido: nome
      }))
    }

    if (novaOpcaoTipo === "comprimento") {
      const existe = comprimentos.some(
        item =>
          item.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert("Esse comprimento já existe.")
        return
      }

      const novaLista = [
        ...comprimentos,
        nome
      ]

      setComprimentos(novaLista)

      salvarLista(
        "camiduda_comprimentos",
        novaLista
      )

      setFormProduto(prev => ({
        ...prev,
        comprimento: nome
      }))
    }

    if (novaOpcaoTipo === "modelagem") {
      const existe = modelagens.some(
        item =>
          item.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert("Essa modelagem já existe.")
        return
      }

      const novaLista = [
        ...modelagens,
        nome
      ]

      setModelagens(novaLista)

      salvarLista(
        "camiduda_modelagens",
        novaLista
      )

      setFormProduto(prev => ({
        ...prev,
        modelagem: nome
      }))
    }

    setNovaOpcaoTipo(null)
    setNovaOpcaoNome("")
    setNovaOpcaoHex("#000000")
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase()

    if (!termo) {
      return produtos
    }

    return produtos.filter(produto =>
      [
        produto.nome,
        produto.categoria,
        produto.subcategoria,
        produto.tecido
      ]
        .filter(Boolean)
        .some(valor =>
          String(valor)
            .toLowerCase()
            .includes(termo)
        )
    )
  }, [produtos, busca])

  const variantesFiltradas = useMemo(() => {
    if (!produtoSelecionado) {
      return []
    }

    return variantes.filter(
      variante =>
        variante.produtoId ===
        produtoSelecionado
    )
  }, [variantes, produtoSelecionado])

  const totalUnidades = useMemo(
    () =>
      variantes.reduce(
        (total, variante) =>
          total + variante.estoqueAtual,
        0
      ),
    [variantes]
  )

  const valorEstoque = useMemo(
    () =>
      variantes.reduce(
        (total, variante) =>
          total +
          variante.estoqueAtual *
            variante.custoUnitario,
        0
      ),
    [variantes]
  )

  const estoqueBaixo = useMemo(
    () =>
      variantes.filter(
        variante =>
          variante.ativo &&
          variante.estoqueAtual <=
            variante.estoqueMinimo
      ).length,
    [variantes]
  )

  const produtoNome = produtos.find(
    p => p.id === produtoSelecionado
  )?.nome

  function abrirNovaOpcao(
    tipo:
      | "cor"
      | "tamanho"
      | "tecido"
      | "comprimento"
      | "modelagem"
  ) {
    setNovaOpcaoTipo(tipo)
    setNovaOpcaoNome("")
    setNovaOpcaoHex("#000000")
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>
            Produtos e Estoque
          </h1>

          <p style={subtitle}>
            Gerencie produtos, variantes e
            movimentações de estoque.
          </p>
        </div>

        <div style={headerButtons}>
          {aba === "produtos" && (
            <button
              style={primaryButton}
              onClick={abrirNovoProduto}
            >
              + Novo Produto
            </button>
          )}

          {aba === "variantes" && (
            <button
              style={primaryButton}
              onClick={abrirNovaVariante}
            >
              + Nova Variante
            </button>
          )}
        </div>
      </div>

      <div style={cards}>
        <div style={card}>
          <span style={cardLabel}>
            Produtos
          </span>

          <strong style={cardValue}>
            {produtos.length}
          </strong>
        </div>

        <div style={card}>
          <span style={cardLabel}>
            Variantes
          </span>

          <strong style={cardValue}>
            {variantes.length}
          </strong>
        </div>

        <div style={card}>
          <span style={cardLabel}>
            Unidades em estoque
          </span>

          <strong style={cardValue}>
            {totalUnidades}
          </strong>
        </div>

        <div style={card}>
          <span style={cardLabel}>
            Valor em estoque
          </span>

          <strong style={cardValue}>
            {moeda(valorEstoque)}
          </strong>
        </div>

        <div style={card}>
          <span style={cardLabel}>
            Estoque baixo
          </span>

          <strong
            style={{
              ...cardValue,
              color:
                estoqueBaixo > 0
                  ? "#a16b00"
                  : "#5f5a50"
            }}
          >
            {estoqueBaixo}
          </strong>
        </div>
      </div>

      <div style={tabs}>
        <button
          onClick={() => setAba("produtos")}
          style={{
            ...tab,
            ...(aba === "produtos"
              ? activeTab
              : {})
          }}
        >
          Produtos
        </button>

        <button
          onClick={() => setAba("variantes")}
          style={{
            ...tab,
            ...(aba === "variantes"
              ? activeTab
              : {})
          }}
        >
          Variantes e Estoque
        </button>

        <button
          onClick={() =>
            setAba("movimentacoes")
          }
          style={{
            ...tab,
            ...(aba === "movimentacoes"
              ? activeTab
              : {})
          }}
        >
          Movimentações
        </button>
      </div>

      {aba === "produtos" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Produtos cadastrados
              </h2>
            </div>

            <input
              value={busca}
              onChange={e =>
                setBusca(e.target.value)
              }
              placeholder="Buscar produto..."
              style={search}
            />
          </div>

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
                    Subcategoria
                  </th>

                  <th style={th}>
                    Tecido
                  </th>

                  <th style={th}>
                    Data de entrada
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
                {produtosFiltrados.map(
                  produto => (
                    <tr key={produto.id}>
                      <td style={td}>
                        <strong>
                          {produto.nome}
                        </strong>
                      </td>

                      <td style={td}>
                        {produto.categoria ??
                          "-"}
                      </td>

                      <td style={td}>
                        {produto.subcategoria ??
                          "-"}
                      </td>

                      <td style={td}>
                        {produto.tecido ??
                          "-"}
                      </td>

                      <td style={td}>
                        {dataBR(
                          produto.dataEntrada
                        )}
                      </td>

                      <td style={td}>
                        <span
                          style={{
                            ...status,
                            background:
                              produto.ativo
                                ? "#eef7ee"
                                : "#f4f4f4",
                            color:
                              produto.ativo
                                ? "#477047"
                                : "#777"
                          }}
                        >
                          {produto.ativo
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td style={td}>
                        <div
                          style={
                            actionButtons
                          }
                        >
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
                                produto.id
                              )
                              setAba(
                                "variantes"
                              )
                            }}
                          >
                            Variantes
                          </button>

                          <button
                            style={secondaryButton}
                            onClick={() =>
                              alterarStatusProduto(
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
                )}
              </tbody>
            </table>

            {produtosFiltrados.length === 0 && (
              <div style={empty}>
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "variantes" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Variantes e Estoque
              </h2>

              <p style={sectionSubtitle}>
                {produtoNome
                  ? `Produto: ${produtoNome}`
                  : "Selecione um produto para visualizar as variantes."}
              </p>
            </div>

            <select
              value={produtoSelecionado}
              onChange={e =>
                setProdutoSelecionado(
                  e.target.value
                )
              }
              style={input}
            >
              <option value="">
                Selecione o produto
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

          {produtoSelecionado && (
            <div style={tableWrapper}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>
                      Cor
                    </th>

                    <th style={th}>
                      Tamanho
                    </th>

                    <th style={th}>
                      SKU
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
                      Mínimo
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
                  {variantesFiltradas.map(
                    variante => {
                      const cor =
                        cores.find(
                          c =>
                            c.nome ===
                            variante.cor
                        )

                      return (
                        <tr
                          key={variante.id}
                        >
                          <td style={td}>
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 8
                              }}
                            >
                              {cor && (
                                <span
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius:
                                      "50%",
                                    background:
                                      cor.hex,
                                    border:
                                      "1px solid #ddd",
                                    display:
                                      "inline-block"
                                  }}
                                />
                              )}

                              {variante.cor ??
                                "-"}
                            </div>
                          </td>

                          <td style={td}>
                            {variante.tamanho ??
                              "-"}
                          </td>

                          <td style={td}>
                            {variante.sku}
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
                                  variante.estoqueAtual <=
                                  variante.estoqueMinimo
                                    ? "#a16b00"
                                    : "#4f4a42"
                              }}
                            >
                              {
                                variante.estoqueAtual
                              }
                            </strong>
                          </td>

                          <td style={td}>
                            {
                              variante.estoqueMinimo
                            }
                          </td>

                          <td style={td}>
                            <span
                              style={{
                                ...status,
                                background:
                                  variante.ativo
                                    ? "#eef7ee"
                                    : "#f4f4f4",
                                color:
                                  variante.ativo
                                    ? "#477047"
                                    : "#777"
                              }}
                            >
                              {variante.ativo
                                ? "Ativo"
                                : "Inativo"}
                            </span>
                          </td>

                          <td style={td}>
                            <div
                              style={
                                actionButtons
                              }
                            >
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
                                  secondaryButton
                                }
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
                                  alterarStatusVariante(
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

              {variantesFiltradas.length ===
                0 && (
                <div style={empty}>
                  Nenhuma variante cadastrada
                  para este produto.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {aba === "movimentacoes" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Movimentações de estoque
              </h2>

              <p style={sectionSubtitle}>
                Histórico de entradas,
                saídas e ajustes.
              </p>
            </div>
          </div>

          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>
                    Data
                  </th>

                  <th style={th}>
                    Variante
                  </th>

                  <th style={th}>
                    Tipo
                  </th>

                  <th style={th}>
                    Quantidade
                  </th>

                  <th style={th}>
                    Saldo anterior
                  </th>

                  <th style={th}>
                    Saldo posterior
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
                  movimentacao => {
                    const variante =
                      variantes.find(
                        v =>
                          v.id ===
                          movimentacao.varianteId
                      )

                    return (
                      <tr
                        key={
                          movimentacao.id
                        }
                      >
                        <td style={td}>
                          {new Date(
                            movimentacao.criadoem
                          ).toLocaleString(
                            "pt-BR"
                          )}
                        </td>

                        <td style={td}>
                          {variante
                            ? `${variante.cor ?? ""} ${variante.tamanho ?? ""} - ${variante.sku}`
                            : "-"}
                        </td>

                        <td style={td}>
                          {movimentacao.tipo}
                        </td>

                        <td style={td}>
                          {
                            movimentacao.quantidade
                          }
                        </td>

                        <td style={td}>
                          {
                            movimentacao.saldoAnterior
                          }
                        </td>

                        <td style={td}>
                          {
                            movimentacao.saldoPosterior
                          }
                        </td>

                        <td style={td}>
                          {movimentacao.motivo ??
                            "-"}
                        </td>

                        <td style={td}>
                          {movimentacao.observacao ??
                            "-"}
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>

            {movimentacoes.length === 0 && (
              <div style={empty}>
                Nenhuma movimentação registrada.
              </div>
            )}
          </div>
        </section>
      )}

      {modalProduto && (
        <div style={overlayModal}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  {produtoEditando
                    ? "Editar Produto"
                    : "Novo Produto"}
                </h2>

                <p style={modalSubtitle}>
                  Cadastre as informações gerais
                  do produto.
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
              <div
                style={{
                  ...field,
                  gridColumn: "1 / -1"
                }}
              >
                <label style={label}>
                  Nome do produto
                </label>

                <input
                  value={formProduto.nome}
                  onChange={e =>
                    setFormProduto(prev => ({
                      ...prev,
                      nome: e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Ex.: Camiseta Cami&Duda"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Categoria
                </label>

                <select
                  value={
                    formProduto.categoria
                  }
                  onChange={e =>
                    setFormProduto(prev => ({
                      ...prev,
                      categoria:
                        e.target.value,
                      subcategoria: ""
                    }))
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {CATEGORIAS.map(
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
              </div>

              <div style={field}>
                <label style={label}>
                  Subcategoria
                </label>

                <select
                  value={
                    formProduto.subcategoria
                  }
                  onChange={e =>
                    setFormProduto(prev => ({
                      ...prev,
                      subcategoria:
                        e.target.value
                    }))
                  }
                  style={input}
                  disabled={
                    !formProduto.categoria
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {(
                    SUBCATEGORIAS[
                      formProduto.categoria
                    ] ?? []
                  ).map(subcategoria => (
                    <option
                      key={subcategoria}
                      value={subcategoria}
                    >
                      {subcategoria}
                    </option>
                  ))}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Tecido
                </label>

                <select
                  value={
                    formProduto.tecido
                  }
                  onChange={e => {
                    if (
                      e.target.value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "tecido"
                      )
                      return
                    }

                    setFormProduto(prev => ({
                      ...prev,
                      tecido:
                        e.target.value
                    }))
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {tecidos.map(tecido => (
                    <option
                      key={tecido}
                      value={tecido}
                    >
                      {tecido}
                    </option>
                  ))}

                  <option value="__novo__">
                    + Adicionar novo tecido
                  </option>
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Comprimento
                </label>

                <select
                  value={
                    formProduto.comprimento
                  }
                  onChange={e => {
                    if (
                      e.target.value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "comprimento"
                      )
                      return
                    }

                    setFormProduto(prev => ({
                      ...prev,
                      comprimento:
                        e.target.value
                    }))
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {comprimentos.map(
                    comprimento => (
                      <option
                        key={comprimento}
                        value={comprimento}
                      >
                        {comprimento}
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo comprimento
                  </option>
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Modelagem
                </label>

                <select
                  value={
                    formProduto.modelagem
                  }
                  onChange={e => {
                    if (
                      e.target.value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "modelagem"
                      )
                      return
                    }

                    setFormProduto(prev => ({
                      ...prev,
                      modelagem:
                        e.target.value
                    }))
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {modelagens.map(
                    modelagem => (
                      <option
                        key={modelagem}
                        value={modelagem}
                      >
                        {modelagem}
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar nova modelagem
                  </option>
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Data de entrada
                </label>

                <input
                  type="date"
                  value={
                    formProduto.dataEntrada
                  }
                  onChange={e =>
                    setFormProduto(prev => ({
                      ...prev,
                      dataEntrada:
                        e.target.value
                    }))
                  }
                  style={input}
                />
              </div>

              <div
                style={{
                  ...field,
                  gridColumn: "1 / -1"
                }}
              >
                <label style={label}>
                  Descrição
                </label>

                <textarea
                  value={
                    formProduto.descricao
                  }
                  onChange={e =>
                    setFormProduto(prev => ({
                      ...prev,
                      descricao:
                        e.target.value
                    }))
                  }
                  style={textarea}
                  rows={4}
                  placeholder="Descrição do produto..."
                />
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
                  : "Salvar Produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVariante && (
        <div style={overlayModal}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  {varianteEditando
                    ? "Editar Variante"
                    : "Nova Variante"}
                </h2>

                <p style={modalSubtitle}>
                  Cadastre uma combinação de
                  cor e tamanho.
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
              <div style={field}>
                <label style={label}>
                  Produto
                </label>

                <select
                  value={
                    formVariante.produtoId
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      produtoId:
                        e.target.value
                    }))
                  }
                  style={input}
                  disabled={
                    !!varianteEditando
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

              <div style={field}>
                <label style={label}>
                  Cor
                </label>

                <select
                  value={
                    formVariante.cor
                  }
                  onChange={e => {
                    if (
                      e.target.value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "cor"
                      )
                      return
                    }

                    setFormVariante(prev => ({
                      ...prev,
                      cor:
                        e.target.value
                    }))
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {cores.map(cor => (
                    <option
                      key={cor.nome}
                      value={cor.nome}
                    >
                      {cor.nome}
                    </option>
                  ))}

                  <option value="__novo__">
                    + Adicionar nova cor
                  </option>
                </select>

                {formVariante.cor && (
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      marginTop: 8,
                      fontSize: 13,
                      color: "#777"
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius:
                          "50%",
                        background:
                          cores.find(
                            c =>
                              c.nome ===
                              formVariante.cor
                          )?.hex ??
                          "#ddd",
                        border:
                          "1px solid #ddd"
                      }}
                    />

                    {
                      cores.find(
                        c =>
                          c.nome ===
                          formVariante.cor
                      )?.hex
                    }
                  </div>
                )}
              </div>

              <div style={field}>
                <label style={label}>
                  Tamanho
                </label>

                <select
                  value={
                    formVariante.tamanho
                  }
                  onChange={e => {
                    if (
                      e.target.value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "tamanho"
                      )
                      return
                    }

                    setFormVariante(prev => ({
                      ...prev,
                      tamanho:
                        e.target.value
                    }))
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {tamanhos.map(
                    tamanho => (
                      <option
                        key={tamanho}
                        value={tamanho}
                      >
                        {tamanho}
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo tamanho
                  </option>
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  SKU
                </label>

                <input
                  value={
                    formVariante.sku
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      sku:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Ex.: CAM-PT-M"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Preço de venda
                </label>

                <input
                  value={
                    formVariante.precoVenda
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      precoVenda:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Custo unitário
                </label>

                <input
                  value={
                    formVariante.custoUnitario
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      custoUnitario:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Margem alvo (%)
                </label>

                <input
                  value={
                    formVariante.margemAlvo
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      margemAlvo:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Ex.: 45"
                  inputMode="decimal"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Estoque mínimo
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    formVariante.estoqueMinimo
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      estoqueMinimo:
                        e.target.value
                    }))
                  }
                  style={input}
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Estoque máximo
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    formVariante.estoqueMaximo
                  }
                  onChange={e =>
                    setFormVariante(prev => ({
                      ...prev,
                      estoqueMaximo:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Opcional"
                />
              </div>
            </div>

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
                  : "Salvar Variante"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEstoque && (
        <div style={overlayModal}>
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  Movimentar Estoque
                </h2>

                <p style={modalSubtitle}>
                  {varianteEstoque?.sku}
                  {" — "}
                  Estoque atual:{" "}
                  {varianteEstoque?.estoqueAtual ??
                    0}
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

            <div style={formGrid}>
              <div style={field}>
                <label style={label}>
                  Tipo
                </label>

                <select
                  value={
                    formEstoque.tipo
                  }
                  onChange={e =>
                    setFormEstoque(prev => ({
                      ...prev,
                      tipo:
                        e.target.value
                    }))
                  }
                  style={input}
                >
                  {TIPOS_MOVIMENTACAO.map(
                    tipo => (
                      <option
                        key={tipo}
                        value={tipo}
                      >
                        {tipo}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div style={field}>
                <label style={label}>
                  Quantidade
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    formEstoque.quantidade
                  }
                  onChange={e =>
                    setFormEstoque(prev => ({
                      ...prev,
                      quantidade:
                        e.target.value
                    }))
                  }
                  style={input}
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Custo unitário
                </label>

                <input
                  value={
                    formEstoque.custoUnitario
                  }
                  onChange={e =>
                    setFormEstoque(prev => ({
                      ...prev,
                      custoUnitario:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Opcional"
                  inputMode="decimal"
                />
              </div>

              <div style={field}>
                <label style={label}>
                  Motivo
                </label>

                <input
                  value={
                    formEstoque.motivo
                  }
                  onChange={e =>
                    setFormEstoque(prev => ({
                      ...prev,
                      motivo:
                        e.target.value
                    }))
                  }
                  style={input}
                  placeholder="Ex.: Compra de fornecedor"
                />
              </div>

              <div
                style={{
                  ...field,
                  gridColumn: "1 / -1"
                }}
              >
                <label style={label}>
                  Observação
                </label>

                <textarea
                  value={
                    formEstoque.observacao
                  }
                  onChange={e =>
                    setFormEstoque(prev => ({
                      ...prev,
                      observacao:
                        e.target.value
                    }))
                  }
                  style={textarea}
                  rows={4}
                  placeholder="Observação opcional..."
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
                onClick={
                  movimentarEstoque
                }
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Registrar movimentação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {novaOpcaoTipo && (
        <div style={overlayModal}>
          <div
            style={{
              ...modal,
              maxWidth: 460
            }}
          >
            <div style={modalHeader}>
              <div>
                <h2 style={modalTitle}>
                  Adicionar{" "}
                  {novaOpcaoTipo === "cor"
                    ? "cor"
                    : novaOpcaoTipo ===
                        "tamanho"
                      ? "tamanho"
                      : novaOpcaoTipo ===
                          "tecido"
                        ? "tecido"
                        : novaOpcaoTipo ===
                            "comprimento"
                          ? "comprimento"
                          : "modelagem"}
                </h2>

                <p style={modalSubtitle}>
                  A nova opção será salva
                  neste navegador.
                </p>
              </div>

              <button
                style={closeButton}
                onClick={() =>
                  setNovaOpcaoTipo(null)
                }
              >
                ×
              </button>
            </div>

            <div style={field}>
              <label style={label}>
                Nome
              </label>

              <input
                value={novaOpcaoNome}
                onChange={e =>
                  setNovaOpcaoNome(
                    e.target.value
                  )
                }
                style={input}
                placeholder={
                  novaOpcaoTipo === "cor"
                    ? "Ex.: Dourado"
                    : "Digite o nome"
                }
                autoFocus
              />
            </div>

            {novaOpcaoTipo === "cor" && (
              <div
                style={{
                  ...field,
                  marginTop: 16
                }}
              >
                <label style={label}>
                  Cor / HEX
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center"
                  }}
                >
                  <input
                    type="color"
                    value={
                      novaOpcaoHex
                    }
                    onChange={e =>
                      setNovaOpcaoHex(
                        e.target.value
                      )
                    }
                    style={{
                      width: 50,
                      height: 42,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 2,
                      background:
                        "#fff"
                    }}
                  />

                  <input
                    value={
                      novaOpcaoHex
                    }
                    onChange={e =>
                      setNovaOpcaoHex(
                        e.target.value
                      )
                    }
                    style={{
                      ...input,
                      flex: 1
                    }}
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}

            <div style={modalFooter}>
              <button
                style={cancelButton}
                onClick={() =>
                  setNovaOpcaoTipo(null)
                }
              >
                Cancelar
              </button>

              <button
                style={primaryButton}
                onClick={
                  adicionarNovaOpcao
                }
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  marginBottom: 30
}

const title = {
  margin: 0,
  fontFamily: "Playfair Display, serif",
  fontSize: 34,
  color: "#3f3b34"
}

const subtitle = {
  margin: "8px 0 0",
  color: "#77736b",
  fontSize: 14
}

const headerButtons = {
  display: "flex",
  gap: 10
}

const primaryButton = {
  border: "none",
  borderRadius: 10,
  padding: "12px 20px",
  background: "#b9974f",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14
}

const secondaryButton = {
  border: "1px solid #e2d5b5",
  borderRadius: 8,
  padding: "7px 10px",
  background: "#fffdfa",
  color: "#665a45",
  cursor: "pointer",
  fontSize: 12
}

const cancelButton = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "12px 20px",
  background: "#fff",
  color: "#666",
  fontWeight: 500,
  cursor: "pointer"
}

const cards = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
  marginBottom: 28
}

const card = {
  background: "#fff",
  border: "1px solid #eee7d7",
  borderRadius: 14,
  padding: 20,
  boxShadow:
    "0 4px 14px rgba(216,191,122,0.08)"
}

const cardLabel = {
  display: "block",
  color: "#888176",
  fontSize: 13,
  marginBottom: 8
}

const cardValue = {
  fontSize: 24,
  color: "#4d473d"
}

const tabs = {
  display: "flex",
  gap: 4,
  borderBottom: "1px solid #e7dfcc",
  marginBottom: 24,
  overflowX: "auto" as const
}

const tab = {
  border: "none",
  background: "transparent",
  padding: "13px 18px",
  color: "#777",
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap" as const
}

const activeTab = {
  color: "#8b6f3d",
  borderBottom:
    "3px solid #d8bf7a",
  fontWeight: 600
}

const section = {
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #eee7d7",
  padding: 24,
  boxShadow:
    "0 4px 16px rgba(0,0,0,0.03)"
}

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 22,
  flexWrap: "wrap" as const
}

const sectionTitle = {
  margin: 0,
  fontSize: 20,
  color: "#4b463e"
}

const sectionSubtitle = {
  margin: "6px 0 0",
  color: "#888176",
  fontSize: 13
}

const search = {
  width: 240,
  maxWidth: "100%",
  border: "1px solid #ddd5c3",
  borderRadius: 9,
  padding: "10px 12px",
  outline: "none",
  background: "#fff"
}

const tableWrapper = {
  width: "100%",
  overflowX: "auto" as const
}

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 900
}

const th = {
  textAlign: "left" as const,
  padding: "13px 12px",
  background: "#faf8f2",
  color: "#766f63",
  fontSize: 12,
  fontWeight: 600,
  borderBottom: "1px solid #e8e0d0"
}

const td = {
  padding: "14px 12px",
  borderBottom: "1px solid #eee",
  color: "#555047",
  fontSize: 13
}

const status = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600
}

const actionButtons = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const
}

const empty = {
  textAlign: "center" as const,
  padding: 40,
  color: "#999"
}

const overlayModal = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.38)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  zIndex: 2000,
  overflowY: "auto" as const
}

const modal = {
  width: "100%",
  maxWidth: 760,
  maxHeight: "90vh",
  overflowY: "auto" as const,
  background: "#fffdfa",
  borderRadius: 16,
  padding: 26,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.18)"
}

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 24
}

const modalTitle = {
  margin: 0,
  color: "#403b33",
  fontFamily:
    "Playfair Display, serif",
  fontSize: 25
}

const modalSubtitle = {
  margin: "6px 0 0",
  color: "#888176",
  fontSize: 13
}

const closeButton = {
  width: 34,
  height: 34,
  border: "none",
  borderRadius: 8,
  background: "#f5f1e7",
  color: "#76684e",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1
}

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 18
}

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 7
}

const label = {
  fontSize: 13,
  fontWeight: 600,
  color: "#625c52"
}

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #ddd5c3",
  borderRadius: 9,
  padding: "11px 12px",
  background: "#fff",
  color: "#4e4941",
  fontSize: 14,
  outline: "none"
}

const textarea = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #ddd5c3",
  borderRadius: 9,
  padding: "11px 12px",
  background: "#fff",
  color: "#4e4941",
  fontSize: 14,
  outline: "none",
  resize: "vertical" as const
}

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 26,
  paddingTop: 18,
  borderTop: "1px solid #eee6d6"
}