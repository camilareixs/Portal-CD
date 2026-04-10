import { useState } from "react"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
  cidade: string
  estado: string
}

export default function Clientes(){

  const [clientes,setClientes] = useState<Cliente[]>([
    {id:"1",nome:"Ana Souza",cpf:"111",celular:"9999",pontos:8,cidade:"São Paulo",estado:"SP"},
    {id:"2",nome:"Mariana Lima",cpf:"222",celular:"8888",pontos:2,cidade:"Santo André",estado:"SP"},
    {id:"3",nome:"Carla Mendes",cpf:"333",celular:"7777",pontos:10,cidade:"Rio",estado:"RJ"}
  ])

  const [modal,setModal] = useState(false)
  const [hovered,setHovered] = useState<string|null>(null)

  const [busca,setBusca] = useState("")
  const [estadoFiltro,setEstadoFiltro] = useState("")
  const [cidadeFiltro,setCidadeFiltro] = useState("")
  const [sortDesc,setSortDesc] = useState(true)

  const [nome,setNome] = useState("")
  const [cpf,setCpf] = useState("")
  const [celular,setCelular] = useState("")
  const [cidade,setCidade] = useState("")
  const [estado,setEstado] = useState("")

  function cadastrar(){

    if(!nome || !cpf) return

    setClientes([
      ...clientes,
      {
        id:Date.now().toString(),
        nome,
        cpf,
        celular,
        cidade,
        estado,
        pontos:0
      }
    ])

    setModal(false)
    setNome("")
    setCpf("")
    setCelular("")
    setCidade("")
    setEstado("")
  }

  const lista = clientes
    .filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf.includes(busca)
    )
    .filter(c => !estadoFiltro || c.estado === estadoFiltro)
    .filter(c => !cidadeFiltro || c.cidade === cidadeFiltro)
    .sort((a,b)=> sortDesc ? b.pontos-a.pontos : a.pontos-b.pontos)

  const totalClientes = clientes.length
  const proximos = clientes.filter(c=>c.pontos>=8 && c.pontos<10).length
  const cupons = clientes.filter(c=>c.pontos>=10).length

  return(
    <div>

      {/* HEADER */}
      <div style={header}>
        <div>
          <h1 style={title}>Clientes</h1>
          <span style={subtitle}>Fidelidade e relacionamento</span>
        </div>

        <button style={novoBtn} onClick={()=>setModal(true)}>
          Novo Cliente
        </button>
      </div>

      {/* SUMMARY */}
      <div style={summaryGrid}>
        <SummaryCard label="Total Clientes" value={totalClientes}/>
        <SummaryCard label="Próximos do Resgate" value={proximos}/>
        <SummaryCard label="Cupons Disponíveis" value={cupons}/>
      </div>

      {/* FILTROS */}
      <div style={filters}>
        <input
          placeholder="Buscar cliente"
          value={busca}
          onChange={e=>setBusca(e.target.value)}
          style={search}
        />

        <select
          value={estadoFiltro}
          onChange={e=>setEstadoFiltro(e.target.value)}
          style={dropdown}
        >
          <option value="">Estado</option>
          <option>SP</option>
          <option>RJ</option>
          <option>MG</option>
        </select>

        <input
          placeholder="Cidade"
          value={cidadeFiltro}
          onChange={e=>setCidadeFiltro(e.target.value)}
          style={filter}
        />
      </div>

      {/* TABELA */}
      <div style={table}>
        <div style={tableHeader}>
          <span>Nome</span>
          <span>CPF</span>
          <span>Celular</span>
          <span onClick={()=>setSortDesc(!sortDesc)} style={{cursor:"pointer"}}>Pontos</span>
          <span>Status</span>
          <span>Cidade</span>
          <span></span>
        </div>

        {lista.map(c=>{

          const status =
            c.pontos >= 10
              ? "Cupom disponível"
              : c.pontos >= 8
              ? "Quase lá"
              : "Acumulando"

          return(
            <div
              key={c.id}
              style={{
                ...row,
                background:hovered===c.id ? "#faf9f6" : "#fff"
              }}
              onMouseEnter={()=>setHovered(c.id)}
              onMouseLeave={()=>setHovered(null)}
            >
              <span>{c.nome}</span>
              <span>{c.cpf}</span>
              <span>{c.celular}</span>

              <CircularPoints pontos={c.pontos}/>

              <StatusBadge status={status}/>
              <span>{c.cidade}</span>

              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span>{c.estado}</span>

                {hovered===c.id && (
                  <button style={actionBtn}>
                    Lançar
                  </button>
                )}
              </div>

            </div>
          )
        })}
      </div>

      {/* MODAL */}
      {modal && (
        <div style={overlay}>
          <div style={modalCard}>
            <h2 style={{fontFamily:"Playfair Display"}}>Novo Cliente</h2>

            <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} style={input}/>
            <input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)} style={input}/>
            <input placeholder="Celular" value={celular} onChange={e=>setCelular(e.target.value)} style={input}/>
            <input placeholder="Cidade" value={cidade} onChange={e=>setCidade(e.target.value)} style={input}/>
            <input placeholder="Estado" value={estado} onChange={e=>setEstado(e.target.value)} style={input}/>

            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button style={cancelBtn} onClick={()=>setModal(false)}>Cancelar</button>
              <button style={saveBtn} onClick={cadastrar}>Cadastrar</button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

/* COMPONENTES */

function SummaryCard({label,value}:{label:string,value:number}){
  return(
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  )
}

function CircularPoints({pontos}:{pontos:number}){

  const deg = pontos * 36

  return(
    <div style={{
      width:42,
      height:42,
      borderRadius:"50%",
      background:`conic-gradient(#c6a75e ${deg}deg,#eee ${deg}deg)`,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      fontSize:11,
      fontWeight:600
    }}>
      {pontos}
    </div>
  )
}

function StatusBadge({status}:{status:string}){

  const map:any={
    "Acumulando":"#efefef",
    "Quase lá":"#f3e7c7",
    "Cupom disponível":"#d4b05f"
  }

  return(
    <span style={{
      background:map[status],
      padding:"3px 9px",
      borderRadius:999,
      fontSize:10,
      width:"fit-content"
    }}>
      {status}
    </span>
  )
}

/* STYLES */

const header={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:30}
const title={fontFamily:"Playfair Display",fontSize:42,margin:0}
const subtitle={color:"#8a8a8a"}

const novoBtn={
  background:"linear-gradient(135deg,#d4b05f,#b8963a)",
  color:"#fff",
  border:"none",
  padding:"14px 28px",
  borderRadius:12,
  cursor:"pointer"
}

const summaryGrid={
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
  gap:22,
  marginBottom:36
}

const summaryCard={
  background:"#fff",
  padding:"26px 28px",
  borderRadius:20,
  border:"1px solid #f1efe9",
  minHeight:110,
  display:"flex",
  flexDirection:"column",
  justifyContent:"center"
}

const summaryLabel={fontSize:13,color:"#9a978f",marginBottom:10}
const summaryValue={fontSize:34,fontFamily:"Playfair Display"}

const filters={display:"flex",gap:14,flexWrap:"wrap",marginBottom:30}

const search={flex:1,padding:14,borderRadius:12,border:"1px solid #e7e4db"}
const filter={minWidth:160,padding:14,borderRadius:12,border:"1px solid #e7e4db"}

const dropdown={padding:14,borderRadius:12,border:"1px solid #e7e4db",background:"#fff"}

const table={background:"#fff",borderRadius:22,overflow:"hidden",border:"1px solid #f2efe8"}

const tableHeader={
  display:"grid",
  gridTemplateColumns:"2fr 1.2fr 1.2fr 80px 1.3fr 1.3fr 1fr",
  padding:"18px 24px",
  background:"#fbf8ef",
  fontWeight:600,
  fontSize:13,
  color:"#6f6a5f"
}

const row={
  display:"grid",
  gridTemplateColumns:"2fr 1.2fr 1.2fr 80px 1.3fr 1.3fr 1fr",
  padding:"18px 24px",
  borderTop:"1px solid #f3f2ef",
  alignItems:"center",
  transition:"0.2s"
}

const actionBtn={
  background:"#c6a75e",
  border:"none",
  color:"#fff",
  padding:"6px 12px",
  borderRadius:8,
  fontSize:11,
  cursor:"pointer"
}

const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center"}
const modalCard={background:"#fff",padding:40,borderRadius:20,width:420}

const input={width:"100%",padding:14,marginTop:12,borderRadius:10,border:"1px solid #ddd"}

const cancelBtn={flex:1,padding:14,background:"#eee",border:"none",borderRadius:10}
const saveBtn={flex:1,padding:14,background:"#c6a75e",color:"#fff",border:"none",borderRadius:10}