import { ReactNode } from "react"

type Page = "dashboard" | "clientes" | "compra" | "troca"

type Props = {
  children: ReactNode
  setPage: (p: Page) => void
}

export default function Layout({ children, setPage }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* SIDEBAR MINIMAL */}
      <aside style={{
        width: 90,
        background: "#fff",
        borderRight: "1px solid #ececec",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 30,
        gap: 30
      }}>
        <Logo />

        <NavBtn label="" onClick={() => setPage("dashboard")} />
        <NavBtn label="👗" onClick={() => setPage("clientes")} />
        <NavBtn label="🛍️" onClick={() => setPage("compra")} />
        <NavBtn label="🎁" onClick={() => setPage("troca")} />
      </aside>

      {/* CONTEÚDO FULL */}
      <div style={{
        flex: 1,
        padding: "50px 60px"
      }}>
        {children}
      </div>

    </div>
  )
}

function Logo() {
  return (
    <div style={{
      fontWeight: 700,
      fontSize: 20,
      color: "#c6a75e"
    }}>
      F
    </div>
  )
}

function NavBtn({ label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        fontSize: 22,
        cursor: "pointer",
        opacity: 0.6
      }}
    >
      {label}
    </button>
  )
}