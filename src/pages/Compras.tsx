import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  pontos: number
  celular: string
  creditoDisponivel: number
  ativo: boolean
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
  creditoutilizado: number
  pontosutilizados: number
  ativo: boolean
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

function normalizarBuscaVenda(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

// Retorna a data atual no formato exigido pelo input type="date",
// respeitando o fuso horário local do computador.
function dataAtualLocal() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

export default function Compras({
  compraSelecionada
}: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])

  const [modal, setModal] = useState(false)
  const [modalReceita, setModalReceita] = useState(false)

  const [clienteSel, setClienteSel] =
    useState<Cliente | null>(null)

  const [buscaCliente, setBuscaCliente] =
    useState("")

  // A nova venda começa com a data de hoje, mas permite lançamento retroativo.
  const [dataVenda, setDataVenda] = useState(dataAtualLocal())

  const [buscaVenda, setBuscaVenda] =
    useState("")

  const [filtroAno, setFiltroAno] = useState("todos")
  const [filtroMes, setFiltroMes] = useState("todos")

  const [filtroPagamento, setFiltroPagamento] =
    useState("todos")

  const [valor, setValor] = useState(0)

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
      .select("id,nome,cpf,pontos,celular,creditoDisponivel,ativo")
      .eq("ativo", true)
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
          pontos: Number(c.pontos || 0),
          celular: c.celular || "",
          creditoDisponivel: Number(c.creditoDisponivel || 0),
          ativo: c.ativo !== false
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
      .eq("ativo", true)
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
            Number(c.cupomusado || 0),

          creditoutilizado:
            Number(c.creditoutilizado || 0),

          pontosutilizados:
            Number(c.pontosutilizados || 0),

          ativo: c.ativo !== false
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

  const normalizarBuscaCliente = (valor: string) =>
    valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

  const clientesFiltrados = clientes.filter(c => {
    const termo = normalizarBuscaCliente(buscaCliente)
    if (!termo) return true
    const termoNumerico = termo.replace(/\D/g, "")
    const camposTexto = [c.nome, c.cpf, c.celular, (c as any).descricao, (c as any).observacao, (c as any).clienteRef]
    const encontrouTexto = camposTexto.some(campo => normalizarBuscaCliente(String(campo || "")).includes(termo))
    const encontrouNumero = termoNumerico.length > 0 && [c.cpf, c.celular].some(campo => String(campo || "").replace(/\D/g, "").includes(termoNumerico))
    return encontrouTexto || encontrouNumero
  })

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

  // O crédito é aplicado automaticamente depois do cupom de fidelidade.
  // A pontuação continua sendo calculada sobre o valor integral da venda.
  const creditoDisponivel = Number(clienteSel?.creditoDisponivel || 0)

  const creditoUtilizado = clienteSel
    ? Math.min(creditoDisponivel, Math.max(valor - valorCupom, 0))
    : 0

  const valorFinal = Math.max(valor - valorCupom - creditoUtilizado, 0)

  const valorRestante = valorFinal

  /*
   * R$ 150,00 = 1 ponto
   */
  const pontosGerados =
    Math.min(
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
    if (!dataVenda) {
      alert("Selecione a data da venda.")
      return
    }

    if (!clienteSel) {
      alert("Selecione um cliente.")
      return
    }

    if (valor <= 0) {
      alert("Digite um valor válido.")
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

    const partesPagamento: string[] = []
    if (valorFinal > 0) partesPagamento.push(pagamento)
    if (valorCupom > 0) partesPagamento.push("Cupom")
    if (creditoUtilizado > 0) partesPagamento.push("Crédito")
    const pagamentoFinal = partesPagamento.length > 0
      ? partesPagamento.join(" + ")
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

          valor,

          pagamento:
            pagamentoFinal,

          parcelas,

          pontosgerados:
            pontosGerados,

          cupomusado:
            valorCupom,

          creditoutilizado:
            creditoUtilizado,

          pontosutilizados: pontosUsados,
          ativo: true,

          criadoem:
            new Date(`${dataVenda}T12:00:00`).toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      alert(
        "Erro ao registrar compra: " +
          error.message
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
        pontos: novosPontos,
        creditoDisponivel: Math.max(creditoDisponivel - creditoUtilizado, 0)
      })
      .eq(
        "id",
        clienteSel.id
      )

    if (erroCliente) {
      /*
       * Se a compra foi criada,
       * mas os pontos falharam,
       * tentamos remover a compra.
       */
      await supabase
        .from("compras")
        .update({ ativo: false })
        .eq("id", compraCriada.id)

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
          "Venda salva, mas não foi possível registrar os cupons: " +
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

              tipo:
                "Cupom Fidelidade",

              status:
                "Concluído",

              ativo: true,

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
      "Venda registrada com sucesso!"
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

          creditoutilizado: 0,
          pontosutilizados: 0,
          ativo: true,

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

    setDataVenda(dataAtualLocal())

    setClienteSel(null)

    setValor(0)

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

  async function excluirCompra(compra: Compra) {
    const ehReceita = compra.pagamento === "Receita"
    const confirmacao = window.confirm(
      ehReceita
        ? `Deseja inativar esta receita?\n\nDescrição: ${compra.cliente || "Sem descrição"}\nValor: ${moeda(compra.valor)}\n\nO registro será ocultado do aplicativo, mas permanecerá salvo no banco.`
        : `Deseja inativar esta venda?\n\nCliente: ${compra.cliente || "Sem cliente"}\nValor: ${moeda(compra.valor)}\n\nOs pontos e o crédito usados nesta venda serão devolvidos. O registro será preservado no banco.`
    )
    if (!confirmacao) return

    setExcluindo(compra.id)

    // Receitas também são apenas inativadas; nunca usamos DELETE.
    if (ehReceita || !compra.clienteid) {
      const { error } = await supabase
        .from("compras")
        .update({ ativo: false })
        .eq("id", compra.id)

      if (error) {
        alert("Erro ao inativar registro: " + error.message)
        setExcluindo(null)
        return
      }

      setExcluindo(null)
      await fetchCompras()
      alert(ehReceita ? "Receita inativada." : "Registro inativado.")
      return
    }

    // Busca os valores atuais para devolver pontos e crédito sem sobrescrever valores antigos.
    const { data: clienteAtual, error: erroBuscaCliente } = await supabase
      .from("clientes")
      .select("id,pontos,creditoDisponivel")
      .eq("id", compra.clienteid)
      .maybeSingle()

    if (erroBuscaCliente || !clienteAtual) {
      alert("Não foi possível carregar os dados da cliente para estornar a venda." + (erroBuscaCliente ? " " + erroBuscaCliente.message : ""))
      setExcluindo(null)
      return
    }

    const pontosDevolvidos = Number(compra.pontosutilizados || (compra.cupomusado > 0 ? Math.ceil(compra.cupomusado / VALOR_CUPOM) * PONTOS_POR_CUPOM : 0))
    const pontosAtualizados = Math.max(0, Number(clienteAtual.pontos || 0) - Number(compra.pontosgerados || 0) + pontosDevolvidos)
    const creditoAtualizado = Number(clienteAtual.creditoDisponivel || 0) + Number(compra.creditoutilizado || 0)

    const { error: erroInativarVenda } = await supabase
      .from("compras")
      .update({ ativo: false })
      .eq("id", compra.id)

    if (erroInativarVenda) {
      alert("Erro ao inativar venda: " + erroInativarVenda.message)
      setExcluindo(null)
      return
    }

    const { error: erroEstornoCliente } = await supabase
      .from("clientes")
      .update({ pontos: pontosAtualizados, creditoDisponivel: creditoAtualizado })
      .eq("id", compra.clienteid)

    if (erroEstornoCliente) {
      // A venda fica ativa novamente se não for possível concluir o estorno do saldo.
      await supabase.from("compras").update({ ativo: true }).eq("id", compra.id)
      alert("Não foi possível estornar pontos e crédito: " + erroEstornoCliente.message)
      setExcluindo(null)
      return
    }

    // Preserva os registros de trocas/cupons, apenas marcando-os como inativos.
    const { error: erroTrocas } = await supabase
      .from("trocas")
      .update({ ativo: false })
      .eq("compraid", compra.id)

    setExcluindo(null)
    await fetchClientes()
    await fetchCompras()

    if (erroTrocas) {
      alert("Venda inativada e saldos estornados, mas não foi possível inativar os registros de cupons relacionados: " + erroTrocas.message)
      return
    }

    alert("Venda inativada. Os pontos e o crédito utilizados foram devolvidos.")
  }

  /*
   * =========================
   * FILTROS
   * =========================
   */

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>()
    compras.forEach(compra => {
      const data = new Date(compra.criadoem)
      if (!Number.isNaN(data.getTime())) {
        anos.add(String(data.getFullYear()))
      }
    })
    return Array.from(anos).sort((a, b) => b.localeCompare(a))
  }, [compras])

  const mesesDisponiveis = [
    { valor: "01", nome: "Janeiro" },
    { valor: "02", nome: "Fevereiro" },
    { valor: "03", nome: "Março" },
    { valor: "04", nome: "Abril" },
    { valor: "05", nome: "Maio" },
    { valor: "06", nome: "Junho" },
    { valor: "07", nome: "Julho" },
    { valor: "08", nome: "Agosto" },
    { valor: "09", nome: "Setembro" },
    { valor: "10", nome: "Outubro" },
    { valor: "11", nome: "Novembro" },
    { valor: "12", nome: "Dezembro" }
  ]

  const comprasFiltradas = useMemo(() => {
    const termo = normalizarBuscaVenda(buscaVenda)
    const termoNumerico = buscaVenda.replace(/\D/g, "")

    return compras.filter(compra => {
      const clienteRelacionado = clientes.find(cliente => cliente.id === compra.clienteid)
      const camposTexto = [compra.cliente, compra.cpf, clienteRelacionado?.celular, compra.pagamento]
      const encontrouTexto = !termo || camposTexto.some(campo =>
        normalizarBuscaVenda(String(campo || "")).includes(termo)
      )
      const encontrouNumero = termoNumerico.length > 0 &&
        String(compra.cpf || "").replace(/\D/g, "").includes(termoNumerico)
      const buscaMatch = !termo || encontrouTexto || encontrouNumero

      const data = new Date(compra.criadoem)
      if (Number.isNaN(data.getTime())) return false

      const anoCompra = String(data.getFullYear())
      const mesCompra = String(data.getMonth() + 1).padStart(2, "0")
      const anoMatch = filtroAno === "todos" || anoCompra === filtroAno
      const mesMatch = filtroMes === "todos" || mesCompra === filtroMes
      const pagamentoMatch = filtroPagamento === "todos" ||
        normalizarBuscaVenda(compra.pagamento).includes(normalizarBuscaVenda(filtroPagamento))

      return buscaMatch && anoMatch && mesMatch && pagamentoMatch
    })
  }, [compras, clientes, buscaVenda, filtroAno, filtroMes, filtroPagamento])

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
            .compras-filtros {
              grid-template-columns: 1fr !important;
            }

            .compra-card {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 600px) {
            .compras-container {
              padding: 18px !important;
            }

            .dash-grid {
              grid-template-columns: 1fr 1fr !important;
            }

            .dash-faturamento {
              grid-column: 1 / -1;
            }

            .compra-card {
              grid-template-columns: minmax(0, 1fr) !important;
              gap: 12px !important;
              padding: 14px !important;
            }

            .compra-card > div { min-width: 0; }
            .compra-card-delete { display: flex !important; width: 100%; justify-content: flex-end !important; }
            .compra-card-delete button { display: inline-flex !important; align-items: center; justify-content: center; min-width: 42px; min-height: 42px; }

            .header-buttons {
              width: 100%;
            }

            .header-buttons button {
              flex: 1;
            }
          }
        `}
      </style>

      {/* =========================
          CABEÇALHO
      ========================= */}

      <div style={header}>
        <h1 style={title}>
          Vendas
        </h1>

        <div
          className="header-buttons"
          style={headerButtons}
        >
          <button
            style={btnSmall}
            onClick={() => {
              setDataVenda(dataAtualLocal())
              setModal(true)
            }}
          >
            Nova venda
          </button>
        </div>
      </div>

      {/* =========================
          DASHBOARD
      ========================= */}

      <div className="dash-grid" style={dashGrid}>
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
          FILTROS
      ========================= */}

      <div
        className="compras-filtros"
        style={filtrosBar}
      >
        <input
          placeholder="Buscar por cliente ou CPF"
          value={buscaVenda}
          onChange={e => setBuscaVenda(e.target.value)}
          style={inputFiltro}
        />

        <select
          value={filtroAno}
          onChange={e => setFiltroAno(e.target.value)}
          style={selectFiltro}
          aria-label="Filtrar por ano"
        >
          <option value="todos">Todos os anos</option>
          {anosDisponiveis.map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>

        <select
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          style={selectFiltro}
          aria-label="Filtrar por mês"
        >
          <option value="todos">Todos os meses</option>
          {mesesDisponiveis.map(mes => (
            <option key={mes.valor} value={mes.valor}>{mes.nome}</option>
          ))}
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
                  className="compra-card-delete"
                  style={deleteContainer}
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
                    title={excluindo === compra.id ? "Inativando venda" : "Inativar venda"}
                    aria-label={excluindo === compra.id ? "Inativando venda" : "Inativar venda"}
                  >
                    {excluindo === compra.id ? (
                      <span style={{ fontSize: 11 }}>…</span>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
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
                Nova venda
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

            {/* DATA DA VENDA */}
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600
              }}
            >
              Data da venda
            </label>

            <input
              type="date"
              value={dataVenda}
              onChange={e => setDataVenda(e.target.value)}
              style={{
                ...input,
                marginBottom: 16
              }}
            />

            {/* BUSCAR CLIENTE */}

            <input
              placeholder="Buscar por nome, descrição, telefone ou CPF"
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
                          ? "2px solid #b9974f"
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

                  <span style={clientePontos}>
                    {clienteSel.pontos} pontos
                  </span>
                  <span style={creditoTag}>
                    Crédito: {moeda(clienteSel.creditoDisponivel)}
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

                {/* VALOR */}

                <label
                  style={
                    fieldLabel
                  }
                >
                  Valor da compra
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="R$ 0,00"
                  style={input}
                  value={
                    valor || ""
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
                  <option value="N/A">
                    N/A
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
                    Valor da venda: {" "}
                    <strong>{moeda(valor)}</strong>
                  </div>

                  <div>
                    Cupom utilizado: {" "}
                    <strong>{moeda(valorCupom)}</strong>
                  </div>

                  <div>
                    Crédito disponível: {" "}
                    <strong>{moeda(creditoDisponivel)}</strong>
                  </div>

                  <div>
                    Crédito utilizado: {" "}
                    <strong>{moeda(creditoUtilizado)}</strong>
                  </div>

                  <div style={{ borderTop: "1px solid #e7dcc0", paddingTop: 8, marginTop: 4 }}>
                    Valor final: {" "}
                    <strong>{moeda(valorFinal)}</strong>
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
  background: "#b9974f",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace:
    "nowrap" as const
}

const btnSecondary = {
  padding:
    "11px 18px",
  borderRadius: 10,
  border: "1px solid #e5d7b3",
  background: "#faf8f1",
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

const emptyText = {
  color: "#888",
  fontSize: 14,
  padding: 10
}

const filtrosBar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,2fr) repeat(3, minmax(0,1fr))",
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
  color: "#8f7131"
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
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  padding: 8,
  borderRadius: 9,
  border:
    "1px solid #efcaca",
  background: "#fff5f5",
  color: "#c45a5a",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap" as const
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
  background: "#b9974f",
  color: "#fff",
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

const creditoTag = {
  padding: "5px 9px",
  borderRadius: 8,
  background: "#f8f1df",
  color: "#8f7131",
  fontSize: 12,
  fontWeight: 600
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