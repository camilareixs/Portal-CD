import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Periodo = "7" | "30" | "90" | "365" | "all"

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

type Produto = {
  id: string
  nome: string
  ativo?: boolean | null
}

type Variante = {
  id: string
  produtoId?: string | null
  estoqueAtual?: number | null
  estoqueMinimo?: number | null
  ativo?: boolean | null
}

type VendaItem = {
  id: string
  compraId?: string | null
  quantidade?: number | null
  custoUnitario?: number | null
  produtoId?: string | null
  produtoVarianteId?: string | null
  varianteId?: string | null
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

const inicioMes = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth(), 1)

const fimMes = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth() + 1, 1)

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

const nomeMes = (data: Date) =>
  data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

const dentroDoPeriodo = (valor: string, periodo: Periodo) => {
  if (periodo === "all") return true
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return false

  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - Number(periodo) + 1)
  return data >= inicio
}

const abrirWhatsApp = (telefone: string | null | undefined, mensagem: string) => {
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

const datasSazonais = [
  { mes: 1, dia: 1, nome: "Ano Novo", mensagem: "Um novo ano começou! Que seja cheio de alegria, realizações e momentos especiais. A Cami&Duda deseja um excelente ano para você!" },
  { mes: 2, dia: 14, nome: "Dia de São Valentim", mensagem: "Hoje é dia de celebrar o amor e o carinho. Que seu dia seja especial! Com carinho, Cami&Duda." },
  { mes: 3, dia: 8, nome: "Dia da Mulher", mensagem: "Hoje celebramos mulheres incríveis como você. Que nunca faltem motivos para se sentir especial. Com carinho, Cami&Duda!" },
  { mes: 5, dia: 2, nome: "Dia das Mães", mensagem: "Neste Dia das Mães, desejamos muito amor, carinho e momentos especiais. A Cami&Duda preparou tudo com muito carinho para celebrar essa data!" },
  { mes: 6, dia: 12, nome: "Dia dos Namorados", mensagem: "Que o amor esteja presente nos pequenos detalhes. A Cami&Duda deseja um Dia dos Namorados cheio de carinho!" },
  { mes: 8, dia: 9, nome: "Dia dos Pais", mensagem: "Desejamos um Dia dos Pais cheio de carinho e bons momentos. Com carinho, Cami&Duda!" },
  { mes: 10, dia: 12, nome: "Dia das Crianças", mensagem: "Que o dia seja leve, divertido e cheio de alegria. Feliz Dia das Crianças! Com carinho, Cami&Duda." },
  { mes: 11, dia: 27, nome: "Black Friday", mensagem: "A Black Friday chegou à Cami&Duda! Passe na loja para conferir as oportunidades especiais que preparamos." },
  { mes: 12, dia: 25, nome: "Natal", mensagem: "Que seu Natal seja cheio de amor, paz e momentos especiais. A Cami&Duda deseja boas festas para você e sua família!" },
]

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("30")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [itens, setItens] = useState<VendaItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  const [meta, setMeta] = useState(10000)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [novaMeta, setNovaMeta] = useState("10000")

  const [mensagemAniversario, setMensagemAniversario] = useState(
    "Olá, {nome}! A equipe Cami&Duda deseja um feliz aniversário, com muita saúde, alegria e um novo ciclo cheio de coisas boas. Esperamos te ver em breve!",
  )
  const [mensagemIndicacao, setMensagemIndicacao] = useState(
    "Oi! Quero te apresentar a Cami&Duda, uma loja cheia de peças lindas. Acho que você vai gostar! 💛",
  )
  const [dataSazonalSelecionada, setDataSazonalSelecionada] = useState("")
  const [mensagemSazonal, setMensagemSazonal] = useState("")
  const [dataPersonalizada, setDataPersonalizada] = useState("")
  const [nomeDataPersonalizada, setNomeDataPersonalizada] = useState("")

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
        itensResult,
      ] = await Promise.all([
        supabase.from("clientes").select("id,nome,pontos,dataNascimento,celular"),
        supabase.from("compras").select("id,clienteid,valor,criadoem,pagamento,status").order("criadoem", { ascending: false }),
        supabase.from("receitas").select("id,descricao,valor,dataCompetencia,status"),
        supabase.from("despesas").select("id,descricao,valor,dataCompetencia,status"),
        supabase.from("produtos").select("id,nome,ativo"),
        supabase.from("produtoVariantes").select("id,produtoId,estoqueAtual,estoqueMinimo,ativo"),
        supabase.from("vendaItens").select("*"),
      ])

      for (const resultado of [
        clientesResult, comprasResult, receitasResult, despesasResult,
        produtosResult, variantesResult, itensResult,
      ]) {
        if (resultado.error) throw resultado.error
      }

      setClientes((clientesResult.data ?? []) as Cliente[])
      setCompras((comprasResult.data ?? []) as Compra[])
      setReceitas((receitasResult.data ?? []) as Receita[])
      setDespesas((despesasResult.data ?? []) as Despesa[])
      setProdutos((produtosResult.data ?? []) as Produto[])
      setVariantes((variantesResult.data ?? []) as Variante[])
      setItens((itensResult.data ?? []) as VendaItem[])
    } catch (error) {
      console.error(error)
      setErro("Não foi possível carregar os dados do dashboard.")
    } finally {
      setCarregando(false)
    }
  }

  const clientesMap = useMemo(
    () => new Map(clientes.map(cliente => [cliente.id, cliente])),
    [clientes],
  )

  const comprasValidas = useMemo(() => compras.filter(compraValida), [compras])

  const comprasPeriodo = useMemo(
    () => comprasValidas.filter(compra => dentroDoPeriodo(compra.criadoem, periodo)),
    [comprasValidas, periodo],
  )

  const faturamento = comprasPeriodo.reduce((total, compra) => total + numero(compra.valor), 0)
  const pedidos = comprasPeriodo.length
  const ticketMedio = pedidos ? faturamento / pedidos : 0

  const clientesAtendidos = new Set(
    comprasPeriodo.map(compra => compra.clienteid).filter(Boolean),
  ).size

  const receitasPendentes = receitas
    .filter(receita => texto(receita.status) === "pendente" && receita.dataCompetencia && dentroDoPeriodo(receita.dataCompetencia, periodo))
    .reduce((total, receita) => total + numero(receita.valor), 0)

  const despesasPendentes = despesas
    .filter(despesa => texto(despesa.status) === "pendente" && despesa.dataCompetencia && dentroDoPeriodo(despesa.dataCompetencia, periodo))
    .reduce((total, despesa) => total + numero(despesa.valor), 0)

  const despesasPagas = despesas
    .filter(despesa => texto(despesa.status) === "paga" && despesa.dataCompetencia && dentroDoPeriodo(despesa.dataCompetencia, periodo))
    .reduce((total, despesa) => total + numero(despesa.valor), 0)

  const custoProdutosVendidos = useMemo(() => {
    return itens.reduce((total, item) => {
      const compra = comprasValidas.find(venda => venda.id === item.compraId)
      if (!compra || !dentroDoPeriodo(compra.criadoem, periodo)) return total
      return total + numero(item.custoUnitario) * (numero(item.quantidade) || 1)
    }, 0)
  }, [itens, comprasValidas, periodo])

  const lucroBruto = faturamento - custoProdutosVendidos
  const resultadoEstimado = lucroBruto - despesasPagas

  const mesAtual = new Date()
  const primeiroDiaAtual = inicioMes(mesAtual)
  const primeiroDiaAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1)
  const primeiroDiaProximo = fimMes(mesAtual)

  const vendasMesAtual = comprasValidas.filter(compra => {
    const data = new Date(compra.criadoem)
    return data >= primeiroDiaAtual && data < primeiroDiaProximo
  })

  const vendasMesAnterior = comprasValidas.filter(compra => {
    const data = new Date(compra.criadoem)
    return data >= primeiroDiaAnterior && data < primeiroDiaAtual
  })

  const faturamentoMesAtual = vendasMesAtual.reduce((total, compra) => total + numero(compra.valor), 0)
  const faturamentoMesAnterior = vendasMesAnterior.reduce((total, compra) => total + numero(compra.valor), 0)
  const variacaoMensal = faturamentoMesAnterior
    ? ((faturamentoMesAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
    : null

  const aniversariantes = useMemo(() => {
    return clientes
      .filter(cliente => {
        const nascimento = dataLocal(cliente.dataNascimento)
        return nascimento && nascimento.getMonth() === mesAtual.getMonth()
      })
      .sort((a, b) => {
        const dataA = dataLocal(a.dataNascimento)?.getDate() ?? 0
        const dataB = dataLocal(b.dataNascimento)?.getDate() ?? 0
        return dataA - dataB
      })
  }, [clientes, mesAtual.getMonth()])

  const vendasPorMes = useMemo(() => {
    const meses = Array.from({ length: 6 }, (_, indice) => {
      const data = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 5 + indice, 1)
      return {
        chave: `${data.getFullYear()}-${data.getMonth()}`,
        nome: data.toLocaleDateString("pt-BR", { month: "short" }),
        total: 0,
      }
    })

    comprasValidas.forEach(compra => {
      const data = new Date(compra.criadoem)
      const mes = meses.find(item => item.chave === `${data.getFullYear()}-${data.getMonth()}`)
      if (mes) mes.total += numero(compra.valor)
    })

    return meses
  }, [comprasValidas, mesAtual.getMonth(), mesAtual.getFullYear()])

  const maiorVendaMensal = Math.max(...vendasPorMes.map(mes => mes.total), 1)

  const rankingClientes = useMemo(() => {
    const ranking = new Map<string, { cliente: Cliente; total: number; pedidos: number }>()

    comprasPeriodo.forEach(compra => {
      if (!compra.clienteid) return
      const cliente = clientesMap.get(compra.clienteid)
      if (!cliente) return

      const atual = ranking.get(cliente.id)
      if (atual) {
        atual.total += numero(compra.valor)
        atual.pedidos += 1
      } else {
        ranking.set(cliente.id, { cliente, total: numero(compra.valor), pedidos: 1 })
      }
    })

    return [...ranking.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  }, [comprasPeriodo, clientesMap])

  const estoqueBaixo = variantes.filter(variante =>
    variante.ativo !== false &&
    numero(variante.estoqueAtual) <= numero(variante.estoqueMinimo),
  )

  const produtosAtivos = produtos.filter(produto => produto.ativo !== false).length

  const datasCalendario = useMemo(() => {
    const ano = new Date().getFullYear()
    const hoje = new Date()
    return datasSazonais
      .map(data => ({
        ...data,
        data: new Date(ano, data.mes - 1, data.dia),
      }))
      .filter(data => data.data >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()))
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, 5)
  }, [])

  function selecionarDataSazonal(valor: string) {
    setDataSazonalSelecionada(valor)
    const data = datasSazonais.find(item => `${item.mes}-${item.dia}` === valor)
    setMensagemSazonal(data?.mensagem ?? "")
  }

  function salvarMeta() {
    const valor = numero(novaMeta)
    if (valor > 0) setMeta(valor)
    setEditandoMeta(false)
  }

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
        @media(max-width:900px) { .dash-kpis,.dash-three { grid-template-columns:repeat(2,minmax(0,1fr)); } .dash-two { grid-template-columns:1fr; } }
        @media(max-width:560px) { .dash-kpis,.dash-three { grid-template-columns:1fr; } .dash-card { padding:14px; } }
      `}</style>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Cami&Duda</h1>
          <p style={styles.subtitle}>Visão geral da operação da loja</p>
        </div>
        <label style={styles.filterLabel}>
          Período
          <select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} style={styles.select}>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">1 ano</option>
            <option value="all">Todo o período</option>
          </select>
        </label>
      </header>

      {erro && <div style={styles.error}>{erro}</div>}

      <section className="dash-grid dash-kpis" style={{ marginBottom: 16 }}>
        <Kpi titulo="Faturamento do período" valor={moeda(faturamento)} detalhe={`${pedidos} venda(s)`} />
        <Kpi titulo="Ticket médio" valor={moeda(ticketMedio)} detalhe="Valor médio por venda" />
        <Kpi titulo="Clientes atendidos" valor={String(clientesAtendidos)} detalhe="Clientes com compra no período" />
        <Kpi titulo="Resultado estimado" valor={moeda(resultadoEstimado)} detalhe="Faturamento − custo dos itens − despesas pagas" />
      </section>

      <section className="dash-grid dash-two" style={{ marginBottom: 16 }}>
        <div className="dash-card">
          <h2 style={styles.cardTitle}>Vendas dos últimos 6 meses</h2>
          <p style={styles.cardSub}>Faturamento mensal, incluindo meses sem vendas.</p>
          <div style={styles.chart}>
            {vendasPorMes.map(mes => (
              <div className="dash-bar" key={mes.chave}>
                <small style={styles.chartValue}>{mes.total ? moeda(mes.total) : "R$ 0"}</small>
                <div style={{
                  width: "min(42px,75%)",
                  height: `${Math.max(mes.total ? 8 : 3, (mes.total / maiorVendaMensal) * 150)}px`,
                  background: mes.total ? "#c9a227" : "#e9e4d8",
                  borderRadius: "6px 6px 0 0",
                }} />
                <span style={styles.chartLabel}>{mes.nome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>Comparativo mensal</h2>
          <p style={styles.cardSub}>{nomeMes(mesAtual)} × {nomeMes(primeiroDiaAnterior)}</p>
          <div style={styles.compareNumber}>{moeda(faturamentoMesAtual)}</div>
          <div style={styles.muted}>Mês atual até agora</div>
          <div style={{ ...styles.compareChange, color: variacaoMensal === null ? "#777" : variacaoMensal >= 0 ? "#28764b" : "#b13b35" }}>
            {variacaoMensal === null ? "Sem vendas no mês anterior para comparar" : `${variacaoMensal >= 0 ? "▲" : "▼"} ${Math.abs(variacaoMensal).toFixed(1)}% em relação ao mês anterior`}
          </div>
          <div style={styles.comparePrevious}>
            Mês anterior: <strong>{moeda(faturamentoMesAnterior)}</strong>
          </div>
          <div style={{ marginTop: 22 }}>
            <div style={styles.flexBetween}>
              <strong style={{ fontSize: 13 }}>Meta mensal</strong>
              <button className="dash-btn" onClick={() => { setNovaMeta(String(meta)); setEditandoMeta(true) }}>Editar meta</button>
            </div>
            <div style={{ ...styles.flexBetween, marginTop: 12 }}>
              <strong>{moeda(faturamentoMesAtual)}</strong>
              <span style={styles.muted}>de {moeda(meta)}</span>
            </div>
            <div style={styles.progressBg}>
              <div style={{ ...styles.progress, width: `${Math.min(100, (faturamentoMesAtual / meta) * 100)}%` }} />
            </div>
            <div style={styles.flexBetween}>
              <span style={styles.muted}>{Math.min(100, (faturamentoMesAtual / meta) * 100).toFixed(0)}% atingido</span>
              <span style={styles.muted}>Faltam {moeda(Math.max(0, meta - faturamentoMesAtual))}</span>
            </div>
            {editandoMeta && (
              <div style={{ marginTop: 12 }}>
                <input value={novaMeta} onChange={e => setNovaMeta(e.target.value)} style={styles.input} placeholder="Valor da meta" />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="dash-btn" onClick={salvarMeta}>Salvar</button>
                  <button className="dash-btn" onClick={() => setEditandoMeta(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dash-grid dash-two" style={{ marginBottom: 16 }}>
        <div className="dash-card">
          <h2 style={styles.cardTitle}>Principais clientes</h2>
          <p style={styles.cardSub}>Ordenados pelo valor comprado no período.</p>
          {rankingClientes.length ? rankingClientes.map((item, indice) => (
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
          )) : <Empty>Nenhuma compra no período.</Empty>}
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>Visão financeira</h2>
          <p style={styles.cardSub}>Valores registrados no período selecionado.</p>
          <FinancialRow label="Receitas pendentes" value={moeda(receitasPendentes)} />
          <FinancialRow label="Despesas pendentes" value={moeda(despesasPendentes)} />
          <FinancialRow label="Despesas pagas" value={moeda(despesasPagas)} />
          <FinancialRow label="Custo dos produtos vendidos" value={moeda(custoProdutosVendidos)} />
          <FinancialRow label="Lucro bruto estimado" value={moeda(lucroBruto)} strong />
        </div>
      </section>

      <section className="dash-grid dash-three" style={{ marginBottom: 16 }}>
        <div className="dash-card">
          <h2 style={styles.cardTitle}>Estoque</h2>
          <p style={styles.cardSub}>Resumo dos cadastros atuais.</p>
          <div style={styles.bigNumber}>{produtosAtivos}</div>
          <div style={styles.muted}>Produtos ativos</div>
          <div style={{ ...styles.stockAlert, marginTop: 14 }}>
            <strong>{estoqueBaixo.length}</strong> variante(s) com estoque no mínimo ou abaixo dele.
          </div>
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>Formas de pagamento</h2>
          <p style={styles.cardSub}>Faturamento por forma de pagamento no período.</p>
          {(() => {
            const pagamentos = new Map<string, number>()
            comprasPeriodo.forEach(compra => {
              const nome = compra.pagamento?.trim() || "Não informado"
              pagamentos.set(nome, (pagamentos.get(nome) ?? 0) + numero(compra.valor))
            })
            return [...pagamentos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, total]) => (
              <FinancialRow key={nome} label={nome} value={moeda(total)} />
            ))
          })()}
        </div>

        <div className="dash-card">
          <h2 style={styles.cardTitle}>Atenção financeira</h2>
          <p style={styles.cardSub}>Pendências que merecem acompanhamento.</p>
          <div style={styles.attention}>
            <span>Receitas pendentes</span>
            <strong>{moeda(receitasPendentes)}</strong>
          </div>
          <div style={styles.attention}>
            <span>Despesas pendentes</span>
            <strong>{moeda(despesasPendentes)}</strong>
          </div>
        </div>
      </section>

      <section className="dash-card" style={{ marginBottom: 16 }}>
        <h2 style={styles.cardTitle}>Ações da loja</h2>
        <p style={styles.cardSub}>Prepare mensagens e campanhas para revisar antes de enviar pelo WhatsApp.</p>

        <div className="dash-grid dash-three">
          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Aniversariantes do mês</h3>
            <p style={styles.cardSub}>{aniversariantes.length} cliente(s) fazem aniversário este mês.</p>
            <label style={styles.label}>Mensagem — use {"{nome}"} para personalizar</label>
            <textarea rows={4} value={mensagemAniversario} onChange={e => setMensagemAniversario(e.target.value)} style={styles.textarea} />
            <div style={{ marginTop: 10 }}>
              {aniversariantes.map(cliente => (
                <div className="dash-row" key={cliente.id}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={styles.rowName}>{cliente.nome}</strong>
                    <div style={styles.muted}>{dataCurta(cliente.dataNascimento)}</div>
                  </div>
                  <button className="dash-btn" onClick={() => abrirWhatsApp(cliente.celular, mensagemAniversario.replaceAll("{nome}", cliente.nome))}>WhatsApp</button>
                </div>
              ))}
              {!aniversariantes.length && <Empty>Não há aniversariantes cadastrados neste mês.</Empty>}
            </div>
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Indique uma amiga</h3>
            <p style={styles.cardSub}>Mensagem pronta para compartilhar com uma cliente pelo WhatsApp.</p>
            <label style={styles.label}>Texto da mensagem</label>
            <textarea rows={5} value={mensagemIndicacao} onChange={e => setMensagemIndicacao(e.target.value)} style={styles.textarea} />
            <button className="dash-btn" style={{ marginTop: 10 }} onClick={() => abrirWhatsApp(null, mensagemIndicacao)}>
              Compartilhar mensagem
            </button>
          </div>

          <div style={styles.actionCard}>
            <h3 style={styles.actionTitle}>Calendário sazonal</h3>
            <p style={styles.cardSub}>Escolha uma data comercial e prepare uma campanha.</p>
            <label style={styles.label}>Datas próximas</label>
            <select style={styles.input} value={dataSazonalSelecionada} onChange={e => selecionarDataSazonal(e.target.value)}>
              <option value="">Selecione uma data</option>
              {datasCalendario.map(data => (
                <option key={`${data.mes}-${data.dia}`} value={`${data.mes}-${data.dia}`}>
                  {data.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} — {data.nome}
                </option>
              ))}
            </select>

            <label style={{ ...styles.label, marginTop: 10 }}>Ou crie uma data personalizada</label>
            <input type="date" value={dataPersonalizada} onChange={e => { setDataPersonalizada(e.target.value); setDataSazonalSelecionada("personalizada"); setMensagemSazonal("") }} style={styles.input} />
            <input value={nomeDataPersonalizada} onChange={e => setNomeDataPersonalizada(e.target.value)} style={{ ...styles.input, marginTop: 8 }} placeholder="Nome da campanha ou data" />

            <label style={{ ...styles.label, marginTop: 10 }}>Mensagem da campanha</label>
            <textarea rows={4} value={mensagemSazonal} onChange={e => setMensagemSazonal(e.target.value)} style={styles.textarea} placeholder="Escreva ou ajuste a mensagem da campanha..." />

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

function Kpi({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="dash-card">
      <div style={styles.muted}>{titulo}</div>
      <strong style={styles.kpiValue}>{valor}</strong>
      <div style={styles.muted}>{detalhe}</div>
    </div>
  )
}

function FinancialRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="dash-row">
      <span style={{ color: "#777", fontSize: 13 }}>{label}</span>
      <strong style={{ fontSize: 13, color: strong ? "#735b15" : "#222" }}>{value}</strong>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={styles.empty}>{children}</div>
}

const styles: Record<string, React.CSSProperties> = {
  page: { width: "100%", maxWidth: 1400, margin: "0 auto", padding: 24, background: "#faf9f6", color: "#222" },
  loading: { padding: 50, textAlign: "center", color: "#777" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  title: { margin: 0, fontSize: "clamp(25px, 3vw, 34px)", lineHeight: 1.2 },
  subtitle: { margin: "6px 0 0", color: "#777", fontSize: 14 },
  filterLabel: { display: "flex", alignItems: "center", gap: 9, color: "#777", fontSize: 13 },
  select: { padding: "10px 12px", border: "1px solid #ddd5c6", borderRadius: 8, background: "#fff", color: "#222" },
  error: { background: "#fff0f0", border: "1px solid #e5bcbc", padding: 12, borderRadius: 8, marginBottom: 16, color: "#9a3333" },
  cardTitle: { margin: 0, fontSize: 17, color: "#222" },
  cardSub: { margin: "5px 0 16px", color: "#888", fontSize: 12, lineHeight: 1.5 },
  muted: { color: "#888", fontSize: 12, lineHeight: 1.45 },
  kpiValue: { display: "block", margin: "10px 0 7px", fontSize: "clamp(19px, 2vw, 27px)", overflowWrap: "anywhere" },
  chart: { height: 220, display: "flex", alignItems: "flex-end", gap: 14, padding: "8px 4px 0" },
  chartValue: { color: "#777", fontSize: 10, whiteSpace: "nowrap" },
  chartLabel: { color: "#777", fontSize: 11, textTransform: "capitalize" },
  compareNumber: { fontSize: 28, fontWeight: 700, marginTop: 20 },
  compareChange: { fontSize: 13, fontWeight: 600, marginTop: 12 },
  comparePrevious: { marginTop: 8, color: "#777", fontSize: 12 },
  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  progressBg: { height: 8, background: "#eee9df", borderRadius: 20, overflow: "hidden", margin: "8px 0" },
  progress: { height: "100%", background: "#c9a227", borderRadius: 20 },
  input: { width: "100%", padding: "9px 10px", border: "1px solid #ddd5c6", borderRadius: 7, background: "#fff", color: "#222" },
  rowName: { fontSize: 13, lineHeight: 1.4 },
  rank: { display: "flex", alignItems: "center", justifyContent: "center", width: 25, height: 25, borderRadius: "50%", background: "#f1eadb", color: "#806b32", fontSize: 11, fontWeight: 700 },
  bigNumber: { fontSize: 30, fontWeight: 700, marginTop: 20 },
  stockAlert: { background: "#faf5e8", border: "1px solid #eee1bf", borderRadius: 8, padding: 10, color: "#735b15", fontSize: 12, lineHeight: 1.5 },
  attention: { display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 0", borderBottom: "1px solid #eee9df", color: "#777", fontSize: 13 },
  actionCard: { minWidth: 0, padding: 14, border: "1px solid #eee6d8", borderRadius: 10, background: "#fdfbf6" },
  actionTitle: { margin: 0, fontSize: 15 },
  label: { display: "block", color: "#777", fontSize: 11, marginBottom: 6 },
  textarea: { width: "100%", padding: 10, border: "1px solid #ddd5c6", borderRadius: 7, resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, background: "#fff", color: "#222" },
  empty: { padding: "18px 0", textAlign: "center", color: "#888", fontSize: 12 },
}
