import { ReactNode, useState } from "react"

type Page = "dashboard" | "clientes" | "compra" | "troca"

type Props = {
  children: ReactNode
  setPage: (p: Page) => void
}

export default function Layout({ children, setPage }: Props) {

  const [active, setActive] = useState<Page>("clientes")

  function nav(p: Page) {
    setActive(p)
    setPage(p)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      <aside style={sidebar}>

        <div style={logo}>Fidelidade</div>

        <NavItem
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => nav("dashboard")}
        />

        <NavItem
          label="Clientes"
          active={active === "clientes"}
          onClick={() => nav("clientes")}
        />

        <NavItem
          label="Compras"
          active={active === "compra"}
          onClick={() => nav("compra")}
        />

        <NavItem
          label="Trocas"
          active={active === "troca"}
          onClick={() => nav("troca")}
        />

      </aside>

      <main style={content}>
        {children}
      </main>

    </div>
  )
}

function NavItem({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navBtn,
        borderLeft: active ? "3px solid #c6a75e" : "3px solid transparent",
        background: active ? "#fbf8ef" : "transparent",
        color: active ? "#111" : "#666"
      }}
    >
      {label}
    </button>
  )
}

/* styles */

const sidebar = {
  width: 220,
  background: "#ffffff",
  borderRight: "1px solid #eee6cf",
  paddingTop: 50,
  display: "flex",
  flexDirection: "column" as const
}

const logo = {
  fontFamily: "Playfair Display",
  fontSize: 28,
  paddingLeft: 40,
  marginBottom: 40,
  color: "#c6a75e"
}

const navBtn = {
  padding: "16px 40px",
  border: "none",
  background: "transparent",
  textAlign: "left" as const,
  fontSize: 15,
  cursor: "pointer",
  transition: "0.2s"
}

const content = {
  flex: 1,
  padding: "50px 70px",
  background: "#f6f6f7"
}