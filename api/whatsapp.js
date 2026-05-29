import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function enviarMensagem(telefone, texto) {
  await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefone,
        type: "text",
        text: { body: texto },
      }),
    }
  );
}

function menuPrincipal() {
  return `Olá! 👋
Você está no sistema da AD Jacaré.

Digite uma opção:

1️⃣ Fazer pedido para a Mídia (Login necessário)
2️⃣ Consultar status do pedido (Login necessário)
3️⃣ Consultar agenda da igreja
4️⃣ Suporte do Portal do Aluno
5️⃣ Suporte para Líderes e Professores (Login necessário)`;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Token inválido");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  try {
    const mensagem = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!mensagem) {
      return res.status(200).send("Sem mensagem");
    }

    const telefone = mensagem.from;
    const texto = mensagem.text?.body?.trim();

    if (!texto) {
      await enviarMensagem(telefone, "Envie uma mensagem em texto.");
      return res.status(200).send("ok");
    }

    const { data: sessoes } = await supabase
      .from("whatsapp_sessoes")
      .select("*")
      .eq("telefone", telefone)
      .limit(1);

    let sessao = sessoes?.[0];

    if (!sessao) {
      const { data: novaSessao } = await supabase
        .from("whatsapp_sessoes")
        .insert({
          telefone,
          etapa: "menu",
          dados: {},
        })
        .select()
        .single();

      sessao = novaSessao;

      await enviarMensagem(telefone, menuPrincipal());
      return res.status(200).send("ok");
    }

    if (texto.toLowerCase() === "menu") {
      await supabase
        .from("whatsapp_sessoes")
        .update({ etapa: "menu", dados: {} })
        .eq("telefone", telefone);

      await enviarMensagem(telefone, menuPrincipal());
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "menu") {
      if (texto === "1") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: sessao.autenticado
              ? "aguardando_titulo_pedido"
              : "aguardando_email_pedido",
            dados: { destino: "Mídia" },
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          sessao.autenticado
            ? "Digite o título do pedido:"
            : "Para continuar, informe seu e-mail cadastrado no sistema:"
        );

        return res.status(200).send("ok");
      }

      if (texto === "2") {
        if (sessao.autenticado) {
          await consultarStatus(telefone, sessao.usuario_email);
        } else {
          await supabase
            .from("whatsapp_sessoes")
            .update({
              etapa: "aguardando_email_status",
              dados: {},
            })
            .eq("telefone", telefone);

          await enviarMensagem(
            telefone,
            "Para consultar seus pedidos, informe seu e-mail cadastrado:"
          );
        }

        return res.status(200).send("ok");
      }

      if (texto === "3") {
        await enviarMensagem(
          telefone,
          `📅 Agenda da igreja:

Acesse:
https://sistema.adjacare.org/agenda

Digite "menu" para voltar.`
        );

        return res.status(200).send("ok");
      }

      if (texto === "4") {
        await enviarMensagem(
          telefone,
          `🎓 Suporte do Portal do Aluno

Explique sua dúvida em uma mensagem.

Digite "menu" para voltar.`
        );

        return res.status(200).send("ok");
      }

      if (texto === "5") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: sessao.autenticado
              ? "suporte_lider"
              : "aguardando_email_suporte_lider",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          sessao.autenticado
            ? "Explique sua dúvida como líder/professor:"
            : "Para continuar, informe seu e-mail cadastrado:"
        );

        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Opção inválida.\n\n" + menuPrincipal());
      return res.status(200).send("ok");
    }

    if (
      sessao.etapa === "aguardando_email_pedido" ||
      sessao.etapa === "aguardando_email_status" ||
      sessao.etapa === "aguardando_email_suporte_lider"
    ) {
      const email = texto.trim().toLowerCase();

      const { data: usuarios, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email)
        .limit(1);

      console.log("BUSCA USERS:", { email, usuarios, error });

      const usuario = usuarios?.[0];

      if (!usuario) {
        await enviarMensagem(
          telefone,
          "Não encontrei esse e-mail no sistema."
        );
        return res.status(200).send("ok");
      }

      const nomeUsuario = usuario.nome || usuario.name || usuario.email;

      let proximaEtapa = "menu";

      if (sessao.etapa === "aguardando_email_pedido") {
        proximaEtapa = "aguardando_titulo_pedido";
      }

      if (sessao.etapa === "aguardando_email_status") {
        proximaEtapa = "consultando_status";
      }

      if (sessao.etapa === "aguardando_email_suporte_lider") {
        proximaEtapa = "suporte_lider";
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          autenticado: true,
          usuario_id: usuario.id,
          usuario_nome: nomeUsuario,
          usuario_email: usuario.email,
          etapa: proximaEtapa,
        })
        .eq("telefone", telefone);

      if (proximaEtapa === "aguardando_titulo_pedido") {
        await enviarMensagem(
          telefone,
          `Olá, ${nomeUsuario}! ✅
Acesso confirmado.

Digite o título do pedido:`
        );
      }

      if (proximaEtapa === "consultando_status") {
        await consultarStatus(telefone, usuario.email);
      }

      if (proximaEtapa === "suporte_lider") {
        await enviarMensagem(
          telefone,
          `Olá, ${nomeUsuario}! ✅
Acesso confirmado.

Explique sua dúvida como líder/professor:`
        );
      }

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_titulo_pedido") {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "aguardando_descricao_pedido",
          dados: {
            ...sessao.dados,
            titulo: texto,
          },
        })
        .eq("telefone", telefone);

      await enviarMensagem(telefone, "Agora descreva o pedido:");
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_descricao_pedido") {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "aguardando_prioridade_pedido",
          dados: {
            ...sessao.dados,
            descricao: texto,
          },
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Qual a prioridade?

1 - Normal
2 - Urgente
3 - Baixa`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_prioridade_pedido") {
      let prioridade = "Normal";

      if (texto === "2") prioridade = "Urgente";
      if (texto === "3") prioridade = "Baixa";

      const dados = {
        ...sessao.dados,
        prioridade,
      };

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "confirmando_pedido",
          dados,
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Confira o pedido:

Título: ${dados.titulo}
Descrição: ${dados.descricao}
Destino: ${dados.destino}
Prioridade: ${dados.prioridade}

Digite:
1 - Confirmar
2 - Cancelar`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "confirmando_pedido") {
      if (texto === "1") {
        const dados = sessao.dados;

        await supabase.from("pedidos").insert({
          titulo: dados.titulo,
          descricao: dados.descricao,
          destino: dados.destino || "Mídia",
          prioridade: dados.prioridade || "Normal",
          ministerio: "WhatsApp",
          criado_por: sessao.usuario_nome || "WhatsApp",
          usuario_email: sessao.usuario_email,
          status: "Pendente",
        });

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `✅ Pedido criado com sucesso!

Status inicial: Pendente

Digite "menu" para voltar.`
        );

        return res.status(200).send("ok");
      }

      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          "Pedido cancelado.\n\n" + menuPrincipal()
        );

        return res.status(200).send("ok");
      }

      await enviarMensagem(
        telefone,
        "Digite 1 para confirmar ou 2 para cancelar."
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "suporte_lider") {
      await supabase.from("pedidos").insert({
        titulo: "Suporte para líder/professor",
        descricao: texto,
        destino: "Mídia",
        prioridade: "Normal",
        ministerio: "Suporte",
        criado_por: sessao.usuario_nome || "WhatsApp",
        usuario_email: sessao.usuario_email,
        status: "Pendente",
      });

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "menu",
          dados: {},
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `✅ Solicitação enviada com sucesso!

A equipe irá verificar.

Digite "menu" para voltar.`
      );

      return res.status(200).send("ok");
    }

    await enviarMensagem(telefone, menuPrincipal());
    return res.status(200).send("ok");
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send("Erro interno");
  }
}

async function consultarStatus(telefone, usuarioEmail) {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("titulo, status, prioridade, criado_em")
    .eq("usuario_email", usuarioEmail)
    .order("criado_em", { ascending: false })
    .limit(5);

  if (!pedidos || pedidos.length === 0) {
    await enviarMensagem(
      telefone,
      `Não encontrei pedidos no seu nome.

Digite "menu" para voltar.`
    );
    return;
  }

  const lista = pedidos
    .map(
      (p, index) =>
        `${index + 1}. ${p.titulo}
Status: ${p.status}
Prioridade: ${p.prioridade}`
    )
    .join("\n\n");

  await enviarMensagem(
    telefone,
    `📌 Seus últimos pedidos:

${lista}

Digite "menu" para voltar.`
  );
}
