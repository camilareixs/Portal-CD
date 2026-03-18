import { useState } from "react"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [celular, setCelular] = useState("")

  function cadastrar() {
    if (!nome || !cpf) return

    const existe = clientes.find(c => c.cpf === cpf)
    if (existe) return

    setClientes([
      ...clientes,
      { id: Date.now().toString(), nome, cpf, celular }
    ])

    setNome("")
    setCpf("")
    setCelular("")
  }

  return (
    <div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 50
      }}>
        <h1 style={{
          fontSize: 40,
          margin: 0,
          color: "#111"
        }}>
          Clientes
        </h1>

        <button style={addBtn} onClick={cadastrar}>
          + Nova Cliente
        </button>
      </div>

      {/* FORM LINHA */}
      <div style={{
        display: "flex",
        gap: 15,
        marginBottom: 50
      }}>
        <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} style={input}/>
        <input placeholder="CPF" value={cpf} onChange={e=>setCpf(e.target.value)} style={input}/>
        <input placeholder="Celular" value={celular} onChange={e=>setCelular(e.target.value)} style={input}/>
      </div>

      {/* GRID CLIENTES */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
        gap: 20
      }}>
        {clientes.map(c => (
          <div key={c.id} style={clienteCard}>
            <strong>{c.nome}</strong>
            <p>{c.cpf}</p>
            <p>{c.celular}</p>
          </div>
        ))}
      </div>

    </div>
  )
}

const input = {
  flex: 1,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #e5e5e5",
  background: "#fff"
}

const addBtn = {
  background: "#c6a75e",
  border: "none",
  color: "#fff",
  padding: "14px 26px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600
}

const clienteCard = {
  background: "#fff",
  padding: 22,
  borderRadius: 14,
  border: "1px solid #ececec",
  transition: "0.2s"
}