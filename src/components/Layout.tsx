
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

export default function Layout({
  children,
  setPage
}: Props) {
  const [active, setActive] =
    useState<Page>("clientes")

  const [menuOpen, setMenuOpen] =
    useState(true)

  const [isMobile, setIsMobile] =
    useState(false)

  useEffect(() => {
    function handleResize() {
      const mobile =
        window.innerWidth <= 768

      setIsMobile(mobile)

      if (mobile) {
        setMenuOpen(false)
      } else {
        setMenuOpen(true)
      }
    }

    handleResize()

    window.addEventListener(
      "resize",
      handleResize
    )

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      )
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
      {/* =========================
          HEADER MOBILE
      ========================= */}

      {isMobile && (
        <header style={mobileHeader}>
          <button
            onClick={() =>
              setMenuOpen(prev => !prev)
            }
            style={menuButton}
            aria-label={
              menuOpen
                ? "Fechar menu"
                : "Abrir menu"
            }
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

          <div style={mobileLogo}>
            Cami&Duda
          </div>
        </header>
      )}

      {/* =========================
          OVERLAY MOBILE
      ========================= */}

      {isMobile &&
        menuOpen && (
          <div
            style={overlay}
            onClick={() =>
              setMenuOpen(false)
            }
          />
        )}

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        style={{
          ...sidebar,

          width:
            isMobile
              ? 280
              : menuOpen
                ? 260
                : 76,

          minWidth:
            isMobile
              ? 280
              : menuOpen
                ? 260
                : 76,

          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                maxWidth: "85vw",
                height: "100dvh",
                zIndex: 1001,

                transform: menuOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",

                transition:
                  "transform 0.3s ease",

                boxShadow: menuOpen
                  ? "8px 0 30px rgba(0,0,0,0.14)"
                  : "none",

                overflowY: "auto"
              }
            : {
                position: "relative",
                transition:
                  "width 0.25s ease, min-width 0.25s ease"
              })
        }}
      >
        {/* =========================
            CABEÇALHO SIDEBAR
        ========================= */}

        <div
          style={{
            ...sidebarHeader,

            justifyContent:
              menuOpen || isMobile
                ? "space-between"
                : "center"
          }}
        >
          {(menuOpen || isMobile) && (
            <div style={brandWrap}>
              <div style={logo}>
                Cami&Duda
              </div>
            </div>
          )}

          {/* HAMBÚRGUER DESKTOP */}

          {!isMobile && (
            <button
              onClick={() =>
                setMenuOpen(prev => !prev)
              }
              style={desktopMenuButton}
              aria-label={
                menuOpen
                  ? "Recolher menu"
                  : "Expandir menu"
              }
              title={
                menuOpen
                  ? "Recolher menu"
                  : "Expandir menu"
              }
            >
              <span
                style={hamburgerLine}
              />
              <span
                style={hamburgerLine}
              />
              <span
                style={hamburgerLine}
              />
            </button>
          )}
        </div>

        <div
          style={{
            ...divider,

            marginLeft:
              menuOpen || isMobile
                ? 24
                : 12,

            marginRight:
              menuOpen || isMobile
                ? 24
                : 12
          }}
        />

        {/* =========================
            NAVEGAÇÃO
        ========================= */}

        <NavItem
          label="Dashboard"
          active={
            active === "dashboard"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("dashboard")
          }
        />

        <NavItem
          label="Clientes"
          active={
            active === "clientes"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("clientes")
          }
        />

        <NavItem
          label="Compras"
          active={
            active === "compra"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("compra")
          }
        />

        <NavItem
          label="Troca de Pontos"
          active={
            active === "troca"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("troca")
          }
        />

        <NavItem
          label="Estoque"
          active={
            active === "produtos"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("produtos")
          }
        />

        <NavItem
          label="Financeiro"
          active={
            active === "financeiro"
          }
          collapsed={
            !menuOpen && !isMobile
          }
          onClick={() =>
            nav("financeiro")
          }
        />
      </aside>

      {/* =========================
          CONTEÚDO
      ========================= */}

      <main
        style={{
          ...content,

          ...(isMobile
            ? {
                width: "100%",
                minWidth: 0,
                padding:
                  "80px 16px 30px"
              }
            : {
                transition:
                  "padding 0.25s ease"
              })
        }}
      >
        {children}
      </main>
    </div>
  )
}

/* =========================
   NAV ITEM
========================= */

function NavItem({
  label,
  active,
  collapsed,
  onClick
}: {
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={
        collapsed
          ? label
          : undefined
      }
      style={{
        ...navBtn,

        padding:
          collapsed
            ? "16px 0"
            : "16px 36px",

        textAlign:
          collapsed
            ? "center"
            : "left",

        background: active
          ? "#f9f3df"
          : "transparent",

        color: active
          ? "#8b6f3d"
          : "#5f5a50",

        borderLeft: active
          ? "4px solid #d8bf7a"
          : "4px solid transparent",

        fontWeight:
          active ? 600 : 500,

        boxShadow: active
          ? "0 4px 12px rgba(216,191,122,0.12)"
          : "none"
      }}
    >
      {collapsed ? (
        <span
          style={{
            display: "inline-flex",
            width: 30,
            height: 30,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: active
              ? "#f1e5bd"
              : "#f7f5ef",
            fontSize: 11,
            fontWeight: 700,
            color: active
              ? "#8b6f3d"
              : "#777"
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
  minHeight: "100vh",
  background: "#fffdfa",
  borderRight:
    "1px solid #efe3bf",
  paddingTop: 28,
  display: "flex",
  flexDirection:
    "column" as const,
  boxShadow:
    "4px 0 18px rgba(216,191,122,0.08)",
  boxSizing:
    "border-box" as const,
  flexShrink: 0
}

const sidebarHeader = {
  minHeight: 58,
  padding:
    "0 16px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  boxSizing:
    "border-box" as const
}

const brandWrap = {
  paddingLeft: 12,
  paddingRight: 4,
  marginBottom: 0
}

const logo = {
  fontFamily:
    "Playfair Display, serif",
  fontSize: 28,
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
    "18px 24px 20px",
  flexShrink: 0
}

const navBtn = {
  border: "none",
  background: "transparent",
  textAlign:
    "left" as const,
  fontSize: 15,
  cursor: "pointer",
  transition:
    "all 0.25s ease",
  marginBottom: 6,
  borderRadius:
    "0 14px 14px 0",
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: 52,
  flexShrink: 0
}

/* =========================
   DESKTOP MENU BUTTON
========================= */

const desktopMenuButton = {
  width: 40,
  height: 40,
  border: "none",
  background: "#f9f6ec",
  borderRadius: 10,
  display: "flex",
  flexDirection:
    "column" as const,
  justifyContent: "center",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0
}

/* =========================
   CONTEÚDO
========================= */

const content = {
  flex: 1,
  minWidth: 0,
  width: "100%",
  padding:
    "50px 70px",
  background: "#f6f6f7",
  boxSizing:
    "border-box" as const
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
  borderBottom:
    "1px solid #efe3bf",
  display: "flex",
  alignItems: "center",
  zIndex: 1000,
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
  marginLeft: 12,
  whiteSpace:
    "nowrap" as const
}

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
  transition:
    "all 0.25s ease"
}

/* =========================
   OVERLAY
========================= */

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background:
    "rgba(0, 0, 0, 0.32)",
  zIndex: 1000
}

