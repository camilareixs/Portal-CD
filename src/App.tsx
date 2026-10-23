
import { useEffect, useState } from "react"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import Compras from "./pages/Compras"
import Troca from "./pages/Troca"
import Produtos from "./pages/Produtos"
import Financeiro from "./pages/Financeiro"
import LoginCamiduda from "./pages/LoginCamiduda"

export type Page =
  | "dashboard"
  | "clientes"
  | "compra"
  | "troca"
  | "produtos"
  | "financeiro"

export type CompraSelecionada = {
  clienteid: string
  cliente: string
} | null

function App() {
  const [page, setPage] =
    useState<Page>("clientes")

  const [logado, setLogado] =
    useState(false)

  const [perfil, setPerfil] =
    useState("")

  const [carregando, setCarregando] =
    useState(true)

  const [compraSelecionada, setCompraSelecionada] =
    useState<CompraSelecionada>(null)

  const isAdm = perfil === "ADM"

  useEffect(() => {
    const auth =
      localStorage.getItem("camiduda_auth")

    const perfilSalvo =
      localStorage.getItem("camiduda_perfil") || ""

    setLogado(auth === "true")
    setPerfil(perfilSalvo)

    // Funcionário não começa no Dashboard
    if (
      auth === "true" &&
      perfilSalvo !== "ADM"
    ) {
      setPage("clientes")
    }

    setCarregando(false)
  }, [])

  function navegar(pagina: Page) {
    // Restringe Dashboard e Financeiro a ADM
    if (
      !isAdm &&
      (pagina === "dashboard" ||
        pagina === "financeiro")
    ) {
      setPage("clientes")
      return
    }

    setPage(pagina)
  }

  function irParaCompra(
    clienteid: string,
    cliente: string
  ) {
    setCompraSelecionada({
      clienteid,
      cliente
    })

    setPage("compra")
  }

  function renderPage() {
    // Proteção adicional ao renderizar a página
    if (
      !isAdm &&
      (page === "dashboard" ||
        page === "financeiro")
    ) {
      return (
        <Clientes irParaCompra={irParaCompra} />
      )
    }

    switch (page) {
      case "dashboard":
        return <Dashboard />

      case "clientes":
        return (
          <Clientes
            irParaCompra={irParaCompra}
          />
        )

      case "compra":
        return (
          <Compras
            compraSelecionada={compraSelecionada}
          />
        )

      case "troca":
        return <Troca />

      case "produtos":
        return <Produtos />

      case "financeiro":
        return <Financeiro />

      default:
        return (
          <Clientes irParaCompra={irParaCompra} />
        )
    }
  }

  if (carregando) {
    return null
  }

  if (!logado) {
    return <LoginCamiduda />
  }

  return (
    <Layout setPage={navegar}>
      {renderPage()}
    </Layout>
  )
}

export default App
