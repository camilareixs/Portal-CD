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

type TipoOpcao =
  | "cor"
  | "tamanho"
  | "tecido"
  | "comprimento"
  | "modelagem"
  | null

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
  Moletom: 165
}

const PRECO_PADRAO_ACESSORIOS: Record<string, number> = {
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

function carregarLista<T>(
  chave: string,
  padrao: T[]
): T[] {
  try {
    const salvo = localStorage.getItem(chave)

    if (!salvo) return padrao

    const parsed = JSON.parse(salvo)

    return Array.isArray(parsed)
      ? parsed
      : padrao
  } catch {
    return padrao
  }
}

function salvarLista<T>(
  chave: string,
  lista: T[]
) {
  localStorage.setItem(
    chave,
    JSON.stringify(lista)
  )
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function percentualSobreCusto(
  preco: number,
  custo: number
) {
  if (!custo || custo <= 0) return null

  return ((preco - custo) / custo) * 100
}

function lucroUnitario(
  preco: number,
  custo: number
) {
  return preco - custo
}

function dataBR(data: string | null) {
  if (!data) return "-"

  const [ano, mes, dia] = data.split("-")

  if (!ano || !mes || !dia) {
    return data
  }

  return `${dia}/${mes}/${ano}`
}

function valorNumerico(valor: string) {
  return Number(
    valor.replace(/\./g, "").replace(",", ".")
  )
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [movimentacoes, setMovimentacoes] =
    useState<Movimentacao[]>([])

  const [aba, setAba] = useState<
    "produtos" | "variantes" | "movimentacoes"
  >("produtos")

  const [produtoSelecionado, setProdutoSelecionado] =
    useState("")

  const [busca, setBusca] = useState("")

  const [modalProduto, setModalProduto] =
    useState(false)

  const [modalVariante, setModalVariante] =
    useState(false)

  const [modalEstoque, setModalEstoque] =
    useState(false)

  const [produtoEditando, setProdutoEditando] =
    useState<Produto | null>(null)

  const [varianteEditando, setVarianteEditando] =
    useState<Variante | null>(null)

  const [varianteEstoque, setVarianteEstoque] =
    useState<Variante | null>(null)

  const [salvando, setSalvando] = useState(false)

  const [novaOpcaoTipo, setNovaOpcaoTipo] =
    useState<TipoOpcao>(null)

  const [novaOpcaoNome, setNovaOpcaoNome] =
    useState("")

  const [novaOpcaoHex, setNovaOpcaoHex] =
    useState("#000000")

  const [isMobile, setIsMobile] =
    useState(false)

  const [cores, setCores] = useState<Cor[]>(() =>
    carregarLista(
      "camiduda_cores",
      CORES_PADRAO
    )
  )

  const [tamanhos, setTamanhos] = useState<string[]>(
    () =>
      carregarLista(
        "camiduda_tamanhos",
        TAMANHOS_PADRAO
      )
  )

  const [tecidos, setTecidos] = useState<string[]>(
    () =>
      carregarLista(
        "camiduda_tecidos",
        TECIDOS_PADRAO
      )
  )

  const [comprimentos, setComprimentos] =
    useState<string[]>(() =>
      carregarLista(
        "camiduda_comprimentos",
        COMPRIMENTOS_PADRAO
      )
    )

  const [modelagens, setModelagens] =
    useState<string[]>(() =>
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

  const [formVariante, setFormVariante] =
    useState({
      produtoId: "",
      cor: "",
      tamanho: "",
      sku: "",
      precoVenda: "",
      custoUnitario: "",
      estoqueMinimo: "0",
      estoqueMaximo: ""
    })

  const [formEstoque, setFormEstoque] =
    useState({
      tipo: "ENTRADA",
      quantidade: "",
      custoUnitario: "",
      motivo: "",
      observacao: ""
    })

  useEffect(() => {
    function verificarMobile() {
      setIsMobile(window.innerWidth <= 768)
    }

    verificarMobile()

    window.addEventListener(
      "resize",
      verificarMobile
    )

    return () =>
      window.removeEventListener(
        "resize",
        verificarMobile
      )
  }, [])

  async function carregarDados() {
    const [
      produtosResponse,
      variantesResponse,
      movimentacoesResponse
    ] = await Promise.all([
      supabase
        .from("produtos")
        .select("*")
        .order("nome", {
          ascending: true
        }),

      supabase
        .from("produtoVariantes")
        .select("*")
        .order("criadoem", {
          ascending: false
        }),

      supabase
        .from("estoqueMovimentacoes")
        .select("*")
        .order("criadoem", {
          ascending: false
        })
    ])

    if (produtosResponse.error) {
      console.error(
        produtosResponse.error
      )
      alert("Erro ao carregar produtos.")
      return
    }

    if (variantesResponse.error) {
      console.error(
        variantesResponse.error
      )
      alert("Erro ao carregar variantes.")
      return
    }

    if (movimentacoesResponse.error) {
      console.error(
        movimentacoesResponse.error
      )
      alert(
        "Erro ao carregar movimentações."
      )
      return
    }

    setProdutos(
      produtosResponse.data ?? []
    )

    setVariantes(
      variantesResponse.data ?? []
    )

    setMovimentacoes(
      movimentacoesResponse.data ?? []
    )
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
      dataEntrada:
        new Date()
          .toISOString()
          .split("T")[0],
      ativo: true
    })

    setModalProduto(true)
  }

  function abrirEditarProduto(
    produto: Produto
  ) {
    setProdutoEditando(produto)

    setFormProduto({
      nome: produto.nome ?? "",
      descricao: produto.descricao ?? "",
      categoria: produto.categoria ?? "",
      subcategoria:
        produto.subcategoria ?? "",
      tecido: produto.tecido ?? "",
      comprimento:
        produto.comprimento ?? "",
      modelagem:
        produto.modelagem ?? "",
      dataEntrada:
        produto.dataEntrada ?? "",
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

    let precoInicial = ""

    if (produto) {
      precoInicial =
        PRECO_PADRAO[
          produto.subcategoria ?? ""
        ]?.toString() ?? ""

      if (!precoInicial) {
        precoInicial =
          PRECO_PADRAO_ACESSORIOS[
            produto.subcategoria ?? ""
          ]?.toString() ?? ""
      }
    }

    setVarianteEditando(null)

    setFormVariante({
      produtoId: produtoSelecionado,
      cor: "",
      tamanho: "",
      sku: "",
      precoVenda: precoInicial,
      custoUnitario: "",
      estoqueMinimo: "0",
      estoqueMaximo: ""
    })

    setModalVariante(true)
  }

  function abrirEditarVariante(
    variante: Variante
  ) {
    setVarianteEditando(variante)

    setFormVariante({
      produtoId: variante.produtoId,
      cor: variante.cor ?? "",
      tamanho: variante.tamanho ?? "",
      sku: variante.sku ?? "",
      precoVenda:
        variante.precoVenda.toString(),
      custoUnitario:
        variante.custoUnitario.toString(),
      estoqueMinimo:
        variante.estoqueMinimo.toString(),
      estoqueMaximo:
        variante.estoqueMaximo !== null
          ? variante.estoqueMaximo.toString()
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
        formProduto.descricao.trim() ||
        null,
      categoria:
        formProduto.categoria || null,
      subcategoria:
        formProduto.subcategoria || null,
      tecido:
        formProduto.tecido || null,
      comprimento:
        formProduto.comprimento || null,
      modelagem:
        formProduto.modelagem || null,
      dataEntrada:
        formProduto.dataEntrada || null,
      ativo: formProduto.ativo,
      atualizadoem:
        new Date().toISOString()
    }

    let error

    if (produtoEditando) {
      const response = await supabase
        .from("produtos")
        .update(dados)
        .eq(
          "id",
          produtoEditando.id
        )

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

    const preco = valorNumerico(
      formVariante.precoVenda
    )

    const custo = valorNumerico(
      formVariante.custoUnitario
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

    if (
      Number.isNaN(preco) ||
      preco < 0
    ) {
      alert(
        "Informe um preço de venda válido."
      )
      return
    }

    if (
      Number.isNaN(custo) ||
      custo < 0
    ) {
      alert(
        "Informe um custo válido."
      )
      return
    }

    if (estoqueMinimo < 0) {
      alert(
        "Informe um estoque mínimo válido."
      )
      return
    }

    if (
      estoqueMaximo !== null &&
      estoqueMaximo < estoqueMinimo
    ) {
      alert(
        "O estoque máximo não pode ser menor que o mínimo."
      )
      return
    }

    setSalvando(true)

    const dados = {
      produtoId:
        formVariante.produtoId,

      cor:
        formVariante.cor || null,

      tamanho:
        formVariante.tamanho || null,

      sku:
        formVariante.sku.trim(),

      precoVenda: preco,

      custoUnitario: custo,

      estoqueMinimo,

      estoqueMaximo,

      ativo: varianteEditando
        ? varianteEditando.ativo
        : true,

      atualizadoem:
        new Date().toISOString()
    }

    let error

    if (varianteEditando) {
      const response = await supabase
        .from("produtoVariantes")
        .update(dados)
        .eq(
          "id",
          varianteEditando.id
        )

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

      const mensagem =
        error.message.toLowerCase()

      if (
        mensagem.includes(
          "uqprodutovariantecombinacao"
        )
      ) {
        alert(
          "Já existe uma variante com essa combinação de cor e tamanho."
        )
      } else if (
        mensagem.includes(
          "produtovariantes_sku_key"
        )
      ) {
        alert(
          "Este SKU já está cadastrado."
        )
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
    const { error } = await supabase
      .from("produtos")
      .update({
        ativo: !produto.ativo,
        atualizadoem:
          new Date().toISOString()
      })
      .eq("id", produto.id)

    if (error) {
      console.error(error)
      alert(
        "Erro ao alterar status."
      )
      return
    }

    await carregarDados()
  }

  function abrirEstoque(
    variante: Variante
  ) {
    setVarianteEstoque(variante)

    setFormEstoque({
      tipo: "ENTRADA",
      quantidade: "",
      custoUnitario:
        variante.custoUnitario.toString(),
      motivo: "",
      observacao: ""
    })

    setModalEstoque(true)
  }

  async function movimentarEstoque() {
    if (!varianteEstoque) return

    const quantidade = Number(
      formEstoque.quantidade
    )

    if (
      Number.isNaN(quantidade) ||
      quantidade <= 0
    ) {
      alert(
        "Informe uma quantidade válida."
      )
      return
    }

    if (!formEstoque.motivo.trim()) {
      alert(
        "Informe o motivo da movimentação."
      )
      return
    }

    const custo =
      formEstoque.custoUnitario.trim() === ""
        ? null
        : valorNumerico(
            formEstoque.custoUnitario
          )

    if (
      custo !== null &&
      (Number.isNaN(custo) || custo < 0)
    ) {
      alert(
        "Informe um custo válido."
      )
      return
    }

    setSalvando(true)

    const { error } =
      await supabase.rpc(
        "movimentarEstoque",
        {
          p_variante_id:
            varianteEstoque.id,

          p_tipo:
            formEstoque.tipo,

          p_quantidade:
            quantidade,

          p_motivo:
            formEstoque.motivo.trim(),

          p_custo_unitario:
            custo,

          p_origem_tipo:
            null,

          p_origem_id:
            null,

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

  function adicionarNovaOpcao() {
    const nome =
      novaOpcaoNome.trim()

    if (!nome) {
      alert(
        "Informe o nome da opção."
      )
      return
    }

    if (novaOpcaoTipo === "cor") {
      const existe = cores.some(
        cor =>
          cor.nome.toLowerCase() ===
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
        tamanho =>
          tamanho.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert(
          "Esse tamanho já existe."
        )
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
        tecido =>
          tecido.toLowerCase() ===
          nome.toLowerCase()
      )

      if (existe) {
        alert(
          "Esse tecido já existe."
        )
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

    if (
      novaOpcaoTipo ===
      "comprimento"
    ) {
      const existe =
        comprimentos.some(
          comprimento =>
            comprimento.toLowerCase() ===
            nome.toLowerCase()
        )

      if (existe) {
        alert(
          "Esse comprimento já existe."
        )
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

    if (
      novaOpcaoTipo ===
      "modelagem"
    ) {
      const existe =
        modelagens.some(
          modelagem =>
            modelagem.toLowerCase() ===
            nome.toLowerCase()
        )

      if (existe) {
        alert(
          "Essa modelagem já existe."
        )
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

  const produtosFiltrados =
    useMemo(() => {
      const termo =
        busca.trim().toLowerCase()

      if (!termo) {
        return produtos
      }

      return produtos.filter(
        produto =>
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

  const variantesFiltradas =
    useMemo(() => {
      if (!produtoSelecionado) {
        return []
      }

      return variantes.filter(
        variante =>
          variante.produtoId ===
          produtoSelecionado
      )
    }, [
      variantes,
      produtoSelecionado
    ])

  const totalUnidades =
    useMemo(
      () =>
        variantes.reduce(
          (total, variante) =>
            total +
            variante.estoqueAtual,
          0
        ),
      [variantes]
    )

  const valorEstoque =
    useMemo(
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

  const estoqueBaixo =
    useMemo(
      () =>
        variantes.filter(
          variante =>
            variante.ativo &&
            variante.estoqueAtual <=
              variante.estoqueMinimo
        ).length,
      [variantes]
    )

  const produtoAtual =
    produtos.find(
      produto =>
        produto.id ===
        produtoSelecionado
    )

  const tituloNovaOpcao =
    novaOpcaoTipo === "cor"
      ? "nova cor"
      : novaOpcaoTipo === "tamanho"
        ? "novo tamanho"
        : novaOpcaoTipo === "tecido"
          ? "novo tecido"
          : novaOpcaoTipo ===
              "comprimento"
            ? "novo comprimento"
            : "nova modelagem"

  return (
    <div
      style={{
        ...page,
        padding:
          isMobile
            ? "0 0 30px"
            : "0"
      }}
    >
      {/* CABEÇALHO COMPACTO */}

      <div
        style={{
          ...header,
          flexDirection:
            isMobile
              ? "column"
              : "row",
          alignItems:
            isMobile
              ? "stretch"
              : "center",
          marginBottom:
            isMobile ? 18 : 24
        }}
      >
        <div>
          <h1
            style={{
              ...title,
              fontSize:
                isMobile
                  ? 27
                  : 32
            }}
          >
            Produtos e Estoque
          </h1>

          {!isMobile && (
            <p style={subtitle}>
              Produtos, variantes e
              controle de estoque.
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            width:
              isMobile
                ? "100%"
                : "auto"
          }}
        >
          {aba === "produtos" && (
            <button
              style={{
                ...primaryButton,
                flex: isMobile
                  ? 1
                  : undefined
              }}
              onClick={
                abrirNovoProduto
              }
            >
              + Novo Produto
            </button>
          )}

          {aba === "variantes" && (
            <button
              style={{
                ...primaryButton,
                flex: isMobile
                  ? 1
                  : undefined
              }}
              onClick={
                abrirNovaVariante
              }
            >
              + Nova Variante
            </button>
          )}
        </div>
      </div>

      {/* RESUMO COMPACTO */}

      <div
        style={{
          ...summary,
          gridTemplateColumns:
            isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))"
        }}
      >
        <div style={summaryItem}>
          <span>
            Produtos
          </span>
          <strong>
            {produtos.length}
          </strong>
        </div>

        <div style={summaryItem}>
          <span>
            Variantes
          </span>
          <strong>
            {variantes.length}
          </strong>
        </div>

        <div style={summaryItem}>
          <span>
            Unidades
          </span>
          <strong>
            {totalUnidades}
          </strong>
        </div>

        <div style={summaryItem}>
          <span>
            Valor em estoque
          </span>
          <strong>
            {moeda(valorEstoque)}
          </strong>
        </div>
      </div>

      {/* ABAS */}

      <div style={tabs}>
        <button
          onClick={() =>
            setAba("produtos")
          }
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
          onClick={() =>
            setAba("variantes")
          }
          style={{
            ...tab,
            ...(aba === "variantes"
              ? activeTab
              : {})
          }}
        >
          Variantes
        </button>

        <button
          onClick={() =>
            setAba("movimentacoes")
          }
          style={{
            ...tab,
            ...(aba ===
            "movimentacoes"
              ? activeTab
              : {})
          }}
        >
          Estoque
        </button>
      </div>

      {/* PRODUTOS */}

      {aba === "produtos" && (
        <section style={section}>
          <div
            style={{
              ...sectionHeader,
              flexDirection:
                isMobile
                  ? "column"
                  : "row",
              alignItems:
                isMobile
                  ? "stretch"
                  : "center"
            }}
          >
            <div>
              <h2
                style={sectionTitle}
              >
                Produtos
              </h2>

              {!isMobile && (
                <p
                  style={
                    sectionSubtitle
                  }
                >
                  Clique em um produto
                  para administrar suas
                  variantes.
                </p>
              )}
            </div>

            <input
              value={busca}
              onChange={e =>
                setBusca(
                  e.target.value
                )
              }
              placeholder="Buscar produto..."
              style={{
                ...search,
                width:
                  isMobile
                    ? "100%"
                    : 260
              }}
            />
          </div>

          {!isMobile ? (
            <div
              style={tableWrapper}
            >
              <table
                style={table}
              >
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
                      Entrada
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
                  {produtosFiltrados.map(
                    produto => {
                      const qtdVariantes =
                        variantes.filter(
                          v =>
                            v.produtoId ===
                            produto.id
                        ).length

                      return (
                        <tr
                          key={
                            produto.id
                          }
                        >
                          <td style={td}>
                            <strong>
                              {
                                produto.nome
                              }
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
                            {dataBR(
                              produto.dataEntrada
                            )}
                          </td>

                          <td style={td}>
                            {
                              qtdVariantes
                            }
                          </td>

                          <td style={td}>
                            <Status
                              ativo={
                                produto.ativo
                              }
                            />
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
                                onClick={() => {
                                  setProdutoSelecionado(
                                    produto.id
                                  )
                                  setAba(
                                    "variantes"
                                  )
                                }}
                              >
                                Abrir
                              </button>

                              <button
                                style={
                                  secondaryButton
                                }
                                onClick={() =>
                                  abrirEditarProduto(
                                    produto
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={mobileList}>
              {produtosFiltrados.map(
                produto => {
                  const variantesProduto =
                    variantes.filter(
                      v =>
                        v.produtoId ===
                        produto.id
                    )

                  const unidades =
                    variantesProduto.reduce(
                      (
                        total,
                        variante
                      ) =>
                        total +
                        variante.estoqueAtual,
                      0
                    )

                  const valor =
                    variantesProduto.reduce(
                      (
                        total,
                        variante
                      ) =>
                        total +
                        variante.estoqueAtual *
                          variante.custoUnitario,
                      0
                    )

                  return (
                    <div
                      key={
                        produto.id
                      }
                      style={
                        mobileProductCard
                      }
                    >
                      <div
                        style={
                          mobileCardTop
                        }
                      >
                        <div>
                          <h3
                            style={
                              mobileProductName
                            }
                          >
                            {
                              produto.nome
                            }
                          </h3>

                          <span
                            style={
                              mobileProductCategory
                            }
                          >
                            {
                              produto.categoria
                            }

                            {produto.subcategoria
                              ? ` • ${produto.subcategoria}`
                              : ""}
                          </span>
                        </div>

                        <Status
                          ativo={
                            produto.ativo
                          }
                        />
                      </div>

                      <div
                        style={
                          mobileProductInfo
                        }
                      >
                        <div>
                          <span>
                            Entrada
                          </span>
                          <strong>
                            {dataBR(
                              produto.dataEntrada
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Variantes
                          </span>
                          <strong>
                            {
                              variantesProduto.length
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Unidades
                          </span>
                          <strong>
                            {
                              unidades
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Estoque
                          </span>
                          <strong>
                            {moeda(
                              valor
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={
                          mobileActions
                        }
                      >
                        <button
                          style={
                            primarySmall
                          }
                          onClick={() => {
                            setProdutoSelecionado(
                              produto.id
                            )
                            setAba(
                              "variantes"
                            )
                          }}
                        >
                          Ver produto
                        </button>

                        <button
                          style={
                            secondarySmall
                          }
                          onClick={() =>
                            abrirEditarProduto(
                              produto
                            )
                          }
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  )
                }
              )}

              {produtosFiltrados.length ===
                0 && (
                <div
                  style={empty}
                >
                  Nenhum produto
                  encontrado.
                </div>
              )}
            </div>
          )}

          {!isMobile &&
            produtosFiltrados.length ===
              0 && (
              <div
                style={empty}
              >
                Nenhum produto
                encontrado.
              </div>
            )}
        </section>
      )}

      {/* VARIANTES */}

      {aba === "variantes" && (
        <section style={section}>
          <div
            style={{
              ...sectionHeader,
              flexDirection:
                isMobile
                  ? "column"
                  : "row",
              alignItems:
                isMobile
                  ? "stretch"
                  : "center"
            }}
          >
            <div>
              <button
                style={backButton}
                onClick={() =>
                  setAba(
                    "produtos"
                  )
                }
              >
                ← Produtos
              </button>

              <h2
                style={{
                  ...sectionTitle,
                  marginTop: 10
                }}
              >
                {produtoAtual
                  ?.nome ??
                  "Variantes"}
              </h2>

              {produtoAtual && (
                <p
                  style={
                    sectionSubtitle
                  }
                >
                  {produtoAtual.categoria}
                  {produtoAtual.subcategoria
                    ? ` • ${produtoAtual.subcategoria}`
                    : ""}
                </p>
              )}
            </div>

            <select
              value={
                produtoSelecionado
              }
              onChange={e =>
                setProdutoSelecionado(
                  e.target.value
                )
              }
              style={{
                ...input,
                width:
                  isMobile
                    ? "100%"
                    : 280
              }}
            >
              <option value="">
                Selecione o produto
              </option>

              {produtos.map(
                produto => (
                  <option
                    key={
                      produto.id
                    }
                    value={
                      produto.id
                    }
                  >
                    {produto.nome}
                  </option>
                )
              )}
            </select>
          </div>

          {produtoSelecionado && (
            <>
              {!isMobile ? (
                <div
                  style={
                    tableWrapper
                  }
                >
                  <table
                    style={
                      table
                    }
                  >
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
                          Sobre custo
                        </th>

                        <th style={th}>
                          Estoque
                        </th>

                        <th style={th}>
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {variantesFiltradas.map(
                        variante => (
                          <tr
                            key={
                              variante.id
                            }
                          >
                            <td style={td}>
                              <CorLabel
                                nome={
                                  variante.cor
                                }
                                cores={
                                  cores
                                }
                              />
                            </td>

                            <td style={td}>
                              {
                                variante.tamanho
                              }
                            </td>

                            <td style={td}>
                              {
                                variante.sku
                              }
                            </td>

                            <td style={td}>
                              <strong>
                                {moeda(
                                  variante.precoVenda
                                )}
                              </strong>
                            </td>

                            <td style={td}>
                              {moeda(
                                variante.custoUnitario
                              )}
                            </td>

                            <td style={td}>
                              <LucroInfo
                                variante={
                                  variante
                                }
                              />
                            </td>

                            <td style={td}>
                              <EstoqueBadge
                                variante={
                                  variante
                                }
                              />
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
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={
                    mobileList
                  }
                >
                  {variantesFiltradas.map(
                    variante => (
                      <div
                        key={
                          variante.id
                        }
                        style={
                          mobileVariantCard
                        }
                      >
                        <div
                          style={
                            mobileCardTop
                          }
                        >
                          <div>
                            <div
                              style={
                                mobileVariantTitle
                              }
                            >
                              <CorLabel
                                nome={
                                  variante.cor
                                }
                                cores={
                                  cores
                                }
                              />

                              <span>
                                /
                              </span>

                              <strong>
                                {
                                  variante.tamanho
                                }
                              </strong>
                            </div>

                            <span
                              style={
                                sku
                              }
                            >
                              SKU:{" "}
                              {
                                variante.sku
                              }
                            </span>
                          </div>

                          <EstoqueBadge
                            variante={
                              variante
                            }
                          />
                        </div>

                        <div
                          style={
                            mobilePriceGrid
                          }
                        >
                          <div>
                            <span>
                              Venda
                            </span>
                            <strong>
                              {moeda(
                                variante.precoVenda
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Custo
                            </span>
                            <strong>
                              {moeda(
                                variante.custoUnitario
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Lucro
                            </span>
                            <strong>
                              {moeda(
                                lucroUnitario(
                                  variante.precoVenda,
                                  variante.custoUnitario
                                )
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Sobre custo
                            </span>
                            <strong
                              style={{
                                color:
                                  "#6d825f"
                              }}
                            >
                              {(() => {
                                const percentual =
                                  percentualSobreCusto(
                                    variante.precoVenda,
                                    variante.custoUnitario
                                  )

                                return percentual ===
                                  null
                                  ? "-"
                                  : `+${percentual.toFixed(2)}%`
                              })()}
                            </strong>
                          </div>
                        </div>

                        <div
                          style={
                            mobileActions
                          }
                        >
                          <button
                            style={
                              primarySmall
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
                              secondarySmall
                            }
                            onClick={() =>
                              abrirEditarVariante(
                                variante
                              )
                            }
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {variantesFiltradas.length ===
                    0 && (
                    <div
                      style={
                        empty
                      }
                    >
                      Nenhuma variante
                      cadastrada.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* MOVIMENTAÇÕES */}

      {aba ===
        "movimentacoes" && (
        <section style={section}>
          <div
            style={
              sectionHeader
            }
          >
            <div>
              <h2
                style={
                  sectionTitle
                }
              >
                Movimentações
              </h2>

              <p
                style={
                  sectionSubtitle
                }
              >
                Histórico de entradas,
                saídas e ajustes.
              </p>
            </div>

            {estoqueBaixo > 0 && (
              <div
                style={
                  warning
                }
              >
                {estoqueBaixo}{" "}
                {estoqueBaixo ===
                1
                  ? "variante"
                  : "variantes"}{" "}
                com estoque baixo
              </div>
            )}
          </div>

          {!isMobile ? (
            <div
              style={
                tableWrapper
              }
            >
              <table
                style={
                  table
                }
              >
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
                              ? `${variante.cor ?? ""} ${variante.tamanho ?? ""} • ${variante.sku}`
                              : "-"}
                          </td>

                          <td style={td}>
                            {
                              movimentacao.tipo
                            }
                          </td>

                          <td style={td}>
                            {
                              movimentacao.quantidade
                            }
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
                            {
                              movimentacao.motivo ??
                              "-"
                            }
                          </td>

                          <td style={td}>
                            {
                              movimentacao.observacao ??
                              "-"
                            }
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={
                mobileList
              }
            >
              {movimentacoes.map(
                movimentacao => {
                  const variante =
                    variantes.find(
                      v =>
                        v.id ===
                        movimentacao.varianteId
                    )

                  return (
                    <div
                      key={
                        movimentacao.id
                      }
                      style={
                        mobileMovementCard
                      }
                    >
                      <div
                        style={
                          mobileCardTop
                        }
                      >
                        <div>
                          <strong>
                            {variante
                              ? `${variante.cor ?? ""} ${variante.tamanho ?? ""}`
                              : "-"}
                          </strong>

                          <span
                            style={
                              sku
                            }
                          >
                            {variante?.sku ??
                              ""}
                          </span>
                        </div>

                        <span
                          style={
                            movementType
                          }
                        >
                          {
                            movimentacao.tipo
                          }
                        </span>
                      </div>

                      <div
                        style={
                          movementInfo
                        }
                      >
                        <span>
                          Quantidade
                        </span>

                        <strong>
                          {
                            movimentacao.quantidade
                          }
                        </strong>

                        <span>
                          Saldo
                        </span>

                        <strong>
                          {
                            movimentacao.saldoAnterior
                          }{" "}
                          →
                          {
                            movimentacao.saldoPosterior
                          }
                        </strong>
                      </div>

                      <div
                        style={
                          movementDetails
                        }
                      >
                        <strong>
                          {
                            movimentacao.motivo ??
                            "-"
                          }
                        </strong>

                        <span>
                          {new Date(
                            movimentacao.criadoem
                          ).toLocaleString(
                            "pt-BR"
                          )}
                        </span>

                        {movimentacao.observacao && (
                          <span>
                            {
                              movimentacao.observacao
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>
      )}

      {/* MODAL PRODUTO */}

      {modalProduto && (
        <div
          style={
            overlayModal
          }
        >
          <div
            style={{
              ...modal,
              maxWidth:
                isMobile
                  ? "100%"
                  : 700
            }}
          >
            <ModalHeader
              title={
                produtoEditando
                  ? "Editar produto"
                  : "Novo produto"
              }
              subtitle="Informações gerais da peça."
              fechar={() =>
                setModalProduto(
                  false
                )
              }
            />

            <div
              style={
                isMobile
                  ? mobileForm
                  : formGrid
              }
            >
              <Field
                label="Nome do produto"
                full
              >
                <input
                  value={
                    formProduto.nome
                  }
                  onChange={e =>
                    setFormProduto(
                      prev => ({
                        ...prev,
                        nome:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="Ex.: Camiseta Cami&Duda"
                />
              </Field>

              <Field label="Categoria">
                <select
                  value={
                    formProduto.categoria
                  }
                  onChange={e =>
                    setFormProduto(
                      prev => ({
                        ...prev,
                        categoria:
                          e.target
                            .value,
                        subcategoria:
                          ""
                      })
                    )
                  }
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {CATEGORIAS.map(
                    categoria => (
                      <option
                        key={
                          categoria
                        }
                        value={
                          categoria
                        }
                      >
                        {categoria}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Subcategoria">
                <select
                  value={
                    formProduto.subcategoria
                  }
                  onChange={e =>
                    setFormProduto(
                      prev => ({
                        ...prev,
                        subcategoria:
                          e.target
                            .value
                      })
                    )
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
                      formProduto
                        .categoria
                    ] ?? []
                  ).map(
                    subcategoria => (
                      <option
                        key={
                          subcategoria
                        }
                        value={
                          subcategoria
                        }
                      >
                        {
                          subcategoria
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Tecido">
                <select
                  value={
                    formProduto.tecido
                  }
                  onChange={e => {
                    if (
                      e.target
                        .value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "tecido"
                      )
                      return
                    }

                    setFormProduto(
                      prev => ({
                        ...prev,
                        tecido:
                          e.target
                            .value
                      })
                    )
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {tecidos.map(
                    tecido => (
                      <option
                        key={
                          tecido
                        }
                        value={
                          tecido
                        }
                      >
                        {tecido}
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo
                  </option>
                </select>
              </Field>

              <Field label="Comprimento">
                <select
                  value={
                    formProduto.comprimento
                  }
                  onChange={e => {
                    if (
                      e.target
                        .value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "comprimento"
                      )
                      return
                    }

                    setFormProduto(
                      prev => ({
                        ...prev,
                        comprimento:
                          e.target
                            .value
                      })
                    )
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {comprimentos.map(
                    comprimento => (
                      <option
                        key={
                          comprimento
                        }
                        value={
                          comprimento
                        }
                      >
                        {
                          comprimento
                        }
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo
                  </option>
                </select>
              </Field>

              <Field label="Modelagem">
                <select
                  value={
                    formProduto.modelagem
                  }
                  onChange={e => {
                    if (
                      e.target
                        .value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "modelagem"
                      )
                      return
                    }

                    setFormProduto(
                      prev => ({
                        ...prev,
                        modelagem:
                          e.target
                            .value
                      })
                    )
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {modelagens.map(
                    modelagem => (
                      <option
                        key={
                          modelagem
                        }
                        value={
                          modelagem
                        }
                      >
                        {
                          modelagem
                        }
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo
                  </option>
                </select>
              </Field>

              <Field label="Data de entrada">
                <input
                  type="date"
                  value={
                    formProduto.dataEntrada
                  }
                  onChange={e =>
                    setFormProduto(
                      prev => ({
                        ...prev,
                        dataEntrada:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                />
              </Field>

              <Field
                label="Descrição"
                full
              >
                <textarea
                  value={
                    formProduto.descricao
                  }
                  onChange={e =>
                    setFormProduto(
                      prev => ({
                        ...prev,
                        descricao:
                          e.target
                            .value
                      })
                    )
                  }
                  style={textarea}
                  rows={
                    isMobile
                      ? 3
                      : 4
                  }
                  placeholder="Descrição opcional..."
                />
              </Field>
            </div>

            <ModalFooter
              cancelar={() =>
                setModalProduto(
                  false
                )
              }
              salvar={
                salvarProduto
              }
              salvando={
                salvando
              }
              texto={
                produtoEditando
                  ? "Salvar alterações"
                  : "Cadastrar produto"
              }
            />
          </div>
        </div>
      )}

      {/* MODAL VARIANTE */}

      {modalVariante && (
        <div
          style={
            overlayModal
          }
        >
          <div
            style={{
              ...modal,
              maxWidth:
                isMobile
                  ? "100%"
                  : 700
            }}
          >
            <ModalHeader
              title={
                varianteEditando
                  ? "Editar variante"
                  : "Nova variante"
              }
              subtitle="Uma variante representa uma combinação de cor e tamanho."
              fechar={() =>
                setModalVariante(
                  false
                )
              }
            />

            <div
              style={
                isMobile
                  ? mobileForm
                  : formGrid
              }
            >
              <Field label="Produto" full>
                <select
                  value={
                    formVariante.produtoId
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        produtoId:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  disabled={
                    !!varianteEditando
                  }
                >
                  <option value="">
                    Selecione
                  </option>

                  {produtos.map(
                    produto => (
                      <option
                        key={
                          produto.id
                        }
                        value={
                          produto.id
                        }
                      >
                        {
                          produto.nome
                        }
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Cor">
                <select
                  value={
                    formVariante.cor
                  }
                  onChange={e => {
                    if (
                      e.target
                        .value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "cor"
                      )
                      return
                    }

                    setFormVariante(
                      prev => ({
                        ...prev,
                        cor:
                          e.target
                            .value
                      })
                    )
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {cores.map(
                    cor => (
                      <option
                        key={
                          cor.nome
                        }
                        value={
                          cor.nome
                        }
                      >
                        {
                          cor.nome
                        }
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar nova
                  </option>
                </select>

                {formVariante.cor && (
                  <CorPreview
                    nome={
                      formVariante.cor
                    }
                    cores={cores}
                  />
                )}
              </Field>

              <Field label="Tamanho">
                <select
                  value={
                    formVariante.tamanho
                  }
                  onChange={e => {
                    if (
                      e.target
                        .value ===
                      "__novo__"
                    ) {
                      abrirNovaOpcao(
                        "tamanho"
                      )
                      return
                    }

                    setFormVariante(
                      prev => ({
                        ...prev,
                        tamanho:
                          e.target
                            .value
                      })
                    )
                  }}
                  style={input}
                >
                  <option value="">
                    Selecione
                  </option>

                  {tamanhos.map(
                    tamanho => (
                      <option
                        key={
                          tamanho
                        }
                        value={
                          tamanho
                        }
                      >
                        {
                          tamanho
                        }
                      </option>
                    )
                  )}

                  <option value="__novo__">
                    + Adicionar novo
                  </option>
                </select>
              </Field>

              <Field label="SKU">
                <input
                  value={
                    formVariante.sku
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        sku:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="Ex.: CAM-PRE-M"
                />
              </Field>

              <Field label="Preço de venda">
                <input
                  value={
                    formVariante.precoVenda
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        precoVenda:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="69,00"
                  inputMode="decimal"
                />
              </Field>

              <Field label="Custo unitário">
                <input
                  value={
                    formVariante.custoUnitario
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        custoUnitario:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="42,90"
                  inputMode="decimal"
                />
              </Field>

              {/* CÁLCULO AUTOMÁTICO */}

              {(() => {
                const preco =
                  valorNumerico(
                    formVariante.precoVenda
                  )

                const custo =
                  valorNumerico(
                    formVariante.custoUnitario
                  )

                const lucro =
                  lucroUnitario(
                    preco,
                    custo
                  )

                const percentual =
                  percentualSobreCusto(
                    preco,
                    custo
                  )

                if (
                  !formVariante.precoVenda ||
                  !formVariante.custoUnitario
                ) {
                  return null
                }

                return (
                  <div
                    style={{
                      gridColumn:
                        "1 / -1",
                      display:
                        "grid",
                      gridTemplateColumns:
                        isMobile
                          ? "1fr 1fr"
                          : "repeat(3, 1fr)",
                      gap: 10,
                      padding: 14,
                      background:
                        "#faf7ee",
                      border:
                        "1px solid #eee2c5",
                      borderRadius: 12
                    }}
                  >
                    <div>
                      <span
                        style={
                          calculationLabel
                        }
                      >
                        Lucro unitário
                      </span>

                      <strong
                        style={
                          calculationValue
                        }
                      >
                        {moeda(
                          lucro
                        )}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={
                          calculationLabel
                        }
                      >
                        Sobre o custo
                      </span>

                      <strong
                        style={{
                          ...calculationValue,
                          color:
                            percentual !==
                              null &&
                            percentual <
                              0
                              ? "#a34e4e"
                              : "#657b58"
                        }}
                      >
                        {percentual ===
                        null
                          ? "-"
                          : `${
                              percentual >=
                              0
                                ? "+"
                                : ""
                            }${percentual.toFixed(
                              2
                            )}%`}
                      </strong>
                    </div>

                    {!isMobile && (
                      <div>
                        <span
                          style={
                            calculationLabel
                          }
                        >
                          Venda
                        </span>

                        <strong
                          style={
                            calculationValue
                          }
                        >
                          {moeda(
                            preco
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                )
              })()}

              <Field label="Estoque mínimo">
                <input
                  type="number"
                  min="0"
                  value={
                    formVariante.estoqueMinimo
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        estoqueMinimo:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                />
              </Field>

              <Field label="Estoque máximo">
                <input
                  type="number"
                  min="0"
                  value={
                    formVariante.estoqueMaximo
                  }
                  onChange={e =>
                    setFormVariante(
                      prev => ({
                        ...prev,
                        estoqueMaximo:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="Opcional"
                />
              </Field>
            </div>

            <ModalFooter
              cancelar={() =>
                setModalVariante(
                  false
                )
              }
              salvar={
                salvarVariante
              }
              salvando={
                salvando
              }
              texto={
                varianteEditando
                  ? "Salvar alterações"
                  : "Cadastrar variante"
              }
            />
          </div>
        </div>
      )}

      {/* MODAL ESTOQUE */}

      {modalEstoque && (
        <div
          style={
            overlayModal
          }
        >
          <div
            style={{
              ...modal,
              maxWidth:
                isMobile
                  ? "100%"
                  : 560
            }}
          >
            <ModalHeader
              title="Movimentar estoque"
              subtitle={
                varianteEstoque
                  ? `${varianteEstoque.sku} • estoque atual: ${varianteEstoque.estoqueAtual}`
                  : ""
              }
              fechar={() =>
                setModalEstoque(
                  false
                )
              }
            />

            <div
              style={
                isMobile
                  ? mobileForm
                  : formGrid
              }
            >
              <Field label="Tipo">
                <select
                  value={
                    formEstoque.tipo
                  }
                  onChange={e =>
                    setFormEstoque(
                      prev => ({
                        ...prev,
                        tipo:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                >
                  {TIPOS_MOVIMENTACAO.map(
                    tipo => (
                      <option
                        key={
                          tipo
                        }
                        value={
                          tipo
                        }
                      >
                        {tipo}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="Quantidade">
                <input
                  type="number"
                  min="1"
                  value={
                    formEstoque.quantidade
                  }
                  onChange={e =>
                    setFormEstoque(
                      prev => ({
                        ...prev,
                        quantidade:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                />
              </Field>

              <Field label="Custo unitário">
                <input
                  value={
                    formEstoque.custoUnitario
                  }
                  onChange={e =>
                    setFormEstoque(
                      prev => ({
                        ...prev,
                        custoUnitario:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  inputMode="decimal"
                />
              </Field>

              <Field label="Motivo">
                <input
                  value={
                    formEstoque.motivo
                  }
                  onChange={e =>
                    setFormEstoque(
                      prev => ({
                        ...prev,
                        motivo:
                          e.target
                            .value
                      })
                    )
                  }
                  style={input}
                  placeholder="Ex.: Entrada de mercadoria"
                />
              </Field>

              <Field
                label="Observação"
                full
              >
                <textarea
                  value={
                    formEstoque.observacao
                  }
                  onChange={e =>
                    setFormEstoque(
                      prev => ({
                        ...prev,
                        observacao:
                          e.target
                            .value
                      })
                    )
                  }
                  style={textarea}
                  rows={3}
                  placeholder="Opcional"
                />
              </Field>
            </div>

            <ModalFooter
              cancelar={() =>
                setModalEstoque(
                  false
                )
              }
              salvar={
                movimentarEstoque
              }
              salvando={
                salvando
              }
              texto="Registrar movimentação"
            />
          </div>
        </div>
      )}

      {/* NOVA OPÇÃO */}

      {novaOpcaoTipo && (
        <div
          style={
            overlayModal
          }
        >
          <div
            style={{
              ...modal,
              maxWidth:
                isMobile
                  ? "100%"
                  : 430
            }}
          >
            <ModalHeader
              title={`Adicionar ${tituloNovaOpcao}`}
              subtitle="A opção ficará disponível neste navegador."
              fechar={() =>
                setNovaOpcaoTipo(
                  null
                )
              }
            />

            <Field label="Nome">
              <input
                value={
                  novaOpcaoNome
                }
                onChange={e =>
                  setNovaOpcaoNome(
                    e.target.value
                  )
                }
                style={input}
                placeholder={
                  novaOpcaoTipo ===
                  "cor"
                    ? "Ex.: Dourado"
                    : "Digite o nome"
                }
                autoFocus
              />
            </Field>

            {novaOpcaoTipo ===
              "cor" && (
              <div
                style={{
                  marginTop: 16
                }}
              >
                <Field label="Cor">
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 10,
                      alignItems:
                        "center"
                    }}
                  >
                    <input
                      type="color"
                      value={
                        novaOpcaoHex
                      }
                      onChange={e =>
                        setNovaOpcaoHex(
                          e.target
                            .value
                        )
                      }
                      style={
                        colorPicker
                      }
                    />

                    <input
                      value={
                        novaOpcaoHex
                      }
                      onChange={e =>
                        setNovaOpcaoHex(
                          e.target
                            .value
                        )
                      }
                      style={{
                        ...input,
                        flex: 1
                      }}
                    />
                  </div>
                </Field>
              </div>
            )}

            <div
              style={
                modalFooter
              }
            >
              <button
                style={
                  cancelButton
                }
                onClick={() =>
                  setNovaOpcaoTipo(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                style={
                  primaryButton
                }
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

/* COMPONENTES */

function Status({
  ativo
}: {
  ativo: boolean
}) {
  return (
    <span
      style={{
        ...status,
        background: ativo
          ? "#edf5eb"
          : "#f2f2f2",
        color: ativo
          ? "#56704d"
          : "#777"
      }}
    >
      {ativo
        ? "Ativo"
        : "Inativo"}
    </span>
  )
}

function CorLabel({
  nome,
  cores
}: {
  nome: string | null
  cores: Cor[]
}) {
  if (!nome) return <span>-</span>

  const cor = cores.find(
    item => item.nome === nome
  )

  return (
    <div
      style={{
        display: "flex",
        alignItems:
          "center",
        gap: 8
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          minWidth: 16,
          borderRadius:
            "50%",
          background:
            cor?.hex ?? "#ddd",
          border:
            "1px solid #ddd"
        }}
      />

      <span>{nome}</span>
    </div>
  )
}

function CorPreview({
  nome,
  cores
}: {
  nome: string
  cores: Cor[]
}) {
  const cor = cores.find(
    item => item.nome === nome
  )

  if (!cor) return null

  return (
    <div
      style={{
        display: "flex",
        alignItems:
          "center",
        gap: 7,
        marginTop: 6,
        fontSize: 12,
        color: "#888"
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius:
            "50%",
          background:
            cor.hex,
          border:
            "1px solid #ddd"
        }}
      />

      {cor.hex}
    </div>
  )
}

function LucroInfo({
  variante
}: {
  variante: Variante
}) {
  const percentual =
    percentualSobreCusto(
      variante.precoVenda,
      variante.custoUnitario
    )

  return (
    <div>
      <strong
        style={{
          color:
            percentual !== null &&
            percentual < 0
              ? "#a34e4e"
              : "#657b58"
        }}
      >
        {percentual === null
          ? "-"
          : `+${percentual.toFixed(
              2
            )}%`}
      </strong>

      <div
        style={{
          fontSize: 11,
          color: "#999",
          marginTop: 3
        }}
      >
        {moeda(
          lucroUnitario(
            variante.precoVenda,
            variante.custoUnitario
          )
        )}{" "}
        / un.
      </div>
    </div>
  )
}

function EstoqueBadge({
  variante
}: {
  variante: Variante
}) {
  const baixo =
    variante.estoqueAtual <=
    variante.estoqueMinimo

  return (
    <span
      style={{
        ...stockBadge,
        color: baixo
          ? "#9a6b19"
          : "#5c6657",
        background: baixo
          ? "#fbf2dc"
          : "#eef3eb"
      }}
    >
      {variante.estoqueAtual}
      {baixo &&
        " • baixo"}
    </span>
  )
}

function ModalHeader({
  title,
  subtitle,
  fechar
}: {
  title: string
  subtitle: string
  fechar: () => void
}) {
  return (
    <div
      style={
        modalHeader
      }
    >
      <div>
        <h2
          style={
            modalTitle
          }
        >
          {title}
        </h2>

        <p
          style={
            modalSubtitle
          }
        >
          {subtitle}
        </p>
      </div>

      <button
        style={
          closeButton
        }
        onClick={fechar}
      >
        ×
      </button>
    </div>
  )
}

function ModalFooter({
  cancelar,
  salvar,
  salvando,
  texto
}: {
  cancelar: () => void
  salvar: () => void
  salvando: boolean
  texto: string
}) {
  return (
    <div
      style={
        modalFooter
      }
    >
      <button
        style={
          cancelButton
        }
        onClick={
          cancelar
        }
      >
        Cancelar
      </button>

      <button
        style={
          primaryButton
        }
        onClick={salvar}
        disabled={salvando}
      >
        {salvando
          ? "Salvando..."
          : texto}
      </button>
    </div>
  )
}

function Field({
  label,
  children,
  full = false
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div
      style={{
        ...field,
        gridColumn:
          full
            ? "1 / -1"
            : undefined
      }}
    >
      <label
        style={
          labelStyle
        }
      >
        {label}
      </label>

      {children}
    </div>
  )
}

/* ESTILOS */

const page = {
  width: "100%",
  maxWidth: 1450,
  margin: "0 auto",
  boxSizing:
    "border-box" as const
}

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 20
}

const title = {
  margin: 0,
  fontFamily:
    "Playfair Display, serif",
  color: "#403c35",
  fontWeight: 700
}

const subtitle = {
  margin:
    "5px 0 0",
  color: "#858078",
  fontSize: 13
}

const summary = {
  display: "grid",
  gap: 10,
  marginBottom: 22
}

const summaryItem = {
  background: "#fff",
  border:
    "1px solid #ece6d8",
  borderRadius: 10,
  padding:
    "13px 16px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  minWidth: 0
}

const tabs = {
  display: "flex",
  gap: 4,
  borderBottom:
    "1px solid #e6dfd1",
  marginBottom: 20,
  overflowX:
    "auto" as const
}

const tab = {
  border: "none",
  background:
    "transparent",
  padding:
    "11px 16px",
  color: "#777168",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace:
    "nowrap" as const
}

const activeTab = {
  color: "#8b6f3d",
  borderBottom:
    "2px solid #c9ad6d",
  fontWeight: 600
}

const section = {
  background: "#fff",
  border:
    "1px solid #ece6d8",
  borderRadius: 14,
  padding: 20,
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
}

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 15,
  marginBottom: 18
}

const sectionTitle = {
  margin: 0,
  fontSize: 19,
  color: "#4b463e",
  fontWeight: 600
}

const sectionSubtitle = {
  margin:
    "5px 0 0",
  color: "#8b867e",
  fontSize: 12
}

const search = {
  border:
    "1px solid #ddd5c4",
  borderRadius: 8,
  padding:
    "9px 11px",
  background: "#fff",
  outline: "none",
  fontSize: 13,
  boxSizing:
    "border-box" as const
}

const tableWrapper = {
  width: "100%",
  overflowX:
    "auto" as const
}

const table = {
  width: "100%",
  borderCollapse:
    "collapse" as const
}

const th = {
  textAlign:
    "left" as const,
  padding:
    "11px 10px",
  background:
    "#faf8f3",
  color: "#797269",
  fontSize: 11,
  fontWeight: 600,
  borderBottom:
    "1px solid #e9e2d4"
}

const td = {
  padding:
    "12px 10px",
  borderBottom:
    "1px solid #eeeae2",
  color: "#555047",
  fontSize: 12
}

const status = {
  display:
    "inline-block",
  padding:
    "4px 8px",
  borderRadius: 20,
  fontSize: 10,
  fontWeight: 600
}

const stockBadge = {
  display:
    "inline-block",
  padding:
    "5px 8px",
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 600
}

const actionButtons = {
  display: "flex",
  gap: 5,
  flexWrap:
    "wrap" as const
}

const primaryButton = {
  border: "none",
  borderRadius: 9,
  padding:
    "10px 16px",
  background:
    "#b9974f",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13
}

const secondaryButton = {
  border:
    "1px solid #e0d6c2",
  borderRadius: 7,
  padding:
    "6px 9px",
  background:
    "#fffdfa",
  color: "#665a45",
  cursor: "pointer",
  fontSize: 11
}

const backButton = {
  border: "none",
  background:
    "transparent",
  padding: 0,
  color: "#8b6f3d",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600
}

const empty = {
  textAlign:
    "center" as const,
  padding: 35,
  color: "#999",
  fontSize: 13
}

const warning = {
  background:
    "#fbf2dc",
  color: "#96701e",
  padding:
    "7px 10px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600
}

const mobileList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 10
}

const mobileProductCard = {
  border:
    "1px solid #ebe5d9",
  borderRadius: 12,
  padding: 15,
  background:
    "#fff"
}

const mobileVariantCard = {
  border:
    "1px solid #ebe5d9",
  borderRadius: 12,
  padding: 15,
  background:
    "#fff"
}

const mobileMovementCard = {
  border:
    "1px solid #ebe5d9",
  borderRadius: 12,
  padding: 14,
  background:
    "#fff"
}

const mobileCardTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 10
}

const mobileProductName = {
  margin: 0,
  color: "#403c35",
  fontSize: 16,
  fontWeight: 600
}

const mobileProductCategory = {
  display: "block",
  marginTop: 4,
  color: "#89837a",
  fontSize: 11
}

const mobileProductInfo = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 10,
  marginTop: 16,
  paddingTop: 13,
  borderTop:
    "1px solid #eee9df"
}

const mobilePriceGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 10,
  marginTop: 15,
  paddingTop: 13,
  borderTop:
    "1px solid #eee9df"
}


const mobileActions = {
  display: "flex",
  gap: 7,
  marginTop: 15
}

const primarySmall = {
  ...primaryButton,
  flex: 1,
  padding:
    "9px 12px",
  fontSize: 12
}

const secondarySmall = {
  ...secondaryButton,
  flex: 1,
  padding:
    "9px 12px",
  fontSize: 12
}

const mobileVariantTitle = {
  display: "flex",
  alignItems:
    "center",
  gap: 7,
  fontSize: 14,
  color: "#4c473f"
}

const sku = {
  display: "block",
  marginTop: 5,
  color: "#99938a",
  fontSize: 10
}

const movementType = {
  background:
    "#f7f3e9",
  color: "#8a7144",
  padding:
    "5px 8px",
  borderRadius: 6,
  fontSize: 9,
  fontWeight: 600
}

const movementInfo = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 6,
  marginTop: 14,
  fontSize: 11,
  color: "#888"
}

const movementDetails = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 4,
  marginTop: 13,
  paddingTop: 10,
  borderTop:
    "1px solid #eee9df",
  fontSize: 10,
  color: "#888"
}

const mobileForm = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 15
}

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: 15
}

const field = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 6
}

const labelStyle = {
  color: "#625c53",
  fontSize: 12,
  fontWeight: 600
}

const input = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #ddd5c4",
  borderRadius: 8,
  padding:
    "10px 11px",
  background:
    "#fff",
  color: "#4e4941",
  fontSize: 13,
  outline: "none"
}

const textarea = {
  ...input,
  resize:
    "vertical" as const
}

const calculationLabel = {
  display:
    "block",
  color: "#898176",
  fontSize: 10,
  marginBottom: 4
}

const calculationValue = {
  display:
    "block",
  color: "#4e493f",
  fontSize: 15
}

const overlayModal = {
  position: "fixed" as const,
  inset: 0,
  background:
    "rgba(0,0,0,0.38)",
  display: "flex",
  justifyContent:
    "center",
  alignItems:
    "center",
  padding: 15,
  zIndex: 2000,
  overflowY:
    "auto" as const
}

const modal = {
  width: "100%",
  maxHeight: "92vh",
  overflowY:
    "auto" as const,
  background:
    "#fffdfa",
  borderRadius: 15,
  padding: 22,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.18)",
  boxSizing:
    "border-box" as const
}

const modalHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 15,
  marginBottom: 20
}

const modalTitle = {
  margin: 0,
  fontFamily:
    "Playfair Display, serif",
  fontSize: 23,
  color: "#403b34"
}

const modalSubtitle = {
  margin:
    "5px 0 0",
  color: "#888176",
  fontSize: 11
}

const closeButton = {
  width: 32,
  height: 32,
  minWidth: 32,
  border: "none",
  borderRadius: 7,
  background:
    "#f4f0e7",
  color: "#76684e",
  fontSize: 22,
  cursor: "pointer"
}

const modalFooter = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: 8,
  marginTop: 22,
  paddingTop: 16,
  borderTop:
    "1px solid #eee7da"
}

const cancelButton = {
  border:
    "1px solid #ddd5c4",
  borderRadius: 9,
  padding:
    "10px 15px",
  background:
    "#fff",
  color: "#666",
  cursor: "pointer",
  fontSize: 12
}

const colorPicker = {
  width: 45,
  height: 40,
  border:
    "1px solid #ddd5c4",
  borderRadius: 7,
  padding: 2,
  background:
    "#fff",
  cursor: "pointer"
}