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

      // Se voltar para desktop, fecha o menu
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

  // Impede o scroll da página quando o menu estiver aberto no celular
  useEffect(() => {
    if (isMobile && menuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, menuOpen])

  function nav(p: Page) {
    setActive(p)
    setPage(p)

    // Fecha o menu depois de escolher uma página
    if (isMobile) {
      setMenuOpen(false)
    }
  }

  function toggleMenu() {
    setMenuOpen((prev) => !prev)
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div style={layout}>
      {/* =====================================
          HEADER MOBILE
      ====================================== */}

      {isMobile && (
        <header style={mobileHeader}>
          <button
            onClick={toggleMenu}
            style={menuButton}
            aria-label={
              menuOpen ? "Fechar menu" : "Abrir menu"
            }
          >
            {menuOpen ? (
              <span style={closeIcon}>×</span>
            ) : (
              <>
                <span style={hamburgerLine} />
                <span style={hamburgerLine} />
                <span style={hamburgerLine} />
              </>
            )}
          </button>

          <div style={mobileLogo}>
            Cami&Duda
          </div>
        </header>
      )}

      {/* =====================================
          OVERLAY MOBILE
      ====================================== */}

      {isMobile && menuOpen && (
        <div
          style={overlay}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* =====================================
          SIDEBAR
      ====================================== */}

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
                minWidth: 280,

                height: "100vh",

                zIndex: 2001,

                transform: menuOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",

                transition:
                  "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

                boxShadow: menuOpen
                  ? "8px 0 30px rgba(0,0,0,0.15)"
                  : "none",

                overflowY: "auto"
              }
            : {})
        }}
      >
        {/* Logo do menu */}

        <div style={brandWrap}>
          <div style={logo}>
            Cami&Duda
          </div>
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

      {/* =====================================
          CONTEÚDO
      ====================================== */}

      <main
        style={{
          ...content,

          ...(isMobile
            ? {
                width: "100%",
                minWidth: 0,
                padding:
                  "80px 16px 30px",
                boxSizing: "border-box"
              }
            : {})
        }}
      >
        {children}
      </main>
    </div>
  )
}

/* =====================================
   ITEM DO MENU
===================================== */

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

/* =====================================
   LAYOUT
===================================== */

const layout = {
  display: "flex",
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden" as const
}

/* =====================================
   SIDEBAR
===================================== */

const sidebar = {
  width: 260,
  minWidth: 260,

  background: "#fffdfa",

  borderRight:
    "1px solid #efe3bf",

  paddingTop: 46,

  display: "flex",
  flexDirection: "column" as const,

  boxShadow:
    "4px 0 18px rgba(216,191,122,0.08)",

  boxSizing: "border-box" as const
}

const brandWrap = {
  paddingLeft: 36,
  paddingRight: 24,
  marginBottom: 30
}

const logo = {
  fontFamily:
    "Playfair Display, serif",

  fontSize: 32,

  color: "#b9974f",

  fontWeight: 700,

  letterSpacing: "0.4px",

  whiteSpace:
    "nowrap" as const
}

const divider = {
  height: 1,

  background:
    "linear-gradient(90deg, transparent, #e7d39b, transparent)",

  margin:
    "0 24px 26px"
}

const navBtn = {
  padding: "16px 36px",

  border: "none",

  background: "transparent",

  textAlign:
    "left" as const,

  fontSize: 15,

  cursor: "pointer",

  transition:
    "all 0.25s ease",

  marginBottom: 8,

  borderRadius:
    "0 14px 14px 0",

  width: "100%",

  boxSizing:
    "border-box" as const
}

/* =====================================
   CONTEÚDO
===================================== */

const content = {
  flex: 1,

  minWidth: 0,

  padding:
    "50px 70px",

  background: "#f6f6f7",

  boxSizing:
    "border-box" as const
}

/* =====================================
   HEADER MOBILE
===================================== */

const mobileHeader = {
  position: "fixed" as const,

  top: 0,
  left: 0,
  right: 0,

  height: 64,

  background: "#fffdfa",

  borderBottom:
    "1px solid #efe3bf",

  display: "flex",

  alignItems: "center",

  zIndex: 2000,

  boxShadow:
    "0 2px 12px rgba(216,191,122,0.08)"
}

const mobileLogo = {
  fontFamily:
    "Playfair Display, serif",

  fontSize: 24,

  color: "#b9974f",

  fontWeight: 700,

  letterSpacing: "0.4px",

  marginLeft: 12
}

/* =====================================
   BOTÃO HAMBURGER
===================================== */

const menuButton = {
  width: 44,
  height: 44,

  marginLeft: 8,

  border: "none",

  background: "transparent",

  display: "flex",

  flexDirection:
    "column" as const,

  justifyContent:
    "center",

  alignItems:
    "center",

  gap: 5,

  cursor: "pointer",

  padding: 0,

  borderRadius: 10
}

const hamburgerLine = {
  width: 23,
  height: 2,

  background: "#8b6f3d",

  borderRadius: 10,

  display: "block"
}

const closeIcon = {
  fontSize: 34,

  lineHeight: 1,

  fontWeight: 300,

  color: "#8b6f3d",

  display: "block",

  marginTop: -2
}

/* =====================================
   FUNDO DO MENU
===================================== */

const overlay = {
  position: "fixed" as const,

  inset: 0,

  background:
    "rgba(0, 0, 0, 0.32)",

  zIndex: 2000
}