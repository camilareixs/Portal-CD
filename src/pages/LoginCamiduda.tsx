import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function LoginCamiduda() {
  const [usuario, setUsuario] =
    useState("")

  const [senha, setSenha] =
    useState("")

  const [codigo, setCodigo] =
    useState("")

  const [modoCadastro, setModoCadastro] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [erro, setErro] =
    useState("")

  const [text, setText] =
    useState("")

  const fullText = "Camiduda"

  useEffect(() => {
    verificarPrimeiroAcesso()

    let i = 0

    const interval = setInterval(() => {
      setText(
        fullText.slice(0, i + 1)
      )

      i++

      if (i === fullText.length) {
        clearInterval(interval)
      }
    }, 120)

    return () =>
      clearInterval(interval)
  }, [])

  async function verificarPrimeiroAcesso() {
    const { data } =
      await supabase
        .from("login")
        .select("*")
        .limit(1)

    if (!data || data.length === 0) {
      setModoCadastro(true)
    }
  }

  async function handleCadastro() {
    setErro("")

    if (codigo !== "CDFEI") {
      setErro(
        "Código de acesso inválido"
      )
      return
    }

    if (!usuario || !senha) {
      setErro(
        "Preencha usuário e senha"
      )
      return
    }

    setLoading(true)

    const { error } =
      await supabase
        .from("login")
        .insert([
          {
            usuario,
            senha,
            codigo_secreto: codigo,
            primeiro_acesso: false
          }
        ])

    setLoading(false)

    if (error) {
      setErro(
        "Erro ao criar acesso"
      )
      return
    }

    setModoCadastro(false)
    setUsuario("")
    setSenha("")
    setCodigo("")
  }

  async function handleLogin() {
    setErro("")
    setLoading(true)

    const { data, error } =
      await supabase
        .from("login")
        .select("*")
        .eq("usuario", usuario)
        .eq("senha", senha)
        .single()

    setLoading(false)

    if (error || !data) {
      setErro(
        "Usuário ou senha inválidos"
      )
      return
    }

    localStorage.setItem(
      "camiduda_auth",
      "true"
    )

    localStorage.setItem(
      "camiduda_user",
      data.usuario
    )

    window.location.reload()
  }

  return (
    <div style={container}>
      <div style={card}>
        <div style={header}>
          <h1 style={title}>
            {text}
            <span
              style={{
                color: "#c8a24a"
              }}
            >
              .
            </span>
          </h1>

          <p style={sub}>
            {modoCadastro
              ? "Acesso exclusivo"
              : "Bem-vinda de volta"}
          </p>
        </div>

        <div style={form}>
          <input
            style={input}
            placeholder="Usuário"
            value={usuario}
            onChange={e =>
              setUsuario(e.target.value)
            }
            autoComplete="username"
          />

          <input
            style={input}
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e =>
              setSenha(e.target.value)
            }
            autoComplete={
              modoCadastro
                ? "new-password"
                : "current-password"
            }
          />

          {modoCadastro && (
            <input
              style={input}
              placeholder="Código de acesso"
              value={codigo}
              onChange={e =>
                setCodigo(
                  e.target.value
                )
              }
            />
          )}

          {erro && (
            <span style={erroStyle}>
              {erro}
            </span>
          )}

          <button
            style={{
              ...button,
              opacity: loading ? 0.7 : 1
            }}
            onClick={
              modoCadastro
                ? handleCadastro
                : handleLogin
            }
            disabled={loading}
          >
            {loading
              ? "Entrando..."
              : modoCadastro
              ? "Criar acesso"
              : "Entrar"}
          </button>

          <div style={toggle}>
            {modoCadastro ? (
              <span
                onClick={() => {
                  setModoCadastro(false)
                  setErro("")
                }}
              >
                Já possui acesso?{" "}
                <b
                  style={{
                    color: "#b08d3c"
                  }}
                >
                  Entrar
                </b>
              </span>
            ) : (
              <span
                onClick={() => {
                  setModoCadastro(true)
                  setErro("")
                }}
              >
                Primeiro acesso?{" "}
                <b
                  style={{
                    color: "#b08d3c"
                  }}
                >
                  Criar conta
                </b>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const container = {
  width: "100%",
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Inter",
  background:
    "radial-gradient(circle at top,#fffdf8,#f3f0e8)",
  padding: 20,
  overflowX: "hidden" as const
}

const card = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  borderRadius: 22,
  padding: 44,
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.12)",
  border: "1px solid #e9e2d2"
}

const header = {
  textAlign: "center" as const,
  marginBottom: 26
}

const title = {
  fontSize: 42,
  margin: 0,
  fontWeight: 600,
  color: "#b08d3c",
  letterSpacing: 0.5
}

const sub = {
  color: "#7a7a7a",
  fontSize: 14,
  marginTop: 6
}

const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
  width: "100%"
}

const input = {
  width: "100%",
  minWidth: 0,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e6dcc8",
  background: "#ffffff",
  fontSize: 14,
  outline: "none"
}

const button = {
  width: "100%",
  marginTop: 10,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background:
    "linear-gradient(90deg,#b08d3c,#d6b25e)",
  color: "#1a1a1a",
  fontWeight: 600,
  cursor: "pointer"
}

const erroStyle = {
  color: "#b91c1c",
  fontSize: 13,
  textAlign: "center" as const
}

const toggle = {
  marginTop: 14,
  textAlign: "center" as const,
  color: "#777",
  fontSize: 13,
  cursor: "pointer",
  lineHeight: 1.5
}