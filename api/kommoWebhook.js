export default async function handler(req, res) {

  console.log("Webhook recebido")

  console.log("METHOD:", req.method)

  console.log("BODY:", req.body)

  return res.status(200).json({ ok: true })

}
