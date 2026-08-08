import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "./GestaoGeral.css"

const ATALHOS = [
  ["Secretaria", "Membros, documentos e movimentações", "/secretaria"],
  ["Usuários", "Perfis, acessos e permissões", "/usuarios"],
  ["Custos fixos", "Compromissos financeiros recorrentes", "/custos-fixos"],
  ["Agenda", "Programação e compromissos da igreja", "/agenda"],
  ["Avisos", "Comunicação interna por perfil", "/avisos"],
  ["EBD", "Ensino, frequência e relatórios", "/ebd"],
]

export default function GestaoGeral() {
  const navigate = useNavigate()
  const [dados, setDados] = useState({ membros: null, ativos: null, usuarios: null, pedidos: null, avisos: null })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const [membros, ativos, usuarios, pedidos, avisos] = await Promise.all([
        supabase.from("membros").select("id", { count: "exact", head: true }),
        supabase.from("membros").select("id", { count: "exact", head: true }).eq("situacao_cadastral", "Ativo"),
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("pedidos").select("id", { count: "exact", head: true }).not("status", "in", "(concluido,arquivado)"),
        supabase.from("avisos").select("id", { count: "exact", head: true }),
      ])
      if (ativo) { setDados({ membros: membros.count, ativos: ativos.count, usuarios: usuarios.count, pedidos: pedidos.count, avisos: avisos.count }); setCarregando(false) }
    }
    carregar()
    return () => { ativo = false }
  }, [])

  return <main className="gestao-page">
    <header className="gestao-hero"><div><small>ADMINISTRAÇÃO</small><h1>Gestão geral</h1><p>Uma visão única das áreas essenciais da Assembleia de Deus, Bairro Jacaré.</p></div><span>Visão institucional</span></header>
    <section className="gestao-indicadores" aria-busy={carregando}>
      <article className="destaque"><small>BASE GERAL</small><strong>{dados.membros ?? "—"}</strong><p>membros cadastrados</p></article>
      <article><small>MEMBROS ATIVOS</small><strong>{dados.ativos ?? "—"}</strong><p>em situação ativa</p></article>
      <article><small>USUÁRIOS</small><strong>{dados.usuarios ?? "—"}</strong><p>acessos cadastrados</p></article>
      <article><small>EM ANDAMENTO</small><strong>{dados.pedidos ?? "—"}</strong><p>pedidos não finalizados</p></article>
      <article><small>COMUNICAÇÃO</small><strong>{dados.avisos ?? "—"}</strong><p>avisos registrados</p></article>
    </section>
    <section className="gestao-conteudo"><div><small>ÁREAS DO SISTEMA</small><h2>Acessos administrativos</h2><p>Entre diretamente em cada área para consultar ou atualizar informações.</p></div><div className="gestao-atalhos">{ATALHOS.map(([titulo, descricao, rota], indice) => <button type="button" key={rota} onClick={() => navigate(rota)}><b>{String(indice + 1).padStart(2, "0")}</b><span><strong>{titulo}</strong><small>{descricao}</small></span><i>→</i></button>)}</div></section>
  </main>
}
