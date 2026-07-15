"use client";

import { useEffect, useState } from "react";
import { supabaseRest } from "./supabase-rest";
import { siteUrl } from "../links";

export default function StoreHeaderButton() {
  const [config, setConfig] = useState<{ loja_ativa:boolean; mostrar_botao_topo:boolean; texto_botao_topo:string } | null>(null);
  useEffect(() => { supabaseRest("loja_configuracoes?chave=eq.tetelestai-2026&select=loja_ativa,mostrar_botao_topo,texto_botao_topo&limit=1").then(r => setConfig(r[0] || null)).catch(() => null); }, []);
  if (!config?.mostrar_botao_topo) return null;
  const textoConfigurado = config.texto_botao_topo?.trim();
  const texto = textoConfigurado && textoConfigurado.length > 3 ? textoConfigurado : "Peça agora sua camiseta";
  return <a className={`store-header-cta ${config.loja_ativa ? "":"store-header-cta-off"}`} href={siteUrl("loja")}>{texto}</a>;
}
