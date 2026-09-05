import { useEffect, useState, useMemo } from "react"
import { supabase } from "../lib/supabase"

// --- TIPOS DE DADOS ---

type Receita = {
  id: string
  descricao: string
  valor: number
  categoria: string
  tipo: "VENDA" | "OUTRO"
  status: "RECEBIDA" | "PENDENTE"
  data: string
  vendaId?: string
}

type Despesa = {
  id: string
  descricao: string
  valor: number
  categoria: string
  status: "PAGO" | "PENDENTE"
  data: string
}

type CompraFiado = {
  id: string
  clienteId: string
  clienteNome: string
  valorTotal: number
  valorRecebido: number
  valorPendente: number
  data: string
}

export default function Financeiro() {
  // --- ESTADOS DA APLICAÇÃO ---
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [comprasFiado, setComprasFiado] = useState<CompraFiado[]>([])
  const [custoProdutosVendidos, setCustoProdutosVendidos] = useState<number>(0)
  const [vendasTotaisCount, setVendasTotaisCount] = useState<number>(0)

  // Filtros
  const [abaAtiva, setAbaAtiva] = useState<"resumo" | "receitas" | "despesas" | "fiado">("resumo")
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("")
  const [periodoFiltro, setPeriodoFiltro] = useState("todos")

  // Modais e Formulários
  const [novaReceitaModal, setNovaReceitaModal] = useState(false)
  const [novaDespesaModal, setNovaDespesaModal] = useState(false)
  const [receberFiadoModal, setReceberFiadoModal] = useState<CompraFiado | null>(null)
  const [valorAbater, setValorAbater] = useState("")

  const [formReceita, setFormReceita] = useState<Partial<Receita>>({
    tipo: "OUTRO",
    status: "RECEBIDA",
    data: new Date().toISOString().split("T")[0]
  })

  const [formDespesa, setFormDespesa] = useState<Partial<Despesa>>({
    status: "PAGO",
    data: new Date().toISOString().split("T")[0]
  })

  // --- CARREGAMENTO DE DADOS ---

  async function fetchFinanceiro() {
    // 1. Buscar Receitas
    const { data: dataReceitas, error: errReceitas } = await supabase
      .from("receitas")
      .select("*")
      .order("data", { ascending: false })

    if (!errReceitas && dataReceitas) {
      setReceitas(
        dataReceitas.map((r: any) => ({
          id: String(r.id),
          descricao: r.descricao || "Receita sem nome",
          valor: Number(r.valor || 0),
          categoria: r.categoria || "Geral",
          tipo: r.tipo || "OUTRO",
          status: r.status || "RECEBIDA",
          data: r.data || r.criadoem || "",
          vendaId: r.vendaid ? String(r.vendaid) : undefined
        }))
      )
    }

    // 2. Buscar Despesas
    const { data: dataDespesas, error: errDespesas } = await supabase
      .from("despesas")
      .select("*")
      .order("data", { ascending: false })

    if (!errDespesas && dataDespesas) {
      setDespesas(
        dataDespesas.map((d: any) => ({
          id: String(d.id),
          descricao: d.descricao || "Despesa sem nome",
          valor: Number(d.valor || 0),
          categoria: d.categoria || "Operacional",
          status: d.status || "PAGO",
          data: d.data || d.criadoem || ""
        }))
      )
    }

    // 3. Buscar Compras Fiado / Contas a Receber
    const { data: dataFiado, error: errFiado } = await supabase
      .from("compras")
      .select("*")
      .gt("valor_pendente", 0)
      .order("criadoem", { ascending: false })

    if (!errFiado && dataFiado) {
      setComprasFiado(
        dataFiado.map((f: any) => ({
          id: String(f.id),
          clienteId: String(f.clienteid),
          clienteNome: f.cliente || "Cliente",
          valorTotal: Number(f.valor || 0),
          valorRecebido: Number(f.valor_recebido || 0),
          valorPendente: Number(f.valor_pendente || f.valor || 0),
          data: f.criadoem || ""
        }))
      )
    }

    // 4. Buscar Custo dos Produtos Vendidos (CMV) das compras/vendas
    const { data: dataVendas } = await supabase.from("compras").select("custo_total, valor")

    if (dataVendas) {
      setVendasTotaisCount(dataVendas.length)
      const cmvTotal = dataVendas.reduce((acc, v: any) => acc + Number(v.custo_total || 0), 0)
      setCustoProdutosVendidos(cmvTotal)
    }
  }

  useEffect(() => {
    fetchFinanceiro()
  }, [])

  // --- AÇÕES DO BANCO DE DADOS ---

  async function criarReceita() {
    if (!formReceita.descricao?.trim() || !formReceita.valor) {
      alert("Preencha a descrição e o valor da receita")
      return
    }

    const { error } = await supabase.from("receitas").insert([
      {
        descricao: formReceita.descricao,
        valor: Number(formReceita.valor),
        categoria: formReceita.categoria || "Geral",
        tipo: formReceita.tipo || "OUTRO",
        status: formReceita.status || "RECEBIDA",
        data: formReceita.data || new Date().toISOString()
      }
    ])

    if (error) {
      alert("Erro ao criar receita: " + error.message)
      return
    }

    alert("Receita lançada com sucesso!")
    setNovaReceitaModal(false)
    setFormReceita({ tipo: "OUTRO", status: "RECEBIDA", data: new Date().toISOString().split("T")[0] })
    fetchFinanceiro()
  }

  async function criarDespesa() {
    if (!formDespesa.descricao?.trim() || !formDespesa.valor) {
      alert("Preencha a descrição e o valor da despesa")
      return
    }

    const { error } = await supabase.from("despesas").insert([
      {
        descricao: formDespesa.descricao,
        valor: Number(formDespesa.valor),
        categoria: formDespesa.categoria || "Operacional",
        status: formDespesa.status || "PAGO",
        data: formDespesa.data || new Date().toISOString()
      }
    ])

    if (error) {
      alert("Erro ao criar despesa: " + error.message)
      return
    }

    alert("Despesa lançada com sucesso!")
    setNovaDespesaModal(false)
    setFormDespesa({ status: "PAGO", data: new Date().toISOString().split("T")[0] })
    fetchFinanceiro()
  }

  async function abaterFiado() {
    if (!receberFiadoModal || !valorAbater) return

    const valorNum = Number(valorAbater)
    if (isNaN(valorNum) || valorNum <= 0) {
      alert("Informe um valor válido!")
      return
    }

    const novoRecebido = receberFiadoModal.valorRecebido + valorNum
    const novoPendente = Math.max(0, receberFiadoModal.valorPendente - valorNum)

    const { error } = await supabase
      .from("compras")
      .update({
        valor_recebido: novoRecebido,
        valor_pendente: novoPendente
      })
      .eq("id", receberFiadoModal.id)

    if (error) {
      alert("Erro ao abater valor: " + error.message)
      return
    }

    // Registrar como receita de pagamento de fiado
    await supabase.from("receitas").insert([
      {
        descricao: `Recebimento Fiado - ${receberFiadoModal.clienteNome}`,
        valor: valorNum,
        categoria: "Fiado",
        tipo: "OUTRO",
        status: "RECEBIDA",
        data: new Date().toISOString()
      }
    ])

    alert("Pagamento abatido com sucesso!")
    setReceberFiadoModal(null)
    setValorAbater("")
    fetchFinanceiro()
  }

  async function excluirRegistro(tabela: "receitas" | "despesas", id: string) {
    if (!window.confirm("Deseja realmente excluir este registro financeiro?")) return

    const { error } = await supabase.from(tabela).delete().eq("id", id)

    if (error) {
      alert("Erro ao excluir: " + error.message)
      return
    }

    fetchFinanceiro()
  }

  // --- CÁLCULOS E MÉTRICAS CONSOLIDADAS ---

  const resumoMetrics = useMemo(() => {
    const totalReceitas = receitas
      .filter(r => r.status === "RECEBIDA")
      .reduce((acc, r) => acc + Number(r.valor), 0)

    const totalDespesas = despesas
      .filter(d => d.status === "PAGO")
      .reduce((acc, r) => acc + Number(r.valor), 0)

    const totalAReceber = comprasFiado.reduce((acc, f) => acc + f.valorPendente, 0)
    const totalRecebidoFiado = comprasFiado.reduce((acc, f) => acc + f.valorRecebido, 0)

    const faturamentoVendas = receitas
      .filter(r => r.tipo === "VENDA" && r.status === "RECEBIDA")
      .reduce((acc, r) => acc + Number(r.valor), 0)

    // Lucro Bruto = Faturamento de Vendas - Custo das Mercadorias (CMV)
    const lucroBruto = faturamentoVendas - custoProdutosVendidos

    // Lucro Líquido Real = Lucro Bruto - Despesas Operacionais
    const lucroLiquido = lucroBruto - totalDespesas

    // Resultado de Caixa
    const resultadoLiquido = totalReceitas - totalDespesas
    const clientesComFiado = new Set(comprasFiado.map(f => f.clienteId)).size

    return {
      totalReceitas,
      totalDespesas,
      resultadoLiquido,
      lucroBruto,
      lucroLiquido,
      totalAReceber,
      totalRecebidoFiado,
      faturamentoVendas,
      qtdVendas: vendasTotaisCount,
      qtdReceitas: receitas.length,
      qtdDespesas: despesas.length,
      clientesComFiado
    }
  }, [receitas, despesas, comprasFiado, custoProdutosVendidos, vendasTotaisCount])

  // Formatação de moeda e datas
  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  function formatarData(dataStr: string) {
    if (!dataStr) return "-"
    const d = new Date(dataStr)
    return isNaN(d.getTime()) ? dataStr : d.toLocaleDateString("pt-BR")
  }

  // Filtros aplicados
  const categoriasUnicas = Array.from(
    new Set(
      abaAtiva === "receitas"
        ? receitas.map(r => r.categoria)
        : despesas.map(d => d.categoria)
    )
  ).sort()

  const receitasFiltradas = receitas
    .filter(r => r.descricao.toLowerCase().includes(busca.toLowerCase()))
    .filter(r => !statusFiltro || r.status === statusFiltro)
    .filter(r => !categoriaFiltro || r.categoria === categoriaFiltro)

  const despesasFiltradas = despesas
    .filter(d => d.descricao.toLowerCase().includes(busca.toLowerCase()))
    .filter(d => !statusFiltro || d.status === statusFiltro)
    .filter(d => !categoriaFiltro || d.categoria === categoriaFiltro)

  const fiadoFiltrado = comprasFiado.filter(f =>
    f.clienteNome.toLowerCase().includes(busca.toLowerCase())
  )

  function fecharModais() {
    setNovaReceitaModal(false)
    setNovaDespesaModal(false)
    setReceberFiadoModal(null)
    setValorAbater("")
  }

  return (
    <div style={container}>
      {/* MESMA ESTILIZAÇÃO E RESPONSIVIDADE DO COMPONENTE CLIENTES */}
      <style>{`
        .financeiro-filtros {
          display: flex;
          gap: 12px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }

        .financeiro-busca {
          flex: 2;
          min-width: 220px;
        }

        .financeiro-select {
          flex: 1;
          min-width: 140px;
        }

        .financeiro-abas {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          border-bottom: 2px solid #eae6db;
          padding-bottom: 10px;
          overflow-x: auto;
        }

        .financeiro-aba-btn {
          background: transparent;
          border: none;
          padding: 8px 16px;
          font-size: 15px;
          font-weight: 600;
          color: #777;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .financeiro-aba-btn.ativa {
          background: #111;
          color: #fff;
        }

        .financeiro-grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 25px;
        }

        .financeiro-grid-secundario {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .financeiro-tabela-wrapper {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #eae6db;
          overflow-x: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .financeiro-tabela {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }

        .financeiro-tabela th {
          background: #fcfbf7;
          padding: 14px;
          font-weight: 600;
          color: #555;
          border-bottom: 1px solid #eae6db;
        }

        .financeiro-tabela td {
          padding: 14px;
          border-bottom: 1px solid #f3f0e6;
          color: #333;
        }

        .financeiro-tabela tr:last-child td {
          border-bottom: none;
        }

        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-sucesso { background: #dcfce7; color: #15803d; }
        .badge-alerta { background: #fef3c7; color: #b45309; }
        .badge-perigo { background: #fee2e2; color: #b91c1c; }

        @media (max-width: 600px) {
          .financeiro-header {
            margin-bottom: 18px !important;
          }

          .financeiro-header-title {
            font-size: 28px !important;
          }

          .financeiro-filtros {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px !important;
            margin-bottom: 22px !important;
          }

          .financeiro-busca {
            grid-column: 1 / -1;
          }

          .financeiro-grid-cards {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          .financeiro-modal {
            width: 100% !important;
            max-width: 410px !important;
            padding: 18px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="financeiro-header" style={header}>
        <h1 className="financeiro-header-title" style={title}>
          Financeiro
        </h1>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={primaryBtn}
            onClick={() => {
              setFormReceita({
                tipo: "OUTRO",
                status: "RECEBIDA",
                data: new Date().toISOString().split("T")[0]
              })
              setNovaReceitaModal(true)
            }}
          >
            + Receita
          </button>

          <button
            style={{ ...primaryBtn, background: "#b91c1c" }}
            onClick={() => {
              setFormDespesa({
                status: "PAGO",
                data: new Date().toISOString().split("T")[0]
              })
              setNovaDespesaModal(true)
            }}
          >
            + Despesa
          </button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="financeiro-abas">
        <button
          className={`financeiro-aba-btn ${abaAtiva === "resumo" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("resumo")}
        >
          Resumo & DRE
        </button>
        <button
          className={`financeiro-aba-btn ${abaAtiva === "receitas" ? "ativa" : ""}`}
          onClick={() => { setAbaAtiva("receitas"); setStatusFiltro(""); setCategoriaFiltro(""); }}
        >
          Receitas ({receitas.length})
        </button>
        <button
          className={`financeiro-aba-btn ${abaAtiva === "despesas" ? "ativa" : ""}`}
          onClick={() => { setAbaAtiva("despesas"); setStatusFiltro(""); setCategoriaFiltro(""); }}
        >
          Despesas ({despesas.length})
        </button>
        <button
          className={`financeiro-aba-btn ${abaAtiva === "fiado" ? "ativa" : ""}`}
          onClick={() => setAbaAtiva("fiado")}
        >
          Contas a Receber ({comprasFiado.length})
        </button>
      </div>

      {/* ABA 1: RESUMO & DRE */}
      {abaAtiva === "resumo" && (
        <div>
          <div className="financeiro-grid-cards">
            <div style={card}>
              <span style={mutedSmall}>Faturamento (Vendas)</span>
              <strong style={cardValue}>{moeda(resumoMetrics.faturamentoVendas)}</strong>
              <span style={mutedExtraSmall}>Total de vendas confirmadas</span>
            </div>

            <div style={card}>
              <span style={mutedSmall}>Lucro Bruto</span>
              <strong style={{ ...cardValue, color: resumoMetrics.lucroBruto >= 0 ? "#15803d" : "#b91c1c" }}>
                {moeda(resumoMetrics.lucroBruto)}
              </strong>
              <span style={mutedExtraSmall}>Faturamento (-) CMV ({moeda(custoProdutosVendidos)})</span>
            </div>

            <div style={{ ...card, background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <span style={{ ...mutedSmall, color: "#166534" }}>Lucro Líquido Real</span>
              <strong style={{ ...cardValue, color: resumoMetrics.lucroLiquido >= 0 ? "#15803d" : "#b91c1c" }}>
                {moeda(resumoMetrics.lucroLiquido)}
              </strong>
              <span style={mutedExtraSmall}>Lucro Bruto (-) Despesas Operacionais</span>
            </div>

            <div style={{ ...card, borderColor: "#fde68a" }}>
              <span style={mutedSmall}>A Receber (Fiado)</span>
              <strong style={{ ...cardValue, color: "#b45309" }}>
                {moeda(resumoMetrics.totalAReceber)}
              </strong>
              <span style={mutedExtraSmall}>{resumoMetrics.clientesComFiado} cliente(s) pendente(s)</span>
            </div>
          </div>

          {/* DRE SIMPLIFICADO */}
          <div style={sectionBox}>
            <h3 style={sectionBoxTitle}>Demonstrativo do Resultado do Exercício (DRE)</h3>

            <div style={dreRow}>
              <span>(+) Faturamento Bruto de Vendas</span>
              <strong>{moeda(resumoMetrics.faturamentoVendas)}</strong>
            </div>

            <div style={{ ...dreRow, color: "#b91c1c" }}>
              <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
              <strong>- {moeda(custoProdutosVendidos)}</strong>
            </div>

            <div style={{ ...dreRow, borderTop: "1px solid #eee6d2", fontWeight: "bold" }}>
              <span>(=) Lucro Bruto</span>
              <span style={{ color: resumoMetrics.lucroBruto >= 0 ? "#15803d" : "#b91c1c" }}>
                {moeda(resumoMetrics.lucroBruto)}
              </span>
            </div>

            <div style={{ ...dreRow, color: "#b91c1c" }}>
              <span>(-) Despesas Operacionais</span>
              <strong>- {moeda(resumoMetrics.totalDespesas)}</strong>
            </div>

            <div style={{ ...dreRow, borderTop: "2px solid #111", fontWeight: "bold", fontSize: 16, marginTop: 8 }}>
              <span>(=) Lucro Líquido Final</span>
              <span style={{ color: resumoMetrics.lucroLiquido >= 0 ? "#15803d" : "#b91c1c" }}>
                {moeda(resumoMetrics.lucroLiquido)}
              </span>
            </div>
          </div>

          {/* MÉTRICAS SECUNDÁRIAS DE CAIXA */}
          <div className="financeiro-grid-secundario">
            <div style={cardSmall}>
              <span style={mutedSmall}>Receitas Totais Entradas</span>
              <strong>{moeda(resumoMetrics.totalReceitas)}</strong>
            </div>
            <div style={cardSmall}>
              <span style={mutedSmall}>Despesas Totais Saídas</span>
              <strong>{moeda(resumoMetrics.totalDespesas)}</strong>
            </div>
            <div style={cardSmall}>
              <span style={mutedSmall}>Resultado de Caixa</span>
              <strong style={{ color: resumoMetrics.resultadoLiquido >= 0 ? "#15803d" : "#b91c1c" }}>
                {moeda(resumoMetrics.resultadoLiquido)}
              </strong>
            </div>
            <div style={cardSmall}>
              <span style={mutedSmall}>Total de Vendas</span>
              <strong>{resumoMetrics.qtdVendas} realizada(s)</strong>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2 E 3: LISTAGEM COM FILTROS DE RECEITAS E DESPESAS */}
      {(abaAtiva === "receitas" || abaAtiva === "despesas") && (
        <div>
          <div className="financeiro-filtros">
            <input
              className="financeiro-busca"
              placeholder={`Buscar em ${abaAtiva}...`}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={input}
            />

            <select
              className="financeiro-select"
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
              style={select}
            >
              <option value="">Status (Todos)</option>
              <option value={abaAtiva === "receitas" ? "RECEBIDA" : "PAGO"}>
                {abaAtiva === "receitas" ? "Recebidas" : "Pagas"}
              </option>
              <option value="PENDENTE">Pendentes</option>
            </select>

            <select
              className="financeiro-select"
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
              style={select}
            >
              <option value="">Categorias (Todas)</option>
              {categoriasUnicas.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="financeiro-tabela-wrapper">
            <table className="financeiro-tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {abaAtiva === "receitas" ? (
                  receitasFiltradas.length > 0 ? (
                    receitasFiltradas.map(r => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.descricao}</strong>
                          {r.tipo === "VENDA" && <span style={tagVenda}>Venda</span>}
                        </td>
                        <td>{formatarData(r.data)}</td>
                        <td>{r.categoria}</td>
                        <td>
                          <span className={`badge ${r.status === "RECEBIDA" ? "badge-sucesso" : "badge-alerta"}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ color: "#15803d", fontWeight: "600" }}>{moeda(r.valor)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            style={btnExcluirTabela}
                            onClick={() => excluirRegistro("receitas", r.id)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                        Nenhuma receita encontrada.
                      </td>
                    </tr>
                  )
                ) : (
                  despesasFiltradas.length > 0 ? (
                    despesasFiltradas.map(d => (
                      <tr key={d.id}>
                        <td><strong>{d.descricao}</strong></td>
                        <td>{formatarData(d.data)}</td>
                        <td>{d.categoria}</td>
                        <td>
                          <span className={`badge ${d.status === "PAGO" ? "badge-sucesso" : "badge-alerta"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ color: "#b91c1c", fontWeight: "600" }}>{moeda(d.valor)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            style={btnExcluirTabela}
                            onClick={() => excluirRegistro("despesas", d.id)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                        Nenhuma despesa encontrada.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: FIADO / CONTAS A RECEBER */}
      {abaAtiva === "fiado" && (
        <div>
          <div className="financeiro-filtros">
            <input
              className="financeiro-busca"
              placeholder="Buscar cliente do fiado..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={input}
            />
          </div>

          <div className="financeiro-tabela-wrapper">
            <table className="financeiro-tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data Compra</th>
                  <th>Valor Total</th>
                  <th>Já Pago</th>
                  <th>Pendente</th>
                  <th style={{ textAlign: "right" }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {fiadoFiltrado.length > 0 ? (
                  fiadoFiltrado.map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.clienteNome}</strong></td>
                      <td>{formatarData(f.data)}</td>
                      <td>{moeda(f.valorTotal)}</td>
                      <td style={{ color: "#15803d" }}>{moeda(f.valorRecebido)}</td>
                      <td style={{ color: "#b45309", fontWeight: "bold" }}>{moeda(f.valorPendente)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          style={primaryBtnSm}
                          onClick={() => setReceberFiadoModal(f)}
                        >
                          Abater / Receber
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                      Nenhum valor pendente no fiado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA RECEITA */}
      {novaReceitaModal && (
        <div style={overlay} onClick={fecharModais}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>Nova Receita</h2>
              <button style={closeBtn} onClick={fecharModais}>×</button>
            </div>

            <input
              style={inputSpacing}
              placeholder="Descrição (ex: Venda de Balcão, Serviços)"
              value={formReceita.descricao || ""}
              onChange={e => setFormReceita({ ...formReceita, descricao: e.target.value })}
            />

            <input
              style={inputSpacing}
              type="number"
              placeholder="Valor (R$)"
              value={formReceita.valor || ""}
              onChange={e => setFormReceita({ ...formReceita, valor: Number(e.target.value) })}
            />

            <input
              style={inputSpacing}
              placeholder="Categoria (ex: Vendas, Serviços, Extra)"
              value={formReceita.categoria || ""}
              onChange={e => setFormReceita({ ...formReceita, categoria: e.target.value })}
            />

            <input
              style={inputSpacing}
              type="date"
              value={formReceita.data || ""}
              onChange={e => setFormReceita({ ...formReceita, data: e.target.value })}
            />

            <select
              style={inputSpacing}
              value={formReceita.status || "RECEBIDA"}
              onChange={e => setFormReceita({ ...formReceita, status: e.target.value as any })}
            >
              <option value="RECEBIDA">Recebida</option>
              <option value="PENDENTE">Pendente</option>
            </select>

            <div style={modalActions}>
              <button style={secondaryBtn} onClick={fecharModais}>Cancelar</button>
              <button style={primaryBtn} onClick={criarReceita}>Salvar Receita</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA DESPESA */}
      {novaDespesaModal && (
        <div style={overlay} onClick={fecharModais}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>Nova Despesa</h2>
              <button style={closeBtn} onClick={fecharModais}>×</button>
            </div>

            <input
              style={inputSpacing}
              placeholder="Descrição (ex: Aluguel, Luz, Fornecedores)"
              value={formDespesa.descricao || ""}
              onChange={e => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
            />

            <input
              style={inputSpacing}
              type="number"
              placeholder="Valor (R$)"
              value={formDespesa.valor || ""}
              onChange={e => setFormDespesa({ ...formDespesa, valor: Number(e.target.value) })}
            />

            <input
              style={inputSpacing}
              placeholder="Categoria (ex: Operacional, Fixo, Variável)"
              value={formDespesa.categoria || ""}
              onChange={e => setFormDespesa({ ...formDespesa, categoria: e.target.value })}
            />

            <input
              style={inputSpacing}
              type="date"
              value={formDespesa.data || ""}
              onChange={e => setFormDespesa({ ...formDespesa, data: e.target.value })}
            />

            <select
              style={inputSpacing}
              value={formDespesa.status || "PAGO"}
              onChange={e => setFormDespesa({ ...formDespesa, status: e.target.value as any })}
            >
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
            </select>

            <div style={modalActions}>
              <button style={secondaryBtn} onClick={fecharModais}>Cancelar</button>
              <button style={{ ...primaryBtn, background: "#b91c1c" }} onClick={criarDespesa}>
                Salvar Despesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABATER FIADO */}
      {receberFiadoModal && (
        <div style={overlay} onClick={fecharModais}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={modalTitle}>Abater Fiado</h2>
              <button style={closeBtn} onClick={fecharModais}>×</button>
            </div>

            <p style={{ fontSize: 14, color: "#555", marginBottom: 15 }}>
              Cliente: <strong>{receberFiadoModal.clienteNome}</strong><br />
              Valor pendente atual: <strong style={{ color: "#b45309" }}>{moeda(receberFiadoModal.valorPendente)}</strong>
            </p>

            <input
              style={inputSpacing}
              type="number"
              placeholder="Valor a receber/abater (R$)"
              value={valorAbater}
              onChange={e => setValorAbater(e.target.value)}
            />

            <div style={modalActions}>
              <button style={secondaryBtn} onClick={fecharModais}>Cancelar</button>
              <button style={primaryBtn} onClick={abaterFiado}>Confirmar Recebimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- ESTILOS IDÊNTICOS AO COMPONENTE DE CLIENTES (CSS IN LINE) ---

const container: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "20px 16px",
  fontFamily: "Inter, system-ui, sans-serif",
  color: "#111"
}

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 25
}

const title: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  margin: 0
}

const input: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14,
  outline: "none",
  background: "#fff"
}

const select: React.CSSProperties = {
  ...input,
  cursor: "pointer"
}

const inputSpacing: React.CSSProperties = {
  ...input,
  width: "100%",
  boxSizing: "border-box",
  marginBottom: 12
}

const primaryBtn: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
  transition: "opacity 0.2s"
}

const primaryBtnSm: React.CSSProperties = {
  ...primaryBtn,
  padding: "6px 12px",
  fontSize: 12
}

const secondaryBtn: React.CSSProperties = {
  background: "#f3f0e6",
  color: "#333",
  border: "1px solid #eee6d2",
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  border: "1px solid #eae6db",
  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
}

const cardSmall: React.CSSProperties = {
  ...card,
  padding: 14,
  borderRadius: 12
}

const cardValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: "8px 0"
}

const mutedSmall: React.CSSProperties = {
  fontSize: 13,
  color: "#666"
}

const mutedExtraSmall: React.CSSProperties = {
  fontSize: 11,
  color: "#888"
}

const sectionBox: React.CSSProperties = {
  background: "#fcfbf7",
  border: "1px solid #eee6d2",
  borderRadius: 16,
  padding: 20,
  marginTop: 10,
  marginBottom: 20
}

const sectionBoxTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginTop: 0,
  marginBottom: 15,
  color: "#222"
}

const dreRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  fontSize: 14
}

const tagVenda: React.CSSProperties = {
  marginLeft: 8,
  background: "#e0f2fe",
  color: "#0369a1",
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 4,
  fontWeight: "bold"
}

const btnExcluirTabela: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#b91c1c",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600
}

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
  padding: 16
}

const modal: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: 24,
  width: "100%",
  maxWidth: 460,
  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  maxHeight: "90vh",
  overflowY: "auto"
}

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18
}

const modalTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0
}

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  fontSize: 24,
  cursor: "pointer",
  color: "#888"
}

const modalActions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18
}