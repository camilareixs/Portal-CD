
import type { ReactNode } from "react"

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
        <div style={brandWrap}>
          <div style={logo}>Cami&Duda</div>
        </div>

        <div style={divider} />

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

      <main style={content}>{children}</main>
    </div>
  )
}

function NavItem({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navBtn,
        background: active ? "#f9f3df" : "transparent",
        color: active ? "#8b6f3d" : "#5f5a50",
        borderLeft: active
          ? "4px solid #d8bf7a"
          : "4px solid transparent",
        fontWeight: active ? 600 : 500,
        boxShadow: active
          ? "0 4px 12px rgba(216,191,122,0.12)"
          : "none"
      }}
    >
      {label}
    </button>
  )
}

const sidebar = {
  width: 260,
  background: "#fffdfa",
  borderRight: "1px solid #efe3bf",
  paddingTop: 46,
  display: "flex",
  flexDirection: "column" as const,
  boxShadow: "4px 0 18px rgba(216,191,122,0.08)"
}

const brandWrap = {
  paddingLeft: 36,
  paddingRight: 24,
  marginBottom: 30
}

const logo = {
  fontFamily: "Playfair Display, serif",
  fontSize: 32,
  color: "#b9974f",
  fontWeight: 700,
  letterSpacing: "0.4px"
}

const divider = {
  height: 1,
  background: "linear-gradient(90deg, transparent, #e7d39b, transparent)",
  margin: "0 24px 26px"
}

const navBtn = {
  padding: "16px 36px",
  border: "none",
  background: "transparent",
  textAlign: "left" as const,
  fontSize: 15,
  cursor: "pointer",
  transition: "all 0.25s ease",
  marginBottom: 8,
  borderRadius: "0 14px 14px 0"
}

const content = {
  flex: 1,
  padding: "50px 70px",
  background: "#f6f6f7"
}

