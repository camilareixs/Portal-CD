import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
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
  descricao?: string | null
  valor?: number | null
  dataCompetencia?: string | null
  status?: string | null
}

type Despesa = {
  id: string
  descricao?: string | null
  valor?: number | null
  dataCompetencia?: string | null
  status?: string | null
}

type VendaItem = {
  id: string
  compraId?: string | null
  quantidade?: number | null
  custoUnitario?: number | null
}

type Campanha = {
  id: string
  titulo: string
  data_evento: string
  descricao?: string | null
  tipo: "padrao" | "personalizada"
}

type DataSazonal = {
  mes: number
  dia: number
  nome: string
  mensagem: string
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
    const resultado = Number(
      valor.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", "."),
    )
    return Number.isNaN(resultado) ? 0 : resultado
  }

  return 0
}

const texto = (valor: unknown) => String(valor ?? "").trim().toLowerCase()

const compraValida = (compra: Compra) =>
  !["cancelada", "cancelado"].includes(texto(compra.status))

const dataLocal = (valor?: string | null) => {
  if (!valor) return null
  const data = new Date(`${valor.slice(0, 10)}T12:00:00`)
  return Number.isNaN(data.getTime()) ? null : data
}

const dataCurta = (valor?: string | null) => {
  const data = dataLocal(valor)
  return data
    ? data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : "—"
}

const nomeMes = (ano: number, mes: number) =>
  new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })

const dentroDoPeriodo = (
  valor: string | null | undefined,
  ano: number,
  mes: number | null,
) => {
  if (!valor) return false
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return false

  return (
    data.getFullYear() === ano &&
    (mes === null || data.getMonth() === mes)
  )
}

const abrirWhatsApp = (
  telefone: string | null | undefined,
  mensagem: string,
) => {
  const numeroLimpo = String(telefone ?? "").replace(/\D/g, "")
  const numeroComPais = numeroLimpo
    ? numeroLimpo.startsWith("55")
      ? numeroLimpo
      : `55${numeroLimpo}`
    : ""

  const url = numeroComPais
    ? `https://wa.me/${numeroComPais}?text=${encodeURIComponent(mensagem)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagem)}`

  window.open(url, "_blank", "noopener,noreferrer")
}

const segundoDomingo = (ano: number, mes: number) => {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  return 1 + ((7 - primeiroDia) % 7) + 7
}

const ultimaSexta = (ano: number, mes: number) => {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const diaSemana = new Date(ano, mes - 1, ultimoDia).getDay()
  return ultimoDia - ((diaSemana - 5 + 7) % 7)
}

const datasSazonaisDoAno = (ano: number): DataSazonal[] => [
  {
    mes: 1,
    dia: 1,
    nome: "Ano Novo",
    mensagem:
      "Um novo ano começou! Que seja cheio de alegria, realizações e momentos especiais. A Cami&Duda deseja um excelente ano para você!",
  },
  {
    mes: 3,
    dia: 8,
    nome: "Dia da Mulher",
    mensagem:
      "Hoje celebramos mulheres incríveis como você. Que nunca faltem motivos para se sentir especial. Com carinho, Cami&Duda!",
  },
  {
    mes: 3,
    dia: 15,
    nome: "Dia do Consumidor",
    mensagem:
      "Hoje é Dia do Consumidor! A Cami&Duda agradece pela sua confiança e carinho. Esperamos você para conferir nossas novidades!",
  },
  {
    mes: 5,
    dia: segundoDomingo(ano, 5),
    nome: "Dia das Mães",
    mensagem:
      "Neste Dia das Mães, desejamos muito amor, carinho e momentos especiais. A Cami&Duda preparou tudo com muito carinho para celebrar essa data!",
  },
  {
    mes: 6,
    dia: 12,
    nome: "Dia dos Namorados",
    mensagem:
      "Que o amor esteja presente nos pequenos detalhes. A Cami&Duda deseja um Dia dos Namorados cheio de carinho!",
  },
  {
    mes: 8,
    dia: segundoDomingo(ano, 8),
    nome: "Dia dos Pais",
    mensagem:
      "Desejamos um Dia dos Pais cheio de carinho e bons momentos. Com carinho, Cami&Duda!",
  },
  {
    mes: 9,
    dia: 15,
    nome: "Dia do Cliente",
    mensagem:
      "Hoje é Dia do Cliente! Obrigada por fazer parte da história da Cami&Duda. Seu carinho e confiança são muito especiais para nós!",
  },
  {
    mes: 10,
    dia: 12,
    nome: "Dia das Crianças",
    mensagem:
      "Que o dia seja leve, divertido e cheio de alegria. Feliz Dia das Crianças! Com carinho, Cami&Duda.",
  },
  {
    mes: 11,
    dia: ultimaSexta(ano, 11),
    nome: "Black Friday",
    mensagem:
      "A Black Friday chegou à Cami&Duda! Passe na loja para conferir as oportunidades especiais que preparamos.",
  },
  {
    mes: 12,
    dia: 25,
    nome: "Natal",
    mensagem:
      "Que seu Natal seja cheio de amor, paz e momentos especiais. A Cami&Duda deseja boas festas para você e sua família!",
  },
  {
    mes: 12,
    dia: 31,
    nome: "Fim de ano",
    mensagem:
      "Mais um ano chega ao fim! A Cami&Duda agradece por fazer parte da sua história e deseja um novo ciclo cheio de alegria e realizações.",
  },
]

export default function Dashboard() {
  const hoje = new Date()

  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth())
  const [todosMeses, setTodosMeses] = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [itens, setItens] = useState<VendaItem[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoCampanha, setSalvandoCampanha] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagemSucesso, setMensagemSucesso] = useState("")

  const [metaMensal, setMetaMensal] = useState(10000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState("10000")

  const [mensagemAniversario, setMensagemAniversario] = useState(
    "Olá, {nome}! A equipe Cami&Duda deseja um feliz aniversário, com muita saúde, alegria e um novo ciclo cheio de coisas boas. Esperamos te ver em breve!",
  )
  const [mensagemIndicacao, setMensagemIndicacao] = useState(
    "Oi! Quero te apresentar a Cami&Duda, uma loja cheia de peças lindas. Acho que você vai gostar!",
  )

  const [dataSazonalSelecionada, setDataSazonalSelecionada] = useState("")
  const [mensagemSazonal, setMensagemSazonal] = useState("")
  const [dataPersonalizada, setDataPersonalizada] = useState("")
  const [nomeDataPersonalizada, setNomeDataPersonalizada] = useState("")
  const [descricaoDataPersonalizada, setDescricaoDataPersonalizada] = useState("")

  useEffect(() => {
    void carregarDados()
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
        itensResult,
        campanhasResult,
      ] = await Promise.all([
        supabase.from("clientes").select("id,nome,pontos,dataNascimento,celular"),
        supabase
          .from("compras")
          .select("id,clienteid,valor,criadoem,pagamento,status")
          .order("criadoem", { ascending: false }),
        supabase.from("receitas").select("id,descricao,valor,dataCompetencia,status"),
        supabase.from("despesas").select("id,descricao,valor,dataCompetencia,status"),
        supabase.from("vendaItens").select("*"),
        supabase
          .from("calendario_campanhas")
          .select("id,titulo,data_evento,descricao,tipo")
          .order("data_evento", { ascending: true }),
      ])

      for (const resultado of [
        clientesResult,
        comprasResult,
        receitasResult,
        despesasResult,
        itensResult,
        campanhasResult,
      ]) {
        if (resultado.error) throw resultado.error
      }

      setClientes((clientesResult.data ?? []) as Cliente[])
      setCompras((comprasResult.data ?? []) as Compra[])
      setReceitas((receitasResult.data ?? []) as Receita[])
      setDespesas((despesasResult.data ?? []) as Despesa[])
      setItens((itensResult.data ?? []) as VendaItem[])
      setCampanhas((campanhasResult.data ?? []) as Campanha[])
    } catch (error) {
      console.error(error)
      setErro(
        "Não foi possível carregar os dados. Confira os nomes das tabelas e as permissões do Supabase.",
      )
    } finally {
      setCarregando(false)
    }
  }

  const comprasValidas = useMemo(
    () => compras.filter(compraValida),
    [compras],
  )

  const mesFiltro = todosMeses ? null : mesSelecionado

  const comprasPeriodo = useMemo(
    () =>
      comprasValidas.filter(compra =>
        dentroDoPeriodo(compra.criadoem, anoSelecionado, mesFiltro),
      ),
    [comprasValidas, anoSelecionado, mesFiltro],
  )

  const faturamento = comprasPeriodo.reduce(
    (total, compra) => total + numero(compra.valor),
    0,
  )
  const pedidos = comprasPeriodo.length
  const ticketMedio = pedidos ? faturamento / pedidos : 0
  const clientesAtendidos = new Set(
    comprasPeriodo.map(compra => compra.clienteid).filter(Boolean),
  ).size

  const receitasPendentes = receitas
    .filter(
      receita =>
        texto(receita.status) === "pendente" &&
        dentroDoPeriodo(receita.dataCompetencia, anoSelecionado, mesFiltro),
    )
    .reduce((total, receita) => total + numero(receita.valor), 0)

  const despesasPendentes = despesas
    .filter(
      despesa =>
        texto(despesa.status) === "pendente" &&
        dentroDoPeriodo(despesa.dataCompetencia, anoSelecionado, mesFiltro),
    )
    .reduce((total, despesa) => total + numero(despesa.valor), 0)

  const despesasPagas = despesas
    .filter(
      despesa =>
        texto(despesa.status) === "paga" &&
        dentroDoPeriodo(despesa.dataCompetencia, anoSelecionado, mesFiltro),
    )
    .reduce((total, despesa) => total + numero(despesa.valor), 0)

  const custoProdutosVendidos = useMemo(
    () =>
      itens.reduce((total, item) => {
        const compra = comprasValidas.find(venda => venda.id === item.compraId)
        if (
          !compra ||
          !dentroDoPeriodo(compra.criadoem, anoSelecionado, mesFiltro)
        ) {
          return total
        }

        return total + numero(item.custoUnitario) * (numero(item.quantidade) || 1)
      }, 0),
    [itens, comprasValidas, anoSelecionado, mesFiltro],
  )

  const lucroBruto = faturamento - custoProdutosVendidos
  const resultadoEstimado = lucroBruto - despesasPagas

  const comprasAnoAnterior = comprasValidas.filter(compra =>
    dentroDoPeriodo(compra.criadoem, anoSelecionado - 1, mesFiltro),
  )
  const faturamentoAnoAnterior = comprasAnoAnterior.reduce(
    (total, compra) => total + numero(compra.valor),
    0,
  )
  const variacaoComparativo = faturamentoAnoAnterior
    ? ((faturamento - faturamentoAnoAnterior) / faturamentoAnoAnterior) * 100
    : null

  const faturamentoMesAnterior = useMemo(() => {
    if (todosMeses) return 0
    const dataAnterior = new Date(anoSelecionado, mesSelecionado - 1, 1)
    return comprasValidas
      .filter(compra =>
        dentroDoPeriodo(
          compra.criadoem,
          dataAnterior.getFullYear(),
          dataAnterior.getMonth(),
        ),
      )
      .reduce((total, compra) => total + numero(compra.valor), 0)
  }, [comprasValidas, anoSelecionado, mesSelecionado, todosMeses])

  const variacaoMensal =
    !todosMeses && faturamentoMesAnterior
      ? ((faturamento - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
      : null

  const clientesMap = useMemo(
    () => new Map(clientes.map(cliente => [cliente.id, cliente])),
    [clientes],
  )

  const rankingClientes = useMemo(() => {
    const ranking = new Map<
      string,
      { cliente: Cliente; total: number; pedidos: number }
    >()

    comprasPeriodo.forEach(compra => {
      if (!compra.clienteid) return
      const cliente = clientesMap.get(compra.clienteid)
      if (!cliente) return

      const atual = ranking.get(cliente.id)
      if (atual) {
        atual.total += numero(compra.valor)
        atual.pedidos += 1
      } else {
        ranking.set(cliente.id, {
          cliente,
          total: numero(compra.valor),
          pedidos: 1,
        })
      }
    })

    return [...ranking.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [comprasPeriodo, clientesMap])

  const aniversariantes = useMemo(
    () =>
      clientes
        .filter(cliente => {
          const nascimento = dataLocal(cliente.dataNascimento)
          return (
            nascimento &&
            (todosMeses || nascimento.getMonth() === mesSelecionado)
          )
        })
        .sort((a, b) => {
          const dataA = dataLocal(a.dataNascimento)
          const dataB = dataLocal(b.dataNascimento)
          if (!dataA || !dataB) return 0
          return (
            dataA.getMonth() - dataB.getMonth() ||
            dataA.getDate() - dataB.getDate()
          )
        }),
    [clientes, todosMeses, mesSelecionado],
  )

  const vendasPorMes = useMemo(() => {
    const meses = Array.from({ length: 12 }, (_, mes) => ({
      chave: `${anoSelecionado}-${mes}`,
      nome: new Date(anoSelecionado, mes, 1).toLocaleDateString("pt-BR", {
        month: "short",
      }),
      total: 0,
    }))

    comprasValidas.forEach(compra => {
      const data = new Date(compra.criadoem)
      if (data.getFullYear() !== anoSelecionado) return
      const item = meses[data.getMonth()]
      if (item) item.total += numero(compra.valor)
    })

    return meses
  }, [comprasValidas, anoSelecionado])

  const maiorVendaMensal = Math.max(...vendasPorMes.map(mes => mes.total), 1)

  const datasPadrao = useMemo(
    () => datasSazonaisDoAno(anoSelecionado),
    [anoSelecionado],
  )

  const campanhasPersonalizadas = campanhas.filter(
    campanha => campanha.tipo === "personalizada",
  )

  const datasCalendario = useMemo(() => {
    const hojeInicio = new Date()
    hojeInicio.setHours(0, 0, 0, 0)

    const padrao = datasPadrao.map(data => ({
      id: `padrao-${data.mes}-${data.dia}`,
      titulo: data.nome,
      data_evento: `${anoSelecionado}-${String(data.mes).padStart(2, "0")}-${String(data.dia).padStart(2, "0")}`,
      descricao: data.mensagem,
      tipo: "padrao" as const,
    }))

    return [...padrao, ...campanhasPersonalizadas]
      .filter(campanha => {
        const data = dataLocal(campanha.data_evento)
        return data && data >= hojeInicio
      })
      .sort((a, b) => {
        const dataA = dataLocal(a.data_evento)?.getTime() ?? 0
        const dataB = dataLocal(b.data_evento)?.getTime() ?? 0
        return dataA - dataB
      })
      .slice(0, 8)
  }, [datasPadrao, campanhasPersonalizadas, anoSelecionado])

  function selecionarDataSazonal(valor: string) {
    setDataSazonalSelecionada(valor)

    if (valor === "outra") {
      setMensagemSazonal("")
      return
    }

    const data = datasCalendario.find(item => item.id === valor)
    setMensagemSazonal(data?.descricao ?? "")
    setDataPersonalizada("")
    setNomeDataPersonalizada("")
    setDescricaoDataPersonalizada("")
  }

  async function salvarCampanhaPersonalizada() {
    if (!nomeDataPersonalizada.trim() || !dataPersonalizada) {
      setErro("Informe o nome e a data da campanha personalizada.")
      return
    }

    try {
      setSalvandoCampanha(true)
      setErro("")
      setMensagemSucesso("")

      const { data, error } = await supabase
        .from("calendario_campanhas")
        .insert({
          titulo: nomeDataPersonalizada.trim(),
          data_evento: dataPersonalizada,
          descricao: descricaoDataPersonalizada.trim() || null,
          tipo: "personalizada",
        })
        .select("id,titulo,data_evento,descricao,tipo")
        .single()

      if (error) throw error

      setCampanhas(atual => [...atual, data as Campanha])
      setDataSazonalSelecionada(data.id)
      setMensagemSazonal(data.descricao ?? "")
      setMensagemSucesso("Campanha salva no calendário.")
      setDataPersonalizada("")
      setNomeDataPersonalizada("")
      setDescricaoDataPersonalizada("")
    } catch (error) {
      console.error(error)
      setErro("Não foi possível salvar a campanha no calendário.")
    } finally {
      setSalvandoCampanha(false)
    }
  }

  function salvarMeta() {
    const valor = numero(novaMeta)
    if (valor > 0) setMetaMensal(valor)
    setEditandoMeta(false)
  }

  const metaPeriodo = todosMeses ? metaMensal * 12 : metaMensal
  const percentualMeta = metaPeriodo > 0 ? (faturamento / metaPeriodo) * 100 : 0
  const tituloPeriodo = todosMeses
    ? `ano de ${anoSelecionado}`
    : nomeMes(anoSelecionado, mesSelecionado)

  if (carregando) {
    return <div style={styles.loading}>Carregando dashboard...</div>
  }

  return (
    <main style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        .dash-grid { display:grid; gap:16px; }
        .dash-kpis { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .dash-two { grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); }
        .dash-three { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .dash-card { min-width:0; background:#fff; border:1px solid #e7e1d5; border-radius:12px; padding:18px; }
        .dash-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid #eee9df; }
        .dash-row:last-child { border-bottom:0; }
        .dash-bar { display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:7px; min-width:0; flex:1; }
        .dash-btn { border:1px solid #d5c08b; background:#fffaf0; color:#735b15; border-radius:7px; padding:9px 12px; cursor:pointer; font-size:12px; }
        .dash-btn:disabled { opacity:.4; cursor:not-allowed; }
        @media(max-width:900px) {
          .dash-kpis,.dash-three { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .dash-two { grid-template-columns:1fr; }
        }
        @media(max-width:560px) {
          .dash-kpis,.dash-three { grid-template-columns:1fr; }
          .dash-card { padding:14px; }
        }
      `}</style>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Cami&Duda</h1>
          <p style={styles.subtitle}>Visão geral da loja por período</p>
        </div>

        <div style={styles.filters}>
          <label style={styles.filterLabel}>
            Ano
            <select
              value={anoSelecionado}
              onChange={e => setAnoSelecionado(Number(e.target.value))}
              style={styles.select}
            >
              {Array.from({ length: 7 }, (_, indice) => hoje.getFullYear() - 5 + indice).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </label>

          <label style={styles.filterLabel}>
            Mês
            <select
              value={mesSelecionado}
              disabled={todosMeses}
              onChange={e => setMesSelecionado(Number(e.target.value))}
              style={styles.select}
            >
              {Array.from({ length: 12 }, (_, mes) => (
                <option key={mes} value={mes}>
                  {new Date(anoSelecionado, mes, 1).toLocaleDateString("pt-BR", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={todosMeses}
              onChange={e => setTodosMeses(e.target.checked)}
            />
            Todos os meses
          </label>
        </div>
      </header>

      {erro && <div style={styles.error}>{erro}</div>}
      {mensagemSucesso && <div style={styles.success}>{mensagemSucesso}</div>}

      <section className="dash-grid dash-kpis" style={{ marginBottom: 16 }}>
        <Kpi
          titulo={todosMeses ? "Faturamento do ano" : "Faturamento do mês"}
          valor={moeda(faturamento)}
          detalhe={`${pedidos} venda(s)`}
        />
        <Kpi
          titulo="Ticket médio"
          valor={moeda(ticketMedio)}
          detalhe="Valor médio por venda"
        />
        <Kpi
          titulo="Clientes atendidos"
          valor={String(clientesAtendidos)}
          detalhe="Clientes com compra no período"
        />
        <Kpi
          titulo="Resultado estimado"
          valor={moeda(resultadoEstimado)}
          detalhe="Lucro bruto menos despesas pagas"
        />
      </section>

      <section className="dash-grid dash-two" style={{ marginBottom: 16 }}>
        <div className="dash-card">
          <h2 style={styles.cardTitle}>Evolução das vendas</h2>
          <p style={styles.cardSub}>
            Faturamento dos 12 meses de {anoSelecionado}.
          </p>

          <div style={styles.chart}>
            {vendasPorMes.map((mes, indice) => (
              <div className="dash-bar" key={mes.chave}>
                <small style={styles.chartValue}>
                  {mes.total ? moeda(mes.total) : "R$ 0"}
                </small>
                <div
                  style={{
                    width: "min(42px,75%)",
                    height: `${Math.max(mes.total ? 8 : 3, (mes.total / maiorVendaMensal) * 150)}px`,
                    background:
                      !todosMeses && indice === mesSelecionado
                        ? "#735b15"
                        : mes.total
                          ? "#c9a227"
                          : "#e9e4d8",
                    borderRadius: "6px 6px 0 0",
                  }}
                />
                <span style={styles.chartLabel}>{mes.nome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>
            {todosMeses ? "Comparativo anual" : "Comparativo mensal"}
          </h2>
          <p style={styles.cardSub}>
            {todosMeses
              ? `${anoSelecionado} × ${anoSelecionado - 1}`
              : `${nomeMes(anoSelecionado, mesSelecionado)} × mês anterior`}
          </p>

          <div style={styles.compareNumber}>{moeda(faturamento)}</div>
          <div style={styles.muted}>
            {todosMeses ? "Faturamento do ano" : "Mês selecionado"}
          </div>

          <div
            style={{
              ...styles.compareChange,
              color:
                (todosMeses ? variacaoComparativo : variacaoMensal) === null
                  ? "#777"
                  : (todosMeses ? variacaoComparativo : variacaoMensal)! >= 0
                    ? "#28764b"
                    : "#b13b35",
            }}
          >
            {(todosMeses ? variacaoComparativo : variacaoMensal) === null
              ? "Sem período anterior para comparar"
              : `${(todosMeses ? variacaoComparativo : variacaoMensal)! >= 0 ? "▲" : "▼"} ${Math.abs((todosMeses ? variacaoComparativo : variacaoMensal)!).toFixed(1)}% em relação ao período anterior`}
          </div>

          <div style={styles.comparePrevious}>
            {todosMeses ? "Ano anterior: " : "Mês anterior: "}
            <strong>
              {moeda(todosMeses ? faturamentoAnoAnterior : faturamentoMesAnterior)}
            </strong>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={styles.flexBetween}>
              <strong style={{ fontSize: 13 }}>
                {todosMeses ? "Meta anual" : "Meta do mês"}
              </strong>
              <button
                className="dash-btn"
                onClick={() => {
                  setNovaMeta(String(metaMensal))
                  setEditandoMeta(true)
                }}
              >
                Editar meta mensal
              </button>
            </div>

            <div style={{ ...styles.flexBetween, marginTop: 12 }}>
              <strong>{moeda(faturamento)}</strong>
              <span style={styles.muted}>de {moeda(metaPeriodo)}</span>
            </div>

            <div style={styles.progressBg}>
              <div
                style={{
                  ...styles.progress,
                  width: `${Math.min(100, percentualMeta)}%`,
                }}
              />
            </div>

            <div style={styles.flexBetween}>
              <span style={styles.muted}>
                {Math.min(100, percentualMeta).toFixed(0)}% atingido
              </span>
              <span style={styles.muted}>
                Faltam {moeda(Math.max(0, metaPeriodo - faturamento))}
              </span>
            </div>

            {editandoMeta && (
              <div style={{ marginTop: 12 }}>
                <input
                  value={novaMeta}
                  onChange={e => setNovaMeta(e.target.value)}
                  style={styles.input}
                  placeholder="Valor da meta mensal"
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="dash-btn" onClick={salvarMeta}>Salvar</button>
                  <button className="dash-btn" onClick={() => setEditandoMeta(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dash-grid dash-two" style={{ marginBottom: 16 }}>
        <div className="dash-card">
          <h2 style={styles.cardTitle}>Principais clientes</h2>
          <p style={styles.cardSub}>
            Ordenados pelo valor comprado em {tituloPeriodo}.
          </p>

          {rankingClientes.length ? (
            rankingClientes.map((item, indice) => (
              <div className="dash-row" key={item.cliente.id}>
                <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                  <span style={styles.rank}>{indice + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={styles.rowName}>{item.cliente.nome}</strong>
                    <div style={styles.muted}>{item.pedidos} compra(s)</div>
                  </div>
                </div>
                <strong>{moeda(item.total)}</strong>
              </div>
            ))
          ) : (
            <Empty>Nenhuma compra neste período.</Empty>
          )}
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>Visão financeira</h2>
          <p style={styles.cardSub}>Valores registrados em {tituloPeriodo}.</p>
          <FinancialRow label="Receitas pendentes" value={moeda(receitasPendentes)} />
          <FinancialRow label="Despesas pendentes" value={moeda(despesasPendentes)} />
          <FinancialRow label="Despesas pagas" value={moeda(despesasPagas)} />
          <FinancialRow label="Custo dos produtos vendidos" value={moeda(custoProdutosVendidos)} />
          <FinancialRow label="Lucro bruto estimado" value={moeda(lucroBruto)} strong />
        </div>
      </section>

      <section className="dash-card" style={{ marginBottom: 16 }}>
        <h2 style={styles.cardTitle}>Ações da loja</h2>
        <p style={styles.cardSub}>
          Prepare mensagens e campanhas para revisar antes de enviar pelo WhatsApp.
        </p>

        <div className="dash-grid dash-three">
          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Aniversariantes</h3>
            <p style={styles.cardSub}>
              {aniversariantes.length} cliente(s) fazem aniversário{" "}
              {todosMeses ? `em ${anoSelecionado}` : `em ${nomeMes(anoSelecionado, mesSelecionado)}`}.
            </p>

            <label style={styles.label}>Mensagem — use {"{nome}"} para personalizar</label>
            <textarea
              rows={4}
              value={mensagemAniversario}
              onChange={e => setMensagemAniversario(e.target.value)}
              style={styles.textarea}
            />

            {aniversariantes.map(cliente => (
              <div className="dash-row" key={cliente.id}>
                <div style={{ minWidth: 0 }}>
                  <strong style={styles.rowName}>{cliente.nome}</strong>
                  <div style={styles.muted}>{dataCurta(cliente.dataNascimento)}</div>
                </div>
                <button
                  className="dash-btn"
                  onClick={() =>
                    abrirWhatsApp(
                      cliente.celular,
                      mensagemAniversario.replaceAll("{nome}", cliente.nome),
                    )
                  }
                >
                  WhatsApp
                </button>
              </div>
            ))}

            {!aniversariantes.length && (
              <Empty>Não há aniversariantes cadastrados neste período.</Empty>
            )}
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Indique uma amiga</h3>
            <p style={styles.cardSub}>Mensagem pronta para compartilhar com uma cliente.</p>
            <label style={styles.label}>Texto da mensagem</label>
            <textarea
              rows={5}
              value={mensagemIndicacao}
              onChange={e => setMensagemIndicacao(e.target.value)}
              style={styles.textarea}
            />
            <button
              className="dash-btn"
              style={{ marginTop: 10 }}
              onClick={() => abrirWhatsApp(null, mensagemIndicacao)}
            >
              Compartilhar mensagem
            </button>
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Calendário sazonal</h3>
            <p style={styles.cardSub}>
              Datas comerciais e campanhas personalizadas salvas no calendário.
            </p>

            <label style={styles.label}>Datas próximas</label>
            <select
              style={styles.input}
              value={dataSazonalSelecionada}
              onChange={e => selecionarDataSazonal(e.target.value)}
            >
              <option value="">Selecione uma data</option>
              {datasCalendario.map(data => (
                <option key={data.id} value={data.id}>
                  {dataCurta(data.data_evento)} — {data.titulo}
                </option>
              ))}
              <option value="outra">Outra data...</option>
            </select>

            {dataSazonalSelecionada === "outra" && (
              <>
                <label style={{ ...styles.label, marginTop: 10 }}>Nome da campanha</label>
                <input
                  value={nomeDataPersonalizada}
                  onChange={e => setNomeDataPersonalizada(e.target.value)}
                  style={styles.input}
                  placeholder="Ex.: Aniversário da loja"
                />

                <label style={{ ...styles.label, marginTop: 10 }}>Data</label>
                <input
                  type="date"
                  value={dataPersonalizada}
                  onChange={e => setDataPersonalizada(e.target.value)}
                  style={styles.input}
                />

                <label style={{ ...styles.label, marginTop: 10 }}>Descrição (opcional)</label>
                <textarea
                  rows={3}
                  value={descricaoDataPersonalizada}
                  onChange={e => setDescricaoDataPersonalizada(e.target.value)}
                  style={styles.textarea}
                  placeholder="Observações sobre a campanha..."
                />

                <button
                  className="dash-btn"
                  style={{ marginTop: 10 }}
                  disabled={salvandoCampanha || !nomeDataPersonalizada.trim() || !dataPersonalizada}
                  onClick={() => void salvarCampanhaPersonalizada()}
                >
                  {salvandoCampanha ? "Salvando..." : "Salvar data no calendário"}
                </button>
              </>
            )}

            <label style={{ ...styles.label, marginTop: 10 }}>Mensagem da campanha</label>
            <textarea
              rows={4}
              value={mensagemSazonal}
              onChange={e => setMensagemSazonal(e.target.value)}
              style={styles.textarea}
              placeholder="Selecione uma data e escreva a mensagem..."
            />

            <button
              className="dash-btn"
              style={{ marginTop: 10 }}
              disabled={!mensagemSazonal.trim()}
              onClick={() => abrirWhatsApp(null, mensagemSazonal)}
            >
              Abrir campanha no WhatsApp
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Kpi({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string
  valor: string
  detalhe: string
}) {
  return (
    <div className="dash-card">
      <div style={styles.muted}>{titulo}</div>
      <strong style={styles.kpiValue}>{valor}</strong>
      <div style={styles.muted}>{detalhe}</div>
    </div>
  )
}

function FinancialRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="dash-row">
      <span style={{ color: "#777", fontSize: 13 }}>{label}</span>
      <strong
        style={{
          fontSize: 13,
          color: strong ? "#735b15" : "#222",
        }}
      >
        {value}
      </strong>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={styles.empty}>{children}</div>
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 1400,
    margin: "0 auto",
    padding: 24,
    background: "#faf9f6",
    color: "#222",
  },
  loading: {
    padding: 50,
    textAlign: "center",
    color: "#777",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: "clamp(25px, 3vw, 34px)",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#777",
    fontSize: 14,
  },
  filters: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  filterLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#777",
    fontSize: 13,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#777",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  select: {
    padding: "10px 12px",
    border: "1px solid #ddd5c6",
    borderRadius: 8,
    background: "#fff",
    color: "#222",
    textTransform: "capitalize",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #e5bcbc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: "#9a3333",
  },
  success: {
    background: "#effaf2",
    border: "1px solid #b9dfc2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    color: "#28764b",
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
    color: "#222",
  },
  cardSub: {
    margin: "5px 0 16px",
    color: "#888",
    fontSize: 12,
    lineHeight: 1.5,
  },
  muted: {
    color: "#888",
    fontSize: 12,
    lineHeight: 1.45,
  },
  kpiValue: {
    display: "block",
    margin: "10px 0 7px",
    fontSize: "clamp(19px, 2vw, 27px)",
    overflowWrap: "anywhere",
  },
  chart: {
    height: 220,
    display: "flex",
    alignItems: "flex-end",
    gap: 7,
    padding: "8px 4px 0",
    overflowX: "auto",
  },
  chartValue: {
    color: "#777",
    fontSize: 9,
    whiteSpace: "nowrap",
  },
  chartLabel: {
    color: "#777",
    fontSize: 11,
    textTransform: "capitalize",
  },
  compareNumber: {
    fontSize: 28,
    fontWeight: 700,
    marginTop: 20,
  },
  compareChange: {
    fontSize: 13,
    fontWeight: 600,
    marginTop: 12,
  },
  comparePrevious: {
    marginTop: 8,
    color: "#777",
    fontSize: 12,
  },
  flexBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  progressBg: {
    height: 8,
    background: "#eee9df",
    borderRadius: 20,
    overflow: "hidden",
    margin: "8px 0",
  },
  progress: {
    height: "100%",
    background: "#c9a227",
    borderRadius: 20,
  },
  input: {
    width: "100%",
    padding: "9px 10px",
    border: "1px solid #ddd5c6",
    borderRadius: 7,
    background: "#fff",
    color: "#222",
  },
  rowName: {
    fontSize: 13,
    lineHeight: 1.4,
  },
  rank: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 25,
    height: 25,
    borderRadius: "50%",
    background: "#f1eadb",
    color: "#806b32",
    fontSize: 11,
    fontWeight: 700,
  },
  actionCard: {
    minWidth: 0,
    padding: 14,
    border: "1px solid #eee6d8",
    borderRadius: 10,
    background: "#fdfbf6",
  },
  actionTitle: {
    margin: 0,
    fontSize: 15,
  },
  label: {
    display: "block",
    color: "#777",
    fontSize: 11,
    marginBottom: 6,
  },
  textarea: {
    width: "100%",
    padding: 10,
    border: "1px solid #ddd5c6",
    borderRadius: 7,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.5,
    background: "#fff",
    color: "#222",
  },
  empty: {
    padding: "18px 0",
    textAlign: "center",
    color: "#888",
    fontSize: 12,
  },
}
