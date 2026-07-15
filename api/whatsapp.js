import { createClient } from "@supabase/supabase-js";
import { iniciarPedidoTetelestai, processarPedidoTetelestai } from "../server/whatsappTetelestai.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

async function salvarMensagem(telefone, direcao, mensagem) {
  await supabase.from("whatsapp_mensagens").insert({
    telefone,
    direcao,
    mensagem,
  });
}

async function enviarMensagem(telefone, texto) {
  await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telefone,
        type: "text",
        text: {
          body: texto,
          preview_url: false,
        },
      }),
    }
  );

  await salvarMensagem(telefone, "enviada", texto);
}

async function enviarInterativo(telefone, interactive, registro) {
  const resposta = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: telefone, type: "interactive", interactive }),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`WhatsApp recusou a mensagem interativa: ${detalhe}`);
  }
  await salvarMensagem(telefone, "enviada", registro);
}

async function enviarLista(telefone, { cabecalho, corpo, botao, secoes }) {
  try {
    const sections = secoes.map(({ titulo, title, rows }) => ({
      title: (title || titulo || "Opções").slice(0, 24),
      rows,
    }));
    await enviarInterativo(telefone, {
      type: "list",
      header: cabecalho ? { type: "text", text: cabecalho.slice(0, 60) } : undefined,
      body: { text: corpo.slice(0, 1024) },
      action: { button: botao.slice(0, 20), sections },
    }, `${cabecalho || "Lista"}\n${corpo}`);
  } catch (error) {
    console.error("Falha ao enviar lista; usando texto:", error.message);
    const linhas = secoes.flatMap(s => s.rows).map((r,i) => `${i + 1}. ${r.title}${r.description ? ` — ${r.description}` : ""}`).join("\n");
    await enviarMensagem(telefone, `*${cabecalho || "Escolha uma opção"}*\n\n${corpo}\n\n${linhas}\n\nResponda com o número da opção.`);
  }
}

async function enviarBotoes(telefone, { corpo, botoes }) {
  try {
    await enviarInterativo(telefone, {
      type: "button",
      body: { text: corpo.slice(0, 1024) },
      action: { buttons: botoes.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })) },
    }, corpo);
  } catch (error) {
    console.error("Falha ao enviar botões; usando texto:", error.message);
    await enviarMensagem(telefone, `${corpo}\n\n${botoes.map((b,i)=>`${i+1}. ${b.title}`).join("\n")}\n\nResponda com o número da opção.`);
  }
}

async function enviarMenuPrincipal(telefone) {
  await enviarLista(telefone, {
    cabecalho: "AD Jacaré",
    corpo: "Olá! Escolha como podemos ajudar.",
    botao: "Abrir opções",
    secoes: [{ titulo: "Atendimento", rows: [
      { id:"menu_midia", title:"Pedido para Mídia", description:"Solicitar arte, divulgação ou mídia" },
      { id:"menu_ebd", title:"Senha da EBD", description:"Consultar acesso do aluno" },
      { id:"menu_atendente", title:"Falar com atendente", description:"Atendimento humano" },
      { id:"menu_som", title:"Som e Projeção", description:"Enviar hino, áudio ou vídeo" },
      { id:"menu_outros", title:"Outras opções", description:"Mídia, Secretaria ou Suporte" },
      { id:"menu_tetelestai", title:"Camisetas Tetelestai", description:"Montar ou consultar seu pedido" },
    ] }],
  });
}

async function enviarMenuOutrasOpcoes(telefone) {
  await enviarLista(telefone, { cabecalho:"Outras opções", corpo:"Escolha o setor desejado.", botao:"Escolher setor", secoes:[{titulo:"Setores",rows:[
    {id:"outros_midia",title:"Mídia"},{id:"outros_secretaria",title:"Secretaria"},{id:"outros_suporte",title:"Suporte"},{id:"outros_menu",title:"Menu principal"},
  ]}] });
}

function menuPrincipal() {
  return `Olá! 👋
Você está no atendimento da AD Jacaré.

Digite uma opção:

1️⃣ Fazer pedido
2️⃣ Consultar senha da EBD
3️⃣ Falar com um atendente
4️⃣ Enviar hino, áudio ou vídeo para Som/Projeção
5️⃣ Outras opções`;
}

function menuOutrasOpcoes() {
  return `Outras opções:

1️⃣ Falar com a Mídia
2️⃣ Falar com a Secretaria
3️⃣ Falar com o Suporte
4️⃣ Voltar ao menu principal`;
}

function ehSaudacao(texto = "") {
  const normalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z\s]/g, "").trim();
  return /^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite|iniciar|inicio|comecar|atendimento)$/.test(normalizado);
}

async function ativarAtendimentoHumano(telefone, destino = "Atendimento") {
  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "atendimento_humano",
      atendimento_humano: true,
      atendente_nome: null,
      autenticado: false,
      usuario_id: null,
      usuario_nome: null,
      usuario_email: null,
      dados: { destino },
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `👋 Sua conversa foi encaminhada para *${destino}*.

Aguarde um momento. Um atendente irá responder por aqui.`
  );
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

    if (!mensagem) return res.status(200).send("Sem mensagem");

    if (mensagem.id) {
      const { error: erroEvento } = await supabase.from("whatsapp_eventos_processados").insert({ mensagem_id: mensagem.id });
      if (erroEvento?.code === "23505") return res.status(200).send("Mensagem já processada");
      if (erroEvento) console.error("Deduplicação indisponível:", erroEvento.message);
    }

    const telefone = mensagem.from;
    const interacaoId = mensagem.interactive?.list_reply?.id || mensagem.interactive?.button_reply?.id;
    const aliases = { menu_midia:"1", menu_ebd:"2", menu_atendente:"3", menu_som:"4", menu_outros:"5", menu_tetelestai:"6", outros_midia:"1", outros_secretaria:"2", outros_suporte:"3", outros_menu:"4" };
    const texto = aliases[interacaoId] || interacaoId || mensagem.text?.body?.trim();

    if (texto) {
      await salvarMensagem(telefone, "recebida", mensagem.interactive?.list_reply?.title || mensagem.interactive?.button_reply?.title || texto);
    }

    const { data: sessoes } = await supabase
      .from("whatsapp_sessoes")
      .select("*")
      .eq("telefone", telefone)
      .limit(1);

    let sessao = sessoes?.[0];

    if (!sessao) {
      const { data: novaSessao, error } = await supabase
        .from("whatsapp_sessoes")
        .insert({
          telefone,
          etapa: "menu",
          autenticado: false,
          atendimento_humano: false,
          dados: {},
        })
        .select()
        .single();

      if (error) {
        await enviarMensagem(telefone, `Erro ao iniciar sessão: ${error.message}`);
        return res.status(200).send("ok");
      }

      sessao = novaSessao;
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (!texto) {
      await enviarMensagem(
        telefone,
        `Recebi seu arquivo/mídia. ✅

Para enviar hino, áudio ou vídeo para Som/Projeção, digite *4* no menu principal.`
      );
      return res.status(200).send("ok");
    }

    if (texto.toLowerCase() === "menu" || ehSaudacao(texto)) {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "menu",
          autenticado: false,
          usuario_id: null,
          usuario_nome: null,
          usuario_email: null,
          atendimento_humano: false,
          dados: {},
        })
        .eq("telefone", telefone);

      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.atendimento_humano === true) {
      return res.status(200).send("Atendimento humano ativo");
    }

    if (sessao.etapa === "menu") {
      if (texto === "1") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "aguardando_email_pedido",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: { destino: "Mídia" },
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          "Para continuar, informe seu e-mail cadastrado no sistema:"
        );

        return res.status(200).send("ok");
      }

      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "aguardando_nome_ebd",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `🔐 Consulta de senha da EBD

Informe o nome completo do aluno:`
        );

        return res.status(200).send("ok");
      }

      if (texto === "3") {
        await ativarAtendimentoHumano(telefone, "Atendimento");
        return res.status(200).send("ok");
      }

      if (texto === "4") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "aguardando_nome_som_projecao",
            dados: { destino: "Som/Projeção" },
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `🎵 Som/Projeção

Informe seu nome para começarmos:`
        );

        return res.status(200).send("ok");
      }

      if (texto === "5") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu_outras_opcoes",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMenuOutrasOpcoes(telefone);
        return res.status(200).send("ok");
      }

      if (texto === "6") {
        await iniciarPedidoTetelestai({ telefone, enviarMensagem });
        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Não consegui identificar essa opção.");
      await enviarMenuPrincipal(telefone);
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "menu_outras_opcoes") {
      if (texto === "1") {
        await ativarAtendimentoHumano(telefone, "Mídia");
        return res.status(200).send("ok");
      }

      if (texto === "2") {
        await ativarAtendimentoHumano(telefone, "Secretaria");
        return res.status(200).send("ok");
      }

      if (texto === "3") {
        await ativarAtendimentoHumano(telefone, "Suporte");
        return res.status(200).send("ok");
      }

      if (texto === "4") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMenuPrincipal(telefone);
        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Não consegui identificar essa opção.");
      await enviarMenuOutrasOpcoes(telefone);
      return res.status(200).send("ok");
    }

    if (await processarPedidoTetelestai({ telefone, texto, sessao, enviarMensagem, enviarLista, enviarBotoes })) {
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_nome_ebd") {
  const nomeBusca = texto.trim();

  const { data: alunos, error } = await supabase
    .from("ebd_alunos")
    .select("*")
    .ilike("nome", `%${nomeBusca}%`)
    .limit(5);

  if (error) {
    await enviarMensagem(
      telefone,
      `Erro ao consultar aluno da EBD.

Detalhe: ${error.message}`
    );
    return res.status(200).send("ok");
  }

  if (!alunos || alunos.length === 0) {
    await enviarMensagem(
      telefone,
      `Não encontrei nenhum aluno com esse nome.

Confira se digitou corretamente ou envie "menu" para voltar.`
    );
    return res.status(200).send("ok");
  }

  if (alunos.length > 1) {
    const lista = alunos
      .map((aluno, index) => `${index + 1}. ${aluno.nome}`)
      .join("\n");

    await supabase
      .from("whatsapp_sessoes")
      .update({
        etapa: "selecionando_aluno_ebd",
        dados: { alunos },
      })
      .eq("telefone", telefone);

    await enviarMensagem(
      telefone,
      `Encontrei mais de um aluno:

${lista}

Digite o número correspondente:`
    );

    return res.status(200).send("ok");
  }

  const aluno = alunos[0];

  const login = aluno.email_portal || "Login não cadastrado";
  const senha = aluno.senha_portal || "Senha não cadastrada";
  const situacao = aluno.ativo ? "🟢 Ativo" : "🔴 Inativo";

  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "portal_aluno_opcoes",
      dados: {},
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `🎓 Dados do Portal do Aluno

👤 Aluno: ${aluno.nome}

📧 Login: ${login}

🔑 Senha: ${senha}

📌 Situação: ${situacao}

🌐 Acesso:
https://sistema.adjacare.org/portal-aluno

Digite:

1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "selecionando_aluno_ebd") {
  const indice = Number(texto) - 1;
  const alunos = sessao.dados?.alunos || [];
  const aluno = alunos[indice];

  if (!aluno) {
    await enviarMensagem(telefone, "Opção inválida. Digite o número do aluno.");
    return res.status(200).send("ok");
  }

  const login = aluno.email_portal || "Login não cadastrado";
  const senha = aluno.senha_portal || "Senha não cadastrada";
  const situacao = aluno.ativo ? "🟢 Ativo" : "🔴 Inativo";

  await supabase
    .from("whatsapp_sessoes")
    .update({
      etapa: "portal_aluno_opcoes",
      dados: {},
    })
    .eq("telefone", telefone);

  await enviarMensagem(
    telefone,
    `🎓 Dados do Portal do Aluno

👤 Aluno: ${aluno.nome}

📧 Login: ${login}

🔑 Senha: ${senha}

📌 Situação: ${situacao}

🌐 Acesso:
https://sistema.adjacare.org/portal-aluno

Digite:

1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "portal_aluno_opcoes") {
  if (texto === "1") {
    await ativarAtendimentoHumano(telefone, "Suporte");

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

    await enviarMenuPrincipal(telefone);

    return res.status(200).send("ok");
  }

  await enviarMensagem(
    telefone,
    `Opção inválida.

Digite:
1️⃣ Falar com um atendente
2️⃣ Voltar ao menu`
  );

  return res.status(200).send("ok");
}

    if (sessao.etapa === "aguardando_nome_som_projecao") {
      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "aguardando_descricao_som_projecao",
          dados: {
            ...sessao.dados,
            nome: texto,
          },
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Certo, ${texto}.

Agora envie a letra do hino, o nome do hino, link do vídeo ou explique o que precisa para Som/Projeção:`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "aguardando_descricao_som_projecao") {
      const dados = {
        ...sessao.dados,
        descricao: texto,
      };

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "confirmando_som_projecao",
          dados,
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `Confira a solicitação:

Nome: ${dados.nome}
Destino: Som/Projeção
Descrição: ${dados.descricao}

Digite:
1 - Confirmar
2 - Cancelar`
      );

      return res.status(200).send("ok");
    }

    if (sessao.etapa === "confirmando_som_projecao") {
      if (texto === "1") {
        const dados = sessao.dados || {};

        const { error } = await supabase.from("pedidos").insert({
          titulo: "WhatsApp - Som/Projeção",
          descricao: dados.descricao,
          destino: "Som/Projeção",
          prioridade: "Normal",
          ministerio: "Som/Projeção",
          criado_por: dados.nome || "WhatsApp",
          status: "Pendente",
        });

        if (error) {
          await enviarMensagem(
            telefone,
            `Erro ao salvar solicitação.

Detalhe: ${error.message}`
          );
          return res.status(200).send("ok");
        }

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `✅ Solicitação enviada para Som/Projeção.

A equipe irá verificar assim que possível.

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
          `Solicitação cancelada.

Digite "menu" para voltar.`
        );

        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Digite 1 para confirmar ou 2 para cancelar.");
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

      if (error) {
        await enviarMensagem(telefone, `Erro ao consultar usuário: ${error.message}`);
        return res.status(200).send("ok");
      }

      const usuario = usuarios?.[0];

      if (!usuario) {
        await enviarMensagem(telefone, "Não encontrei esse e-mail no sistema.");
        return res.status(200).send("ok");
      }

      const nomeUsuario = usuario.nome || usuario.name || usuario.email;

      const ministerioUsuario =
        usuario.ministerio ||
        usuario.departamento ||
        usuario.setor ||
        usuario.role ||
        "Não informado";

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
          dados: {
            ...sessao.dados,
            ministerio: ministerioUsuario,
          },
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
        await consultarStatus(telefone, nomeUsuario);

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);
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
Ministério: ${dados.ministerio || "Não informado"}
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

        const { error: erroPedido } = await supabase.from("pedidos").insert({
          titulo: dados.titulo,
          descricao: dados.descricao,
          destino: dados.destino || "Mídia",
          prioridade: dados.prioridade || "Normal",
          ministerio: dados.ministerio || "Não informado",
          criado_por: sessao.usuario_nome || "WhatsApp",
          status: "Pendente",
        });

        if (erroPedido) {
          await enviarMensagem(
            telefone,
            `Erro ao salvar o pedido no sistema.

Detalhe: ${erroPedido.message}`
          );
          return res.status(200).send("ok");
        }

        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `✅ Pedido criado com sucesso!

Status inicial: Pendente.

Conversa encerrada. Para uma nova solicitação, envie "menu" e faça a autenticação novamente.`
        );

        return res.status(200).send("ok");
      }

      if (texto === "2") {
        await supabase
          .from("whatsapp_sessoes")
          .update({
            etapa: "menu",
            autenticado: false,
            usuario_id: null,
            usuario_nome: null,
            usuario_email: null,
            dados: {},
          })
          .eq("telefone", telefone);

        await enviarMensagem(
          telefone,
          `Pedido cancelado.

Conversa encerrada. Para uma nova solicitação, envie "menu".`
        );

        return res.status(200).send("ok");
      }

      await enviarMensagem(telefone, "Digite 1 para confirmar ou 2 para cancelar.");
      return res.status(200).send("ok");
    }

    if (sessao.etapa === "suporte_lider") {
      const { error: erroSuporte } = await supabase.from("pedidos").insert({
        titulo: "Suporte para líder/professor",
        descricao: texto,
        destino: "Mídia",
        prioridade: "Normal",
        ministerio: sessao.dados?.ministerio || "Não informado",
        criado_por: sessao.usuario_nome || "WhatsApp",
        status: "Pendente",
      });

      if (erroSuporte) {
        await enviarMensagem(
          telefone,
          `Erro ao enviar suporte.

Detalhe: ${erroSuporte.message}`
        );
        return res.status(200).send("ok");
      }

      await supabase
        .from("whatsapp_sessoes")
        .update({
          etapa: "menu",
          autenticado: false,
          usuario_id: null,
          usuario_nome: null,
          usuario_email: null,
          dados: {},
        })
        .eq("telefone", telefone);

      await enviarMensagem(
        telefone,
        `✅ Solicitação enviada com sucesso!

Conversa encerrada. Para uma nova solicitação, envie "menu" e faça a autenticação novamente.`
      );

      return res.status(200).send("ok");
    }

    await enviarMenuPrincipal(telefone);
    return res.status(200).send("ok");
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(200).send("Erro registrado");
  }
}

async function consultarStatus(telefone, nomeUsuario) {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("titulo, status, prioridade, created_at")
    .eq("criado_por", nomeUsuario)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    await enviarMensagem(
      telefone,
      `Erro ao consultar pedidos.

Detalhe: ${error.message}`
    );
    return;
  }

  if (!pedidos || pedidos.length === 0) {
    await enviarMensagem(
      telefone,
      `Não encontrei pedidos no seu nome.

Conversa encerrada. Para uma nova consulta, envie "menu".`
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

Conversa encerrada. Para uma nova solicitação, envie "menu".`
  );
}
