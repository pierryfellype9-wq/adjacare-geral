import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req,res){

try{

const { titulo,mensagem,destino } = req.body

await supabase
.from("avisos")
.insert({
titulo,
mensagem,
destino
})

const { data:usuarios } = await supabase
.from("users")
.select("email,role")

const emails = usuarios
.filter(u => destino === "Todos" || u.role === destino)
.map(u => u.email)

await resend.emails.send({

from:"Sistema ADJACARÉ <midia@adjacare.org>",
to:emails,
subject:`Novo aviso: ${titulo}`,

html:`

<h2>${titulo}</h2>

<p>${mensagem}</p>

<p><b>Destino:</b> ${destino}</p>

<p>Sistema ADJACARÉ</p>

`

})

res.status(200).json({ok:true})

}catch(e){

console.log(e)

res.status(500).json({erro:e.message})

}

}
