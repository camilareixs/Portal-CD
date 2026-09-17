import { useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "../lib/supabase"

type Receita = {
  id: string
  tipo: "VENDA" | "PAGAMENTO_FIADO" | "OUTRA_RECEITA" | "OUTROS"
  descricao: string
  valor: number
  dataCompetencia: string
  dataRecebimento: string | null
  status: "PENDENTE" | "RECEBIDA" | "CANCELADA"
  observacao: string
  criadoem: string
  compraId: string | null
}

type Despesa = {
  id: string
  descricao: string
  valor: number
  dataCompetencia: string
  dataPagamento: string | null
  recorrente: boolean
  status: "PENDENTE" | "PAGA" | "CANCELADA"
  observacao: string
  categoria: string
  criadoem: string
}

type Compra = {
  id: string
  clienteid: string | null
  cliente: string
  cpf: string
  valor: number
  pagamento: string
  criadoem: string
  status: "PENDENTE" | "CONCLUIDA" | "CANCELADA"
}

type VendaItem = {
  id: string
  compraId: string
  quantidade: number
  custoUnitario: number
}

type Fiado = {
  compra: Compra
  recebido: number
  pendente: number
}

const categoriasDespesas = [
  "Aluguel",
  "Marketing",
  "Embalagens",
  "Transporte",
  "Taxas",
  "Fornecedores",
  "Operacional",
  "Impostos",
  "Pessoal",
  "Manutenção",
  "Outros"
]

const meses = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" }, { value: "04", label: "Abril" },
  { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" }
]

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function numeroMoeda(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "").trim()
  if (!limpo) return 0
  const ultimoVirgula = limpo.lastIndexOf(",")
  const ultimoPonto = limpo.lastIndexOf(".")
  let normalizado = limpo
  if (ultimoVirgula > ultimoPonto) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".")
  } else if (ultimoPonto > ultimoVirgula && ultimoVirgula !== -1) {
    normalizado = limpo.replace(/,/g, "")
  }
  return Number(normalizado) || 0
}

function moedaInput(valor: number) {
  if (!valor) return ""
  return moeda(valor).replace(/\s/g, "")
}

function dataBR(data: string | null | undefined) {
  if (!data) return "-"
  const parte = String(data).slice(0, 10)
  const [ano, mes, dia] = parte.split("-")
  if (!ano || !mes || !dia) return "-"
  return `${dia}/${mes}/${ano}`
}

function dataLocal(data: string | null | undefined) {
  if (!data) return null
  const parte = String(data).slice(0, 10)
  const [ano, mes, dia] = parte.split("-").map(Number)
  if (!ano || !mes || !dia) return null
  return new Date(ano, mes - 1, dia)
}

function anoDaData(data: string | null | undefined) {
  const d = dataLocal(data)
  return d ? d.getFullYear() : null
}

function mesDaData(data: string | null | undefined) {
  const d = dataLocal(data)
  return d ? String(d.getMonth() + 1).padStart(2, "0") : ""
}

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function inicioDoMesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function anosDisponiveis(receitas: Receita[], despesas: Despesa[], compras: Compra[]) {
  const anos = new Set<number>([new Date().getFullYear()])
  receitas.forEach(r => { const a = anoDaData(r.dataCompetencia); if (a) anos.add(a) })
  despesas.forEach(d => { const a = anoDaData(d.dataCompetencia); if (a) anos.add(a) })
  compras.forEach(c => { const a = anoDaData(c.criadoem); if (a) anos.add(a) })
  return [...anos].sort((a, b) => b - a)
}

function tipoReceitaLabel(tipo: Receita["tipo"]) {
  switch (tipo) {
    case "VENDA": return "Venda"
    case "PAGAMENTO_FIADO": return "Pagamento de fiado"
    case "OUTRA_RECEITA": return "Outra receita"
    default: return "Outros"
  }
}

export default function Financeiro() {
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [vendaItens, setVendaItens] = useState<VendaItem[]>([])

  const [aba, setAba] = useState<"resumo" | "receitas" | "despesas" | "fiado">("resumo")
  const [filtroMes, setFiltroMes] = useState("todos")
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()))
  const [busca, setBusca] = useState("")
  const [filtroStatus] = useState("todos")
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState(false)
  const [dataInicio, setDataInicio] = useState(inicioDoMesAtual())
  const [dataFim, setDataFim] = useState(hojeISO())

  const [modalReceita, setModalReceita] = useState(false)
  const [modalDespesa, setModalDespesa] = useState(false)
  const [modalFiado, setModalFiado] = useState(false)
  const [fiadoSelecionado, setFiadoSelecionado] = useState<Fiado | null>(null)
  const [valorPagamentoFiado, setValorPagamentoFiado] = useState(0)

  const [descricaoReceita, setDescricaoReceita] = useState("")
  const [valorReceita, setValorReceita] = useState(0)
  const [tipoReceita, setTipoReceita] = useState<Receita["tipo"]>("OUTRA_RECEITA")
  const [observacaoReceita, setObservacaoReceita] = useState("")

  const [descricaoDespesa, setDescricaoDespesa] = useState("")
  const [valorDespesa, setValorDespesa] = useState(0)
  const [categoriaDespesa, setCategoriaDespesa] = useState("Outros")
  const [dataCompetenciaDespesa, setDataCompetenciaDespesa] = useState(inicioDoMesAtual())
  const [dataPagamentoDespesa, setDataPagamentoDespesa] = useState(hojeISO())
  const [despesaRecorrente, setDespesaRecorrente] = useState(false)
  const [statusDespesa, setStatusDespesa] = useState<Despesa["status"]>("PAGA")
  const [observacaoDespesa, setObservacaoDespesa] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function fetchFinanceiro() {
    setCarregando(true)
    const [receitasResult, despesasResult, comprasResult, itensResult] = await Promise.all([
      supabase.from("receitas").select("*").order("dataCompetencia", { ascending: false }),
      supabase.from("despesas").select("*").order("dataCompetencia", { ascending: false }),
      supabase.from("compras").select("id,clienteid,cliente,cpf,valor,pagamento,criadoem,status").order("criadoem", { ascending: false }),
      supabase.from("vendaItens").select("id,compraId,quantidade,custoUnitario")
    ])

    if (receitasResult.error) alert("Erro ao carregar receitas: " + receitasResult.error.message)
    if (despesasResult.error) alert("Erro ao carregar despesas: " + despesasResult.error.message)
    if (comprasResult.error) alert("Erro ao carregar vendas: " + comprasResult.error.message)
    if (itensResult.error) alert("Erro ao carregar itens das vendas: " + itensResult.error.message)

    if (receitasResult.data) {
      setReceitas(receitasResult.data.map((r: any) => ({
        id: String(r.id), tipo: r.tipo, descricao: r.descricao || "", valor: Number(r.valor || 0),
        dataCompetencia: r.dataCompetencia || "", dataRecebimento: r.dataRecebimento || null,
        status: r.status, observacao: r.observacao || "", criadoem: r.criadoem || "",
        compraId: r.compraId ? String(r.compraId) : null
      })))
    }
    if (despesasResult.data) {
      setDespesas(despesasResult.data.map((d: any) => ({
        id: String(d.id), descricao: d.descricao || "", valor: Number(d.valor || 0),
        dataCompetencia: d.dataCompetencia || "", dataPagamento: d.dataPagamento || null,
        recorrente: Boolean(d.recorrente), status: d.status, observacao: d.observacao || "",
        categoria: d.categoria || "Outros", criadoem: d.criadoem || ""
      })))
    }
    if (comprasResult.data) {
      setCompras(comprasResult.data.map((c: any) => ({
        id: String(c.id), clienteid: c.clienteid ? String(c.clienteid) : null,
        cliente: c.cliente || "", cpf: c.cpf || "", valor: Number(c.valor || 0),
        pagamento: c.pagamento || "", criadoem: c.criadoem || "", status: c.status || "CONCLUIDA"
      })))
    }
    if (itensResult.data) {
      setVendaItens(itensResult.data.map((item: any) => ({
        id: String(item.id), compraId: String(item.compraId),
        quantidade: Number(item.quantidade || 0), custoUnitario: Number(item.custoUnitario || 0)
      })))
    }
    setCarregando(false)
  }

  useEffect(() => { fetchFinanceiro() }, [])

  const anos = useMemo(() => anosDisponiveis(receitas, despesas, compras), [receitas, despesas, compras])

  const dentroDoPeriodo = (data: string | null | undefined) => {
    if (!data) return false
    if (periodoPersonalizado) {
      const valor = String(data).slice(0, 10)
      return valor >= dataInicio && valor <= dataFim
    }
    const anoOk = filtroAno === "todos" || String(anoDaData(data)) === filtroAno
    const mesOk = filtroMes === "todos" || mesDaData(data) === filtroMes
    return anoOk && mesOk
  }

  const vendasValidas = useMemo(() => compras.filter(c => c.status === "CONCLUIDA"), [compras])
  const vendasPeriodo = useMemo(() => vendasValidas.filter(c => dentroDoPeriodo(c.criadoem)), [vendasValidas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])

  const faturamento = useMemo(() => vendasPeriodo.reduce((t, c) => t + c.valor, 0), [vendasPeriodo])

  const receitasPeriodo = useMemo(() => receitas.filter(r => dentroDoPeriodo(r.dataCompetencia)), [receitas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])
  const receitasRecebidas = useMemo(() => receitas.filter(r => r.status === "RECEBIDA" && dentroDoPeriodo(r.dataRecebimento || r.dataCompetencia)), [receitas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])
  const totalReceitasExtras = useMemo(() => receitasRecebidas.filter(r => r.tipo !== "VENDA" && r.tipo !== "PAGAMENTO_FIADO").reduce((t, r) => t + r.valor, 0), [receitasRecebidas])
  const totalRecebido = useMemo(() => receitasRecebidas.reduce((t, r) => t + r.valor, 0), [receitasRecebidas])

  const despesasPeriodo = useMemo(() => despesas.filter(d => dentroDoPeriodo(d.dataCompetencia)), [despesas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])
  const despesasPagas = useMemo(() => despesas.filter(d => d.status === "PAGA" && dentroDoPeriodo(d.dataPagamento || d.dataCompetencia)), [despesas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])
  const despesasPendentes = useMemo(() => despesas.filter(d => d.status === "PENDENTE" && dentroDoPeriodo(d.dataCompetencia)), [despesas, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])
  const totalDespesas = useMemo(() => despesasPagas.reduce((t, d) => t + d.valor, 0), [despesasPagas])
  const totalDespesasPendentes = useMemo(() => despesasPendentes.reduce((t, d) => t + d.valor, 0), [despesasPendentes])

  const custoProdutosVendidos = useMemo(() => {
    const ids = new Set(vendasPeriodo.map(c => c.id))
    return vendaItens.filter(i => ids.has(i.compraId)).reduce((t, i) => t + i.quantidade * i.custoUnitario, 0)
  }, [vendaItens, vendasPeriodo])

  const lucroBruto = faturamento - custoProdutosVendidos
  const resultadoOperacional = lucroBruto - totalDespesas
  const resultadoLiquido = resultadoOperacional + totalReceitasExtras
  const resultadoCaixa = totalRecebido - totalDespesas
  const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0
  const margemLiquida = faturamento > 0 ? (resultadoLiquido / faturamento) * 100 : 0
  const ticketMedio = vendasPeriodo.length ? faturamento / vendasPeriodo.length : 0
  const unidadesVendidas = vendaItens.filter(i => new Set(vendasPeriodo.map(c => c.id)).has(i.compraId)).reduce((t, i) => t + i.quantidade, 0)

  const fiado = useMemo(() => {
    return compras.filter(c => c.status !== "CANCELADA" && c.pagamento.toLowerCase().includes("em aberto")).map(compra => {
      const recebido = receitas.filter(r => r.compraId === compra.id && r.tipo === "PAGAMENTO_FIADO" && r.status === "RECEBIDA").reduce((t, r) => t + r.valor, 0)
      return { compra, recebido, pendente: Math.max(compra.valor - recebido, 0) }
    }).filter(i => i.pendente > 0)
  }, [compras, receitas])

  const totalAReceber = useMemo(() => fiado.filter(i => dentroDoPeriodo(i.compra.criadoem)).reduce((t, i) => t + i.pendente, 0), [fiado, filtroAno, filtroMes, periodoPersonalizado, dataInicio, dataFim])

  const receitasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    return receitasPeriodo.filter(r => (filtroStatus === "todos" || r.status === filtroStatus) && `${r.descricao} ${r.tipo}`.toLowerCase().includes(termo))
  }, [receitasPeriodo, busca, filtroStatus])

  const despesasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    return despesasPeriodo.filter(d => (filtroStatus === "todos" || d.status === filtroStatus) && `${d.descricao} ${d.categoria}`.toLowerCase().includes(termo))
  }, [despesasPeriodo, busca, filtroStatus])

  const despesasPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {}
    despesasPagas.forEach(d => { mapa[d.categoria] = (mapa[d.categoria] || 0) + d.valor })
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [despesasPagas])

  const pagamentosPorTipo = useMemo(() => {
    const mapa: Record<string, number> = {}
    vendasPeriodo.forEach(v => {
      const tipo = v.pagamento || "Não informado"
      mapa[tipo] = (mapa[tipo] || 0) + v.valor
    })
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [vendasPeriodo])

  const mesesDoAno = useMemo(() => {
    const ano = Number(filtroAno) || new Date().getFullYear()
    return meses.map(m => {
      const vendas = vendasValidas.filter(v => anoDaData(v.criadoem) === ano && mesDaData(v.criadoem) === m.value).reduce((t, v) => t + v.valor, 0)
      const despesasMes = despesas.filter(d => d.status === "PAGA" && anoDaData(d.dataPagamento || d.dataCompetencia) === ano && mesDaData(d.dataPagamento || d.dataCompetencia) === m.value).reduce((t, d) => t + d.valor, 0)
      return { ...m, vendas, despesas: despesasMes, saldo: vendas - despesasMes }
    })
  }, [filtroAno, vendasValidas, despesas])

  async function criarReceita() {
    if (!descricaoReceita.trim() || valorReceita <= 0) {
      alert("Informe descrição e um valor maior que zero.")
      return
    }
    const hoje = hojeISO()
    const { error } = await supabase.from("receitas").insert({
      tipo: tipoReceita, descricao: descricaoReceita.trim(), valor: valorReceita,
      dataCompetencia: hoje, dataRecebimento: hoje, status: "RECEBIDA",
      observacao: observacaoReceita.trim() || null
    })
    if (error) { alert("Erro ao cadastrar receita: " + error.message); return }
    setModalReceita(false); setDescricaoReceita(""); setValorReceita(0); setTipoReceita("OUTRA_RECEITA"); setObservacaoReceita("")
    await fetchFinanceiro()
  }

  async function criarDespesa() {
    if (!descricaoDespesa.trim() || valorDespesa <= 0) {
      alert("Informe descrição e um valor maior que zero.")
      return
    }
    const { error } = await supabase.from("despesas").insert({
      descricao: descricaoDespesa.trim(), valor: valorDespesa, dataCompetencia: dataCompetenciaDespesa,
      dataPagamento: statusDespesa === "PAGA" ? dataPagamentoDespesa : null, recorrente: despesaRecorrente,
      status: statusDespesa, observacao: observacaoDespesa.trim() || null, categoria: categoriaDespesa
    })
    if (error) { alert("Erro ao cadastrar despesa: " + error.message); return }
    setModalDespesa(false); setDescricaoDespesa(""); setValorDespesa(0); setCategoriaDespesa("Outros")
    setDataCompetenciaDespesa(inicioDoMesAtual()); setDataPagamentoDespesa(hojeISO()); setDespesaRecorrente(false); setStatusDespesa("PAGA"); setObservacaoDespesa("")
    await fetchFinanceiro()
  }

  async function registrarPagamentoFiado() {
    if (!fiadoSelecionado || valorPagamentoFiado <= 0 || valorPagamentoFiado > fiadoSelecionado.pendente) {
      alert("Informe um valor válido, sem ultrapassar o saldo pendente.")
      return
    }
    const hoje = hojeISO()
    const { error } = await supabase.from("receitas").insert({
      tipo: "PAGAMENTO_FIADO",
      descricao: `Pagamento de fiado - ${fiadoSelecionado.compra.cliente || "Cliente"}`,
      valor: valorPagamentoFiado, dataCompetencia: hoje, dataRecebimento: hoje,
      status: "RECEBIDA", observacao: `Pagamento referente à venda ${fiadoSelecionado.compra.id}`,
      compraId: fiadoSelecionado.compra.id
    })
    if (error) { alert("Erro ao registrar pagamento: " + error.message); return }
    setModalFiado(false); setFiadoSelecionado(null); setValorPagamentoFiado(0)
    await fetchFinanceiro()
  }

  async function cancelarReceita(receita: Receita) {
    if (!window.confirm(`Deseja cancelar esta receita?\n\n${receita.descricao}\n${moeda(receita.valor)}`)) return
    const { error } = await supabase.from("receitas").update({ status: "CANCELADA" }).eq("id", receita.id)
    if (error) { alert("Erro ao cancelar receita: " + error.message); return }
    await fetchFinanceiro()
  }

  async function cancelarDespesa(despesa: Despesa) {
    if (!window.confirm(`Deseja cancelar esta despesa?\n\n${despesa.descricao}\n${moeda(despesa.valor)}`)) return
    const { error } = await supabase.from("despesas").update({ status: "CANCELADA" }).eq("id", despesa.id)
    if (error) { alert("Erro ao cancelar despesa: " + error.message); return }
    await fetchFinanceiro()
  }

  function gerarRelatorio() {
    const periodo = periodoPersonalizado ? `${dataBR(dataInicio)} a ${dataBR(dataFim)}` : `${filtroMes === "todos" ? `Ano ${filtroAno}` : `${meses.find(m => m.value === filtroMes)?.label} de ${filtroAno}`}`
    const linhasReceitas = receitasRecebidas.map(r => `<tr><td>${dataBR(r.dataRecebimento || r.dataCompetencia)}</td><td>${tipoReceitaLabel(r.tipo)}</td><td>${r.descricao}</td><td class="entrada">${moeda(r.valor)}</td></tr>`).join("")
    const linhasDespesas = despesasPagas.map(d => `<tr><td>${dataBR(d.dataPagamento || d.dataCompetencia)}</td><td>${d.categoria}</td><td>${d.descricao}</td><td class="saida">${moeda(d.valor)}</td></tr>`).join("")
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório financeiro - Cami&Duda</title>
    <style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#202020;background:#eee;margin:0;padding:30px}
    .folha{max-width:900px;margin:auto;background:#fff;padding:38px;border:1px solid #ddd}
    .cab{border:2px solid #222;padding:20px;display:flex;justify-content:space-between;gap:20px}
    .marca{font-size:25px;font-weight:800;letter-spacing:1px}.sub{color:#666;font-size:12px;margin-top:5px}
    .titulo{text-align:right}.titulo h1{margin:0;font-size:20px}.titulo div{font-size:12px;margin-top:5px}
    .faixa{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #222;border-top:0}
    .kpi{padding:14px;border-right:1px solid #ddd}.kpi:last-child{border-right:0}.kpi small{display:block;color:#666;font-size:10px;text-transform:uppercase}.kpi strong{display:block;font-size:17px;margin-top:5px}
    h2{font-size:14px;border-bottom:2px solid #222;padding-bottom:7px;margin:25px 0 10px}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f3f3;font-size:10px;text-transform:uppercase}td:last-child,th:last-child{text-align:right}.entrada{color:#456d35}.saida{color:#a33}
    .dre{width:100%;border:1px solid #ddd}.dre div{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #eee}.dre .total{font-weight:800;border-top:2px solid #222;border-bottom:0}
    .rodape{margin-top:30px;padding-top:12px;border-top:1px dashed #999;font-size:10px;color:#666;display:flex;justify-content:space-between}
    @media print{body{background:#fff;padding:0}.folha{border:0;max-width:none}.no-print{display:none}}
    @media(max-width:650px){body{padding:8px}.folha{padding:18px}.cab{display:block}.titulo{text-align:left;margin-top:15px}.faixa{grid-template-columns:1fr 1fr}}
    </style></head><body><main class="folha">
    <div class="cab"><div><div class="marca">CAMI&DUDA</div><div class="sub">Relatório gerencial financeiro</div></div><div class="titulo"><h1>RELATÓRIO FINANCEIRO</h1><div>Período: ${periodo}</div><div>Emitido em ${dataBR(hojeISO())}</div></div></div>
    <div class="faixa"><div class="kpi"><small>Faturamento</small><strong>${moeda(faturamento)}</strong></div><div class="kpi"><small>Recebido</small><strong>${moeda(totalRecebido)}</strong></div><div class="kpi"><small>Despesas pagas</small><strong>${moeda(totalDespesas)}</strong></div><div class="kpi"><small>Resultado líquido</small><strong>${moeda(resultadoLiquido)}</strong></div></div>
    <h2>Demonstrativo do resultado</h2><div class="dre">
    <div><span>Faturamento</span><strong>${moeda(faturamento)}</strong></div><div><span>(-) Custo dos produtos vendidos</span><strong>${moeda(custoProdutosVendidos)}</strong></div><div><span>Lucro bruto</span><strong>${moeda(lucroBruto)}</strong></div><div><span>(-) Despesas operacionais pagas</span><strong>${moeda(totalDespesas)}</strong></div><div><span>(+) Outras receitas</span><strong>${moeda(totalReceitasExtras)}</strong></div><div class="total"><span>Resultado líquido</span><strong>${moeda(resultadoLiquido)}</strong></div></div>
    <h2>Indicadores</h2><table><tr><th>Vendas</th><th>Unidades</th><th>Ticket médio</th><th>Margem bruta</th><th>Margem líquida</th><th>A receber</th></tr><tr><td>${vendasPeriodo.length}</td><td>${unidadesVendidas}</td><td>${moeda(ticketMedio)}</td><td>${margemBruta.toFixed(1)}%</td><td>${margemLiquida.toFixed(1)}%</td><td>${moeda(totalAReceber)}</td></tr></table>
    <h2>Receitas recebidas</h2><table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr>${linhasReceitas || `<tr><td colspan="4">Nenhuma receita no período.</td></tr>`}</table>
    <h2>Despesas pagas</h2><table><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr>${linhasDespesas || `<tr><td colspan="4">Nenhuma despesa no período.</td></tr>`}</table>
    <h2>Resumo de caixa</h2><div class="dre"><div><span>Entradas recebidas</span><strong>${moeda(totalRecebido)}</strong></div><div><span>Saídas pagas</span><strong>${moeda(totalDespesas)}</strong></div><div class="total"><span>Saldo de caixa do período</span><strong>${moeda(resultadoCaixa)}</strong></div></div>
    <div class="rodape"><span>Cami&Duda • relatório gerencial</span><span>Documento gerencial — não substitui documento fiscal.</span></div>
    </main><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`
    const janela = window.open("", "_blank", "width=1000,height=800")
    if (!janela) { alert("O navegador bloqueou a janela do relatório. Permita pop-ups para baixar/imprimir o relatório."); return }
    janela.document.write(html)
    janela.document.close()
  }

  const periodoTexto = periodoPersonalizado
    ? `${dataBR(dataInicio)} → ${dataBR(dataFim)}`
    : filtroMes === "todos" ? `Ano ${filtroAno}` : `${meses.find(m => m.value === filtroMes)?.label} de ${filtroAno}`

  return (
    <div style={container}>
      <style>{`
        .fin-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .fin-two{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(280px,1fr);gap:16px}
        .fin-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
        .fin-table{width:100%;border-collapse:collapse;min-width:720px}.fin-table th,.fin-table td{padding:12px;border-bottom:1px solid #eee;text-align:left;font-size:13px}.fin-table th{font-size:11px;color:#777;text-transform:uppercase;background:#fafafa}.fin-table .right{text-align:right}
        .fin-scroll{overflow-x:auto;width:100%;-webkit-overflow-scrolling:touch}
        .fin-tabs{display:flex;gap:4px;overflow-x:auto;white-space:nowrap}
        .fin-input-grid{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px}
        .fin-breakdown{display:flex;flex-direction:column;gap:10px}.fin-break{display:grid;grid-template-columns:minmax(100px,1fr) minmax(120px,2fr) auto;align-items:center;gap:10px;font-size:12px}.fin-bar{height:8px;background:#eee;border-radius:20px;overflow:hidden}.fin-bar span{display:block;height:100%;background:#d4af37}
        @media(max-width:1000px){.fin-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fin-two,.fin-three{grid-template-columns:1fr}.fin-input-grid{grid-template-columns:1fr 1fr}.fin-input-grid button{grid-column:span 2}}
        @media(max-width:620px){.fin-grid{grid-template-columns:1fr}.fin-input-grid{grid-template-columns:1fr}.fin-input-grid button{grid-column:auto}.fin-card{padding:15px!important}.fin-title{font-size:25px!important}.fin-header-actions{width:100%}.fin-header-actions button{flex:1}.fin-tabs button{padding:10px 12px!important}.fin-kpi-value{font-size:20px!important}}
      `}</style>

      <div style={header}>
        <div>
          <h1 className="fin-title" style={title}>Financeiro</h1>
          <div style={subtitle}>Visão gerencial de vendas, receitas, despesas, caixa e valores a receber.</div>
        </div>
        <div className="fin-header-actions" style={headerButtons}>
          <button style={btnSecondary} onClick={gerarRelatorio}>Relatório / PDF</button>
          <button style={btnExpense} onClick={() => setModalDespesa(true)}>+ Nova despesa</button>
          <button style={btnSmall} onClick={() => setModalReceita(true)}>+ Nova receita</button>
        </div>
      </div>

      <div className="fin-card" style={periodCard}>
        <div style={periodTop}>
          <div><strong>Período de análise</strong><div style={muted}>Todos os indicadores abaixo acompanham este período.</div></div>
          <label style={switchLabel}><input type="checkbox" checked={periodoPersonalizado} onChange={e => setPeriodoPersonalizado(e.target.checked)} /> Período personalizado</label>
        </div>
        {!periodoPersonalizado ? (
          <div className="fin-input-grid" style={{marginTop:14}}>
            <select style={input} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
              <option value="todos">Todos os meses</option>{meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select style={input} value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input style={input} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar movimentação..." />
            <button style={refreshBtn} onClick={fetchFinanceiro} disabled={carregando}>{carregando ? "Atualizando..." : "Atualizar"}</button>
          </div>
        ) : (
          <div className="fin-input-grid" style={{marginTop:14}}>
            <div><label style={fieldLabel}>Data inicial</label><input type="date" style={input} value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
            <div><label style={fieldLabel}>Data final</label><input type="date" style={input} value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
            <input style={input} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar movimentação..." />
            <button style={refreshBtn} onClick={fetchFinanceiro} disabled={carregando}>{carregando ? "Atualizando..." : "Atualizar"}</button>
          </div>
        )}
      </div>

      <div className="fin-grid" style={{marginBottom:16}}>
        <Kpi label="Faturamento" value={moeda(faturamento)} detail={`${vendasPeriodo.length} venda(s)`} />
        <Kpi label="Recebido" value={moeda(totalRecebido)} detail={`Caixa de entradas`} />
        <Kpi label="A receber" value={moeda(totalAReceber)} detail={`${fiado.filter(i => dentroDoPeriodo(i.compra.criadoem)).length} venda(s) em aberto`} />
        <Kpi label="Despesas pagas" value={moeda(totalDespesas)} detail={`${despesasPagas.length} lançamento(s)`} />
        <Kpi label="CMV" value={moeda(custoProdutosVendidos)} detail="Custo dos produtos vendidos" />
        <Kpi label="Lucro bruto" value={moeda(lucroBruto)} detail={`Margem ${margemBruta.toFixed(1)}%`} />
        <Kpi label="Resultado líquido" value={moeda(resultadoLiquido)} detail={`Margem ${margemLiquida.toFixed(1)}%`} destaque />
        <Kpi label="Caixa líquido" value={moeda(resultadoCaixa)} detail="Recebido − despesas pagas" />
      </div>

      <div className="fin-tabs" style={tabs}>
        {[
          ["resumo","Visão geral"],["receitas","Receitas"],["despesas","Despesas"],["fiado","A receber"]
        ].map(([value,label]) => <button key={value} style={aba === value ? tabAtiva : tab} onClick={() => setAba(value as typeof aba)}>{label}{value === "fiado" && totalAReceber > 0 ? <span style={tabBadge}>{fiado.filter(i => dentroDoPeriodo(i.compra.criadoem)).length}</span> : null}</button>)}
      </div>

      {aba === "resumo" && (
        <>
          <div className="fin-two">
            <section className="fin-card" style={section}>
              <div style={sectionHeader}><div><h3 style={sectionTitleNoMargin}>Demonstrativo do resultado</h3><div style={muted}>{periodoTexto}</div></div><button style={btnSecondary} onClick={gerarRelatorio}>Gerar relatório</button></div>
              <ResumoLinha label="Faturamento" valor={moeda(faturamento)} />
              <ResumoLinha label="(-) Custo dos produtos vendidos" valor={moeda(custoProdutosVendidos)} />
              <ResumoLinha label="Lucro bruto" valor={moeda(lucroBruto)} />
              <ResumoLinha label="(-) Despesas operacionais pagas" valor={moeda(totalDespesas)} />
              <ResumoLinha label="(+) Outras receitas recebidas" valor={moeda(totalReceitasExtras)} />
              <ResumoLinha label="Resultado líquido" valor={moeda(resultadoLiquido)} destaque />
            </section>
            <section className="fin-card" style={section}>
              <h3 style={sectionTitle}>Indicadores do período</h3>
              <Indicator label="Ticket médio" value={moeda(ticketMedio)} />
              <Indicator label="Unidades vendidas" value={String(unidadesVendidas)} />
              <Indicator label="Margem bruta" value={`${margemBruta.toFixed(1)}%`} />
              <Indicator label="Margem líquida" value={`${margemLiquida.toFixed(1)}%`} />
              <Indicator label="Despesas pendentes" value={moeda(totalDespesasPendentes)} />
              <Indicator label="Receitas extras" value={moeda(totalReceitasExtras)} />
            </section>
          </div>

          <div className="fin-three" style={{marginTop:16}}>
            <section className="fin-card" style={section}>
              <h3 style={sectionTitle}>Despesas por categoria</h3>
              <div className="fin-breakdown">
                {despesasPorCategoria.length ? despesasPorCategoria.map(([cat,val]) => <Breakdown key={cat} label={cat} value={val} total={totalDespesas} />) : <div style={emptyText}>Nenhuma despesa paga no período.</div>}
              </div>
            </section>
            <section className="fin-card" style={section}>
              <h3 style={sectionTitle}>Vendas por pagamento</h3>
              <div className="fin-breakdown">
                {pagamentosPorTipo.length ? pagamentosPorTipo.map(([tipo,val]) => <Breakdown key={tipo} label={tipo} value={val} total={faturamento} />) : <div style={emptyText}>Nenhuma venda no período.</div>}
              </div>
            </section>
            <section className="fin-card" style={section}>
              <h3 style={sectionTitle}>Contas a pagar</h3>
              <Indicator label="Pendentes" value={moeda(totalDespesasPendentes)} />
              <Indicator label="Pagas" value={moeda(totalDespesas)} />
              <Indicator label="Recorrentes pagas" value={moeda(despesasPagas.filter(d => d.recorrente).reduce((t,d)=>t+d.valor,0))} />
            </section>
          </div>

          <section className="fin-card" style={{...section, marginTop:16}}>
            <h3 style={sectionTitle}>Acompanhamento mensal — {filtroAno}</h3>
            <div className="fin-scroll"><table className="fin-table"><thead><tr><th>Mês</th><th className="right">Faturamento</th><th className="right">Despesas</th><th className="right">Saldo</th></tr></thead><tbody>
              {mesesDoAno.map(m => <tr key={m.value}><td>{m.label}</td><td className="right">{moeda(m.vendas)}</td><td className="right">{moeda(m.despesas)}</td><td className="right" style={{fontWeight:700,color:m.saldo >= 0 ? "#5f7f47" : "#b35a5a"}}>{moeda(m.saldo)}</td></tr>)}
            </tbody></table></div>
          </section>

          <section className="fin-card" style={{...section, marginTop:16}}>
            <h3 style={sectionTitle}>Últimas movimentações</h3>
            <div className="fin-scroll"><table className="fin-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Status</th><th className="right">Valor</th></tr></thead><tbody>
              {[...receitasRecebidas.map(r=>({data:r.dataRecebimento||r.dataCompetencia,tipo:"Entrada",descricao:r.descricao,status:r.status,valor:r.valor})),...despesasPagas.map(d=>({data:d.dataPagamento||d.dataCompetencia,tipo:"Saída",descricao:d.descricao,status:d.status,valor:-d.valor}))].sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,12).map((m,i)=><tr key={`${m.tipo}-${i}`}><td>{dataBR(m.data)}</td><td>{m.tipo}</td><td>{m.descricao}</td><td><StatusBadge status={m.status}/></td><td className="right" style={{color:m.valor>=0?"#5f7f47":"#b35a5a",fontWeight:700}}>{m.valor>=0?"+ ":"- "}{moeda(Math.abs(m.valor))}</td></tr>)}
            </tbody></table></div>
          </section>
        </>
      )}

      {aba === "receitas" && <ListCard title="Receitas" subtitle="Entradas financeiras registradas no período." action={<button style={btnSmall} onClick={()=>setModalReceita(true)}>+ Nova receita</button>}>
        <div className="fin-scroll"><table className="fin-table"><thead><tr><th>Descrição</th><th>Tipo</th><th>Competência</th><th>Recebimento</th><th>Status</th><th className="right">Valor</th><th></th></tr></thead><tbody>
          {receitasFiltradas.map(r=><tr key={r.id}><td><strong>{r.descricao}</strong>{r.observacao&&<div style={muted}>{r.observacao}</div>}</td><td>{tipoReceitaLabel(r.tipo)}</td><td>{dataBR(r.dataCompetencia)}</td><td>{dataBR(r.dataRecebimento)}</td><td><StatusBadge status={r.status}/></td><td className="right" style={{color:"#5f7f47",fontWeight:700}}>{moeda(r.valor)}</td><td><button style={deleteBtn} disabled={r.status==="CANCELADA"} onClick={()=>cancelarReceita(r)}>Cancelar</button></td></tr>)}
        </tbody></table></div>
        {!receitasFiltradas.length && <div style={emptyText}>Nenhuma receita encontrada.</div>}
      </ListCard>}

      {aba === "despesas" && <ListCard title="Despesas" subtitle="Contas e gastos da operação." action={<button style={btnExpense} onClick={()=>setModalDespesa(true)}>+ Nova despesa</button>}>
        <div className="fin-scroll"><table className="fin-table"><thead><tr><th>Descrição</th><th>Categoria</th><th>Competência</th><th>Pagamento</th><th>Status</th><th className="right">Valor</th><th></th></tr></thead><tbody>
          {despesasFiltradas.map(d=><tr key={d.id}><td><strong>{d.descricao}</strong>{d.recorrente&&<div style={muted}>Despesa recorrente</div>}</td><td>{d.categoria}</td><td>{dataBR(d.dataCompetencia)}</td><td>{dataBR(d.dataPagamento)}</td><td><StatusBadge status={d.status}/></td><td className="right" style={{color:"#b35a5a",fontWeight:700}}>{moeda(d.valor)}</td><td><button style={deleteBtn} disabled={d.status==="CANCELADA"} onClick={()=>cancelarDespesa(d)}>Cancelar</button></td></tr>)}
        </tbody></table></div>
        {!despesasFiltradas.length && <div style={emptyText}>Nenhuma despesa encontrada.</div>}
      </ListCard>}

      {aba === "fiado" && <ListCard title="Valores a receber" subtitle="Vendas em aberto e saldo ainda não recebido." action={<strong style={fiadoTotal}>{moeda(totalAReceber)}</strong>}>
        <div className="fin-scroll"><table className="fin-table"><thead><tr><th>Cliente</th><th>Venda</th><th className="right">Original</th><th className="right">Recebido</th><th className="right">Pendente</th><th></th></tr></thead><tbody>
          {fiado.filter(i=>dentroDoPeriodo(i.compra.criadoem)).map(i=><tr key={i.compra.id}><td><strong>{i.compra.cliente||"Cliente"}</strong><div style={muted}>{i.compra.cpf}</div></td><td>{dataBR(i.compra.criadoem)}</td><td className="right">{moeda(i.compra.valor)}</td><td className="right" style={{color:"#5f7f47"}}>{moeda(i.recebido)}</td><td className="right" style={{color:"#b35a5a",fontWeight:700}}>{moeda(i.pendente)}</td><td><button style={btnSmall} onClick={()=>{setFiadoSelecionado(i);setValorPagamentoFiado(0);setModalFiado(true)}}>Receber</button></td></tr>)}
        </tbody></table></div>
        {!fiado.filter(i=>dentroDoPeriodo(i.compra.criadoem)).length&&<div style={emptyText}>Nenhum valor pendente no período.</div>}
      </ListCard>}

      {modalReceita && <Modal titulo="Nova receita" subtitulo="Registre uma entrada financeira." onClose={()=>setModalReceita(false)}>
        <label style={fieldLabel}>Descrição</label><input style={input} placeholder="Ex.: receita extra" value={descricaoReceita} onChange={e=>setDescricaoReceita(e.target.value)}/>
        <label style={fieldLabel}>Tipo</label><select style={input} value={tipoReceita} onChange={e=>setTipoReceita(e.target.value as Receita["tipo"])}><option value="OUTRA_RECEITA">Outra receita</option><option value="OUTROS">Outros</option></select>
        <label style={fieldLabel}>Valor</label><input style={input} inputMode="decimal" value={moedaInput(valorReceita)} placeholder="R$ 0,00" onChange={e=>setValorReceita(numeroMoeda(e.target.value))}/>
        <label style={fieldLabel}>Observação</label><textarea style={textarea} placeholder="Opcional" value={observacaoReceita} onChange={e=>setObservacaoReceita(e.target.value)}/>
        <div style={resumo}>Entrada: <strong>{moeda(valorReceita)}</strong></div><button style={btnPrimary} onClick={criarReceita}>Cadastrar receita</button>
      </Modal>}

      {modalDespesa && <Modal titulo="Nova despesa" subtitulo="Registre um gasto da operação." onClose={()=>setModalDespesa(false)}>
        <label style={fieldLabel}>Descrição</label><input style={input} placeholder="Ex.: aluguel" value={descricaoDespesa} onChange={e=>setDescricaoDespesa(e.target.value)}/>
        <label style={fieldLabel}>Categoria</label><select style={input} value={categoriaDespesa} onChange={e=>setCategoriaDespesa(e.target.value)}>{categoriasDespesas.map(c=><option key={c}>{c}</option>)}</select>
        <label style={fieldLabel}>Valor</label><input style={input} inputMode="decimal" value={moedaInput(valorDespesa)} placeholder="R$ 0,00" onChange={e=>setValorDespesa(numeroMoeda(e.target.value))}/>
        <label style={fieldLabel}>Data de competência</label><input type="date" style={input} value={dataCompetenciaDespesa} onChange={e=>setDataCompetenciaDespesa(e.target.value)}/>
        <label style={fieldLabel}>Status</label><select style={input} value={statusDespesa} onChange={e=>setStatusDespesa(e.target.value as Despesa["status"])}><option value="PAGA">Paga</option><option value="PENDENTE">Pendente</option></select>
        {statusDespesa==="PAGA"&&<><label style={fieldLabel}>Data de pagamento</label><input type="date" style={input} value={dataPagamentoDespesa} onChange={e=>setDataPagamentoDespesa(e.target.value)}/></>}
        <label style={checkboxLabel}><input type="checkbox" checked={despesaRecorrente} onChange={e=>setDespesaRecorrente(e.target.checked)}/> Despesa recorrente</label>
        <label style={fieldLabel}>Observação</label><textarea style={textarea} placeholder="Opcional" value={observacaoDespesa} onChange={e=>setObservacaoDespesa(e.target.value)}/>
        <div style={resumo}>Saída: <strong>{moeda(valorDespesa)}</strong></div><button style={btnExpensePrimary} onClick={criarDespesa}>Cadastrar despesa</button>
      </Modal>}

      {modalFiado&&fiadoSelecionado&&<Modal titulo="Receber fiado" subtitulo={`Venda de ${fiadoSelecionado.compra.cliente||"cliente"}`} onClose={()=>{setModalFiado(false);setFiadoSelecionado(null)}}>
        <div style={clienteSelecionado}><div><strong>{fiadoSelecionado.compra.cliente||"Cliente"}</strong><div style={muted}>{fiadoSelecionado.compra.cpf}</div></div><div style={clientePontos}>Pendente: {moeda(fiadoSelecionado.pendente)}</div></div>
        <label style={fieldLabel}>Valor recebido</label><input style={input} inputMode="decimal" value={moedaInput(valorPagamentoFiado)} placeholder="R$ 0,00" onChange={e=>setValorPagamentoFiado(numeroMoeda(e.target.value))}/>
        <button style={btnPrimary} onClick={registrarPagamentoFiado}>Registrar pagamento</button>
      </Modal>}
    </div>
  )
}

function Kpi({label,value,detail,destaque=false}:{label:string,value:string,detail:string,destaque?:boolean}) {
  return <div className="fin-card" style={{...dash,...(destaque?{border:"1px solid #d4af37",background:"#fffdf5"}:{})}}><div style={dashLabel}>{label}</div><strong className="fin-kpi-value" style={dashValue}>{value}</strong><div style={muted}>{detail}</div></div>
}

function Indicator({label,value}:{label:string,value:string}) {
  return <div style={indicator}><span>{label}</span><strong>{value}</strong></div>
}

function Breakdown({label,value,total}:{label:string,value:number,total:number}) {
  const percentual=total>0?(value/total)*100:0
  return <div className="fin-break"><span>{label}</span><div className="fin-bar"><span style={{width:`${Math.max(percentual,2)}%`}}/></div><strong>{moeda(value)}</strong></div>
}

function ResumoLinha({label,valor,destaque=false}:{label:string,valor:string,destaque?:boolean}) {
  return <div style={{...resumoLinha,...(destaque?resumoLinhaDestaque:{})}}><span>{label}</span><strong>{valor}</strong></div>
}

function StatusBadge({status}:{status:string}) {
  const cancelado=status==="CANCELADA", pendente=status==="PENDENTE"
  return <span style={{...statusBadge,...(cancelado?statusCancelado:pendente?statusPendente:statusRecebido)}}>{status==="RECEBIDA"?"Recebida":status==="PAGA"?"Paga":status==="PENDENTE"?"Pendente":"Cancelada"}</span>
}

function ListCard({title,subtitle,action,children}:{title:string,subtitle:string,action:ReactNode,children:ReactNode}) {
  return <section className="fin-card" style={section}><div style={sectionHeader}><div><h3 style={sectionTitleNoMargin}>{title}</h3><div style={muted}>{subtitle}</div></div>{action}</div>{children}</section>
}

function Modal({titulo,subtitulo,children,onClose}:{titulo:string,subtitulo?:string,children:ReactNode,onClose:()=>void}) {
  return <div style={overlay} onClick={onClose}><div style={modalCard} onClick={e=>e.stopPropagation()}><div style={modalHeader}><div><h2 style={{margin:0}}>{titulo}</h2>{subtitulo&&<div style={muted}>{subtitulo}</div>}</div><button style={closeBtn} onClick={onClose}>×</button></div>{children}</div></div>
}

const container={width:"100%",minHeight:"100%",padding:40,background:"#f6f6f7",fontFamily:"Inter",overflowX:"hidden" as const,boxSizing:"border-box" as const}
const header={display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap" as const}
const title={fontSize:30,margin:0,fontWeight:600}
const subtitle={marginTop:5,color:"#888",fontSize:13}
const headerButtons={display:"flex",gap:10,flexWrap:"wrap" as const}
const btnSmall={padding:"11px 18px",borderRadius:10,border:"none",background:"linear-gradient(90deg,#d4af37,#f6e27a)",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap" as const}
const btnSecondary={padding:"11px 18px",borderRadius:10,border:"1px solid #eadfbf",background:"#fff",color:"#80691f",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap" as const}
const btnExpense={padding:"11px 18px",borderRadius:10,border:"1px solid #efcaca",background:"#fff5f5",color:"#c45a5a",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap" as const}
const btnExpensePrimary={padding:13,width:"100%",marginTop:12,borderRadius:10,border:"none",background:"#c45a5a",color:"#fff",cursor:"pointer",fontWeight:600}
const dash={background:"#fff",padding:18,borderRadius:14,minWidth:0,overflow:"hidden" as const,border:"1px solid #eeeeee",boxShadow:"0 3px 12px rgba(0,0,0,0.025)",boxSizing:"border-box" as const}
const dashLabel={color:"#777",fontSize:12,marginBottom:5}
const dashValue={fontSize:22,display:"block",wordBreak:"break-word" as const}
const periodCard={background:"#fff",padding:18,borderRadius:14,border:"1px solid #eee",marginBottom:16,boxSizing:"border-box" as const}
const periodTop={display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,flexWrap:"wrap" as const}
const switchLabel={display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#555",cursor:"pointer"}
const input={width:"100%",minWidth:0,padding:11,borderRadius:10,border:"1px solid #ddd",background:"#fff",boxSizing:"border-box" as const,outline:"none",fontFamily:"inherit"}
const textarea={...input,minHeight:80,resize:"vertical" as const}
const fieldLabel={display:"block",marginTop:12,marginBottom:4,color:"#555",fontSize:12,fontWeight:600}
const refreshBtn={padding:"11px 16px",borderRadius:10,border:"1px solid #ddd",background:"#fff",color:"#555",cursor:"pointer",fontWeight:600,whiteSpace:"nowrap" as const}
const tabs={display:"flex",gap:5,background:"#fff",borderRadius:12,padding:5,marginBottom:20,border:"1px solid #eee",overflowX:"auto" as const}
const tab={border:"none",background:"transparent",padding:"10px 15px",borderRadius:9,color:"#777",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap" as const}
const tabAtiva={...tab,background:"#faf8f1",color:"#80691f",fontWeight:600}
const tabBadge={display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:19,height:19,marginLeft:6,padding:"0 5px",borderRadius:10,background:"#d4af37",color:"#fff",fontSize:10,fontWeight:700}
const section={width:"100%",minWidth:0,background:"#fff",padding:20,borderRadius:16,marginBottom:16,overflow:"hidden" as const,boxSizing:"border-box" as const}
const sectionHeader={display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,marginBottom:16,flexWrap:"wrap" as const}
const sectionTitle={marginTop:0,marginBottom:16,fontSize:17}
const sectionTitleNoMargin={margin:0,fontSize:18}
const resumoLinha={display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,padding:"13px 0",borderBottom:"1px solid #eee",fontSize:14}
const resumoLinhaDestaque={color:"#80691f",fontSize:15,fontWeight:700}
const indicator={display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #eee",fontSize:13}
const statusBadge={display:"inline-block",padding:"5px 8px",borderRadius:7,fontSize:10,fontWeight:600,whiteSpace:"nowrap" as const}
const statusRecebido={background:"#edf5e7",color:"#66834e"}
const statusPendente={background:"#fff6d6",color:"#9b7b2f"}
const statusCancelado={background:"#fff0f0",color:"#c45a5a"}
const deleteBtn={padding:"8px 11px",borderRadius:8,border:"1px solid #efcaca",background:"#fff5f5",color:"#c45a5a",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap" as const}
const fiadoTotal={padding:"9px 13px",borderRadius:9,background:"#faf8f1",color:"#80691f",fontWeight:700,whiteSpace:"nowrap" as const}
const emptyText={color:"#888",fontSize:13,padding:"12px 0"}
const muted={fontSize:12,color:"#888",marginTop:3}
const resumo={marginTop:12,padding:13,background:"#faf8f1",borderRadius:10,lineHeight:1.8,fontSize:13}
const btnPrimary={width:"100%",marginTop:12,padding:13,borderRadius:10,border:"none",background:"linear-gradient(90deg,#d4af37,#f6e27a)",cursor:"pointer",fontWeight:600}
const checkboxLabel={display:"flex",alignItems:"center",gap:8,marginTop:14,fontSize:13,color:"#555",cursor:"pointer"}
const clienteSelecionado={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:12,marginTop:12,borderRadius:10,background:"#faf8f1",flexWrap:"wrap" as const}
const clientePontos={color:"#9b7b2f",fontSize:12,fontWeight:600}
const overlay={position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:2000,overflowY:"auto" as const,boxSizing:"border-box" as const}
const modalCard={background:"#fff",padding:20,borderRadius:16,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto" as const,overflowX:"hidden" as const,boxSizing:"border-box" as const}
const modalHeader={display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:15,marginBottom:10}
const closeBtn={width:34,height:34,border:"none",background:"#f5f5f5",borderRadius:"50%",cursor:"pointer",fontSize:22,lineHeight:1,color:"#666",flexShrink:0}
