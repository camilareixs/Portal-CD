import { useState } from "react"
import Layout from "./components/Layout"

import Dashboard from "./pages/Dashboard"
import Clientes from "./pages/Clientes"
import Compra from "./pages/Compra"
import Troca from "./pages/Troca"

type Page = "dashboard" | "clientes" | "compra" | "troca"

function App() {
  const [page, setPage] = useState<Page>("dashboard")

  function renderPage() {
    if (page === "dashboard") return <Dashboard />
    if (page === "clientes") return <Clientes />
    if (page === "compra") return <Compra />
    if (page === "troca") return <Troca />
  }

  return (
    <Layout setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default App