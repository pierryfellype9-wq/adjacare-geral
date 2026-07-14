-- CONTROLE DE LANÇAMENTO DO SITE TETELESTAI
-- Execute uma vez no SQL Editor do Supabase.

alter table public.loja_configuracoes
  add column if not exists site_publicado boolean not null default false,
  add column if not exists lancamento_em timestamptz;

update public.loja_configuracoes
set site_publicado = false
where chave = 'tetelestai-2026';
