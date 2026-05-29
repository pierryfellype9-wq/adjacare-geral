export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  try {
    const { nome, contato, login, senha, turma } = req.body

    if (!contato) {
      return res.status(400).json({ error: "Contato não informado" })
    }

    let numero = contato.replace(/\D/g, "")

    if (!numero.startsWith("55")) {
      numero = `55${numero}`
    }

    const mensagem = `
Olá! 👋

Este é o canal oficial do Sistema ADJACARÉ!

⚠️ Este número não recebe respostas.

O aluno ${nome} foi cadastrado com sucesso no sistema!

📚 Classe:
${turma}

🔗 Portal do Aluno:
https://sistema.adjacare.org/portal-aluno

👤 Login:
${login}

🔑 Senha inicial:
${senha}

Guarde essas informações para futuros acessos.

Sistema Geral ADJACARÉ
`.trim()

    const resposta = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numero,
          type: "text",
          text: {
            body: mensagem,
          },
        }),
      }
    )

    const data = await resposta.json()

    if (!resposta.ok) {
      console.error("Erro Meta WhatsApp:", data)
      return res.status(500).json({ error: data })
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error("Erro interno:", error)
    return res.status(500).json({ error: "Erro interno ao enviar WhatsApp" })
  }
}
