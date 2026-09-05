import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type LancamentoFinanceiro = {
  id: string
  descricao: string
  tipo: "RECEITA" | "DESPESA"
  valor: number
  categoria: string | null
  status: "PAGO" | "PENDENTE"
  dataVencimento: string | null
  dataPagamento: string | null
  criadoem: string
}

const CATEGORIAS_DESPESA = [
  "Fornecedores",
  "Embalagens",
  "Marketing/Anúncios",
  "Frete/Entregas",
  "Taxas/Comissões",
  "Sistemas/Software",
  "Outros"
]

const CATEGORIAS_RECEITA = [
  "Vendas de Produtos",
  "Serviços",
  "Ajuste Financeiro",
  "Outros"
]

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function dataBR(data: string | null) {
  if (!data) return "-"
  const [ano, mes, dia] = data.split("-")
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

function valorNumerico(valor: string) {
  return Number(
    valor.replace(/\./g, "").replace(",", ".")
  )
}

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([])
  const [busca, setBusca] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "RECEITA" | "DESPESA">("TODOS")
  const [modalLancamento, setModalLancamento] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [formLancamento, setFormLancamento] = useState({
    descricao: "",
    tipo: "DESPESA" as "RECEITA" | "DESPESA",
    valor: "",
    categoria: CATEGORIAS_DESPESA[0],
    status: "PAGO" as "PAGO" | "PENDENTE",
    dataPagamento: new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    function verificarMobile() {
      setIsMobile(window.innerWidth <= 768)
    }
    verificarMobile()
    window.addEventListener("resize", verificarMobile)
    return () => window.removeEventListener("resize", verificarMobile)
  }, [])

  async function carregarDados() {
    const { data, error } = await supabase
      .from("financeiroLancamentos")
      .select("*")
      .order("criadoem", { ascending: false })

    if (error) {
      console.error("Erro ao carregar dados financeiros:", error)
      return
    }

    setLancamentos(data ?? [])
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function abrirNovoLancamento() {
    setFormLancamento({
      descricao: "",
      tipo: "DESPESA",
      valor: "",
      categoria: CATEGORIAS_DESPESA[0],
      status: "PAGO",
      dataPagamento: new Date().toISOString().split("T")[0]
    })
    setModalLancamento(true)
  }

  async function salvarLancamento() {
    if (!formLancamento.descricao.trim()) {
      alert("Informe uma descrição.")
      return
    }

    const valor = valorNumerico(formLancamento.valor)
    if (Number.isNaN(valor) || valor <= 0) {
      alert("Informe um valor válido.")
      return
    }

    setSalvando(true)

    const dados = {
      descricao: formLancamento.descricao.trim(),
      tipo: formLancamento.tipo,
      valor,
      categoria: formLancamento.categoria || null,
      status: formLancamento.status,
      dataPagamento: formLancamento.dataPagamento || null,
      atualizadoem: new Date().toISOString()
    }

    const { error } = await supabase
      .from("financeiroLancamentos")
      .insert(dados)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert("Erro ao salvar lançamento: " + error.message)
      return
    }

    setModalLancamento(false)
    await carregarDados()
  }

  async function excluirLancamento(id: string) {
    if (!window.confirm("Deseja realmente excluir este lançamento?")) return

    const { error } = await supabase
      .from("financeiroLancamentos")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Erro ao excluir: " + error.message)
      return
    }

    await carregarDados()
  }

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(item => {
      const bateTipo = filtroTipo === "TODOS" || item.tipo === filtroTipo
      const termo = busca.toLowerCase().trim()
      const bateBusca =
        !termo ||
        item.descricao.toLowerCase().includes(termo) ||
        (item.categoria && item.categoria.toLowerCase().includes(termo))

      return bateTipo && bateBusca
    })
  }, [lancamentos, filtroTipo, busca])

  const totalReceitas = useMemo(() => {
    return lancamentos
      .filter(l => l.tipo === "RECEITA" && l.status === "PAGO")
      .reduce((acc, item) => acc + item.valor, 0)
  }, [lancamentos])

  const totalDespesas = useMemo(() => {
    return lancamentos
      .filter(l => l.tipo === "DESPESA" && l.status === "PAGO")
      .reduce((acc, item) => acc + item.valor, 0)
  }, [lancamentos])

  const saldoLiquido = useMemo(() => totalReceitas - totalDespesas, [totalReceitas, totalDespesas])

  return (
    <div style={{ padding: isMobile ? "0 0 30px" : "0" }}>
      {/* CABEÇALHO */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          marginBottom: isMobile ? 18 : 24,
          gap: 12
        }}
      >
        <div>
          <h1 style={{ fontSize: isMobile ? 27 : 32, fontWeight: "bold", margin: 0 }}>
            Financeiro
          </h1>
          {!isMobile && (
            <p style={{ color: "#666", marginTop: 4 }}>
              Gestão de fluxo de caixa, receitas e despesas.
            </p>
          )}
        </div>

        <button
          onClick={abrirNovoLancamento}
          style={{
            backgroundColor: "#000",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          + Novo Lançamento
        </button>
      </div>

      {/* RESUMO CARD */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(1, minmax(0, 1fr))"
            : "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 24
        }}
      >
        <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Total de Entradas (Pagas)</span>
          <strong style={{ display: "block", fontSize: 22, color: "#16a34a", marginTop: 4 }}>
            {moeda(totalReceitas)}
          </strong>
        </div>

        <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Total de Saídas (Pagas)</span>
          <strong style={{ display: "block", fontSize: 22, color: "#dc2626", marginTop: 4 }}>
            {moeda(totalDespesas)}
          </strong>
        </div>

        <div style={{ padding: 16, border: "1px solid #e5e5e5", borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Saldo em Caixa</span>
          <strong
            style={{
              display: "block",
              fontSize: 22,
              color: saldoLiquido >= 0 ? "#000" : "#dc2626",
              marginTop: 4
            }}
          >
            {moeda(saldoLiquido)}
          </strong>
        </div>
      </div>

      {/* FILTROS E TABELA */}
      <section style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setFiltroTipo("TODOS")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: filtroTipo === "TODOS" ? "#000" : "#fff",
                color: filtroTipo === "TODOS" ? "#fff" : "#000",
                cursor: "pointer"
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo("RECEITA")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: filtroTipo === "RECEITA" ? "#000" : "#fff",
                color: filtroTipo === "RECEITA" ? "#fff" : "#000",
                cursor: "pointer"
              }}
            >
              Entradas
            </button>
            <button
              onClick={() => setFiltroTipo("DESPESA")}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: filtroTipo === "DESPESA" ? "#000" : "#fff",
                color: filtroTipo === "DESPESA" ? "#fff" : "#000",
                cursor: "pointer"
              }}
            >
              Saídas
            </button>
          </div>

          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar lançamento..."
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              width: isMobile ? "100%" : 260
            }}
          />
        </div>

        {/* TABELA */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ padding: 10 }}>Descrição</th>
                <th style={{ padding: 10 }}>Categoria</th>
                <th style={{ padding: 10 }}>Tipo</th>
                <th style={{ padding: 10 }}>Data</th>
                <th style={{ padding: 10 }}>Valor</th>
                <th style={{ padding: 10 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#888" }}>
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                lancamentosFiltrados.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: 10 }}>
                      <strong>{item.descricao}</strong>
                    </td>
                    <td style={{ padding: 10 }}>{item.categoria ?? "-"}</td>
                    <td style={{ padding: 10 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: "bold",
                          backgroundColor: item.tipo === "RECEITA" ? "#e6f4ea" : "#fce8e6",
                          color: item.tipo === "RECEITA" ? "#137333" : "#c5221f"
                        }}
                      >
                        {item.tipo}
                      </span>
                    </td>
                    <td style={{ padding: 10 }}>{dataBR(item.dataPagamento)}</td>
                    <td
                      style={{
                        padding: 10,
                        fontWeight: "bold",
                        color: item.tipo === "RECEITA" ? "#16a34a" : "#dc2626"
                      }}
                    >
                      {item.tipo === "DESPESA" ? "- " : "+ "}
                      {moeda(item.valor)}
                    </td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={() => excluirLancamento(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          cursor: "pointer"
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE NOVO LANÇAMENTO */}
      {modalLancamento && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: 24,
              borderRadius: 8,
              width: "100%",
              maxWidth: 450
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Novo Lançamento</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Tipo</span>
                <select
                  value={formLancamento.tipo}
                  onChange={e => {
                    const t = e.target.value as "RECEITA" | "DESPESA"
                    setFormLancamento(prev => ({
                      ...prev,
                      tipo: t,
                      categoria: t === "RECEITA" ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0]
                    }))
                  }}
                  style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                >
                  <option value="DESPESA">Saída (Despesa)</option>
                  <option value="RECEITA">Entrada (Receita)</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Descrição</span>
                <input
                  value={formLancamento.descricao}
                  onChange={e =>
                    setFormLancamento(prev => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Ex: Pagamento de Tecidos"
                  style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Valor (R$)</span>
                <input
                  value={formLancamento.valor}
                  onChange={e =>
                    setFormLancamento(prev => ({ ...prev, valor: e.target.value }))
                  }
                  placeholder="0,00"
                  style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Categoria</span>
                <select
                  value={formLancamento.categoria}
                  onChange={e =>
                    setFormLancamento(prev => ({ ...prev, categoria: e.target.value }))
                  }
                  style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                >
                  {(formLancamento.tipo === "RECEITA"
                    ? CATEGORIAS_RECEITA
                    : CATEGORIAS_DESPESA
                  ).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Data de Pagamento</span>
                <input
                  type="date"
                  value={formLancamento.dataPagamento}
                  onChange={e =>
                    setFormLancamento(prev => ({ ...prev, dataPagamento: e.target.value }))
                  }
                  style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20
              }}
            >
              <button
                onClick={() => setModalLancamento(false)}
                disabled={salvando}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarLancamento}
                disabled={salvando}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  backgroundColor: "#000",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}