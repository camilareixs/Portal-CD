import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
id: string
nome: string
cpf: string
celular: string
pontos: number
}

type Resgate = {
id: string
clienteid: string
cupomnumero: number
tipo: string
valorcupom: number
criadoem: string
}

export default function Trocas() {
const [clientes, setClientes] = useState<Cliente[]>([])
const [resgates, setResgates] = useState<Resgate[]>([])

async function fetchClientes() {
const { data, error } = await supabase
.from("clientes")
.select("id,nome,cpf,celular,pontos")
.order("nome")

if (error) {
  alert("Erro clientes: " + error.message)
  return
}

setClientes(
  (data || []).map((c: any) => ({
    id: String(c.id),
    nome: c.nome || "",
    cpf: c.cpf || "",
    celular: c.celular || "",
    pontos: Number(c.pontos || 0)
  }))
)


}

async function fetchTrocas() {
const { data, error } = await supabase
.from("trocas")
.select("*")
.order("criadoem", { ascending: false })


if (error) {
  alert("Erro trocas: " + error.message)
  return
}

setResgates(
  (data || []).map((r: any) => ({
    id: String(r.id),
    clienteid: String(r.clienteid),
    cupomnumero: Number(r.cupomnumero || 0),
    tipo: r.tipo || "Cupom Fidelidade",
    valorcupom: Number(r.valorcupom || 150),
    criadoem: r.criadoem || ""
  }))
)


}

useEffect(() => {
fetchClientes()
fetchTrocas()
}, [])

function getCliente(clienteid: string) {
return clientes.find(c => c.id === clienteid)
}

const totalMes = resgates.filter(r => {
const d = new Date(r.criadoem)
const hoje = new Date()
return (
d.getMonth() === hoje.getMonth() &&
d.getFullYear() === hoje.getFullYear()
)
}).length

const clientesElegiveis = clientes.filter(
c => c.pontos >= 10
).length

const cuponsAtivos = clientes.reduce(
(acc, c) => acc + Math.floor(c.pontos / 10),
0
)

const agrupados = resgates.reduce((acc: any, r) => {
const data = new Date(r.criadoem)
const chave = `${data.getFullYear()}-${data.getMonth()}`


if (!acc[chave]) acc[chave] = []

acc[chave].push(r)

return acc


}, {})

const mesesOrdenados = Object.keys(agrupados).sort(
(a, b) => b.localeCompare(a)
)

return ( <div style={container}> <div style={header}> <div> <h1 style={title}>Trocas</h1> <span style={sub}>
Histórico automático de cupons utilizados </span> </div> </div>


  <div style={dashGrid}>
    <Dash label="Resgates no mês" value={totalMes} />
    <Dash label="Cupons ativos" value={cuponsAtivos} />
    <Dash
      label="Clientes elegíveis"
      value={clientesElegiveis}
    />
  </div>

  {mesesOrdenados.map(m => {
    const lista = agrupados[m]
    const [ano, mes] = m.split("-")

    const nomeMes = new Date(
      Number(ano),
      Number(mes)
    ).toLocaleString("pt-BR", {
      month: "long"
    })

    return (
      <div key={m} style={{ marginBottom: 36 }}>
        <h2 style={mesTitulo}>
          {nomeMes.toUpperCase()} {ano}
        </h2>

        <div style={card}>
          {lista.map((r: Resgate) => {
            const cliente = getCliente(r.clienteid)

            return (
              <div key={r.id} style={row}>
                <div>
                  <strong>
                    {cliente?.nome || "Cliente"}
                  </strong>
                  <div style={muted}>
                    {cliente?.cpf || "-"}
                  </div>
                </div>

                <div>
                  {new Date(
                    r.criadoem
                  ).toLocaleDateString("pt-BR")}
                </div>

                <div>
                  Cupom #{r.cupomnumero}
                </div>

                <div style={checkWrap}>
                  <span style={checkIcon}>✓</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  })}
</div>


)
}

function Dash({ label, value }: any) {
return ( <div style={dash}> <span style={dashLabel}>{label}</span> <strong style={dashValue}>{value}</strong> </div>
)
}

const container = {
padding: 40,
background: "#f6f6f7",
fontFamily: "Inter"
}

const header = {
display: "flex",
justifyContent: "space-between",
marginBottom: 30
}

const title = {
fontSize: 34,
margin: 0,
fontWeight: 600
}

const sub = {
color: "#777",
fontSize: 13
}

const dashGrid = {
display: "grid",
gridTemplateColumns: "repeat(3,1fr)",
gap: 10,
marginBottom: 25
}

const dash = {
background: "#fff",
padding: 16,
borderRadius: 12
}

const dashLabel = {
fontSize: 12,
color: "#777",
display: "block"
}

const dashValue = {
fontSize: 24
}

const mesTitulo = {
fontSize: 16,
marginBottom: 10,
fontWeight: 600
}

const card = {
background: "#fff",
borderRadius: 12,
overflow: "hidden"
}

const row = {
display: "grid",
gridTemplateColumns: "2fr 1fr 1fr 80px",
padding: 14,
borderTop: "1px solid #eee",
alignItems: "center"
}

const muted = {
fontSize: 12,
color: "#999"
}

const checkWrap = {
display: "flex",
justifyContent: "center"
}

const checkIcon = {
width: 28,
height: 28,
borderRadius: "50%",
background: "#22c55e",
color: "white",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontWeight: 700
}
