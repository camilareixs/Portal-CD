import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
  creditoDisponivel: number
  ativo: boolean
  cidade: string
  estado: string
  rua: string
  criadoEm: string
  CEP: string
  Complemento: string
  cintura: string
  "Data de Nascimento": string
  tamanhoSaia?: string
  tamanhoVestido?: string
  tamanhoBlusa?: string
  busto?: string
  quadril?: string
  clienteRef: string
  observacao: string
  descricao?: string
}

type Compra = {
  id: string
  clienteid: string
  cliente: string
  cpf: string
  valor: number
  pagamento: string
  parcelas: number
  pontosgerados: number
  criadoem: string
  cupomusado: number
  ativo?: boolean
}

const MENSAGEM_WHATS_PADRAO =
  "Olá, {nome}! Você tem {pontos} pontos acumulados na Cami&Duda. A cada 10 pontos, você ganha um cupom de R$ 60. Você tem {cupons} cupom(ns) disponível(is) e já acumulou {resto}/10 pontos para o próximo. Te esperamos!"

const MENSAGEM_CUPONS_PADRAO =
  "Olá, {nome}! Você tem {cupons} cupom(ns) disponível(is) e já acumulou {resto}/10 pontos para ganhar mais um. Te esperamos na Cami&Duda!"

export default function Clientes({
  irParaCompra
}: {
  irParaCompra?: (clienteId: string, clienteNome: string) => void
}) {
  const [compras, setCompras] = useState<Compra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const perfil = localStorage.getItem("camiduda_perfil") || ""
  const isAdm = perfil === "ADM"

  const [busca, setBusca] = useState("")
  const [cidadeFiltro, setCidadeFiltro] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState("")
  const [ordenacao, setOrdenacao] = useState("ranking")

  const [selected, setSelected] = useState<Cliente | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [cuponsAberto, setCuponsAberto] = useState(false)
  const [editarDados, setEditarDados] = useState(false)
  const [editarMedidas, setEditarMedidas] = useState(false)
  const [form, setForm] = useState<Partial<Cliente>>({})
  const [novo, setNovo] = useState<Partial<Cliente>>({})

  const [clienteWhats, setClienteWhats] = useState<Cliente | null>(null)
  const [mensagemWhats, setMensagemWhats] = useState(MENSAGEM_WHATS_PADRAO)
  const [mensagemCupons, setMensagemCupons] = useState(MENSAGEM_CUPONS_PADRAO)

  const [quantidadePontos, setQuantidadePontos] = useState("1")
  const [ajustandoPontos, setAjustandoPontos] = useState(false)
  const [editandoPontos, setEditandoPontos] = useState(false)

  const [relatorioAberto, setRelatorioAberto] = useState(false)
  const [relatorioTexto, setRelatorioTexto] = useState("")
  const [creditoAberto, setCreditoAberto] = useState(false)
  const [novoCredito, setNovoCredito] = useState("")
  const [salvandoCredito, setSalvandoCredito] = useState(false)
  const [inativosAberto, setInativosAberto] = useState(false)
  const [clienteInativoWhats, setClienteInativoWhats] = useState<Cliente | null>(null)
  const [mensagemInativo, setMensagemInativo] = useState("")

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("ativo", true)
      .order("pontos", { ascending: false })

    if (error) {
      console.error("Erro ao buscar clientes:", error)
      alert("Erro ao buscar clientes: " + error.message)
      return
    }

    if (!data) return

    const formatados: Cliente[] = data.map((c: any) => ({
      id: String(c.id),
      nome: c.nome || "",
      cpf: c.cpf || "",
      celular: c.celular || "",
      pontos: Number(c.pontos || 0),
      creditoDisponivel: Number(c.creditoDisponivel || 0),
      ativo: c.ativo !== false,
      cidade: c.cidade || "",
      estado: c.estado || "",
      rua: c.rua || "",
      criadoEm: c.criadoem || "",
      CEP: c.cep || "",
      Complemento: c.complemento || "",
      cintura: c.cintura || "",
      "Data de Nascimento": c.dataNascimento || "",
      tamanhoSaia: c.tamanhoSaia || "",
      tamanhoVestido: c.tamanhoVestido || "",
      tamanhoBlusa: c.tamanhoBlusa || "",
      busto: c.busto || "",
      quadril: c.quadril || "",
      clienteRef: c.clienteRef || "",
      observacao: c.observacao || "",
      descricao: c.descricao || ""
    }))
    setClientes(formatados)
    setSelected(atual =>
      atual ? formatados.find(c => c.id === atual.id) || atual : null
    )
  }

  async function fetchCompras() {
    const { data, error } = await supabase
      .from("compras")
      .select("*")
      .eq("ativo", true)
      .order("criadoem", { ascending: false })

    if (error) {
      console.error("Erro ao buscar compras:", error)
      return
    }

    if (data) {
      setCompras(data.map((c: any) => ({
        id: String(c.id),
        clienteid: String(c.clienteid),
        cliente: c.cliente || "",
        cpf: c.cpf || "",
        valor: Number(c.valor || 0),
        pagamento: c.pagamento || "",
        parcelas: Number(c.parcelas || 1),
        pontosgerados: Number(c.pontosgerados || 0),
        criadoem: c.criadoem || "",
        cupomusado: Number(c.cupomusado || 0),
        ativo: c.ativo !== false
      })))
    }
  }

  useEffect(() => {
    void fetchClientes()
    void fetchCompras()
  }, [])

  function calc(pontos: number) {
    return { cupons: Math.floor(pontos / 10), resto: pontos % 10 }
  }

  function formatarData(data: string) {
    if (!data) return "-"
    const dataObj = new Date(data.length === 10 ? `${data}T00:00:00` : data)
    return Number.isNaN(dataObj.getTime()) ? data : dataObj.toLocaleDateString("pt-BR")
  }

  function formatarMoeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  async function salvarNovoCredito() {
    if (!selected) return
    const valor = Number(novoCredito.replace(/\./g, "").replace(",", "."))
    if (!novoCredito.trim() || !Number.isFinite(valor) || valor <= 0) {
      alert("Informe um valor de crédito maior que R$ 0,00.")
      return
    }

    const saldoAtualizado = Number(selected.creditoDisponivel || 0) + valor
    setSalvandoCredito(true)
    const { error } = await supabase
      .from("clientes")
      .update({ creditoDisponivel: saldoAtualizado })
      .eq("id", selected.id)
    setSalvandoCredito(false)

    if (error) {
      alert("Erro ao adicionar crédito: " + error.message)
      return
    }

    setSelected({ ...selected, creditoDisponivel: saldoAtualizado })
    setCreditoAberto(false)
    setNovoCredito("")
    await fetchClientes()
    alert(`Crédito de ${formatarMoeda(valor)} adicionado para ${selected.nome}.`)
  }

  function abrirWhats(cliente: Cliente) {
    if (!cliente.celular?.trim()) {
      alert(`O cliente ${cliente.nome} não possui celular cadastrado.`)
      return
    }
    setMensagemWhats(MENSAGEM_WHATS_PADRAO)
    setClienteWhats(cliente)
  }

  function enviarWhatsPersonalizado() {
    if (!clienteWhats) return
    const numero = clienteWhats.celular.replace(/\D/g, "")
    const numeroWhatsApp = numero.startsWith("55") ? numero : `55${numero}`
    const { cupons, resto } = calc(clienteWhats.pontos)
    const mensagem = mensagemWhats
      .replace(/\{nome\}/gi, clienteWhats.nome)
      .replace(/\{pontos\}/gi, String(clienteWhats.pontos))
      .replace(/\{cupons\}/gi, String(cupons))
      .replace(/\{resto\}/gi, String(resto))

    window.open(
      `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer"
    )
    setClienteWhats(null)
  }

  function enviarWhatsCupom(cliente: Cliente) {
    if (!cliente.celular?.trim()) {
      alert(`O cliente ${cliente.nome} não possui celular cadastrado.`)
      return
    }
    const { cupons, resto } = calc(cliente.pontos)
    const mensagem = mensagemCupons
      .replace(/\{nome\}/gi, cliente.nome)
      .replace(/\{cupons\}/gi, String(cupons))
      .replace(/\{resto\}/gi, String(resto))
    const numero = cliente.celular.replace(/\D/g, "")
    const numeroWhatsApp = numero.startsWith("55") ? numero : `55${numero}`
    window.open(
      `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  async function salvarEdicao() {
    if (!selected) return
    if (!form.nome?.trim()) {
      alert("Preencha o nome do cliente.")
      return
    }

    const { error } = await supabase
      .from("clientes")
      .update({
        nome: form.nome || "",
        cpf: form.cpf || "",
        celular: form.celular || "",
        rua: form.rua || "",
        cidade: form.cidade || "",
        estado: form.estado || "",
        cep: form.CEP || "",
        complemento: form.Complemento || "",
        dataNascimento: form["Data de Nascimento"] || null,
        clienteRef: form.clienteRef || "",
        observacao: form.observacao || "",
        cintura: form.cintura || "",
        tamanhoSaia: form.tamanhoSaia || "",
        tamanhoVestido: form.tamanhoVestido || "",
        tamanhoBlusa: form.tamanhoBlusa || "",
        busto: form.busto || "",
        quadril: form.quadril || ""
      })
      .eq("id", selected.id)

    if (error) {
      alert("Erro ao editar cliente: " + error.message)
      return
    }

    alert("Cliente atualizado com sucesso!")
    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
    await fetchClientes()
  }

  async function criarCliente() {
    if (!novo.nome?.trim()) {
      alert("Preencha o nome do cliente.")
      return
    }

    const referenciaAutomatica = `CLI-${Date.now()}`
    const { error } = await supabase.from("clientes").insert([{
      nome: novo.nome.trim(),
      cpf: novo.cpf || "",
      celular: novo.celular || "",
      cidade: novo.cidade || "",
      estado: novo.estado || "",
      rua: novo.rua || "",
      cep: novo.CEP || "",
      complemento: novo.Complemento || "",
      dataNascimento: novo["Data de Nascimento"] || null,
      clienteRef: referenciaAutomatica,
      observacao: novo.observacao || "",
      cintura: novo.cintura || "",
      pontos: 0,
      creditoDisponivel: 0,
      ativo: true,
      tamanhoSaia: novo.tamanhoSaia || "",
      tamanhoVestido: novo.tamanhoVestido || "",
      tamanhoBlusa: novo.tamanhoBlusa || "",
      busto: novo.busto || "",
      quadril: novo.quadril || ""
    }])

    if (error) {
      alert("Erro ao criar cliente: " + error.message)
      return
    }

    alert("Cliente criado com sucesso!")
    setCreating(false)
    setNovo({})
    await fetchClientes()
  }

  async function excluirCliente() {
    if (!selected) return
    const confirmar = window.confirm(
      `Deseja inativar o cliente "${selected.nome}"?\n\nEle deixará de aparecer no aplicativo, mas seus dados continuarão salvos no banco de dados.`
    )
    if (!confirmar) return

    const { error } = await supabase
      .from("clientes")
      .update({ ativo: false })
      .eq("id", selected.id)
    if (error) {
      alert("Erro ao inativar cliente: " + error.message)
      return
    }

    alert("Cliente inativado. Os dados foram mantidos no banco de dados.")
    setSelected(null)
    setForm({})
    await fetchClientes()
  }

  async function salvarPontosExatos() {
    if (!isAdm || !selected) return
    const quantidade = Number(quantidadePontos)
    if (quantidadePontos.trim() === "" || !Number.isInteger(quantidade) || quantidade < 0) {
      alert("Informe uma quantidade de pontos válida.")
      return
    }

    const confirmar = window.confirm(
      `Deseja alterar os pontos de ${selected.nome} de ${selected.pontos} para ${quantidade}?`
    )
    if (!confirmar) return

    setAjustandoPontos(true)
    const { error } = await supabase.from("clientes")
      .update({ pontos: quantidade })
      .eq("id", selected.id)
    setAjustandoPontos(false)

    if (error) {
      alert("Erro ao salvar pontos: " + error.message)
      return
    }

    setSelected({ ...selected, pontos: quantidade })
    setQuantidadePontos(String(quantidade))
    setEditandoPontos(false)
    await fetchClientes()
    alert("Pontos atualizados com sucesso!")
  }

  function gerarRelatorio(cliente: Cliente) {
    const comprasCliente = compras
      .filter(c => c.clienteid === cliente.id)
      .sort((a, b) => new Date(b.criadoem).getTime() - new Date(a.criadoem).getTime())
    const totalGasto = comprasCliente.reduce((a, c) => a + c.valor, 0)
    const totalCompras = comprasCliente.length
    const ticketMedio = totalCompras > 0 ? totalGasto / totalCompras : 0
    const cuponsUsados = comprasCliente.reduce((a, c) => a + c.cupomusado, 0)
    const pontosGerados = comprasCliente.reduce((a, c) => a + c.pontosgerados, 0)
    const ultimaCompra = comprasCliente.length ? formatarData(comprasCliente[0].criadoem) : "Nenhuma"
    return `RELATÓRIO CAMIDUDA

CLIENTE
Nome: ${cliente.nome}
CPF: ${cliente.cpf || "-"}
Celular: ${cliente.celular || "-"}
Referência: ${cliente.clienteRef || "-"}
Crédito disponível: ${formatarMoeda(cliente.creditoDisponivel)}
Observação: ${cliente.observacao || "-"}
Data de nascimento: ${cliente["Data de Nascimento"] ? formatarData(cliente["Data de Nascimento"]) : "-"}

ENDEREÇO
Rua: ${cliente.rua || "-"}
Número: -
Complemento: ${cliente.Complemento || "-"}
CEP: ${cliente.CEP || "-"}
Cidade: ${cliente.cidade || "-"}
Estado: ${cliente.estado || "-"}

Cliente desde: ${formatarData(cliente.criadoEm)}

------------------------------
RESUMO DE FIDELIDADE
------------------------------
Pontos atuais: ${cliente.pontos}
Cupons disponíveis: ${calc(cliente.pontos).cupons}
Pontos para próximo cupom: ${calc(cliente.pontos).resto}/10

------------------------------
RESUMO DE COMPRAS
------------------------------
Total gasto: R$ ${totalGasto.toFixed(2)}
Compras realizadas: ${totalCompras}
Ticket médio: R$ ${ticketMedio.toFixed(2)}
Última compra: ${ultimaCompra}
Valor em cupons utilizados: R$ ${cuponsUsados.toFixed(2)}
Pontos gerados: ${pontosGerados}

------------------------------
HISTÓRICO
------------------------------
${comprasCliente.length
  ? comprasCliente.map(c => `${formatarData(c.criadoem)} | R$ ${c.valor.toFixed(2)} | ${c.pagamento || "-"}`).join("\n")
  : "Nenhuma compra registrada."}`
  }

  function visualizarRelatorio(cliente: Cliente) {
    setRelatorioTexto(gerarRelatorio(cliente))
    setRelatorioAberto(true)
  }

  function baixarRelatorio(cliente: Cliente) {
    const blob = new Blob([gerarRelatorio(cliente)], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${cliente.nome.replace(/\s+/g, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function fecharModal() {
    setSelected(null)
    setCreating(false)
    setEditing(false)
    setEditarDados(false)
    setEditarMedidas(false)
    setRelatorioAberto(false)
    setRelatorioTexto("")
    setCreditoAberto(false)
    setNovoCredito("")
    setCuponsAberto(false)
    setClienteWhats(null)
    setEditandoPontos(false)
  }

  function iniciarEdicaoDados() {
    if (!selected) return
    setForm({ ...selected })
    setEditing(true)
    setEditarDados(true)
    setEditarMedidas(false)
  }

  function iniciarEdicaoMedidas() {
    if (!selected) return
    setForm({ ...selected })
    setEditing(true)
    setEditarDados(false)
    setEditarMedidas(true)
  }

  function normalizarBusca(valor: unknown) {
    return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
  }

  const cidades = Array.from(new Set(clientes.map(c => c.cidade).filter(Boolean))).sort()
  const estados = Array.from(new Set(clientes.map(c => c.estado).filter(Boolean))).sort()
  const clientesComCupom = clientes.filter(c => c.pontos >= 10)
  const totalClientes = clientes.length

  let lista = [...clientes]
  if (ordenacao === "ranking" || ordenacao === "pontos") {
    lista.sort((a, b) => b.pontos - a.pontos)
  } else if (ordenacao === "alfabetica") {
    lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  lista = lista
    .filter(c => {
      const termo = normalizarBusca(busca)
      return [c.nome, c.cpf, c.celular, c.observacao, c.clienteRef]
        .some(campo => normalizarBusca(campo).includes(termo))
    })
    .filter(c => !cidadeFiltro || c.cidade === cidadeFiltro)
    .filter(c => !estadoFiltro || c.estado === estadoFiltro)

  const clientesInativos = clientes.filter(cliente => {
    const ultimaCompra = compras
      .filter(compra => compra.clienteid === cliente.id && compra.ativo !== false)
      .sort((a, b) => new Date(b.criadoem).getTime() - new Date(a.criadoem).getTime())[0]
    if (!ultimaCompra) return true
    const diasSemComprar = (Date.now() - new Date(ultimaCompra.criadoem).getTime()) / 86400000
    return diasSemComprar > 30
  })

  function abrirMensagemClienteInativo(cliente: Cliente) {
    if (!cliente.celular?.trim()) {
      alert(`O cadastro de ${cliente.nome} não tem um celular informado.`)
      return
    }
    setClienteInativoWhats(cliente)
    setMensagemInativo(`Oi, ${cliente.nome.split(" ")[0]}! Tudo bem? Faz um tempinho que você não aparece por aqui e sentimos sua falta. Chegaram novidades lindas na Cami&Duda e vamos adorar te receber novamente!`)
  }

  function enviarMensagemClienteInativo() {
    if (!clienteInativoWhats) return
    const numero = clienteInativoWhats.celular.replace(/\D/g, "")
    const numeroComPais = numero.startsWith("55") ? numero : `55${numero}`
    const url = `https://wa.me/${numeroComPais}?text=${encodeURIComponent(mensagemInativo.trim())}`
    // A abertura acontece diretamente no clique do botão para evitar bloqueio de pop-up.
    window.open(url, "_blank")
    setClienteInativoWhats(null)
  }

  return (
    <div style={styles.container}>
      <style>{`
        .clientes-filtros{display:flex;gap:12px;margin-bottom:26px;flex-wrap:wrap}
        .clientes-dashboard{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:24px}
        .clientes-dashboard-card{background:#fff;border:1px solid #eee;border-radius:16px;padding:16px 18px;box-sizing:border-box}
        .clientes-dashboard-button{width:100%;text-align:left;cursor:pointer;transition:.2s}
        .clientes-dashboard-button:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.06)}
        .clientes-dashboard-label{font-size:12px;color:#888;margin-bottom:6px}
        .clientes-dashboard-number{font-size:26px;font-weight:600;color:#333}
        .cupons-clientes-list{display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto}
        .cupons-cliente-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #eee;border-radius:12px;background:#fcfbf7}
        .cupons-cliente-nome{font-size:14px;font-weight:500;min-width:0}
        .cupons-cliente-pontos{color:#80652e;font-size:12px;white-space:nowrap}
        .clientes-busca{flex:2;min-width:220px}
        .clientes-select{flex:1;min-width:140px}
        .clientes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}
        .clientes-modal-actions{display:flex;gap:10px;margin-top:22px;justify-content:center;flex-wrap:wrap;align-items:center;width:100%;box-sizing:border-box}
        .cliente-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.07)!important}
        .relatorio-texto{white-space:pre-wrap;font-family:Inter,sans-serif;font-size:13px;line-height:1.7;color:#333;background:#fcfbf7;border:1px solid #eee6d2;border-radius:14px;padding:18px;max-height:55vh;overflow-y:auto}
        @media(max-width:600px){
          .clientes-header{margin-bottom:18px!important}.clientes-header-title{font-size:28px!important}.clientes-header-button{padding:10px 14px!important}
          .clientes-dashboard{gap:8px!important;margin-bottom:18px!important}.clientes-dashboard-card{padding:13px!important;border-radius:14px!important}.clientes-dashboard-number{font-size:22px!important}
          .clientes-filtros{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:8px!important;margin-bottom:22px!important;width:100%}
          .clientes-busca,.clientes-select{width:100%!important;min-width:0!important;flex:none!important}.clientes-busca{grid-column:1}.clientes-select.cidade{grid-column:2}.clientes-select.estado{grid-column:1}.clientes-select.ranking{grid-column:2}
          .clientes-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.cliente-card{padding:14px!important;border-radius:15px!important}
          .cliente-card-name{font-size:14px!important}.cliente-card-ref{font-size:12px!important}.cliente-card-coupon{font-size:13px!important;margin:8px 0!important}.cliente-card-points{font-size:11px!important}
          .cliente-modal-overlay{padding:10px!important;align-items:center!important}.cliente-modal{width:100%!important;max-width:430px!important;max-height:calc(100vh - 20px)!important;padding:18px!important;border-radius:20px!important}
          .cliente-modal-title{font-size:21px!important}.cliente-modal-points{padding:12px!important;margin-bottom:16px!important}.clientes-modal-actions{gap:8px!important}.clientes-modal-actions{justify-content:center!important;gap:8px!important}.clientes-modal-actions button{padding:9px 12px!important;font-size:13px!important}
          .cliente-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px}.cliente-info-full{grid-column:1/-1}.relatorio-texto{max-height:48vh;font-size:12px}
        }
        @media(max-width:380px){.clientes-grid{gap:8px!important}.cliente-card{padding:12px!important}.cliente-card-name{font-size:13px!important}.cliente-modal{padding:15px!important}.cliente-info-grid{grid-template-columns:1fr!important}.cliente-info-full{grid-column:auto}}
      `}</style>

      {clientesInativos.length > 0 && (
        <div style={styles.inativosBar}>
          <span>
            🔔 {clientesInativos.length} clientes inativos
          </span>
          <button type="button" style={styles.inativosBtn} onClick={() => setInativosAberto(true)}>Ver</button>
        </div>
      )}

      <div className="clientes-header" style={styles.header}>
        <h1 className="clientes-header-title" style={styles.title}>Clientes</h1>
        <button className="clientes-header-button" style={styles.primaryBtn} onClick={() => { setCreating(true); setNovo({}) }}>
          Novo cliente
        </button>
      </div>

      <div className="clientes-dashboard">
        <div className="clientes-dashboard-card">
          <div className="clientes-dashboard-label">Total de clientes</div>
          <div className="clientes-dashboard-number">{totalClientes}</div>
        </div>
        <button
          className="clientes-dashboard-card clientes-dashboard-button"
          style={styles.couponDashboard}
          onClick={() => setCuponsAberto(true)}
        >
          <div className="clientes-dashboard-label" style={{ color: "#8b7955" }}>Clientes com cupom</div>
          <div className="clientes-dashboard-number" style={{ color: "#80652e" }}>{clientesComCupom.length}</div>
          <div style={{ color: "#9b8965", fontSize: 11, marginTop: 3 }}>Ver clientes elegíveis</div>
        </button>
      </div>

      <div className="clientes-filtros">
        <input className="clientes-busca" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={styles.input} />
        <select className="clientes-select cidade" value={cidadeFiltro} onChange={e => setCidadeFiltro(e.target.value)} style={styles.select}>
          <option value="">Cidades</option>{cidades.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="clientes-select estado" value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} style={styles.select}>
          <option value="">Estados</option>{estados.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="clientes-select ranking" value={ordenacao} onChange={e => setOrdenacao(e.target.value)} style={styles.select}>
          <option value="ranking">Ranking</option><option value="alfabetica">A–Z</option><option value="pontos">Pontos</option>
        </select>
      </div>

      <div className="clientes-grid">
        {lista.map((c, index) => {
          const { cupons, resto } = calc(c.pontos)
          return (
            <div key={c.id} className="cliente-card" style={styles.card} onClick={() => { setSelected(c); setForm({ ...c }); setEditandoPontos(false) }}>
              {ordenacao === "ranking" && index < 3 && <span style={styles.rank}>#{index + 1}</span>}
              <div className="cliente-card-name" style={styles.name}>{c.nome}</div>
              {c.observacao && <div className="cliente-card-ref" style={styles.muted}>{c.observacao}</div>}
              <div className="cliente-card-coupon" style={styles.coupon}>{cupons} cupom(ns)</div>
              <div style={styles.progressBg}><div style={{ ...styles.progressFill, width: `${resto * 10}%` }} /></div>
              <div className="cliente-card-points" style={styles.mutedSmall}>{resto}/10 pontos</div>
            </div>
          )
        })}
        {lista.length === 0 && <div style={{ color: "#888", padding: 20 }}>Nenhum cliente encontrado com esses filtros.</div>}
      </div>

      {(selected || creating) && (
        <div className="cliente-modal-overlay" style={styles.overlay} onClick={fecharModal}>
          <div className="cliente-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
            {selected && !editing && (
              <>
                <div style={styles.modalHeader}>
                  <h2 className="cliente-modal-title" style={styles.modalTitle}>{selected.nome}</h2>
                  <button style={styles.closeBtn} onClick={fecharModal}>×</button>
                </div>

                <div className="cliente-modal-points" style={{ ...styles.pointsCard, ...styles.pointsCardGold }}>
                  <div style={styles.pointsTop}>
                    <span style={styles.pointsLabel}>Fidelidade</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <strong style={styles.pointsNumber}>{selected.pontos} pts</strong>
                      {isAdm && <button type="button" title="Editar pontos" aria-label="Editar pontos" onClick={() => { setQuantidadePontos(String(selected.pontos)); setEditandoPontos(v => !v) }} style={styles.editPointsBtn}>✎</button>}
                    </div>
                  </div>
                  <div style={styles.progressBgLarge}><div style={{ ...styles.progressFill, width: `${calc(selected.pontos).resto * 10}%` }} /></div>
                  <div style={styles.pointsBottom}>
                    <span>{calc(selected.pontos).cupons} cupom(ns)</span>
                    <span>{calc(selected.pontos).resto}/10 para o próximo</span>
                  </div>

                  {isAdm && editandoPontos && (
                    <div style={styles.pointsEditor}>
                      <div style={styles.pointsEditorLabel}>EDITAR PONTUAÇÃO</div>
                      <label style={styles.fieldLabel}>Quantidade total de pontos</label>
                      <input type="number" min="0" step="1" value={quantidadePontos} onChange={e => setQuantidadePontos(e.target.value)} style={styles.inputSpacing} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
                        <button type="button" disabled={ajustandoPontos} onClick={() => setEditandoPontos(false)} style={styles.secondaryBtn}>Cancelar</button>
                        <button type="button" disabled={ajustandoPontos} onClick={salvarPontosExatos} style={styles.primaryBtnSmall}>{ajustandoPontos ? "Salvando..." : "Salvar pontos"}</button>
                      </div>
                    </div>
                  )}
                </div>

                {selected.clienteRef && <div style={styles.referenceText}>{selected.clienteRef}</div>}

                <div style={styles.creditCard}>
                  <span style={styles.creditLabel}>Crédito disponível</span>
                  <strong style={styles.creditValue}>{formatarMoeda(selected.creditoDisponivel)}</strong>
                </div>

                <div style={styles.sectionHeader}>
                  <span>Dados pessoais</span><button style={styles.editIcon} onClick={iniciarEdicaoDados}>Editar</button>
                </div>
                <div className="cliente-info-grid">
                  <Info label="CPF" value={selected.cpf || "-"} />
                  <Info label="Celular" value={selected.celular || "-"} />
                  <Info label="Referência" value={selected.clienteRef || "-"} />
                  <div className="cliente-info-full"><Info label="Observação" value={selected.observacao || "-"} /></div>
                  <Info label="Data de nascimento" value={selected["Data de Nascimento"] ? formatarData(selected["Data de Nascimento"]) : "-"} />
                  <Info label="CEP" value={selected.CEP || "-"} />
                  <Info label="Cidade" value={selected.cidade || "-"} />
                  <Info label="Estado" value={selected.estado || "-"} />
                  <div className="cliente-info-full"><Info label="Rua" value={selected.rua || "-"} /></div>
                  <div className="cliente-info-full"><Info label="Complemento" value={selected.Complemento || "-"} /></div>
                  <Info label="Cliente desde" value={formatarData(selected.criadoEm)} />
                </div>

                <div style={{ ...styles.sectionHeader, marginTop: 18 }}>
                  <span>Medidas e tamanhos</span><button style={styles.editIcon} onClick={iniciarEdicaoMedidas}>Editar</button>
                </div>
                <div className="cliente-info-grid">
                  <Info label="Saia" value={selected.tamanhoSaia || "-"} />
                  <Info label="Vestido" value={selected.tamanhoVestido || "-"} />
                  <Info label="Blusa" value={selected.tamanhoBlusa || "-"} />
                  <Info label="Busto" value={selected.busto || "-"} />
                  <Info label="Cintura" value={selected.cintura || "-"} />
                  <Info label="Quadril" value={selected.quadril || "-"} />
                </div>

                <div className="clientes-modal-actions">
                  <button style={styles.secondaryBtn} onClick={() => { if (irParaCompra) irParaCompra(selected.id, selected.nome); setSelected(null) }}>Nova venda</button>
                  <button style={styles.newCreditBtn} onClick={() => { setNovoCredito(""); setCreditoAberto(true) }}>Novo Crédito</button>
                  <button style={styles.secondaryBtn} onClick={() => visualizarRelatorio(selected)}>Relatório</button>
                  <button style={styles.whatsBtn} onClick={() => abrirWhats(selected)}>WhatsApp</button>
                  <button style={styles.deleteBtn} onClick={excluirCliente}>Excluir cliente</button>
                </div>
              </>
            )}

            {selected && editing && (
              <>
                <div style={styles.modalHeader}>
                  <h2 className="cliente-modal-title" style={styles.modalTitle}>Editar cliente</h2>
                  <button style={styles.closeBtn} onClick={() => { setEditing(false); setEditarDados(false); setEditarMedidas(false) }}>×</button>
                </div>

                {editarDados && (
                  <>
                    <div style={styles.editSectionLabel}>Dados pessoais</div>
                    <Campo label="Nome completo"><input style={styles.input} placeholder="Digite o nome completo" value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} /></Campo>
                    <Campo label="CPF"><input style={styles.input} placeholder="Digite o CPF" value={form.cpf || ""} onChange={e => setForm({ ...form, cpf: e.target.value })} /></Campo>
                    <Campo label="Celular"><input style={styles.input} placeholder="Digite o celular" value={form.celular || ""} onChange={e => setForm({ ...form, celular: e.target.value })} /></Campo>
                    <div style={styles.referenceBox}><div style={styles.fieldLabel}>Código de referência</div><div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{form.clienteRef || "-"}</div></div>
                    <Campo label="Observação"><textarea style={styles.textarea} placeholder="Digite uma observação" value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} /></Campo>
                    <Campo label="Data de nascimento"><input style={styles.input} type="date" value={form["Data de Nascimento"] || ""} onChange={e => setForm({ ...form, "Data de Nascimento": e.target.value })} /></Campo>
                    <Campo label="CEP"><input style={styles.input} placeholder="Digite o CEP" value={form.CEP || ""} onChange={e => setForm({ ...form, CEP: e.target.value })} /></Campo>
                    <Campo label="Rua"><input style={styles.input} placeholder="Digite a rua" value={form.rua || ""} onChange={e => setForm({ ...form, rua: e.target.value })} /></Campo>
                    <Campo label="Complemento"><input style={styles.input} placeholder="Apartamento, referência etc." value={form.Complemento || ""} onChange={e => setForm({ ...form, Complemento: e.target.value })} /></Campo>
                    <Campo label="Cidade"><input style={styles.input} placeholder="Digite a cidade" value={form.cidade || ""} onChange={e => setForm({ ...form, cidade: e.target.value })} /></Campo>
                    <Campo label="Estado"><input style={styles.input} placeholder="Digite o estado" value={form.estado || ""} onChange={e => setForm({ ...form, estado: e.target.value })} /></Campo>
                  </>
                )}

                {editarMedidas && (
                  <>
                    <div style={styles.editSectionLabel}>Medidas e tamanhos</div>
                    <Campo label="Tamanho de saia"><input style={styles.input} placeholder="Ex.: 38, M" value={form.tamanhoSaia || ""} onChange={e => setForm({ ...form, tamanhoSaia: e.target.value })} /></Campo>
                    <Campo label="Tamanho de vestido"><input style={styles.input} placeholder="Ex.: 38, M" value={form.tamanhoVestido || ""} onChange={e => setForm({ ...form, tamanhoVestido: e.target.value })} /></Campo>
                    <Campo label="Tamanho de blusa"><input style={styles.input} placeholder="Ex.: P, M, G" value={form.tamanhoBlusa || ""} onChange={e => setForm({ ...form, tamanhoBlusa: e.target.value })} /></Campo>
                    <Campo label="Busto"><input style={styles.input} placeholder="Medida do busto" value={form.busto || ""} onChange={e => setForm({ ...form, busto: e.target.value })} /></Campo>
                    <Campo label="Cintura"><input style={styles.input} placeholder="Medida da cintura" value={form.cintura || ""} onChange={e => setForm({ ...form, cintura: e.target.value })} /></Campo>
                    <Campo label="Quadril"><input style={styles.input} placeholder="Medida do quadril" value={form.quadril || ""} onChange={e => setForm({ ...form, quadril: e.target.value })} /></Campo>
                  </>
                )}

                <div className="clientes-modal-actions">
                  <button style={styles.secondaryBtn} onClick={() => { setEditing(false); setEditarDados(false); setEditarMedidas(false) }}>Cancelar</button>
                  <button style={styles.primaryBtnSmall} onClick={salvarEdicao}>Salvar alterações</button>
                </div>
              </>
            )}

            {creating && (
              <>
                <div style={styles.modalHeader}>
                  <h2 className="cliente-modal-title" style={styles.modalTitle}>Novo cliente</h2>
                  <button style={styles.closeBtn} onClick={fecharModal}>×</button>
                </div>
                <Campo label="Nome completo"><input style={styles.input} placeholder="Digite o nome completo" value={novo.nome || ""} onChange={e => setNovo({ ...novo, nome: e.target.value })} /></Campo>
                <Campo label="CPF"><input style={styles.input} placeholder="Digite o CPF" value={novo.cpf || ""} onChange={e => setNovo({ ...novo, cpf: e.target.value })} /></Campo>
                <Campo label="Celular"><input style={styles.input} placeholder="Digite o celular com DDD" value={novo.celular || ""} onChange={e => setNovo({ ...novo, celular: e.target.value })} /></Campo>
                <Campo label="Observação"><textarea style={styles.textarea} placeholder="Digite uma observação" value={novo.observacao || ""} onChange={e => setNovo({ ...novo, observacao: e.target.value })} /></Campo>
                <Campo label="Data de nascimento"><input style={styles.input} type="date" value={novo["Data de Nascimento"] || ""} onChange={e => setNovo({ ...novo, "Data de Nascimento": e.target.value })} /></Campo>
                <Campo label="CEP"><input style={styles.input} placeholder="Digite o CEP" value={novo.CEP || ""} onChange={e => setNovo({ ...novo, CEP: e.target.value })} /></Campo>
                <Campo label="Rua"><input style={styles.input} placeholder="Digite a rua" value={novo.rua || ""} onChange={e => setNovo({ ...novo, rua: e.target.value })} /></Campo>
                <Campo label="Complemento"><input style={styles.input} placeholder="Apartamento, referência etc." value={novo.Complemento || ""} onChange={e => setNovo({ ...novo, Complemento: e.target.value })} /></Campo>
                <Campo label="Cidade"><input style={styles.input} placeholder="Digite a cidade" value={novo.cidade || ""} onChange={e => setNovo({ ...novo, cidade: e.target.value })} /></Campo>
                <Campo label="Estado"><input style={styles.input} placeholder="Digite o estado" value={novo.estado || ""} onChange={e => setNovo({ ...novo, estado: e.target.value })} /></Campo>
                <div style={styles.editSectionLabel}>Medidas e tamanhos</div>
                <Campo label="Tamanho de saia"><input style={styles.input} placeholder="Ex.: 38, M" value={novo.tamanhoSaia || ""} onChange={e => setNovo({ ...novo, tamanhoSaia: e.target.value })} /></Campo>
                <Campo label="Tamanho de vestido"><input style={styles.input} placeholder="Ex.: 38, M" value={novo.tamanhoVestido || ""} onChange={e => setNovo({ ...novo, tamanhoVestido: e.target.value })} /></Campo>
                <Campo label="Tamanho de blusa"><input style={styles.input} placeholder="Ex.: P, M, G" value={novo.tamanhoBlusa || ""} onChange={e => setNovo({ ...novo, tamanhoBlusa: e.target.value })} /></Campo>
                <Campo label="Busto"><input style={styles.input} placeholder="Medida do busto" value={novo.busto || ""} onChange={e => setNovo({ ...novo, busto: e.target.value })} /></Campo>
                <Campo label="Cintura"><input style={styles.input} placeholder="Medida da cintura" value={novo.cintura || ""} onChange={e => setNovo({ ...novo, cintura: e.target.value })} /></Campo>
                <Campo label="Quadril"><input style={styles.input} placeholder="Medida do quadril" value={novo.quadril || ""} onChange={e => setNovo({ ...novo, quadril: e.target.value })} /></Campo>
                <div style={styles.createActions}><button style={styles.primaryBtnCreate} onClick={criarCliente}>Criar cliente</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {creditoAberto && selected && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 3200 }} onClick={() => setCreditoAberto(false)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Adicionar crédito</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{selected.nome}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setCreditoAberto(false)}>×</button>
            </div>
            <div style={styles.creditBalanceBox}>
              <span style={styles.creditLabel}>Crédito atual</span>
              <strong style={styles.creditValue}>{formatarMoeda(selected.creditoDisponivel)}</strong>
            </div>
            <Campo label="Valor do novo crédito">
              <input
                style={styles.input}
                inputMode="decimal"
                placeholder="Ex.: 25,00"
                value={novoCredito}
                onChange={e => setNovoCredito(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void salvarNovoCredito() }}
              />
            </Campo>
            <div style={styles.helperText}>O valor informado será somado ao crédito já disponível. Depois, esse saldo poderá ser descontado de uma venda.</div>
            <div className="clientes-modal-actions">
              <button style={styles.secondaryBtn} disabled={salvandoCredito} onClick={() => setCreditoAberto(false)}>Cancelar</button>
              <button style={styles.primaryBtnSmall} disabled={salvandoCredito} onClick={() => void salvarNovoCredito()}>{salvandoCredito ? "Salvando..." : "Adicionar crédito"}</button>
            </div>
          </div>
        </div>
      )}

      {clienteWhats && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 3100 }} onClick={() => setClienteWhats(null)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Mensagem de WhatsApp</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 5 }}>Para {clienteWhats.nome}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setClienteWhats(null)}>×</button>
            </div>
            <div style={styles.pointsCard}>
              <div style={{ fontSize: 13, color: "#777" }}>Pontuação atual</div>
              <strong style={styles.pointsNumber}>{clienteWhats.pontos} pontos</strong>
              <div style={{ fontSize: 12, color: "#888", marginTop: 5 }}>
                {calc(clienteWhats.pontos).cupons} cupom(ns) disponível(is) · {calc(clienteWhats.pontos).resto}/10 para o próximo
              </div>
            </div>
            <Campo label="Personalize a mensagem">
              <textarea value={mensagemWhats} onChange={e => setMensagemWhats(e.target.value)} rows={6} style={styles.textarea} />
            </Campo>
            <div style={styles.helperText}>Variáveis automáticas: {"{nome}"}, {"{pontos}"}, {"{cupons}"} e {"{resto}"}.</div>
            <div className="clientes-modal-actions">
              <button style={styles.secondaryBtn} onClick={() => setClienteWhats(null)}>Cancelar</button>
              <button style={styles.whatsBtn} onClick={enviarWhatsPersonalizado}>Abrir no WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {inativosAberto && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 2800 }} onClick={() => setInativosAberto(false)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Clientes inativos</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Clientes sem compras nos últimos 30 dias.</div>
              </div>
              <button type="button" style={styles.closeBtn} onClick={() => setInativosAberto(false)}>×</button>
            </div>
            <div style={{ maxHeight: "48vh", overflowY: "auto", marginTop: 12 }}>
              {clientesInativos.map(cliente => {
                const ultima = compras.filter(compra => compra.clienteid === cliente.id && compra.ativo !== false).sort((a, b) => new Date(b.criadoem).getTime() - new Date(a.criadoem).getTime())[0]
                return (
                  <div key={cliente.id} style={styles.inativosItem}>
                    <div style={{ minWidth: 0 }}>
                      <strong>{cliente.nome}</strong>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Última compra: {ultima ? formatarData(ultima.criadoem) : "Nunca"}</div>
                    </div>
                    <button type="button" style={styles.whatsBtn} onClick={() => abrirMensagemClienteInativo(cliente)}>WhatsApp</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {clienteInativoWhats && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 2900 }} onClick={() => setClienteInativoWhats(null)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Mensagem de WhatsApp</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Para {clienteInativoWhats.nome}</div>
              </div>
              <button type="button" style={styles.closeBtn} onClick={() => setClienteInativoWhats(null)}>×</button>
            </div>
            <Campo label="Edite a mensagem antes de enviar">
              <textarea value={mensagemInativo} onChange={e => setMensagemInativo(e.target.value)} rows={5} style={styles.textarea} />
            </Campo>
            <div className="clientes-modal-actions">
              <button type="button" style={styles.secondaryBtn} onClick={() => setClienteInativoWhats(null)}>Cancelar</button>
              <button type="button" style={styles.whatsBtn} onClick={enviarMensagemClienteInativo}>Abrir no WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {cuponsAberto && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 2900 }} onClick={() => setCuponsAberto(false)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Clientes com cupom</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Personalize a mensagem e abra a conversa no WhatsApp.</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setCuponsAberto(false)}>×</button>
            </div>
            <Campo label="Mensagem para clientes com cupom">
              <textarea value={mensagemCupons} onChange={e => setMensagemCupons(e.target.value)} style={styles.textarea} />
            </Campo>
            <div style={styles.helperText}>Variáveis automáticas: {"{nome}"}, {"{cupons}"} e {"{resto}"}.</div>
            <div className="cupons-clientes-list" style={{ marginTop: 14 }}>
              {clientesComCupom.length ? [...clientesComCupom].sort((a, b) => b.pontos - a.pontos).map(cliente => {
                const { cupons, resto } = calc(cliente.pontos)
                return (
                  <div key={cliente.id} className="cupons-cliente-item">
                    <button type="button" onClick={() => { setCuponsAberto(false); setSelected(cliente); setForm({ ...cliente }) }} style={styles.couponCustomerLink}>
                      <div className="cupons-cliente-nome">{cliente.nome}</div>
                      <div className="cupons-cliente-pontos" style={{ marginTop: 5, whiteSpace: "normal" }}>{cupons} cupom(ns) disponível(is) · {resto}/10 pontos</div>
                    </button>
                    <button type="button" onClick={() => enviarWhatsCupom(cliente)} style={styles.whatsBtn}>WhatsApp</button>
                  </div>
                )
              }) : <div style={styles.emptyState}>Nenhum cliente possui cupom no momento.</div>}
            </div>
          </div>
        </div>
      )}

      {relatorioAberto && selected && (
        <div className="cliente-modal-overlay" style={{ ...styles.overlay, zIndex: 3000 }} onClick={() => setRelatorioAberto(false)}>
          <div className="cliente-modal" style={{ ...styles.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 className="cliente-modal-title" style={styles.modalTitle}>Relatório</h2>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{selected.nome}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setRelatorioAberto(false)}>×</button>
            </div>
            <div className="relatorio-texto">{relatorioTexto}</div>
            <div className="clientes-modal-actions">
              <button style={styles.secondaryBtn} onClick={() => baixarRelatorio(selected)}>Baixar relatório</button>
              <button style={styles.primaryBtnSmall} onClick={() => setRelatorioAberto(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div style={styles.info}><span style={styles.mutedSmall}>{label}</span><div style={styles.infoValue}>{value}</div></div>
}

const styles: Record<string, CSSProperties> = {
  container: { width: "100%", minWidth: 0, boxSizing: "border-box" as const, background: "#f6f6f7", fontFamily: "Inter, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 28, flexWrap: "wrap" as const },
  title: { fontSize: 32, fontWeight: 500, margin: 0 },
  primaryBtn: { padding: "11px 19px", borderRadius: 11, border: "1px solid #a98742", background: "linear-gradient(135deg,#c7a65b,#ad8a45)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 3px 8px rgba(143,112,48,.12)", whiteSpace: "nowrap" as const, transition: "all .2s ease" },
  primaryBtnSmall: { padding: "10px 18px", borderRadius: 11, border: "1px solid #a98742", background: "#b9974f", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const },
  primaryBtnCreate: { padding: "12px 24px", minWidth: 160, borderRadius: 11, border: "1px solid #a98742", background: "linear-gradient(135deg,#c7a65b,#ad8a45)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: "0 3px 8px rgba(143,112,48,.12)" },
  secondaryBtn: { padding: "10px 16px", borderRadius: 10, border: "1px solid #e5e0d4", background: "#fff", color: "#625b4d", cursor: "pointer", whiteSpace: "nowrap" as const },
  inativosBar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const, marginBottom: 12, padding: "8px 12px", border: "none", borderRadius: 10, background: "#fff6d6", color: "#333", boxSizing: "border-box" as const, fontSize: 13 },
  inativosBtn: { padding: "4px 8px", border: "none", borderRadius: 6, background: "transparent", color: "#b8962e", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" as const },
  inativosItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee", flexWrap: "wrap" as const },
  whatsBtn: { padding: "10px 16px", borderRadius: 10, border: "1px solid #d8e8d9", background: "#f0f8f0", color: "#347548", cursor: "pointer", whiteSpace: "nowrap" as const, fontSize: 13, fontWeight: 500 },
  deleteBtn: { padding: "10px 16px", borderRadius: 10, border: "1px solid #ead6d6", background: "#fffafa", color: "#a35f5f", cursor: "pointer", whiteSpace: "nowrap" as const },
  input: { padding: 12, borderRadius: 10, border: "1px solid #e5e2dc", width: "100%", minWidth: 0, boxSizing: "border-box" as const, background: "#fff", outline: "none", font: "inherit" },
  inputSpacing: { padding: 12, borderRadius: 10, border: "1px solid #e5e2dc", width: "100%", minWidth: 0, boxSizing: "border-box" as const, background: "#fff", outline: "none", font: "inherit", marginBottom: 12 },
  textarea: { padding: 12, borderRadius: 10, border: "1px solid #e5e2dc", width: "100%", minWidth: 0, boxSizing: "border-box" as const, background: "#fff", outline: "none", font: "inherit", minHeight: 88, resize: "vertical" as const, lineHeight: 1.5 },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#756443", marginBottom: 6, marginTop: 2 },
  select: { padding: 12, borderRadius: 10, border: "1px solid #e5e2dc", flex: 1, minWidth: 140, background: "#fff", boxSizing: "border-box" as const },
  couponDashboard: { border: "1px solid #e6d8b6", background: "#fbf6e9", borderRadius: 16, color: "#80652e" },
  card: { background: "#fff", padding: 18, borderRadius: 16, border: "1px solid #eee", cursor: "pointer", transition: ".25s", position: "relative" as const, minWidth: 0, boxSizing: "border-box" as const },
  rank: { position: "absolute" as const, top: 12, right: 12, color: "#b8962e", fontSize: 13, fontWeight: 600 },
  name: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, paddingRight: 35, color: "#333" },
  muted: { color: "#888", fontSize: 12, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  mutedSmall: { fontSize: 12, color: "#999" },
  coupon: { margin: "10px 0", color: "#9b7b36", fontSize: 14, fontWeight: 500 },
  progressBg: { height: 6, background: "#eee", borderRadius: 999, overflow: "hidden" as const },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#b9974f,#e7d39c)", borderRadius: 999 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(25,23,18,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" as const, zIndex: 2000 },
  modal: { background: "#fff", padding: 24, borderRadius: 18, width: "100%", maxWidth: 470, maxHeight: "calc(100vh - 32px)", overflowY: "auto" as const, boxShadow: "0 20px 60px rgba(0,0,0,.14)", boxSizing: "border-box" as const },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, marginBottom: 16 },
  modalTitle: { margin: 0, fontSize: 24, fontWeight: 500, color: "#292929" },
  closeBtn: { width: 34, height: 34, minWidth: 34, borderRadius: 50, border: "1px solid #eee", background: "#fafafa", color: "#777", fontSize: 24, lineHeight: 1, cursor: "pointer" },
  pointsCard: { background: "#fcfbf7", border: "1px solid #eee6d2", borderRadius: 14, padding: 14, marginBottom: 18 },
  pointsCardGold: { background: "#fffdf8", border: "1px solid #eee3c9" },
  creditCard: { display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, padding: "9px 12px", marginBottom: 16, border: "1px solid #eee3c9", borderRadius: 9, background: "#fffdf8", flexWrap: "wrap" as const },
  newCreditBtn: { padding: "10px 16px", borderRadius: 10, border: "1px solid #e6d8b6", background: "#fbf6e9", color: "#80652e", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" as const },
  creditLabel: { display: "inline" as const, fontSize: 12, fontWeight: 500, color: "#80652e", marginBottom: 0 },
  creditValue: { display: "inline" as const, fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: "#8f7131" },
  creditBalanceBox: { padding: 14, marginBottom: 18, borderRadius: 12, background: "#fbf6e9", border: "1px solid #e6d8b6" },
  pointsTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 },
  pointsLabel: { fontSize: 13, color: "#777" },
  pointsNumber: { fontSize: 18, color: "#9b7b36", display: "block" as const, marginTop: 3 },
  editPointsBtn: { display: "flex", alignItems: "center", justifyContent: "center", padding: 4, border: "none", background: "transparent", color: "#9b7b36", cursor: "pointer", fontSize: 18 },
  progressBgLarge: { height: 8, background: "#eee", borderRadius: 999, overflow: "hidden" as const },
  pointsBottom: { display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8, fontSize: 11, color: "#888" },
  pointsEditor: { marginTop: 12, padding: 12, background: "#fff", border: "1px solid #eee6d2", borderRadius: 10 },
  pointsEditorLabel: { fontSize: 11, color: "#8c713b", fontWeight: 600, marginBottom: 8 },
  referenceText: { fontSize: 13, color: "#888", marginTop: -8, marginBottom: 16 },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 14, fontWeight: 600, color: "#9b7b36", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #eee" },
  editIcon: { padding: "5px 9px", borderRadius: 8, border: "1px solid #eadfbf", background: "#fffaf0", color: "#8f7131", cursor: "pointer", fontSize: 12 },
  editSectionLabel: { fontSize: 14, fontWeight: 600, color: "#9b7b36", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #eee6d2" },
  info: { marginBottom: 12, minWidth: 0 },
  infoValue: { marginTop: 3, wordBreak: "break-word" as const, fontSize: 14, color: "#333" },
  createActions: { display: "flex", justifyContent: "center", marginTop: 8 },
  helperText: { fontSize: 12, color: "#888", lineHeight: 1.6, marginTop: -5 },
  couponCustomerLink: { flex: 1, minWidth: 0, padding: 0, border: "none", background: "transparent", textAlign: "left" as const, cursor: "pointer" },
  emptyState: { padding: "22px 10px", textAlign: "center" as const, color: "#888", fontSize: 14 },
  referenceBox: { marginBottom: 14, padding: "10px 12px", background: "#fafafa", border: "1px solid #eee", borderRadius: 8 }
}
