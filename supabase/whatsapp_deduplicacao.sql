-- Impede que a mesma mensagem recebida da Meta seja processada mais de uma vez.
create table if not exists public.whatsapp_eventos_processados (
  mensagem_id text primary key,
  processado_em timestamptz not null default now()
);

create index if not exists idx_whatsapp_eventos_processados_data
  on public.whatsapp_eventos_processados (processado_em desc);

alter table public.whatsapp_eventos_processados disable row level security;

-- Mantém apenas os últimos 30 dias quando este bloco for executado novamente.
delete from public.whatsapp_eventos_processados
where processado_em < now() - interval '30 days';
