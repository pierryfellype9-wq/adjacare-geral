import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Capacitor } from "@capacitor/core"

const ULTIMA_VERSAO_URL =
  "https://api.github.com/repos/pierryfellype9-wq/adjacare-geral/releases/latest"

function partesVersao(versao) {
  return String(versao || "")
    .replace(/^v/i, "")
    .split(/[.-]/)
    .slice(0, 3)
    .map((parte) => Number.parseInt(parte, 10) || 0)
}

function versaoMaior(novaVersao, versaoAtual) {
  const nova = partesVersao(novaVersao)
  const atual = partesVersao(versaoAtual)

  for (let indice = 0; indice < 3; indice += 1) {
    if (nova[indice] > atual[indice]) return true
    if (nova[indice] < atual[indice]) return false
  }

  return false
}

export async function verificarAtualizacaoDoApp() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return null
  }

  const [appInfo, resposta] = await Promise.all([
    App.getInfo(),
    fetch(ULTIMA_VERSAO_URL, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    }),
  ])

  if (resposta.status === 404) return null
  if (!resposta.ok) {
    throw new Error(`Não foi possível verificar atualizações (${resposta.status}).`)
  }

  const release = await resposta.json()
  const versaoNova = String(release.tag_name || "").replace(/^v/i, "")
  const apk = (release.assets || []).find((asset) =>
    String(asset.name || "").toLowerCase().endsWith(".apk")
  )

  if (
    release.draft ||
    release.prerelease ||
    !apk?.browser_download_url ||
    !versaoMaior(versaoNova, appInfo.version)
  ) {
    return null
  }

  return {
    versaoAtual: appInfo.version,
    versaoNova,
    descricao: String(release.body || "").trim(),
    url: apk.browser_download_url,
  }
}

export async function baixarAtualizacaoDoApp(url) {
  if (!url?.startsWith("https://github.com/")) {
    throw new Error("Link de atualização inválido.")
  }

  await Browser.open({
    url,
    presentationStyle: "popover",
  })
}
