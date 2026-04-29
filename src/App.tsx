import { useState } from "react"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import Compras from "./pages/Compras"
import Troca from "./pages/Troca"

export type Page = "dashboard" | "clientes" | "compra" | "troca"

export type CompraSelecionada = {
  clienteId: string
  clienteNome: string
} | null

function App() {
  const [page, setPage] = useState<Page>("dashboard")

  // Guarda cliente escolhido para nova compra
  const [compraSelecionada, setCompraSelecionada] = useState<CompraSelecionada>(null)

  function irParaCompra(clienteId: string, clienteNome: string) {
    setCompraSelecionada({
      clienteId,
      clienteNome
    })

    setPage("compra")
  }

  function renderPage() {
    if (page === "dashboard") return <Dashboard />

    if (page === "clientes") {
      return (
        <Clientes
          irParaCompra={irParaCompra}
        />
      )
    }

    if (page === "compra") {
      return (
        <Compras
          compraSelecionada={compraSelecionada}
        />
      )
    }

    if (page === "troca") return <Troca />

    return <Dashboard />
  }

  return (
    <Layout setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default App