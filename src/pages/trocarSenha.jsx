import { useState } from "react"

export default function TrocarSenha({user,setUser,setPage}){

const [senha,setSenha] = useState("")
const [confirmar,setConfirmar] = useState("")

function salvar(e){
e.preventDefault()

if(senha.length < 4){
alert("A senha deve ter pelo menos 4 caracteres")
return
}

if(senha !== confirmar){
alert("As senhas não coincidem")
return
}

localStorage.setItem(user.email,senha)

alert("Senha alterada com sucesso!")

setPage("dashboard")
}

return(

<div className="login-page">

<div className="login-card">

<h2>Alterar Senha</h2>

<form onSubmit={salvar}>

<input
type="password"
placeholder="Nova senha"
value={senha}
onChange={e=>setSenha(e.target.value)}
/>

<input
type="password"
placeholder="Confirmar senha"
value={confirmar}
onChange={e=>setConfirmar(e.target.value)}
/>

<button className="login-btn">
Salvar nova senha
</button>

</form>

</div>

</div>

)

}