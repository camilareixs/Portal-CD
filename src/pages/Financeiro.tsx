import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase" // Ajuste o caminho conforme seu projeto

// Categorias fixas no TypeScript (regra do projeto)
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

export const TIPOS_RECEITAS = [
  { value: "VENDA", label: "Venda" },
  { value: "PAGAMENTO_FIADO", label: "Pagamento de Fiado" },
  { value: "OUTRA_RECEITA", label: "Outra Receita" },
  { value: "OUTROS", label: "Outros" }
] as const

type AbaFinanceiro = "resumo" | "receitas" | "despesas" | "areceber"

interface Receita {
  id: string
  tipo: string
  descricao: string
  valor: number
  dataCompetencia: string
  dataRecebimento: string | null
  status: "PENDENTE" | "RECEBIDA" | "CANCELADA"
  compraId?: string | null
  observacao?: string
  criadoem: string
}

interface Despesa {
  id: string
  descricao: string
  categoria: string
  valor: number
  dataCompetencia: string
  dataPagamento: string | null
  recorrente: boolean
  status: "PENDENTE" | "PAGA" | "CANCELADA"
  observacao?: string
  criadoem: string
}

interface VendaFiado {
  id: string
  cliente: string
  cpf: string
  valor: number
  valorRecebido: number
  criadoem: string
}

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState<AbaFinanceiro>("resumo")
  const [carregando, setCarregando] = useState(false)
  const [filtroMes, setFiltroMes] = useState<string>(
    new Date().toISOString().substring(0, 7) // AAA-MM
  )

  // Dados
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [vendasFiado, setVendasFiado] = useState<VendaFiado[]>([])

  // Modais
  const [modalNovaReceita, setModalNovaReceita] = useState(false)
  const [modalNovaDespesa, setModalNovaDespesa] = useState(false)
  const [modalPagamentoFiado, setModalPagamentoFiado] = useState<VendaFiado | null>(null)

  // Form States - Receita
  const [formReceita, setFormReceita] = useState({
    descricao: "",
    tipo: "OUTRA_RECEITA",
    valor: "",
    dataCompetencia: new Date().toISOString().substring(0, 10),
    dataRecebimento: new Date().toISOString().substring(0, 10),
    status: "RECEBIDA" as "PENDENTE" | "RECEBIDA",
    observacao: ""
  })

  // Form States - Despesa
  const [formDespesa, setFormDespesa] = useState({
    descricao: "",
    categoria: "Operacional",
    valor: "",
    dataCompetencia: new Date().toISOString().substring(0, 10),
    dataPagamento: new Date().toISOString().substring(0, 10),
    recorrente: false,
    status: "PAGA" as "PENDENTE" | "PAGA",
    observacao: ""
  })

  // Form States - Pagamento Fiado
  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    data: new Date().toISOString().substring(0, 10),
    observacao: ""
  })

  useEffect(() => {
    carregarDados()
  }, [filtroMes])

  async function carregarDados() {
    setCarregando(true)
    try {
      // 1. Buscar Receitas
      const { data: recData, error: recErr } = await supabase
        .from("receitas")
        .select("*")
        .order("criadoem", { ascending: false })

      if (recErr) throw recErr
      setReceitas(recData || [])

      // 2. Buscar Despesas
      const { data: despData, error: despErr } = await supabase
        .from("despesas")
        .select("*")
        .order("criadoem", { ascending: false })

      if (despErr) throw despErr
      setDespesas(despData || [])

      // 3. Buscar Vendas Fiado (Em aberto)
      const { data: comprasData, error: comprasErr } = await supabase
        .from("compras")
        .select("id, cliente, cpf, valor, criadoem")
        .eq("pagamento", "Em aberto (Fiado)")
        .neq("status", "CANCELADA")

      if (comprasErr) throw comprasErr

      // Calcular o total já recebido em receitas para cada venda Fiado
      const fiadoComPagamentos: VendaFiado[] = []

      for (const c of comprasData || []) {
        const pagamentosCompra = (recData || []).filter(
          (r) => r.compraId === c.id && r.status === "RECEBIDA"
        )
        const totalRecebido = pagamentosCompra.reduce((acc, curr) => acc + Number(curr.valor), 0)

        // Se ainda restam pendências
        if (c.valor - totalRecebido > 0) {
          fiadoComPagamentos.push({
            id: c.id,
            cliente: c.cliente,
            cpf: c.cpf,
            valor: Number(c.valor),
            valorRecebido: totalRecebido,
            criadoem: c.criadoem
          })
        }
      }

      setVendasFiado(fiadoComPagamentos)
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err)
    } finally {
      setCarregando(false)
    }
  }

  // Ações - Nova Receita
  async function salvarReceita(e: React.FormEvent) {
    e.preventDefault()
    if (!formReceita.descricao || !formReceita.valor) return

    try {
      const { error } = await supabase.from("receitas").insert([
        {
          descricao: formReceita.descricao,
          tipo: formReceita.tipo,
          valor: Number(formReceita.valor),
          dataCompetencia: formReceita.dataCompetencia,
          dataRecebimento: formReceita.status === "RECEBIDA" ? formReceita.dataRecebimento : null,
          status: formReceita.status,
          observacao: formReceita.observacao || null
        }
      ])

      if (error) throw error

      setModalNovaReceita(false)
      setFormReceita({
        descricao: "",
        tipo: "OUTRA_RECEITA",
        valor: "",
        dataCompetencia: new Date().toISOString().substring(0, 10),
        dataRecebimento: new Date().toISOString().substring(0, 10),
        status: "RECEBIDA",
        observacao: ""
      })
      carregarDados()
    } catch (err) {
      alert("Erro ao salvar receita")
      console.error(err)
    }
  }

  // Ações - Nova Despesa
  async function salvarDespesa(e: React.FormEvent) {
    e.preventDefault()
    if (!formDespesa.descricao || !formDespesa.valor) return

    try {
      const { error } = await supabase.from("despesas").insert([
        {
          descricao: formDespesa.descricao,
          categoria: formDespesa.categoria,
          valor: Number(formDespesa.valor),
          dataCompetencia: formDespesa.dataCompetencia,
          dataPagamento: formDespesa.status === "PAGA" ? formDespesa.dataPagamento : null,
          recorrente: formDespesa.recorrente,
          status: formDespesa.status,
          observacao: formDespesa.observacao || null
        }
      ])

      if (error) throw error

      setModalNovaDespesa(false)
      setFormDespesa({
        descricao: "",
        categoria: "Operacional",
        valor: "",
        dataCompetencia: new Date().toISOString().substring(0, 10),
        dataPagamento: new Date().toISOString().substring(0, 10),
        recorrente: false,
        status: "PAGA",
        observacao: ""
      })
      carregarDados()
    } catch (err) {
      alert("Erro ao salvar despesa")
      console.error(err)
    }
  }

  // Ações - Registrar Pagamento de Fiado
  async function registrarPagamentoFiado(e: React.FormEvent) {
    e.preventDefault()
    if (!modalPagamentoFiado || !formPagamento.valor) return

    try {
      const valorPagamento = Number(formPagamento.valor)

      const { error } = await supabase.from("receitas").insert([
        {
          tipo: "PAGAMENTO_FIADO",
          descricao: `Pagamento Fiado - ${modalPagamentoFiado.cliente}`,
          valor: valorPagamento,
          dataCompetencia: formPagamento.data,
          dataRecebimento: formPagamento.data,
          status: "RECEBIDA",
          compraId: modalPagamentoFiado.id,
          observacao: formPagamento.observacao || null
        }
      ])

      if (error) throw error

      setModalPagamentoFiado(null)
      setFormPagamento({
        valor: "",
        data: new Date().toISOString().substring(0, 10),
        observacao: ""
      })
      carregarDados()
    } catch (err) {
      alert("Erro ao registrar pagamento")
      console.error(err)
    }
  }

  // Cálculos de Totais (Filtro por mês selecionado nas datas de competência)
  const receitasFiltradas = receitas.filter(
    (r) => r.status !== "CANCELADA" && r.dataCompetencia?.startsWith(filtroMes)
  )
  const despesasFiltradas = despesas.filter(
    (d) => d.status !== "CANCELADA" && d.dataCompetencia?.startsWith(filtroMes)
  )

  const totalReceitas = receitasFiltradas
    .filter((r) => r.status === "RECEBIDA")
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const totalDespesas = despesasFiltradas
    .filter((d) => d.status === "PAGA")
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  const resultadoLiquido = totalReceitas - totalDespesas

  const totalAReceberFiado = vendasFiado.reduce(
    (acc, curr) => acc + (curr.valor - curr.valorRecebido),
    0
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-200 pb-4">
        <div>
          <h1 className="text-3xl font-serif text-gray-900 tracking-wide">Financeiro</h1>
          <p className="text-sm text-gray-500">Gestão de caixa, receitas, despesas e fiado</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="border border-amber-300 rounded-md px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={carregarDados}
            title="Atualizar dados"
            className="p-2 border border-amber-300 rounded-md bg-white hover:bg-amber-50 text-amber-700 transition"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-gray-200 gap-6">
        {[
          { id: "resumo", label: "Resumo" },
          { id: "receitas", label: "Receitas" },
          { id: "despesas", label: "Despesas" },
          { id: "areceber", label: `A Receber (${vendasFiado.length})` }
        ].map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id as AbaFinanceiro)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              abaAtiva === aba.id
                ? "border-amber-600 text-amber-700 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="py-12 text-center text-gray-500 text-sm">Carregando financeiro...</div>
      ) : (
        <>
          {/* ABA 1: RESUMO */}
          {abaAtiva === "resumo" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-lg border border-amber-100 shadow-sm">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Receitas Recebidas
                  </span>
                  <div className="text-2xl font-serif text-emerald-600 mt-2">
                    R$ {totalReceitas.toFixed(2)}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {receitasFiltradas.length} lançamento(s) no mês
                  </span>
                </div>

                <div className="bg-white p-5 rounded-lg border border-amber-100 shadow-sm">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Despesas Pagas
                  </span>
                  <div className="text-2xl font-serif text-rose-600 mt-2">
                    R$ {totalDespesas.toFixed(2)}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {despesasFiltradas.length} lançamento(s) no mês
                  </span>
                </div>

                <div className="bg-white p-5 rounded-lg border border-amber-100 shadow-sm">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Resultado Caixas
                  </span>
                  <div
                    className={`text-2xl font-serif mt-2 ${
                      resultadoLiquido >= 0 ? "text-amber-700" : "text-rose-700"
                    }`}
                  >
                    R$ {resultadoLiquido.toFixed(2)}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">Receitas - Despesas</span>
                </div>

                <div className="bg-white p-5 rounded-lg border border-amber-100 shadow-sm">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Fiado a Receber (Total)
                  </span>
                  <div className="text-2xl font-serif text-amber-800 mt-2">
                    R$ {totalAReceberFiado.toFixed(2)}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {vendasFiado.length} cliente(s) pendente(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: RECEITAS */}
          {abaAtiva === "receitas" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-serif text-gray-800">Lançamentos de Receitas</h2>
                <button
                  onClick={() => setModalNovaReceita(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-md transition shadow-sm"
                >
                  + Nova Receita
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-50/50 text-gray-600 border-b border-gray-200 font-medium">
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Competência</th>
                      <th className="p-3">Recebimento</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receitasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-400">
                          Nenhuma receita encontrada para o período.
                        </td>
                      </tr>
                    ) : (
                      receitasFiltradas.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-900">{r.descricao}</td>
                          <td className="p-3 text-gray-600">{r.tipo}</td>
                          <td className="p-3 text-gray-500">{r.dataCompetencia}</td>
                          <td className="p-3 text-gray-500">{r.dataRecebimento || "-"}</td>
                          <td className="p-3 font-semibold text-emerald-600">
                            R$ {Number(r.valor).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                r.status === "RECEBIDA"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.status === "PENDENTE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {r.status}
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

          {/* ABA 3: DESPESAS */}
          {abaAtiva === "despesas" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-serif text-gray-800">Lançamentos de Despesas</h2>
                <button
                  onClick={() => setModalNovaDespesa(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-md transition shadow-sm"
                >
                  + Nova Despesa
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-50/50 text-gray-600 border-b border-gray-200 font-medium">
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Competência</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {despesasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-400">
                          Nenhuma despesa encontrada para o período.
                        </td>
                      </tr>
                    ) : (
                      despesasFiltradas.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-medium text-gray-900">{d.descricao}</td>
                          <td className="p-3 text-gray-600">{d.categoria}</td>
                          <td className="p-3 text-gray-500">{d.dataCompetencia}</td>
                          <td className="p-3 text-gray-500">{d.dataPagamento || "-"}</td>
                          <td className="p-3 font-semibold text-rose-600">
                            R$ {Number(d.valor).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                d.status === "PAGA"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : d.status === "PENDENTE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
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

          {/* ABA 4: A RECEBER (FIADO) */}
          {abaAtiva === "areceber" && (
            <div className="space-y-4">
              <h2 className="text-lg font-serif text-gray-800">Contas a Receber (Fiado)</h2>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-50/50 text-gray-600 border-b border-gray-200 font-medium">
                      <th className="p-3">Cliente</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Data da Venda</th>
                      <th className="p-3">Valor Original</th>
                      <th className="p-3">Recebido</th>
                      <th className="p-3">Pendente</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendasFiado.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-400">
                          Nenhum valor em aberto no fiado.
                        </td>
                      </tr>
                    ) : (
                      vendasFiado.map((f) => {
                        const pendente = f.valor - f.valorRecebido
                        return (
                          <tr key={f.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-medium text-gray-900">{f.cliente}</td>
                            <td className="p-3 text-gray-500">{f.cpf || "-"}</td>
                            <td className="p-3 text-gray-500">
                              {new Date(f.criadoem).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="p-3 font-medium text-gray-700">
                              R$ {f.valor.toFixed(2)}
                            </td>
                            <td className="p-3 text-emerald-600 font-medium">
                              R$ {f.valorRecebido.toFixed(2)}
                            </td>
                            <td className="p-3 text-amber-700 font-semibold">
                              R$ {pendente.toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setModalPagamentoFiado(f)}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded font-medium transition"
                              >
                                Registrar Pagamento
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL NOVA RECEITA */}
      {modalNovaReceita && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-serif text-gray-900">Nova Receita</h3>

            <form onSubmit={salvarReceita} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={formReceita.descricao}
                  onChange={(e) => setFormReceita({ ...formReceita, descricao: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select
                    value={formReceita.tipo}
                    onChange={(e) => setFormReceita({ ...formReceita, tipo: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    {TIPOS_RECEITAS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formReceita.valor}
                    onChange={(e) => setFormReceita({ ...formReceita, valor: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Competência
                  </label>
                  <input
                    type="date"
                    required
                    value={formReceita.dataCompetencia}
                    onChange={(e) =>
                      setFormReceita({ ...formReceita, dataCompetencia: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={formReceita.status}
                    onChange={(e) =>
                      setFormReceita({
                        ...formReceita,
                        status: e.target.value as "PENDENTE" | "RECEBIDA"
                      })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    <option value="RECEBIDA">RECEBIDA</option>
                    <option value="PENDENTE">PENDENTE</option>
                  </select>
                </div>
              </div>

              {formReceita.status === "RECEBIDA" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Data do Recebimento
                  </label>
                  <input
                    type="date"
                    value={formReceita.dataRecebimento}
                    onChange={(e) =>
                      setFormReceita({ ...formReceita, dataRecebimento: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea
                  rows={2}
                  value={formReceita.observacao}
                  onChange={(e) => setFormReceita({ ...formReceita, observacao: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaReceita(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA DESPESA */}
      {modalNovaDespesa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-serif text-gray-900">Nova Despesa</h3>

            <form onSubmit={salvarDespesa} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={formDespesa.descricao}
                  onChange={(e) => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <select
                    value={formDespesa.categoria}
                    onChange={(e) => setFormDespesa({ ...formDespesa, categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    {CATEGORIAS_DESPESAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formDespesa.valor}
                    onChange={(e) => setFormDespesa({ ...formDespesa, valor: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Competência
                  </label>
                  <input
                    type="date"
                    required
                    value={formDespesa.dataCompetencia}
                    onChange={(e) =>
                      setFormDespesa({ ...formDespesa, dataCompetencia: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={formDespesa.status}
                    onChange={(e) =>
                      setFormDespesa({
                        ...formDespesa,
                        status: e.target.value as "PENDENTE" | "PAGA"
                      })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    <option value="PAGA">PAGA</option>
                    <option value="PENDENTE">PENDENTE</option>
                  </select>
                </div>
              </div>

              {formDespesa.status === "PAGA" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Data do Pagamento
                  </label>
                  <input
                    type="date"
                    value={formDespesa.dataPagamento}
                    onChange={(e) =>
                      setFormDespesa({ ...formDespesa, dataPagamento: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea
                  rows={2}
                  value={formDespesa.observacao}
                  onChange={(e) => setFormDespesa({ ...formDespesa, observacao: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovaDespesa(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGAMENTO FIADO */}
      {modalPagamentoFiado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-serif text-gray-900">Registrar Pagamento de Fiado</h3>
            <p className="text-xs text-gray-500">
              Cliente: <span className="font-semibold text-gray-800">{modalPagamentoFiado.cliente}</span> | Pendente:{" "}
              <span className="font-semibold text-amber-700">
                R$ {(modalPagamentoFiado.valor - modalPagamentoFiado.valorRecebido).toFixed(2)}
              </span>
            </p>

            <form onSubmit={registrarPagamentoFiado} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Valor Recebido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={modalPagamentoFiado.valor - modalPagamentoFiado.valorRecebido}
                  required
                  value={formPagamento.valor}
                  onChange={(e) => setFormPagamento({ ...formPagamento, valor: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={formPagamento.data}
                  onChange={(e) => setFormPagamento({ ...formPagamento, data: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea
                  rows={2}
                  value={formPagamento.observacao}
                  onChange={(e) =>
                    setFormPagamento({ ...formPagamento, observacao: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPagamentoFiado(null)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
                >
                  Registrar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}