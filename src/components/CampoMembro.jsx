import { useEffect, useMemo, useRef, useState } from "react"

export default function CampoMembro({ membros, valor, onChange, obrigatorio = true }) {
  const containerRef = useRef(null)
  const selecionado = membros.find((membro) => membro.id === valor)
  const [texto, setTexto] = useState("")
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    setTexto(selecionado?.nome || "")
  }, [selecionado?.nome])

  useEffect(() => {
    function fecharAoClicarFora(event) {
      if (!containerRef.current?.contains(event.target)) setAberto(false)
    }

    document.addEventListener("pointerdown", fecharAoClicarFora)
    return () => document.removeEventListener("pointerdown", fecharAoClicarFora)
  }, [])

  const filtrados = useMemo(() => {
    const busca = texto.trim().toLocaleLowerCase("pt-BR")
    if (!busca || selecionado?.nome === texto) return membros
    return membros.filter((membro) =>
      membro.nome.toLocaleLowerCase("pt-BR").includes(busca),
    )
  }, [membros, selecionado?.nome, texto])

  function pesquisar(nome) {
    setTexto(nome)
    setAberto(true)
    if (valor) onChange("")
  }

  function selecionar(membro) {
    setTexto(membro.nome)
    onChange(membro.id)
    setAberto(false)
  }

  return (
    <div
      className="secretaria-campo secretaria-campo-largo secretaria-seletor-membro"
      ref={containerRef}
    >
      <label htmlFor="secretaria-busca-membro">
        Membro{obrigatorio ? " *" : ""}
      </label>
      <div className="secretaria-seletor-controle">
        <input
          id="secretaria-busca-membro"
          type="search"
          value={texto}
          onChange={(event) => pesquisar(event.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Toque para escolher ou digite um nome"
          autoComplete="off"
          aria-expanded={aberto}
          aria-controls="secretaria-opcoes-membros"
          aria-autocomplete="list"
        />
        <button
          type="button"
          aria-label="Abrir lista de membros"
          onClick={() => setAberto((estado) => !estado)}
        >
          {aberto ? "▲" : "▼"}
        </button>
      </div>

      {aberto && (
        <div
          className="secretaria-seletor-opcoes"
          id="secretaria-opcoes-membros"
          role="listbox"
        >
          {filtrados.length === 0 ? (
            <p>Nenhum membro encontrado.</p>
          ) : (
            filtrados.map((membro) => (
              <button
                type="button"
                role="option"
                aria-selected={membro.id === valor}
                className={membro.id === valor ? "selecionado" : ""}
                onClick={() => selecionar(membro)}
                key={membro.id}
              >
                {membro.nome}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
