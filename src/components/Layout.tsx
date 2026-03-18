import { ReactNode } from "react"

type Page = "dashboard" | "clientes" | "compra" | "troca"

type Props = {
  children: ReactNode
  setPage: (p: Page) => void
}

export default function Layout({ children, setPage }: Props) {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#fffdf7",
      fontFamily: "Poppins, sans-serif"
    }}>
      
      <aside style={{
        width: 220,
        background: "#fff",
        borderRight: "1px solid #f1e7c7",
        padding: 25
      }}>
        <h2 style={{ color: "#e6b800" }}>✨ Fidelidade</h2>

        <nav style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginTop: 40
        }}>
          <button onClick={() => setPage("dashboard")} style={navBtn}>🏠 Dashboard</button>
          <button onClick={() => setPage("clientes")} style={navBtn}>👗 Clientes</button>
          <button onClick={() => setPage("compra")} style={navBtn}>🛍️ Nova Compra</button>
          <button onClick={() => setPage("troca")} style={navBtn}>🎁 Trocas</button>
        </nav>
      </aside>

      <div style={{ flex: 1 }}>
        
        <header style={{
          height: 70,
          background: "#fff",
          borderBottom: "1px solid #f1e7c7",
          display: "flex",
          alignItems: "center",
          paddingLeft: 30,
          fontWeight: 600,
          color: "#2b2b2b"
        }}>
          Sistema de Fidelidade 💛
        </header>

        <main style={{ padding: 40 }}>
          {children}
        </main>

      </div>
    </div>
  )
}

const navBtn = {
  background: "#fff3c4",
  border: "none",
  padding: 12,
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left" as const,
  fontWeight: 500
}