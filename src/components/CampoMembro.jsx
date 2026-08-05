import { useEffect, useState } from "react"

export default function CampoMembro({ membros, valor, onChange, obrigatorio = true }) {
  const selecionado = membros.find((membro) => membro.id === valor)
  const [texto, setTexto] = useState("")

  useEffect(() => {
    setTexto(selecionado?.nome || "")
  }, [selecionado?.nome])

  function selecionar(nome) {
    setTexto(nome)
    const membro = membros.find((item) => item.nome === nome)
    onChange(membro?.id || "")
  }

  return (
    <label className="secretaria-campo secretaria-campo-largo">
      <span>Membro{obrigatorio ? " *" : ""}</span>
      <input
        list="secretaria-lista-membros"
        value={texto}
        onChange={(event) => selecionar(event.target.value)}
        placeholder="Digite para localizar um membro"
        required={obrigatorio}
      />
      <datalist id="secretaria-lista-membros">
        {membros.map((membro) => (
          <option value={membro.nome} key={membro.id} />
        ))}
      </datalist>
    </label>
  )
}
