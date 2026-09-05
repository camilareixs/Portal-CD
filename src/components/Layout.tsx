
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

type Page =
  | "dashboard"
  | "clientes"
  | "compra"
  | "troca"
  | "produtos"
  | "financeiro"

type Props = {
  children: ReactNode
  setPage: (p: Page) => void
}

export default function Layout({ children, setPage }: Props) {
  const [active, setActive] = useState<Page>("clientes")
  const [menuOpen, setMenuOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 768

      setIsMobile(mobile)

      if (mobile) {
        setMenuOpen(false)
      } else {
        setMenuOpen(true)
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
                  ? "rotate(45deg) translate(4px, 4px)"
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
                  ? "rotate(-45deg) translate(4px, -4px)"
                  : "none"
              }}
            />
          </button>

          <div style={mobileLogo}>
            Cami&Duda
          </div>
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
            : {
                width: menuOpen ? 260 : 76,
                minWidth: menuOpen ? 260 : 76,
                transition:
                  "width 0.3s ease, min-width 0.3s ease"
              })
        }
      >

        {/* CABEÇALHO DA SIDEBAR */}
        <div
          style={{
            ...sidebarHeader,
            justifyContent: menuOpen
              ? "space-between"
              : "center"
          }}
        >

          {/* LOGO */}
          {menuOpen && (
            <div style={logo}>
              Cami&Duda
            </div>
          )}

          {/* BOTÃO DESKTOP */}
          {!isMobile && (
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              style={desktopMenuButton}
              aria-label={
                menuOpen
                  ? "Recolher menu"
                  : "Expandir menu"
              }
            >
              {menuOpen ? (
                <span style={discreteX}>
                  ×
                </span>
              ) : (
                <span style={desktopHamburger}>
                  <span style={smallHamburgerLine} />
                  <span style={smallHamburgerLine} />
                  <span style={smallHamburgerLine} />
                </span>
              )}
            </button>
          )}

        </div>

        {/* DIVISOR */}
        <div style={divider} />

        {/* MENU */}
        <NavItem
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => nav("dashboard")}
          collapsed={!menuOpen}
        />

        <NavItem
          label="Clientes"
          active={active === "clientes"}
          onClick={() => nav("clientes")}
          collapsed={!menuOpen}
        />

        <NavItem
          label="Compras"
          active={active === "compra"}
          onClick={() => nav("compra")}
          collapsed={!menuOpen}
        />

        <NavItem
          label="Troca de Pontos"
          active={active === "troca"}
          onClick={() => nav("troca")}
          collapsed={!menuOpen}
        />

        <NavItem
          label="Estoque"
          active={active === "produtos"}
          onClick={() => nav("produtos")}
          collapsed={!menuOpen}
        />

        <NavItem
          label="Financeiro"
          active={active === "financeiro"}
          onClick={() => nav("financeiro")}
          collapsed={!menuOpen}
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


/* ================================
   ITEM DO MENU
================================ */

function NavItem({
  label,
  active,
  onClick,
  collapsed
}: {
  label: string
  active: boolean
  onClick: () => void
  collapsed: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        ...navBtn,

        ...(collapsed
          ? {
              padding: "12px 0",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 10,
              margin: "4px 10px",
              width: "calc(100% - 20px)"
            }
          : {}),

        background: active
          ? "#f9f3df"
          : "transparent",

        color: active
          ? "#8b6f3d"
          : "#5f5a50",

        borderLeft: collapsed
          ? "none"
          : active
            ? "4px solid #d8bf7a"
            : "4px solid transparent",

        fontWeight: active
          ? 600
          : 500,

        boxShadow: active
          ? "0 4px 12px rgba(216,191,122,0.12)"
          : "none"
      }}
    >
      {collapsed ? (
        <span
          style={{
            ...collapsedIcon,

            background: active
              ? "#f1e5bd"
              : "#f4f2ed",

            color: active
              ? "#8b6f3d"
              : "#77736b"
          }}
        >
          {label.charAt(0)}
        </span>
      ) : (
        label
      )}
    </button>
  )
}


/* ================================
   LAYOUT
================================ */

const layout = {
  display: "flex",
  width: "100%",
  minHeight: "100vh",
  minWidth: 0,
  overflowX: "hidden" as const
}


/* ================================
   SIDEBAR
================================ */

const sidebar = {
  minHeight: "100vh",
  background: "#fffdfa",
  borderRight: "1px solid #efe3bf",
  paddingTop: 28,
  display: "flex",
  flexDirection: "column" as const,
  boxShadow: "4px 0 18px rgba(216,191,122,0.08)",
  boxSizing: "border-box" as const,
  overflowX: "hidden" as const
}


/* ================================
   CABEÇALHO SIDEBAR
================================ */

const sidebarHeader = {
  height: 52,
  paddingLeft: 24,
  paddingRight: 18,
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box" as const
}


/* ================================
   LOGO
================================ */

const logo = {
  fontFamily: "Playfair Display, serif",
  fontSize: 28,
  color: "#b9974f",
  fontWeight: 700,
  letterSpacing: "0.4px",
  whiteSpace: "nowrap" as const
}


/* ================================
   DIVISOR
================================ */

const divider = {
  height: 1,
  background:
    "linear-gradient(90deg, transparent, #e7d39b, transparent)",
  margin: "12px 18px 22px"
}


/* ================================
   BOTÃO DESKTOP
================================ */

const desktopMenuButton = {
  width: 30,
  height: 30,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  borderRadius: 6,
  flexShrink: 0
}


/* ================================
   X DISCRETO
================================ */

const discreteX = {
  fontSize: 21,
  lineHeight: 1,
  fontWeight: 300,
  color: "#8b6f3d",
  opacity: 0.55,
  transform: "translateY(-1px)",
  display: "block"
}


/* ================================
   HAMBURGER DESKTOP
================================ */

const desktopHamburger = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 3
}

const smallHamburgerLine = {
  display: "block",
  width: 16,
  height: 1.5,
  background: "#8b6f3d",
  borderRadius: 5
}


/* ================================
   MENU
================================ */

const navBtn = {
  padding: "15px 30px",
  border: "none",
  background: "transparent",
  textAlign: "left" as const,
  fontSize: 15,
  cursor: "pointer",
  transition: "all 0.25s ease",
  marginBottom: 6,
  borderRadius: "0 14px 14px 0",
  width: "100%",
  boxSizing: "border-box" as const
}


/* ================================
   MENU RECOLHIDO
================================ */

const collapsedIcon = {
  width: 34,
  height: 34,
  borderRadius: 9,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 600,
  transition: "all 0.25s ease"
}


/* ================================
   CONTEÚDO
================================ */

const content = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  padding: "50px 70px",
  background: "#f6f6f7",
  boxSizing: "border-box" as const
}


/* ================================
   HEADER MOBILE
================================ */

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


/* ================================
   LOGO MOBILE
================================ */

const mobileLogo = {
  fontFamily: "Playfair Display, serif",
  fontSize: 24,
  color: "#b9974f",
  fontWeight: 700,
  letterSpacing: "0.4px",
  marginLeft: 12,
  whiteSpace: "nowrap" as const
}


/* ================================
   HAMBURGER MOBILE
================================ */

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


/* ================================
   OVERLAY MOBILE
================================ */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0, 0, 0, 0.32)",
  zIndex: 1000
}

