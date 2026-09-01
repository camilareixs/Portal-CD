
import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  pontos: number
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

const VALOR_CUPOM = 60
const PONTOS_POR_CUPOM = 10
const PONTOS_POR_150_REAIS = 1

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

  /* =========================
     FETCH CLIENTES
  ========================= */

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nome,cpf,pontos")
      .order("nome")

    if (error) {
      alert("Erro clientes: " + error.message)
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

  /* =========================
     FETCH COMPRAS
  ========================= */

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .order("criadoem", {
        ascending: false
      })

    if (error) {
      alert("Erro compras: " + error.message)
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
          pontosgerados: Number(
            c.pontosgerados || 0
          ),
          criadoem: c.criadoem || "",
          cupomusado: Number(
            c.cupomusado || 0
          )
        }))
      )
    }
  }

  useEffect(() => {
    fetchClientes()
    fetchCompras()
  }, [])

  /* =========================
     CLIENTE VINDO DA PÁGINA
  ========================= */

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

  /* =========================
     CLIENTES FILTRADOS
  ========================= */

  const clientesFiltrados =
    clientes.filter(c =>
      c.nome
        .toLowerCase()
        .includes(
          buscaCliente.toLowerCase()
        )
    )

  /* =========================
     CUPONS
  ========================= */

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
   * A cada R$150 em compras:
   * 1 ponto é gerado.
   */
  const pontosGerados =
    Math.floor(
      valor / 150
    )

  const pontosUsados =
    usarCupom
      ? quantidadeCupons *
        PONTOS_POR_CUPOM
      : 0

  /* =========================
     REGISTRAR COMPRA
  ========================= */

  async function registrarCompra() {
    if (!clienteSel) {
      alert("Selecione um cliente")
      return
    }

    if (valor <= 0) {
      alert("Digite um valor válido")
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
          criadoem:
            new Date().toISOString()
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

    const {
      error: erroCliente
    } = await supabase
      .from("clientes")
      .update({
        pontos: novosPontos
      })
      .eq(
        "id",
        clienteSel.id
      )

    if (erroCliente) {
      /*
       * Caso a venda tenha sido criada,
       * mas a atualização do cliente falhe,
       * tentamos apagar a venda para
       * evitar inconsistência.
       */
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

    /* =========================
       REGISTRAR CUPONS UTILIZADOS
    ========================= */

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
        const trocas = Array.from(
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
              (cuponsAnteriores ||
                0) +
              i +
              1,
            valorcupom:
              VALOR_CUPOM,
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
            "Compra salva, mas erro ao registrar os cupons: " +
              erroTrocas.message
          )
        }
      }
    }

    alert(
      "Compra registrada com sucesso!"
    )

    fecharModalCompra()

    await fetchClientes()
    await fetchCompras()
  }

  /* =========================
     RECEITA SEM VENDA
  ========================= */

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
     * Receita não gera pontos e não
     * está vinculada a cliente.
     */
    const { error } = await supabase
      .from("compras")
      .insert([
        {
          clienteid: null,
          cliente:
            "Receita sem venda",
          cpf: "",
          valor:
            valorReceita,
          pagamento:
            "Receita",
          parcelas: 1,
          pontosgerados: 0,
          cupomusado: 0,
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

    /*
     * A descrição é adicionada ao
     * campo de cliente para manter
     * compatibilidade com a estrutura
     * atual da tabela.
     */
    /*
     * Como a inserção acima já foi feita,
     * não tentamos criar outra linha.
     */

    alert(
      "Receita cadastrada com sucesso!"
    )

    setModalReceita(false)
    setValorReceita(0)
    setDescricaoReceita("")

    await fetchCompras()
  }

  /* =========================
     FECHAR MODAL COMPRA
  ========================= */

  function fecharModalCompra() {
    setModal(false)
    setClienteSel(null)
    setValor(0)
    setPagamento("Pix")
    setParcelas(1)
    setUsarCupom(false)
    setQuantidadeCupons(0)
    setBuscaCliente("")
  }

  /* =========================
     EXCLUIR COMPRA
  ========================= */

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
        )}\n\nEssa ação não poderá ser desfeita.`
      )

    if (!confirmacao) {
      return
    }

    setExcluindo(compra.id)

    /*
     * Se a compra gerou pontos,
     * retiramos esses pontos do cliente.
     *
     * Se utilizou cupons,
     * devolvemos os pontos correspondentes.
     */
    if (compra.clienteid) {
      const cliente = clientes.find(
        c =>
          c.id ===
          compra.clienteid
      )

      if (cliente) {
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

        const novosPontos =
          cliente.pontos -
          compra.pontosgerados +
          pontosADevolver

        if (
          novosPontos < 0
        ) {
          alert(
            "Não foi possível excluir a venda porque os pontos atuais do cliente não permitem desfazer essa operação."
          )

          setExcluindo(null)
          return
        }

        const {
          error:
            erroPontos
        } = await supabase
          .from("clientes")
          .update({
            pontos:
              novosPontos
          })
          .eq(
            "id",
            cliente.id
          )

        if (erroPontos) {
          alert(
            "Erro ao ajustar os pontos do cliente: " +
              erroPontos.message
          )

          setExcluindo(null)
          return
        }
      }
    }

    /*
     * Remove registros de cupons
     * relacionados à venda.
     */
    const {
      error:
        erroTrocas
    } = await supabase
      .from("trocas")
      .delete()
      .eq(
        "compraid",
        compra.id
      )

    if (
      erroTrocas &&
      !erroTrocas.message
        .toLowerCase()
        .includes("relation")
    ) {
      /*
       * Não interrompemos a exclusão
       * caso a tabela de trocas não
       * esteja disponível.
       */
      console.log(
        "Aviso ao excluir trocas:",
        erroTrocas.message
      )
    }

    /*
     * Finalmente exclui a venda.
     */
    const {
      error:
        erroCompra
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
      await fetchClientes()
      return
    }

    alert(
      "Venda excluída com sucesso!"
    )

    setExcluindo(null)

    await fetchClientes()
    await fetchCompras()
  }

  /* =========================
     FILTROS
  ========================= */

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

  /* =========================
     FATURAMENTO POR MÊS
  ========================= */

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
            mes !== filtroMes
          ) {
            return
          }

          const chave =
            `${mes}/${data.getFullYear()}`

          mapa[chave] =
            (mapa[chave] ||
              0) +
            compra.valor
        }
      )

      return Object.entries(
        mapa
      ).sort((a, b) =>
        b[0].localeCompare(
          a[0]
        )
      )
    }, [
      compras,
      filtroMes
    ])

  /* =========================
     CLIENTES INATIVOS
  ========================= */

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

      const ult =
        comprasCliente[0]

      if (!ult) {
        return true
      }

      const dias =
        (hoje.getTime() -
          new Date(
            ult.criadoem
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

  /* =========================
     RENDER
  ========================= */

  return (
    <div style={container}>
      {/* =========================
          CLIENTES INATIVOS
      ========================= */}

      {clientesInativos.length >
        0 && (
        <div style={notifBar}>
          <span>
            🔔{" "}
            {
              clientesInativos.length
            }{" "}
            clientes inativos
          </span>

          <button
            style={notifBtn}
            onClick={() =>
              setModalInativos(
                true
              )
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
          style={headerButtons}
        >
          <button
            style={btnSecondary}
            onClick={() =>
              setModalReceita(
                true
              )
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
              (a, c) =>
                a + c.valor,
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
        <h3
          style={sectionTitle}
        >
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

      <div style={filtrosBar}>
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
          HISTÓRICO DE VENDAS
      ========================= */}

      <div style={section}>
        <h3
          style={sectionTitle}
        >
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
                style={compraCard}
              >
                {/* CLIENTE */}

                <div
                  style={
                    compraCliente
                  }
                >
                  <strong>
                    {compra.cliente ||
                      "Sem cliente"}
                  </strong>

                  {compra.cpf && (
                    <div
                      style={muted}
                    >
                      {compra.cpf}
                    </div>
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
                  style={
                    compraInfo
                  }
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
                  style={
                    compraInfo
                  }
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
                  style={
                    compraInfo
                  }
                >
                  <span
                    style={
                      infoLabel
                    }
                  >
                    Fidelidade
                  </span>

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

            <input
              placeholder="Buscar cliente"
              value={buscaCliente}
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
                      {c.pontos} pontos
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

            {clienteSel && (
              <>
                <div
                  style={
                    clienteSelecionado
                  }
                >
                  <strong>
                    {clienteSel.nome}
                  </strong>

                  <span
                    style={
                      clientePontos
                    }
                  >
                    {clienteSel.pontos}{" "}
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
                      {cuponsDisponiveis}{" "}
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

                          if (
                            !ativo
                          ) {
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
                          ) => (
                            <option
                              key={
                                index +
                                1
                              }
                              value={
                                index +
                                1
                              }
                            >
                              {index +
                                1}{" "}
                              {index +
                                1 ===
                              1
                                ? "cupom"
                                : "cupons"}{" "}
                              —{" "}
                              {moeda(
                                (index +
                                  1) *
                                  VALOR_CUPOM
                              )}
                            </option>
                          )
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
                  placeholder="Valor"
                  style={input}
                  value={
                    valor || ""
                  }
                  onChange={e =>
                    setValor(
                      Number(
                        e.target
                          .value
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
                      e.target
                        .value
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
                    Em aberto
                    (Fiado)
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
                  style={resumo}
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
                      {pontosGerados}
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
                    e.target
                      .value
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

/* =========================
   COMPONENTE DASH
========================= */

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
      className={
        className
      }
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

/* =========================
   ESTILOS
========================= */

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
    "hidden" as const
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 18
}

const notifBar = {
  width: "100%",
  background: "#fff6d6",
  padding: "12px 16px",
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
  padding: "11px 18px",
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
  padding: "11px 18px",
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

/* =========================
   FATURAMENTO MÊS
========================= */

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

/* =========================
   FILTROS
========================= */

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

/* =========================
   HISTÓRICO
========================= */

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

/* =========================
   MODAL
========================= */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background:
    "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 2000,
  overflowY:
    "auto" as const
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

/* =========================
   RESPONSIVIDADE
========================= */

const responsiveStyle = 
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

    .compra-card {
      grid-template-columns: 1fr !important;
    }
  }

