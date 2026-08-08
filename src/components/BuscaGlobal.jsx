import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { temPermissao } from "../lib/permissions"

const ROTAS = [
  ["Início", "Painel e resumo do sistema", "/dashboard", ""],
  ["Pedidos", "Solicitações e acompanhamento", "/pedidos", ""],
  ["Agenda", "Cultos, reuniões e compromissos", "/agenda", ""],
  ["Avisos", "Comunicados internos", "/avisos", ""],
  ["Escola Bíblica", "Alunos, chamada e relatórios", "/ebd", ""],
  ["WhatsApp", "Conversas e atendimento", "/whatsapp", "whatsapp"],
  ["Escala da Mídia", "Organização das equipes", "/escala-midia", "escala"],
  ["Secretaria", "Membros, documentos e movimentações", "/secretaria", "secretaria"],
  ["Usuários", "Acessos ao sistema", "/usuarios", "administrarUsuarios"],
  ["Senhas de aplicativos", "Cofre de acessos", "/senhas-aplicativos", "senhasAplicativos"],
  ["Custos fixos", "Despesas recorrentes", "/custos-fixos", "custosFixos"],
  ["Gestão geral", "Indicadores e atalhos administrativos", "/gestao", "gestao"],
]

function normalizar(valor = "") {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

export default function BuscaGlobal({ user }) {
  const navigate = useNavigate()
  const area = useRef(null)
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState("")
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(false)

  const rotas = useMemo(() => ROTAS.filter(([, , , permissao]) => !permissao || temPermissao(user, permissao)), [user])
  const rotasFiltradas = useMemo(() => {
    const busca = normalizar(termo)
    if (!busca) return rotas.slice(0, 6)
    return rotas.filter(([titulo, descricao]) => normalizar(`${titulo} ${descricao}`).includes(busca)).slice(0, 6)
  }, [rotas, termo])

  useEffect(() => {
    function fechar(evento) {
      if (!area.current?.contains(evento.target)) setAberta(false)
    }
    function atalho(evento) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault()
        setAberta(true)
        requestAnimationFrame(() => area.current?.querySelector("input")?.focus())
      }
      if (evento.key === "Escape") setAberta(false)
    }
    document.addEventListener("pointerdown", fechar)
    document.addEventListener("keydown", atalho)
    return () => { document.removeEventListener("pointerdown", fechar); document.removeEventListener("keydown", atalho) }
  }, [])

  useEffect(() => {
    if (!aberta || !temPermissao(user, "membros") || termo.trim().length < 2) {
      setMembros([])
      return undefined
    }
    const timer = setTimeout(async () => {
      setCarregando(true)
      const { data } = await supabase.from("membros").select("id,nome,telefone,situacao_cadastral").ilike("nome", `%${termo.trim()}%`).order("nome").limit(6)
      setMembros(data || [])
      setCarregando(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [aberta, termo, user])

  function abrir(rota) {
    navigate(rota)
    setAberta(false)
    setTermo("")
  }

  return (
    <div className="busca-global" ref={area}>
      <button type="button" className="app-topbar__icone" onClick={() => setAberta((valor) => !valor)} aria-label="Buscar no sistema" title="Buscar (Ctrl + K)">⌕</button>
      {aberta && <div className="busca-global__painel">
        <label><span>⌕</span><input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar página ou membro..." /></label>
        <div className="busca-global__resultados">
          <small>PÁGINAS</small>
          {rotasFiltradas.map(([titulo, descricao, rota]) => <button type="button" key={rota} onClick={() => abrir(rota)}><span>↗</span><div><strong>{titulo}</strong><small>{descricao}</small></div></button>)}
          {temPermissao(user, "membros") && termo.trim().length >= 2 && <>
            <small>MEMBROS</small>
            {carregando ? <p>Buscando membros...</p> : membros.map((membro) => <button type="button" key={membro.id} onClick={() => abrir(`/membros?busca=${encodeURIComponent(membro.nome)}`)}><span>{membro.nome.charAt(0)}</span><div><strong>{membro.nome}</strong><small>{membro.situacao_cadastral || "Cadastro de membro"}</small></div></button>)}
          </>}
          {!carregando && !rotasFiltradas.length && !membros.length && <p>Nenhum resultado encontrado.</p>}
        </div>
        <footer><span>Use Ctrl + K para abrir</span><span>Esc para fechar</span></footer>
      </div>}
    </div>
  )
}
