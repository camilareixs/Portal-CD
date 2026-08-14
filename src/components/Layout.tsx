import type { ReactNode } from "react"
import { useEffect, useState } from "react"

type Page = "dashboard" | "clientes" | "compra" | "troca"

type Props = {
  children: ReactNode
  setPage: (p: Page) => void
}

export default function Layout({ children, setPage }: Props) {
  const [active, setActive] = useState<Page>("clientes")
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 768

      setIsMobile(mobile)

      if (!mobile) {
        setMenuOpen(false)
      }
    }

    handleResize()

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  function nav(p: Page) {
    setActive(p)
    setPage(p)

    if (isMobile) {
      setMenuOpen(false)
    }
  }

  return (
    <div style={layout}>
      {/* HEADER MOBILE */}
      {isMobile && (
        <header style={mobileHeader}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            style={menuButton}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            <span
              style={{
                ...hamburgerLine,
                transform: menuOpen
                  ? "rotate(45deg) translate(5px, 5px)"
                  : "none"
              }}
            />

            <span
              style={{
                ...hamburgerLine,
                opacity: menuOpen ? 0 : 1
              }}
            />

            <span
              style={{
                ...hamburgerLine,
                transform: menuOpen
                  ? "rotate(-45deg) translate(5px, -5px)"
                  : "none"
              }}
            />
          </button>

          <div style={mobileLogo}>Cami&Duda</div>
        </header>
      )}

      {/* OVERLAY MOBILE */}
      {isMobile && menuOpen && (
        <div
          style={overlay}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          ...sidebar,

          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                maxWidth: "85vw",
                height: "100dvh",
                zIndex: 1001,
                transform: menuOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",
                transition: "transform 0.3s ease",
                boxShadow: menuOpen
                  ? "8px 0 30px rgba(0,0,0,0.14)"
                  : "none",
                overflowY: "auto"
              }
            : {})
        }}
      >
        {/* LOGO */}
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
          label="Troca de Pontos"
          active={active === "troca"}
          onClick={() => nav("troca")}
        />
      </aside>

      {/* CONTEÚDO */}
      <main
        style={{
          ...content,

          ...(isMobile
            ? {
                width: "100%",
                minWidth: 0,
                padding: "80px 16px 30px"
              }
            : {})
        }}
      >
        {children}
      </main>
    </div>
  )
}

function NavItem({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navBtn,

        background: active
          ? "#f9f3df"
          : "transparent",

        color: active
          ? "#8b6f3d"
          : "#5f5a50",

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

/* =========================
   LAYOUT
========================= */

const layout = {
  display: "flex",
  width: "100%",
  minHeight: "100vh",
  minWidth: 0,
  overflowX: "hidden" as const
}

/* =========================
   SIDEBAR
========================= */

const sidebar = {
  width: 260,
  minWidth: 260,
  minHeight: "100vh",
  background: "#fffdfa",
  borderRight: "1px solid #efe3bf",
  paddingTop: 46,
  display: "flex",
  flexDirection: "column" as const,
  boxShadow: "4px 0 18px rgba(216,191,122,0.08)",
  boxSizing: "border-box" as const
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
  letterSpacing: "0.4px",
  whiteSpace: "nowrap" as const
}

const divider = {
  height: 1,
  background:
    "linear-gradient(90deg, transparent, #e7d39b, transparent)",
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
  borderRadius: "0 14px 14px 0",
  width: "100%",
  boxSizing: "border-box" as const
}

/* =========================
   CONTEÚDO
========================= */

const content = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  padding: "50px 70px",
  background: "#f6f6f7",
  boxSizing: "border-box" as const
}

/* =========================
   MOBILE HEADER
========================= */

const mobileHeader = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  width: "100%",
  height: 64,
  background: "#fffdfa",
  borderBottom: "1px solid #efe3bf",
  display: "flex",
  alignItems: "center",
  zIndex: 1000,
  boxShadow: "0 2px 12px rgba(216,191,122,0.08)"
}

const mobileLogo = {
  fontFamily: "Playfair Display, serif",
  fontSize: 24,
  color: "#b9974f",
  fontWeight: 700,
  letterSpacing: "0.4px",
  marginLeft: 12,
  whiteSpace: "nowrap" as const
}

const menuButton = {
  width: 44,
  height: 44,
  marginLeft: 8,
  border: "none",
  background: "transparent",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  alignItems: "center",
  gap: 5,
  cursor: "pointer",
  padding: 0
}

const hamburgerLine = {
  display: "block",
  width: 23,
  height: 2,
  background: "#8b6f3d",
  borderRadius: 5,
  transition: "all 0.25s ease"
}

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0, 0, 0, 0.32)",
  zIndex: 1000
}