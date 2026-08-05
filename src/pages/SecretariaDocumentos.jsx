import SecretariaRegistros from "./SecretariaRegistros"

export default function SecretariaDocumentos({ user }) {
  return <SecretariaRegistros tipoPagina="documentos" user={user} />
}
