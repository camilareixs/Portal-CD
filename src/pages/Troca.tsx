import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type Cliente = {
  id: string
  nome: string
  cpf: string
  celular: string
  pontos: number
}

type Resgate = {
  id: string
  clienteid: string
  cupomnumero: number
  tipo: string
  valorcupom: number
  criadoem: string
}

/* =====================================================
   FORMATAÇÃO DE MOEDA
===================================================== */

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

/* =====================================================
   COMPONENTE PRINCIPAL
===================================================== */

export default function Trocas() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [resgates, setResgates] = useState<Resgate[]>([])

  /* ===================================================
     BUSCAR CLIENTES
  =================================================== */

  async function fetchClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id,nome,cpf,celular,pontos"
      )
      .order("nome")

    if (error) {
      alert(
        "Erro clientes: " +
          error.message
      )
      return
    }

    setClientes(
      (data || []).map((c: any) => ({
        id: String(c.id),
        nome: c.nome || "",
        cpf: c.cpf || "",
        celular: c.celular || "",
        pontos: Number(c.pontos || 0)
      }))
    )
  }

  /* ===================================================
     BUSCAR TROCAS
  =================================================== */

  async function fetchTrocas() {
    const { data, error } = await supabase
      .from("trocas")
      .select("*")
      .order("criadoem", {
        ascending: false
      })

    if (error) {
      alert(
        "Erro trocas: " +
          error.message
      )
      return
    }

    setResgates(
      (data || []).map((r: any) => ({
        id: String(r.id),
        clienteid: String(r.clienteid),
        cupomnumero: Number(
          r.cupomnumero || 0
        ),
        tipo:
          r.tipo ||
          "Cupom Fidelidade",

        /*
         * REGRA ATUAL:
         * 10 pontos = R$ 60,00
         */
        valorcupom: Number(
          r.valorcupom ?? 60
        ),

        criadoem: r.criadoem || ""
      }))
    )
  }

  /* ===================================================
     CARREGAMENTO
  =================================================== */

  useEffect(() => {
    fetchClientes()
    fetchTrocas()
  }, [])

  /* ===================================================
     BUSCAR CLIENTE
  =================================================== */

  function getCliente(clienteid: string) {
    return clientes.find(
      c => c.id === clienteid
    )
  }

  /* ===================================================
     DATA ATUAL
  =================================================== */

  const hoje = new Date()

  /* ===================================================
     RESGATES NO MÊS
  =================================================== */

  const totalMes = resgates.filter(r => {
    const d = new Date(r.criadoem)

    if (Number.isNaN(d.getTime())) {
      return false
    }

    return (
      d.getMonth() === hoje.getMonth() &&
      d.getFullYear() ===
        hoje.getFullYear()
    )
  }).length

  /* ===================================================
     CLIENTES ELEGÍVEIS

     10 pontos = 1 cupom
  =================================================== */

  const clientesElegiveis =
    clientes.filter(
      c => c.pontos >= 10
    ).length

  /* ===================================================
     CUPONS ATIVOS

     Cada 10 pontos representam
     1 cupom disponível.
  =================================================== */

  const cuponsAtivos =
    clientes.reduce(
      (acc, c) =>
        acc + Math.floor(
          Number(c.pontos || 0) / 10
        ),
      0
    )

  /* ===================================================
     VALOR TOTAL DOS RESGATES
  =================================================== */

  const valorTotalResgates =
    resgates.reduce(
      (total, r) =>
        total +
        Number(r.valorcupom || 0),
      0
    )

  /* ===================================================
     AGRUPAR POR MÊS
  =================================================== */

  const agrupados = resgates.reduce(
    (
      acc: Record<string, Resgate[]>,
      r
    ) => {
      const data = new Date(
        r.criadoem
      )

      if (Number.isNaN(data.getTime())) {
        return acc
      }

      /*
       * Usamos mês + 1 porque getMonth()
       * começa em 0.
       */
      const chave = `${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, "0")}`

      if (!acc[chave]) {
        acc[chave] = []
      }

      acc[chave].push(r)

      return acc
    },
    {}
  )

  /* ===================================================
     MESES ORDENADOS
  =================================================== */

  const mesesOrdenados =
    Object.keys(agrupados).sort(
      (a, b) =>
        b.localeCompare(a)
    )

  return (
    <div style={container}>
      {/* =================================================
          HEADER
      ================================================= */}

      <div style={header}>
        <div>
          <h1 style={title}>
            Trocas
          </h1>

          <span style={sub}>
            Histórico automático de
            cupons utilizados
          </span>
        </div>
      </div>

      {/* =================================================
          REGRA DE FIDELIDADE
      ================================================= */}

      <div style={regraCard}>
        <div>
          <span style={regraLabel}>
            Programa de fidelidade
          </span>

          <strong style={regraValor}>
            10 pontos = R$ 60,00
          </strong>
        </div>

        <span style={regraDescricao}>
          Cada cupom utilizado corresponde
          a R$ 60,00 em benefício.
        </span>
      </div>

      {/* =================================================
          INDICADORES
      ================================================= */}

      <div style={dashGrid}>
        <Dash
          label="Resgates no mês"
          value={totalMes}
        />

        <Dash
          label="Cupons ativos"
          value={cuponsAtivos}
        />

        <Dash
          label="Clientes elegíveis"
          value={clientesElegiveis}
        />

        <Dash
          label="Valor dos resgates"
          value={formatarMoeda(
            valorTotalResgates
          )}
        />
      </div>

      {/* =================================================
          HISTÓRICO
      ================================================= */}

      {mesesOrdenados.map(m => {
        const lista = agrupados[m]

        const [ano, mes] =
          m.split("-")

        const nomeMes = new Date(
          Number(ano),
          Number(mes) - 1
        ).toLocaleString(
          "pt-BR",
          {
            month: "long"
          }
        )

        const valorMes =
          lista.reduce(
            (total, r) =>
              total +
              Number(
                r.valorcupom || 0
              ),
            0
          )

        return (
          <div
            key={m}
            style={monthSection}
          >
            {/* TÍTULO DO MÊS */}

            <div
              style={monthHeader}
            >
              <div>
                <h2
                  style={mesTitulo}
                >
                  {nomeMes.toUpperCase()}{" "}
                  {ano}
                </h2>

                <span
                  style={monthSub}
                >
                  {lista.length}{" "}
                  {lista.length === 1
                    ? "resgate"
                    : "resgates"}
                </span>
              </div>

              <strong
                style={monthTotal}
              >
                {formatarMoeda(
                  valorMes
                )}
              </strong>
            </div>

            {/* LISTA */}

            <div style={card}>
              {lista.map(
                (r: Resgate) => {
                  const cliente =
                    getCliente(
                      r.clienteid
                    )

                  return (
                    <div
                      key={r.id}
                      style={row}
                    >
                      {/* CLIENTE */}

                      <div
                        style={
                          clientInfo
                        }
                      >
                        <strong>
                          {cliente?.nome ||
                            "Cliente"}
                        </strong>

                        <div
                          style={
                            muted
                          }
                        >
                          {cliente?.cpf ||
                            "-"}
                        </div>
                      </div>

                      {/* DATA */}

                      <div
                        style={
                          rowInfo
                        }
                      >
                        <span
                          style={
                            mobileLabel
                          }
                        >
                          Data
                        </span>

                        <span>
                          {r.criadoem
                            ? new Date(
                                r.criadoem
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </span>
                      </div>

                      {/* CUPOM */}

                      <div
                        style={
                          rowInfo
                        }
                      >
                        <span
                          style={
                            mobileLabel
                          }
                        >
                          Cupom
                        </span>

                        <span>
                          #{r.cupomnumero}
                        </span>
                      </div>

                      {/* VALOR */}

                      <div
                        style={
                          rowInfo
                        }
                      >
                        <span
                          style={
                            mobileLabel
                          }
                        >
                          Valor
                        </span>

                        <strong
                          style={
                            valorCupom
                          }
                        >
                          {formatarMoeda(
                            r.valorcupom
                          )}
                        </strong>
                      </div>

                      {/* STATUS */}

                      <div
                        style={
                          checkWrap
                        }
                      >
                        <span
                          style={
                            checkIcon
                          }
                        >
                          ✓
                        </span>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )
      })}

      {/* =================================================
          SEM REGISTROS
      ================================================= */}

      {mesesOrdenados.length ===
        0 && (
        <div style={empty}>
          Ainda não existem trocas
          ou cupons utilizados.
        </div>
      )}

      {/* =================================================
          RESPONSIVIDADE
      ================================================= */}

      <style>{`

        @media (max-width: 900px) {

          .trocas-row {
            grid-template-columns:
              minmax(180px, 2fr)
              minmax(100px, 1fr)
              minmax(90px, 1fr)
              minmax(100px, 1fr)
              50px !important;
          }

        }

        @media (max-width: 700px) {

          .trocas-container {
            padding: 20px !important;
          }

          .trocas-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }

          .trocas-row > div {
            width: 100%;
          }

          .trocas-check {
            width: 100% !important;
            justify-content: flex-start !important;
          }

          .trocas-mobile-label {
            display: block !important;
          }

          .trocas-month-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 5px !important;
          }

        }

        @media (max-width: 450px) {

          .trocas-container {
            padding: 16px !important;
          }

          .trocas-title {
            font-size: 28px !important;
          }

        }

      `}</style>
    </div>
  )
}

/* =====================================================
   COMPONENTE DASH
===================================================== */

function Dash({
  label,
  value
}: {
  label: string
  value: string | number
}) {
  return (
    <div style={dash}>
      <span style={dashLabel}>
        {label}
      </span>

      <strong style={dashValue}>
        {value}
      </strong>
    </div>
  )
}

/* =====================================================
   CONTAINER
===================================================== */

const container = {
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding: 40,
  background: "#f6f6f7",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  boxSizing:
    "border-box" as const,
  overflow: "hidden"
}

/* =====================================================
   HEADER
===================================================== */

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  marginBottom: 25
}

const title = {
  fontSize: 34,
  margin: 0,
  fontWeight: 600,
  letterSpacing:
    "-0.5px"
}

const sub = {
  color: "#777",
  fontSize: 13
}

/* =====================================================
   REGRA
===================================================== */

const regraCard = {
  background:
    "linear-gradient(135deg,#fffdf7,#fff)",
  border:
    "1px solid #eadfbf",
  borderRadius: 16,
  padding: 18,
  marginBottom: 18,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap:
    "wrap" as const
}

const regraLabel = {
  display: "block",
  fontSize: 11,
  color: "#8a8a8a",
  marginBottom: 5
}

const regraValor = {
  fontSize: 17,
  color: "#6d561b"
}

const regraDescricao = {
  fontSize: 12,
  color: "#777"
}

/* =====================================================
   DASH GRID
===================================================== */

const dashGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
  marginBottom: 30
}

const dash = {
  background: "#fff",
  padding: 18,
  borderRadius: 14,
  minWidth: 0,
  border:
    "1px solid #eeeeee",
  boxShadow:
    "0 3px 12px rgba(0,0,0,0.025)"
}

const dashLabel = {
  fontSize: 12,
  color: "#777",
  display: "block",
  marginBottom: 6
}

const dashValue = {
  fontSize: 22,
  fontWeight: 600,
  color: "#2d2d2d",
  overflowWrap:
    "anywhere" as const
}

/* =====================================================
   MÊS
===================================================== */

const monthSection = {
  marginBottom: 36,
  minWidth: 0
}

const monthHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 10,
  flexWrap:
    "wrap" as const
}

const mesTitulo = {
  fontSize: 16,
  margin: 0,
  fontWeight: 600
}

const monthSub = {
  display: "block",
  color: "#999",
  fontSize: 11,
  marginTop: 3
}

const monthTotal = {
  fontSize: 15,
  color: "#6d561b"
}

/* =====================================================
   CARD
===================================================== */

const card = {
  background: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  minWidth: 0,
  border:
    "1px solid #eeeeee"
}

/* =====================================================
   LINHA
===================================================== */

const row = {
  display: "grid",
  gridTemplateColumns:
    "minmax(200px,2fr) minmax(120px,1fr) minmax(100px,1fr) minmax(110px,1fr) 60px",
  gap: 16,
  padding: 16,
  borderTop:
    "1px solid #eee",
  alignItems: "center",
  minWidth: 0
}

/* =====================================================
   CLIENTE
===================================================== */

const clientInfo = {
  minWidth: 0,
  overflow: "hidden"
}

/* =====================================================
   INFORMAÇÕES
===================================================== */

const rowInfo = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 3,
  fontSize: 14,
  minWidth: 0
}

const mobileLabel = {
  display: "none",
  fontSize: 11,
  color: "#999"
}

/* =====================================================
   VALOR CUPOM
===================================================== */

const valorCupom = {
  fontSize: 14,
  fontWeight: 600,
  color: "#6d561b"
}

/* =====================================================
   TEXTO SECUNDÁRIO
===================================================== */

const muted = {
  fontSize: 12,
  color: "#999",
  marginTop: 3
}

/* =====================================================
   CHECK
===================================================== */

const checkWrap = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
}

const checkIcon = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#22c55e",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700
}

/* =====================================================
   VAZIO
===================================================== */

const empty = {
  padding: 30,
  textAlign:
    "center" as const,
  color: "#999",
  fontSize: 13,
  background: "#fff",
  borderRadius: 14,
  border:
    "1px solid #eeeeee"
}