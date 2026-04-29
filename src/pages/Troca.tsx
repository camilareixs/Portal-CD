import { useState } from "react"

type Resgate={
 id:string
 cliente:string
 cpf:string
 data:Date
 tipo:string
 status:string
}

export default function Trocas(){

 const [modal,setModal]=useState(false)

 const [resgates]=useState<Resgate[]>([
  {id:"1",cliente:"Ana Souza",cpf:"111",data:new Date(2026,2,12),tipo:"Cupom 150",status:"Concluído"},
  {id:"2",cliente:"Mariana Lima",cpf:"222",data:new Date(2026,1,3),tipo:"Desconto",status:"Concluído"},
  {id:"3",cliente:"Fernanda Alves",cpf:"444",data:new Date(2026,0,18),tipo:"Brinde",status:"Concluído"}
 ])

 const totalMes=resgates.length
 const clientesElegiveis=4
 const cuponsAtivos=2

 const agrupados=resgates.reduce((acc:any,r)=>{
  const chave=`${r.data.getFullYear()}-${r.data.getMonth()}`
  if(!acc[chave]) acc[chave]=[]
  acc[chave].push(r)
  return acc
 },{})

 const mesesOrdenados=Object.keys(agrupados).sort((a,b)=>b.localeCompare(a))

 return(

  <div>

   {/* HEADER */}
   <div style={header}>
    <div>
     <h1 style={title}>Trocas</h1>
     <span style={sub}>Resgate de fidelidade</span>
    </div>

    <button style={novoBtn} onClick={()=>setModal(true)}>
     Resgatar Fidelidade
    </button>
   </div>

   {/* DASH */}
   <div style={dashGrid}>
    <Dash label="Resgates no mês" value={totalMes}/>
    <Dash label="Cupons ativos" value={cuponsAtivos}/>
    <Dash label="Clientes elegíveis" value={clientesElegiveis}/>
   </div>

   {/* TIMELINE */}
   {mesesOrdenados.map(m=>{

    const lista=agrupados[m]
    const [ano,mes]=m.split("-")

    const nomeMes=new Date(Number(ano),Number(mes))
     .toLocaleString("pt-BR",{month:"long"})

    return(

     <div key={m} style={{marginBottom:36}}>

      <h2 style={mesTitulo}>
       {nomeMes.toUpperCase()} {ano}
      </h2>

      <div style={cardMes}>
       {lista.map((r:Resgate)=>(
        <div key={r.id} style={row}>

         <div>
          <strong>{r.cliente}</strong>
          <div style={cpfTxt}>{r.cpf}</div>
         </div>

         <div>{r.data.toLocaleDateString()}</div>
         <div>{r.tipo}</div>
         <Status status={r.status}/>

        </div>
       ))}
      </div>

     </div>

    )

   })}

   {/* MODAL */}
   {modal && (
    <div style={overlay}>
     <div style={modalCard}>

      <div style={modalHead}>
       <h2 style={{fontFamily:"Playfair Display"}}>Resgatar Fidelidade</h2>
       <button style={close} onClick={()=>setModal(false)}>✕</button>
      </div>

      <input placeholder="Nome Cliente" style={input}/>

      <div style={{marginTop:10}}>
       Pontos atuais: <strong>10</strong>
      </div>

      <select style={input}>
       <option>Cupom 150</option>
       <option>Desconto</option>
       <option>Brinde</option>
      </select>

      <button style={save}>
       Confirmar Resgate
      </button>

     </div>
    </div>
   )}

  </div>

 )
}

function Dash({label,value}:{label:string,value:any}){
 return(
  <div style={dashCard}>
   <span style={dashLabel}>{label}</span>
   <strong style={dashValue}>{value}</strong>
  </div>
 )
}

function Status({status}:{status:string}){
 return(
  <span style={{
   background:"#ececec",
   padding:"4px 12px",
   borderRadius:999,
   fontSize:12
  }}>
   {status}
  </span>
 )
}

/* styles iguais compras */

const header={display:"flex",justifyContent:"space-between",marginBottom:30}
const title={fontFamily:"Playfair Display",fontSize:42,margin:0}
const sub={color:"#8a8a8a"}

const novoBtn={
    background:"linear-gradient(135deg,#d4b05f,#b8963a)",
    color:"#fff",
    border:"none",
    padding:"14px 28px",
    borderRadius:12,
    cursor:"pointer"
  }
const dashGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:22,marginBottom:30}
const dashCard={background:"#fff",padding:26,borderRadius:20,border:"1px solid #f1efe9"}
const dashLabel={fontSize:13,color:"#9a978f",marginBottom:6,display:"block"}
const dashValue={fontSize:30,fontFamily:"Playfair Display"}

const mesTitulo={fontFamily:"Playfair Display",marginBottom:10}
const cardMes={background:"#fff",borderRadius:18,overflow:"hidden",border:"1px solid #f3f1ea"}

const row={display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:18,borderTop:"1px solid #f5f3ed",alignItems:"center"}

const cpfTxt={fontSize:12,color:"#aaa"}

const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center"}
const modalCard={background:"#fff",padding:34,borderRadius:20,width:420}

const modalHead={display:"flex",justifyContent:"space-between"}
const close={border:"none",background:"transparent",fontSize:20,cursor:"pointer"}

const input={width:"100%",padding:13,marginTop:12,borderRadius:10,border:"1px solid #ddd"}

const save={marginTop:20,width:"100%",padding:14,background:"#c6a75e",color:"#fff",border:"none",borderRadius:10}