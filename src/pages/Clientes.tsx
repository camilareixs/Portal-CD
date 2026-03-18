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
    if (!nome || !cpf) {
      alert("Preencha nome e CPF 💛")
      return
    }

    const existe = clientes.find(c => c.cpf === cpf)

    if (existe) {
      alert("Cliente já cadastrado ✨")
      return
    }

    const novo = {
      id: Date.now().toString(),
      nome,
      cpf,
      celular
    }

    setClientes([...clientes, novo])

    setNome("")
    setCpf("")
    setCelular("")
  }

  return (
    <div>

      <h1 style={{
        fontSize: 32,
        color: "#2b2b2b",
        marginBottom: 30
      }}>
        👗 Clientes
      </h1>

      <div style={formCard}>
        <h3 style={{ marginBottom: 15 }}>Cadastrar nova cliente ✨</h3>

        <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} style={input}/>
        <input placeholder="CPF" value={cpf} onChange={e => setCpf(e.target.value)} style={input}/>
        <input placeholder="Celular" value={celular} onChange={e => setCelular(e.target.value)} style={input}/>

        <button onClick={cadastrar} style={btn}>
          💛 Cadastrar Cliente
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
        {clientes.map(c => (
          <div key={c.id} style={clienteCard}>
            <div>
              <strong>{c.nome}</strong>
              <p style={{ margin: 0 }}>CPF: {c.cpf}</p>
              <p style={{ margin: 0 }}>📱 {c.celular}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

const formCard = {
  background: "#fff3c4",
  padding: 25,
  borderRadius: 20,
  maxWidth: 500,
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)"
}

const input = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 12,
  border: "1px solid #f0e6c0"
}

const btn = {
  marginTop: 20,
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(90deg,#e6b800,#ffd54f)",
  fontWeight: 600,
  cursor: "pointer"
}

const clienteCard = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  marginTop: 12,
  maxWidth: 500,
  boxShadow: "0 6px 14px rgba(0,0,0,0.04)"
}