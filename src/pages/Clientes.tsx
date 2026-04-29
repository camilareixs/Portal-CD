import { useState } from "react"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
  cidade: string
  estado: string
  rua: string
  criadoEm: string
}

export default function Clientes(){

  const [clientes,setClientes] = useState<Cliente[]>([
    {id:"1",nome:"Ana Souza",cpf:"111",celular:"9999",pontos:18,cidade:"São Paulo",estado:"SP",rua:"Rua A",criadoEm:"2024-01-10"},
    {id:"2",nome:"Mariana Lima",cpf:"222",celular:"8888",pontos:2,cidade:"Santo André",estado:"SP",rua:"Rua B",criadoEm:"2024-02-02"},
    {id:"3",nome:"Carla Mendes",cpf:"333",celular:"7777",pontos:27,cidade:"Rio",estado:"RJ",rua:"Rua C",criadoEm:"2024-03-15"}
  ])

  const [busca,setBusca] = useState("")
  const [cidadeFiltro,setCidadeFiltro] = useState("")
  const [estadoFiltro,setEstadoFiltro] = useState("")
  const [ordenacao,setOrdenacao] = useState("ranking")

  const [selected,setSelected] = useState<Cliente | null>(null)
  const [editing,setEditing] = useState(false)
  const [creating,setCreating] = useState(false)

  const [form,setForm] = useState<Partial<Cliente>>({})
  const [novo,setNovo] = useState<Partial<Cliente>>({})

  function calc(pontos:number){
    return {
      cupons: Math.floor(pontos/10),
      resto: pontos % 10
    }
  }

  const cidades = Array.from(new Set(clientes.map(c=>c.cidade)))
  const estados = Array.from(new Set(clientes.map(c=>c.estado)))

  let lista = [...clientes]

  if(ordenacao === "ranking" || ordenacao === "pontos"){
    lista.sort((a,b)=>b.pontos - a.pontos)
  }

  if(ordenacao === "alfabetica"){
    lista.sort((a,b)=>a.nome.localeCompare(b.nome))
  }

  lista = lista
    .filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter(c => !cidadeFiltro || c.cidade === cidadeFiltro)
    .filter(c => !estadoFiltro || c.estado === estadoFiltro)

  function salvarEdicao(){
    if(!selected) return
    setClientes(clientes.map(c => c.id === selected.id ? {...c,...form} : c))
    setEditing(false)
    setSelected(null)
  }

  function criarCliente(){
    if(!novo.nome) return

    setClientes([
      {
        id: Date.now().toString(),
        nome: novo.nome || "",
        cpf: novo.cpf || "",
        celular: novo.celular || "",
        cidade: novo.cidade || "",
        estado: novo.estado || "",
        rua: novo.rua || "",
        pontos: 0,
        criadoEm: new Date().toISOString().split("T")[0]
      },
      ...clientes
    ])

    setCreating(false)
    setNovo({})
  }

  return(
    <div style={container}>

      {/* HEADER */}
      <div style={header}>
        <h1 style={title}>Clientes</h1>

        <button
          style={primaryBtn}
          onClick={()=>setCreating(true)}
          onMouseEnter={e=>e.currentTarget.style.background="#fff3c4"}
          onMouseLeave={e=>e.currentTarget.style.background="#fffbe6"}
        >
          Novo cliente
        </button>
      </div>

      {/* FILTROS */}
      <div style={filters}>
        <input
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e=>setBusca(e.target.value)}
          style={{...input,flex:2}}
        />

        <select value={cidadeFiltro} onChange={e=>setCidadeFiltro(e.target.value)} style={select}>
          <option value="">Cidade</option>
          {cidades.map(c=><option key={c}>{c}</option>)}
        </select>

        <select value={estadoFiltro} onChange={e=>setEstadoFiltro(e.target.value)} style={select}>
          <option value="">Estado</option>
          {estados.map(e=><option key={e}>{e}</option>)}
        </select>

        <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} style={select}>
          <option value="ranking">Ranking</option>
          <option value="alfabetica">A–Z</option>
          <option value="pontos">Pontos</option>
        </select>
      </div>

      {/* GRID */}
      <div style={grid}>
        {lista.map((c,index)=>{

          const {cupons,resto} = calc(c.pontos)
          const pct = (resto/10)*100

          return(
            <div key={c.id} style={card} onClick={()=>{setSelected(c);setForm(c)}}>

              {ordenacao === "ranking" && index < 3 && (
                <span style={rank}>#{index+1}</span>
              )}

              <div style={name}>{c.nome}</div>
              <div style={muted}>{c.cidade}</div>

              <div style={coupon}>🎟 {cupons}</div>

              <div style={progressBg}>
                <div style={{...progressFill,width:`${pct}%`}}/>
              </div>

              <div style={mutedSmall}>{resto}/10</div>

            </div>
          )
        })}
      </div>

      {/* MODAL */}
      {(selected || creating) && (
        <div style={overlay} onClick={()=>{setSelected(null);setCreating(false);setEditing(false)}}>

          <div style={modal} onClick={e=>e.stopPropagation()}>

            {/* DETALHES */}
            {selected && !editing && (
              <>
                <h2 style={modalTitle}>{selected.nome}</h2>

                <Info label="CPF" value={selected.cpf}/>
                <Info label="Celular" value={selected.celular}/>
                <Info label="Rua" value={selected.rua}/>
                <Info label="Cidade" value={selected.cidade}/>
                <Info label="Estado" value={selected.estado}/>

                <div style={modalActions}>
                  <button style={secondaryBtn} onClick={()=>setEditing(true)}>Editar</button>
                  <button style={primaryBtnSmall}>Nova compra</button>
                </div>
              </>
            )}

            {/* EDITAR */}
            {selected && editing && (
              <>
                <h2 style={modalTitle}>Editar cliente</h2>

                <input style={inputSpacing} value={form.nome||""} onChange={e=>setForm({...form,nome:e.target.value})}/>
                <input style={inputSpacing} value={form.cpf||""} onChange={e=>setForm({...form,cpf:e.target.value})}/>
                <input style={inputSpacing} value={form.celular||""} onChange={e=>setForm({...form,celular:e.target.value})}/>
                <input style={inputSpacing} value={form.rua||""} onChange={e=>setForm({...form,rua:e.target.value})}/>
                <input style={inputSpacing} value={form.cidade||""} onChange={e=>setForm({...form,cidade:e.target.value})}/>
                <input style={inputSpacing} value={form.estado||""} onChange={e=>setForm({...form,estado:e.target.value})}/>

                <div style={modalActions}>
                  <button style={secondaryBtn} onClick={()=>setEditing(false)}>Cancelar</button>
                  <button style={primaryBtnSmall} onClick={salvarEdicao}>Salvar</button>
                </div>
              </>
            )}

            {/* NOVO */}
            {creating && (
              <>
                <h2 style={modalTitle}>Novo cliente</h2>

                <input style={inputSpacing} placeholder="Nome" onChange={e=>setNovo({...novo,nome:e.target.value})}/>
                <input style={inputSpacing} placeholder="CPF" onChange={e=>setNovo({...novo,cpf:e.target.value})}/>
                <input style={inputSpacing} placeholder="Celular" onChange={e=>setNovo({...novo,celular:e.target.value})}/>
                <input style={inputSpacing} placeholder="Rua" onChange={e=>setNovo({...novo,rua:e.target.value})}/>
                <input style={inputSpacing} placeholder="Cidade" onChange={e=>setNovo({...novo,cidade:e.target.value})}/>
                <input style={inputSpacing} placeholder="Estado" onChange={e=>setNovo({...novo,estado:e.target.value})}/>

                <button style={primaryBtnSmall} onClick={criarCliente}>
                  Criar cliente
                </button>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}

/* COMPONENTE */
function Info({label,value}:{label:string,value:string}){
  return(
    <div style={{marginBottom:12}}>
      <span style={mutedSmall}>{label}</span>
      <div>{value}</div>
    </div>
  )
}

/* ESTILO (mantive o seu) */

const container={padding:"48px",background:"#f9f7f1",fontFamily:"Inter, sans-serif"}
const header={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}
const title={fontSize:32,fontWeight:500,margin:0}

const primaryBtn={padding:"10px 18px",borderRadius:10,border:"1px solid #e6e0c9",background:"#fffbe6",cursor:"pointer",transition:"0.2s"}
const primaryBtnSmall={padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(90deg,#d4af37,#f6e27a)"}
const secondaryBtn={padding:"10px",borderRadius:10,border:"1px solid #ddd",background:"#fff"}

const filters={display:"flex",gap:12,marginBottom:30}

const input={padding:12,borderRadius:10,border:"1px solid #e5e5e5",width:"100%"}
const inputSpacing={...input,marginBottom:12}

const select={padding:12,borderRadius:10,border:"1px solid #e5e5e5",flex:1}

const grid={display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:20}

const card={background:"#fff",padding:18,borderRadius:16,border:"1px solid #eee",cursor:"pointer",position:"relative"}
const rank={position:"absolute",top:12,right:12,fontSize:12,color:"#b8962e"}

const name={fontWeight:500}
const muted={color:"#888",fontSize:13}
const mutedSmall={fontSize:12,color:"#999"}

const coupon={margin:"10px 0",color:"#b8962e"}

const progressBg={height:6,background:"#eee",borderRadius:999,marginBottom:6}
const progressFill={height:"100%",background:"linear-gradient(90deg,#d4af37,#f6e27a)"}

const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}
const modal={background:"#fff",padding:"28px",borderRadius:16,width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.12)"}
const modalTitle={marginBottom:20}
const modalActions={display:"flex",gap:10,marginTop:20}