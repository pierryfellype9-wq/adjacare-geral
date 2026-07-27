import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "./supabase";

const TOKEN_LOCAL = "adjacare_push_token";

async function accessTokenAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function registrarTokenNoServidor(token) {
  const accessToken = await accessTokenAtual();
  if (!accessToken) return;

  const resposta = await fetch("/api/push-register", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      platform: Capacitor.getPlatform(),
    }),
  });

  if (!resposta.ok) throw new Error("O servidor não aceitou o token de notificação.");
  localStorage.setItem(TOKEN_LOCAL, token);
}

function abrirDestinoNotificacao(notification) {
  const destino = notification?.notification?.data?.path;
  if (!destino || !destino.startsWith("/")) return;

  window.history.pushState({}, "", destino);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export async function ativarPushNotifications() {
  if (!Capacitor.isNativePlatform()) return () => {};

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: "adjacare_principal",
      name: "Avisos do Sistema ADJACARÉ",
      description: "Novos hinos e avisos principais da igreja",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  }

  const listeners = await Promise.all([
    PushNotifications.addListener("registration", ({ value }) => {
      registrarTokenNoServidor(value).catch((error) =>
        console.error("Falha ao registrar notificações:", error)
      );
    }),
    PushNotifications.addListener("registrationError", (error) => {
      console.error("Falha no registro de notificações:", error);
    }),
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      abrirDestinoNotificacao
    ),
  ]);

  let permissao = await PushNotifications.checkPermissions();
  if (permissao.receive === "prompt") {
    permissao = await PushNotifications.requestPermissions();
  }
  if (permissao.receive === "granted") {
    await PushNotifications.register();
  }

  return () => {
    listeners.forEach((listener) => listener.remove());
  };
}

export async function desativarPushDesteUsuario() {
  if (!Capacitor.isNativePlatform()) return;

  const token = localStorage.getItem(TOKEN_LOCAL);
  const accessToken = await accessTokenAtual();
  if (!token || !accessToken) return;

  await fetch("/api/push-register", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  }).catch(() => undefined);

  localStorage.removeItem(TOKEN_LOCAL);
}
