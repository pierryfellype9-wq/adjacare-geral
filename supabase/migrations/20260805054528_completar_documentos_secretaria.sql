alter table public.secretaria_documentos
  add column if not exists conteudo text,
  add column if not exists assinante_1_nome text,
  add column if not exists assinante_1_cargo text,
  add column if not exists assinante_2_nome text,
  add column if not exists assinante_2_cargo text;
