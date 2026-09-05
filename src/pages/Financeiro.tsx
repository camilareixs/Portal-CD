import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

// ==========================================
// TIPOS E CONSTANTES
// ==========================================
export type TipoReceita = "VENDA" | "PAGAMENTO_FIADO" | "OUTRA_RECEITA" | "OUTROS"
export type StatusFinanceiro = "RECEBIDA" | "PAGO" | "PENDENTE" | "CANCELADA"

export interface Receita {
  id: string
  descricao: string
  tipo: TipoReceita
  competencia: string
  recebimento: string | null
  valor: number
  status: StatusFinanceiro
  compraId?: string | null
  criadoem?: string
}

export interface Despesa {
  id: string
  descricao: string
  categoria: string
  competencia: string
  pagamento: string | null
  valor: number
  recorrente: boolean
  status: "PAGO" | "PENDENTE"
  criadoem?: string
}

export interface CompraFiado {
  id: string
  clienteId: string
  clienteNome: string
  clienteCpf: string
  dataVenda: string
  valorOriginal: number
  valorRecebido: number
  valorPendente: number
}

export const CATEGORIAS_DESPESAS = [
  "Aluguel",
  "Marketing",
  "Embalagens",
  "Transporte",
  "Taxas",
  "Fornecedores",
  "Operacional",
  "Outros"
] as const

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ==========================================
function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function dataBR(data: string | null) {
  if (!data) return "-"
  const [ano, mes, dia] = data.split("T")[0].split("-")
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

// ==========================================
// COMPONENTE PRINCIPAL: FINANCEIRO
// ==========================================
export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<"resumo" | "receitas" | "despesas" | "areceber">("resumo")
  const [mesFiltro, setMesFiltro] = useState<string>(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
  })

  const [carregando, setCarregando] = useState(false)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [comprasFiado, setComprasFiado] = useState<CompraFiado[]>([])
  const [custoProdutosVendidos, setCustoProdutosVendidos] = useState<number>(0)
  const [vendasTotaisCount, setVendasTotaisCount] = useState<number>(0)

  // ESTADOS DOS MODAIS
  const [modalReceita, setModalReceita] = useState(false)
  const [modalDespesa, setModalDespesa] = useState(false)
  const [modalFiado, setModalFiado] = useState<CompraFiado | null>(null)

  // FORMULÁRIOS
  const [formReceita, setFormReceita] = useState({
    descricao: "",
    tipo: "OUTRA_RECEITA" as TipoReceita,
    competencia: new Date().toISOString().split("T")[0],
    recebimento: new Date().toISOString().split("T")[0],
    valor: "",
    status: "RECEBIDA" as "RECEBIDA" | "PENDENTE"
  })

  const [formDespesa, setFormDespesa] = useState({
    descricao: "",
    categoria: CATEGORIAS_DESPESAS[0] as string,
    competencia: new Date().toISOString().split("T")[0],
    pagamento: new Date().toISOString().split("T")[0],
    valor: "",
    recorrente: false,
    status: "PAGO" as "PAGO" | "PENDENTE"
  })

  const [formFiado, setFormFiado] = useState({
    valorRecebido: "",
    data: new Date().toISOString().split("T")[0],
    observacao: ""
  })

  // CARREGAMENTO DOS DADOS COM SUPABASE
  const carregarDados = async () => {
    setCarregando(true)

    const [anoStr, mesStr] = mesFiltro.split("-")
    const ano = parseInt(anoStr, 10)
    const mes = parseInt(mesStr, 10)

    const dataInicio = new Date(ano, mes - 1, 1).toISOString().split("T")[0]
    const dataFim = new Date(ano, mes, 0).toISOString().split("T")[0]

    try {
      // 1. Carregar Receitas
      const { data: dataRec } = await supabase
        .from("receitas")
        .select("*")
        .neq("status", "CANCELADA")
        .gte("competencia", dataInicio)
        .lte("competencia", dataFim)

      setReceitas(dataRec || [])

      // 2. Carregar Despesas
      const { data: dataDesp } = await supabase
        .from("despesas")
        .select("*")
        .gte("competencia", dataInicio)
        .lte("competencia", dataFim)

      setDespesas(dataDesp || [])

      // 3. Carregar Compras para cálculo de CMV e Fiado em aberto
      const { data: dataCompras } = await supabase
        .from("compras")
        .select(`
          id,
          valorTotal,
          formaPagamento,
          status,
          criadoem,
          cliente:clientes(id, nome, cpf),
          vendaItens(quantidade, custoUnitario)
        `)
        .neq("status", "CANCELADA")
        .gte("criadoem", `${dataInicio}T00:00:00`)
        .lte("criadoem", `${dataFim}T23:59:59`)

      let cmvTotal = 0
      let qtdVendas = 0
      const fiadoList: CompraFiado[] = []

      if (dataCompras) {
        qtdVendas = dataCompras.length
        const compraIds = dataCompras.map(c => c.id)

        // Busca pagamentos de fiado anteriores para vincular abatimentos
        const { data: pagamentosFiado } = await supabase
          .from("receitas")
          .select("compraId, valor")
          .eq("tipo", "PAGAMENTO_FIADO")
          .neq("status", "CANCELADA")
          .in("compraId", compraIds.length > 0 ? compraIds : ["none"])

        const recMap = new Map<string, number>()
        pagamentosFiado?.forEach(p => {
          if (p.compraId) {
            recMap.set(p.compraId, (recMap.get(p.compraId) || 0) + Number(p.valor))
          }
        })

        dataCompras.forEach(c => {
          // Soma Custo dos Produtos Vendidos (CMV) via vendaItens
          if (c.vendaItens && Array.isArray(c.vendaItens)) {
            c.vendaItens.forEach((item: any) => {
              cmvTotal += (Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0)
            })
          }

          // Filtra compras Fiado em aberto
          const eFiado = c.formaPagamento === "Em aberto (Fiado)" || c.formaPagamento === "FIADO"
          if (eFiado) {
            const vOrig = Number(c.valorTotal) || 0
            const vRec = recMap.get(c.id) || 0
            const vPend = Math.max(0, vOrig - vRec)

            if (vPend > 0) {
              const cliObj = Array.isArray(c.cliente) ? c.cliente[0] : c.cliente
              fiadoList.push({
                id: c.id,
                clienteId: cliObj?.id || "",
                clienteNome: cliObj?.nome || "Cliente não informado",
                clienteCpf: cliObj?.cpf || "-",
                dataVenda: c.criadoem,
                valorOriginal: vOrig,
                valorRecebido: vRec,
                valorPendente: vPend
              })
            }
          }
        })
      }

      setCustoProdutosVendidos(cmvTotal)
      setVendasTotaisCount(qtdVendas)
      setComprasFiado(fiadoList)
    } catch (err) {
      console.error("Erro ao carregar módulo financeiro:", err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [mesFiltro])

  // CÁLCULOS E MÉTRICAS CONSOLIDADAS
  const resumoMetrics = useMemo(() => {
    const totalReceitas = receitas
      .filter(r => r.status === "RECEBIDA")
      .reduce((acc, r) => acc + Number(r.valor), 0)

    const totalDespesas = despesas
      .filter(d => d.status === "PAGO")
      .reduce((acc, d) => acc + Number(d.valor), 0)

    const totalAReceber = comprasFiado.reduce((acc, f) => acc + f.valorPendente, 0)
    const totalRecebidoFiado = comprasFiado.reduce((acc, f) => acc + f.valorRecebido, 0)

    const faturamentoVendas = receitas
      .filter(r => r.tipo === "VENDA" && r.status === "RECEBIDA")
      .reduce((acc, r) => acc + Number(r.valor), 0)

    const lucroBruto = faturamentoVendas - custoProdutosVendidos
    const resultadoLiquido = totalReceitas - totalDespesas
    const clientesComFiado = new Set(comprasFiado.map(f => f.clienteId)).size

    return {
      totalReceitas,
      totalDespesas,
      resultadoLiquido,
      lucroBruto,
      totalAReceber,
      totalRecebidoFiado,
      faturamentoVendas,
      qtdVendas: vendasTotaisCount,
      qtdReceitas: receitas.length,
      qtdDespesas: despesas.length,
      clientesComFiado
    }
  }, [receitas, despesas, comprasFiado, custoProdutosVendidos, vendasTotaisCount])

  // AÇÕES
  const handleSalvarReceita = async () => {
    if (!formReceita.descricao || !formReceita.valor) return alert("Preencha a descrição e o valor.")
    setCarregando(true)

    const { error } = await supabase.from("receitas").insert({
      descricao: formReceita.descricao,
      tipo: formReceita.tipo,
      competencia: formReceita.competencia,
      recebimento: formReceita.status === "RECEBIDA" ? formReceita.recebimento : null,
      valor: parseFloat(formReceita.valor.replace(".", "").replace(",", ".")),
      status: formReceita.status
    })

    if (error) {
      alert("Erro ao salvar receita: " + error.message)
    } else {
      setModalReceita(false)
      setFormReceita({
        descricao: "",
        tipo: "OUTRA_RECEITA",
        competencia: new Date().toISOString().split("T")[0],
        recebimento: new Date().toISOString().split("T")[0],
        valor: "",
        status: "RECEBIDA"
      })
      carregarDados()
    }
    setCarregando(false)
  }

  const handleSalvarDespesa = async () => {
    if (!formDespesa.descricao || !formDespesa.valor) return alert("Preencha a descrição e o valor.")
    setCarregando(true)

    const { error } = await supabase.from("despesas").insert({
      descricao: formDespesa.descricao,
      categoria: formDespesa.categoria,
      competencia: formDespesa.competencia,
      pagamento: formDespesa.status === "PAGO" ? formDespesa.pagamento : null,
      valor: parseFloat(formDespesa.valor.replace(".", "").replace(",", ".")),
      recorrente: formDespesa.recorrente,
      status: formDespesa.status
    })

    if (error) {
      alert("Erro ao salvar despesa: " + error.message)
    } else {
      setModalDespesa(false)
      setFormDespesa({
        descricao: "",
        categoria: CATEGORIAS_DESPESAS[0],
        competencia: new Date().toISOString().split("T")[0],
        pagamento: new Date().toISOString().split("T")[0],
        valor: "",
        recorrente: false,
        status: "PAGO"
      })
      carregarDados()
    }
    setCarregando(false)
  }

  const handleRegistrarPagamentoFiado = async () => {
    if (!modalFiado) return
    const valorNum = parseFloat(formFiado.valorRecebido.replace(".", "").replace(",", "."))
    if (isNaN(valorNum) || valorNum <= 0) return alert("Informe um valor válido.")
    if (valorNum > modalFiado.valorPendente) {
      return alert(`O valor informado excede o saldo pendente de ${moeda(modalFiado.valorPendente)}`)
    }

    setCarregando(true)

    const { error } = await supabase.from("receitas").insert({
      descricao: `Pagamento Fiado - ${modalFiado.clienteNome}${formFiado.observacao ? ` (${formFiado.observacao})` : ""}`,
      tipo: "PAGAMENTO_FIADO",
      competencia: formFiado.data,
      recebimento: formFiado.data,
      valor: valorNum,
      status: "RECEBIDA",
      compraId: modalFiado.id
    })

    if (error) {
      alert("Erro ao registrar pagamento: " + error.message)
    } else {
      setModalFiado(null)
      setFormFiado({ valorRecebido: "", data: new Date().toISOString().split("T")[0], observacao: "" })
      carregarDados()
    }
    setCarregando(false)
  }

  return (
    <div style={styles.container}>
      {/* HEADER DE TÍTULO */}
      <div style={styles.headerTitleContainer}>
        <h1 style={styles.title}>Financeiro</h1>
        <div style={styles.filterBar}>
          <label style={styles.labelFilter}>
            Período:
            <input
              type="month"
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
              style={styles.inputMonth}
            />
          </label>
          <button onClick={carregarDados} style={styles.btnRefresh} title="Atualizar Dados">
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div style={styles.tabsContainer}>
        {[
          { key: "resumo", label: "Resumo" },
          { key: "receitas", label: "Receitas" },
          { key: "despesas", label: "Despesas" },
          { key: "areceber", label: "A Receber" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setAbaAtiva(tab.key as any)}
            style={{
              ...styles.tabButton,
              ...(abaAtiva === tab.key ? styles.tabButtonActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {carregando ? (
        <div style={styles.loadingState}>Carregando informações financeiras...</div>
      ) : (
        <>
          {/* ABA 1: RESUMO */}
          {abaAtiva === "resumo" && (
            <div>
              <div style={styles.gridCards}>
                <div style={styles.card}>
                  <span style={styles.cardLabel}>Faturamento (Vendas)</span>
                  <strong style={styles.cardValue}>{moeda(resumoMetrics.faturamentoVendas)}</strong>
                  <span style={styles.cardSub}>Total em vendas realizadas</span>
                </div>

                <div style={styles.card}>
                  <span style={styles.cardLabel}>Receitas Efetivas</span>
                  <strong style={{ ...styles.cardValue, color: "#15803d" }}>
                    {moeda(resumoMetrics.totalReceitas)}
                  </strong>
                  <span style={styles.cardSub}>{resumoMetrics.qtdReceitas} lançamentos efetuados</span>
                </div>

                <div style={styles.card}>
                  <span style={styles.cardLabel}>Despesas Totais</span>
                  <strong style={{ ...styles.cardValue, color: "#b91c1c" }}>
                    {moeda(resumoMetrics.totalDespesas)}
                  </strong>
                  <span style={styles.cardSub}>{resumoMetrics.qtdDespesas} despesas pagas</span>
                </div>

                <div style={{ ...styles.card, borderColor: "#d97706" }}>
                  <span style={styles.cardLabel}>A Receber (Fiado)</span>
                  <strong style={{ ...styles.cardValue, color: "#b45309" }}>
                    {moeda(resumoMetrics.totalAReceber)}
                  </strong>
                  <span style={styles.cardSub}>{resumoMetrics.clientesComFiado} clientes pendentes</span>
                </div>
              </div>

              {/* DRE SIMPLIFICADO */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>Demonstrativo do Resultado (Resultado do Período)</h3>
                <div style={styles.dreRow}>
                  <span>Faturamento de Vendas</span>
                  <strong>{moeda(resumoMetrics.faturamentoVendas)}</strong>
                </div>
                <div style={{ ...styles.dreRow, color: "#b91c1c" }}>
                  <span>(-) Custo dos Produtos Vendidos (CMV)</span>
                  <strong>- {moeda(custoProdutosVendidos)}</strong>
                </div>
                <div style={{ ...styles.dreRow, borderTop: "1px solid #e5e7eb", fontWeight: "bold" }}>
                  <span>(=) Lucro Bruto</span>
                  <span style={{ color: resumoMetrics.lucroBruto >= 0 ? "#15803d" : "#b91c1c" }}>
                    {moeda(resumoMetrics.lucroBruto)}
                  </span>
                </div>
                <div style={{ ...styles.dreRow, color: "#b91c1c" }}>
                  <span>(-) Despesas Operacionais</span>
                  <strong>- {moeda(resumoMetrics.totalDespesas)}</strong>
                </div>
                <div style={{ ...styles.dreRow, borderTop: "2px solid #111827", fontWeight: "bold", fontSize: 16 }}>
                  <span>(=) Resultado Líquido Final</span>
                  <span style={{ color: resumoMetrics.resultadoLiquido >= 0 ? "#15803d" : "#b91c1c" }}>
                    {moeda(resumoMetrics.resultadoLiquido)}
                  </span>
                </div>
              </div>

              {/* MÉTRICAS COMPLEMENTARES */}
              <div style={styles.gridCardsSecundarios}>
                <div style={styles.cardSm}>
                  <span style={styles.cardLabel}>Qtd. Vendas</span>
                  <strong>{resumoMetrics.qtdVendas}</strong>
                </div>
                <div style={styles.cardSm}>
                  <span style={styles.cardLabel}>Qtd. Receitas</span>
                  <strong>{resumoMetrics.qtdReceitas}</strong>
                </div>
                <div style={styles.cardSm}>
                  <span style={styles.cardLabel}>Qtd. Despesas</span>
                  <strong>{resumoMetrics.qtdDespesas}</strong>
                </div>
                <div style={styles.cardSm}>
                  <span style={styles.cardLabel}>Recebido de Fiado</span>
                  <strong>{moeda(resumoMetrics.totalRecebidoFiado)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: RECEITAS */}
          {abaAtiva === "receitas" && (
            <div>
              <div style={styles.actionRow}>
                <h3 style={styles.sectionTitle}>Lançamentos de Receita</h3>
                <button onClick={() => setModalReceita(true)} style={styles.btnPrimary}>
                  + Nova receita
                </button>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Descrição</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Competência</th>
                      <th style={styles.th}>Recebimento</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitas.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={styles.tdEmpty}>Nenhuma receita registrada no período.</td>
                      </tr>
                    ) : (
                      receitas.map(r => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={styles.td}><strong>{r.descricao}</strong></td>
                          <td style={styles.td}>{r.tipo.replace("_", " ")}</td>
                          <td style={styles.td}>{dataBR(r.competencia)}</td>
                          <td style={styles.td}>{dataBR(r.recebimento)}</td>
                          <td style={{ ...styles.td, color: "#15803d", fontWeight: "bold" }}>
                            {moeda(Number(r.valor))}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.badgeSuccess}>{r.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: DESPESAS */}
          {abaAtiva === "despesas" && (
            <div>
              <div style={styles.actionRow}>
                <h3 style={styles.sectionTitle}>Lançamentos de Despesa</h3>
                <button onClick={() => setModalDespesa(true)} style={styles.btnPrimary}>
                  + Nova despesa
                </button>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Descrição</th>
                      <th style={styles.th}>Categoria</th>
                      <th style={styles.th}>Competência</th>
                      <th style={styles.th}>Pagamento</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}>Recorrente</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={styles.tdEmpty}>Nenhuma despesa registrada no período.</td>
                      </tr>
                    ) : (
                      despesas.map(d => (
                        <tr key={d.id} style={styles.tr}>
                          <td style={styles.td}><strong>{d.descricao}</strong></td>
                          <td style={styles.td}>{d.categoria}</td>
                          <td style={styles.td}>{dataBR(d.competencia)}</td>
                          <td style={styles.td}>{dataBR(d.pagamento)}</td>
                          <td style={{ ...styles.td, color: "#b91c1c", fontWeight: "bold" }}>
                            {moeda(Number(d.valor))}
                          </td>
                          <td style={styles.td}>{d.recorrente ? "Sim" : "Não"}</td>
                          <td style={styles.td}>
                            <span style={d.status === "PAGO" ? styles.badgeSuccess : styles.badgeWarning}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 4: A RECEBER */}
          {abaAtiva === "areceber" && (
            <div>
              <div style={styles.actionRow}>
                <h3 style={styles.sectionTitle}>Contas a Receber (Vendas no Fiado)</h3>
              </div>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Cliente</th>
                      <th style={styles.th}>CPF</th>
                      <th style={styles.th}>Data da Venda</th>
                      <th style={styles.th}>Valor Original</th>
                      <th style={styles.th}>Valor Recebido</th>
                      <th style={styles.th}>Valor Pendente</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasFiado.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={styles.tdEmpty}>Nenhum fiado em aberto para este período.</td>
                      </tr>
                    ) : (
                      comprasFiado.map(f => (
                        <tr key={f.id} style={styles.tr}>
                          <td style={styles.td}><strong>{f.clienteNome}</strong></td>
                          <td style={styles.td}>{f.clienteCpf}</td>
                          <td style={styles.td}>{dataBR(f.dataVenda)}</td>
                          <td style={styles.td}>{moeda(f.valorOriginal)}</td>
                          <td style={{ ...styles.td, color: "#15803d" }}>{moeda(f.valorRecebido)}</td>
                          <td style={{ ...styles.td, color: "#b91c1c", fontWeight: "bold" }}>
                            {moeda(f.valorPendente)}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => {
                                setModalFiado(f)
                                setFormFiado({
                                  valorRecebido: f.valorPendente.toFixed(2),
                                  data: new Date().toISOString().split("T")[0],
                                  observacao: ""
                                })
                              }}
                              style={styles.btnSecondary}
                            >
                              Registrar pagamento
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: NOVA RECEITA */}
      {modalReceita && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>+ Nova Receita</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo</label>
              <select
                value={formReceita.tipo}
                onChange={e => setFormReceita({ ...formReceita, tipo: e.target.value as TipoReceita })}
                style={styles.input}
              >
                <option value="OUTRA_RECEITA">Outra receita</option>
                <option value="VENDA">Venda</option>
                <option value="PAGAMENTO_FIADO">Pagamento de fiado</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Descrição</label>
              <input
                type="text"
                placeholder="Ex: Serviço de consultoria"
                value={formReceita.descricao}
                onChange={e => setFormReceita({ ...formReceita, descricao: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valor (R$)</label>
              <input
                type="text"
                placeholder="0,00"
                value={formReceita.valor}
                onChange={e => setFormReceita({ ...formReceita, valor: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Competência</label>
              <input
                type="date"
                value={formReceita.competencia}
                onChange={e => setFormReceita({ ...formReceita, competencia: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={formReceita.status}
                  onChange={e => setFormReceita({ ...formReceita, status: e.target.value as any })}
                  style={styles.input}
                >
                  <option value="RECEBIDA">RECEBIDA</option>
                  <option value="PENDENTE">PENDENTE</option>
                </select>
              </div>
              {formReceita.status === "RECEBIDA" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Recebimento</label>
                  <input
                    type="date"
                    value={formReceita.recebimento}
                    onChange={e => setFormReceita({ ...formReceita, recebimento: e.target.value })}
                    style={styles.input}
                  />
                </div>
              )}
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setModalReceita(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleSalvarReceita} style={styles.btnPrimary}>Salvar Receita</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA DESPESA */}
      {modalDespesa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>+ Nova Despesa</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Categoria</label>
              <select
                value={formDespesa.categoria}
                onChange={e => setFormDespesa({ ...formDespesa, categoria: e.target.value })}
                style={styles.input}
              >
                {CATEGORIAS_DESPESAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Descrição</label>
              <input
                type="text"
                placeholder="Ex: Aluguel do espaço"
                value={formDespesa.descricao}
                onChange={e => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Valor (R$)</label>
              <input
                type="text"
                placeholder="0,00"
                value={formDespesa.valor}
                onChange={e => setFormDespesa({ ...formDespesa, valor: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Competência</label>
              <input
                type="date"
                value={formDespesa.competencia}
                onChange={e => setFormDespesa({ ...formDespesa, competencia: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={formDespesa.status}
                  onChange={e => setFormDespesa({ ...formDespesa, status: e.target.value as any })}
                  style={styles.input}
                >
                  <option value="PAGO">PAGO</option>
                  <option value="PENDENTE">PENDENTE</option>
                </select>
              </div>
              {formDespesa.status === "PAGO" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data Pagamento</label>
                  <input
                    type="date"
                    value={formDespesa.pagamento}
                    onChange={e => setFormDespesa({ ...formDespesa, pagamento: e.target.value })}
                    style={styles.input}
                  />
                </div>
              )}
            </div>
            <div style={{ ...styles.formGroup, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="recorrente_check"
                checked={formDespesa.recorrente}
                onChange={e => setFormDespesa({ ...formDespesa, recorrente: e.target.checked })}
              />
              <label htmlFor="recorrente_check" style={styles.label}>Despesa Recorrente</label>
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setModalDespesa(false)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleSalvarDespesa} style={styles.btnPrimary}>Salvar Despesa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGAMENTO FIADO */}
      {modalFiado && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Registrar Pagamento de Fiado</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Cliente: <strong>{modalFiado.clienteNome}</strong> | Saldo Pendente:{" "}
              <strong style={{ color: "#b91c1c" }}>{moeda(modalFiado.valorPendente)}</strong>
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Valor Recebido (R$)</label>
              <input
                type="text"
                value={formFiado.valorRecebido}
                onChange={e => setFormFiado({ ...formFiado, valorRecebido: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data do Recebimento</label>
              <input
                type="date"
                value={formFiado.data}
                onChange={e => setFormFiado({ ...formFiado, data: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Observação</label>
              <input
                type="text"
                placeholder="Ex: Parcela via PIX"
                value={formFiado.observacao}
                onChange={e => setFormFiado({ ...formFiado, observacao: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setModalFiado(null)} style={styles.btnCancel}>Cancelar</button>
              <button onClick={handleRegistrarPagamentoFiado} style={styles.btnPrimary}>Confirmar Pagamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// ESTILOS VISUAIS UNIFICADOS DO SISTEMA
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#fafafa",
    minHeight: "100vh",
    padding: "24px 32px",
    fontFamily: "'Inter', sans-serif",
    color: "#1f2937"
  },
  headerTitleContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    margin: 0
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  labelFilter: {
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  inputMonth: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 13,
    backgroundColor: "#ffffff"
  },
  btnRefresh: {
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    color: "#374151"
  },
  tabsContainer: {
    display: "flex",
    gap: 8,
    borderBottom: "1px solid #e5e7eb",
    marginBottom: 24
  },
  tabButton: {
    padding: "10px 18px",
    border: "none",
    background: "none",
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  },
  tabButtonActive: {
    color: "#b45309",
    borderBottom: "2px solid #b45309",
    fontWeight: "bold"
  },
  gridCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 8,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column"
  },
  cardLabel: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "bold",
    margin: "6px 0 2px",
    color: "#111827"
  },
  cardSub: {
    fontSize: 11,
    color: "#9ca3af"
  },
  gridCardsSecundarios: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 16
  },
  cardSm: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #f3f4f6",
    fontSize: 13
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 8,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    margin: "0 0 16px 0",
    color: "#111827"
  },
  dreRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    fontSize: 14
  },
  actionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  btnPrimary: {
    backgroundColor: "#111827",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer"
  },
  btnSecondary: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer"
  },
  tableWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    border: "1px solid #f3f4f6",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 13
  },
  th: {
    backgroundColor: "#f9fafb",
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 600,
    color: "#374151"
  },
  tr: {
    borderBottom: "1px solid #f3f4f6"
  },
  td: {
    padding: "12px 16px",
    color: "#374151"
  },
  tdEmpty: {
    padding: 24,
    textAlign: "center",
    color: "#9ca3af"
  },
  badgeSuccess: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 24,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
  },
  modalTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20,
    margin: "0 0 16px 0"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 12,
    gap: 4
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151"
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 13
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20
  },
  btnCancel: {
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    padding: "8px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13
  },
  loadingState: {
    padding: 40,
    textAlign: "center",
    color: "#6b7280"
  }
}