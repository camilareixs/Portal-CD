import { useEffect, useState } from "react"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import Compras from "./pages/Compras"
import Troca from "./pages/Troca"
import LoginCamiduda from "./pages/LoginCamiduda"

export type Page = "dashboard" | "clientes" | "compra" | "troca"

export type CompraSelecionada = {
  clienteid: string
  cliente: string
} | null

function App() {
  const [page, setPage] = useState<Page>("dashboard")

  const [logado, setLogado] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const [compraSelecionada, setCompraSelecionada] =
    useState<CompraSelecionada>(null)

  useEffect(() => {
    const auth = localStorage.getItem("camiduda_auth")
    setLogado(auth === "true")
    setCarregando(false)
  }, [])

  function irParaCompra(clienteid: string, cliente: string) {
    setCompraSelecionada({
      clienteid,
      cliente
    })

    setPage("compra")
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <Dashboard />

      case "clientes":
        return (
          <Clientes irParaCompra={irParaCompra} />
        )

      case "compra":
        return (
          <Compras compraSelecionada={compraSelecionada} />
        )

      case "troca":
        return <Troca de Ponto />

      default:
        return <Dashboard />
    }
  }

  if (carregando) return null

  if (!logado) return <LoginCamiduda />

  return (
    <Layout setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
