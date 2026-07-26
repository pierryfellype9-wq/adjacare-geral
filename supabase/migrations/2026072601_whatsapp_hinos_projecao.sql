create extension if not exists pgcrypto;

create table if not exists public.whatsapp_cultos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 3 and 120),
  data_culto timestamptz not null,
  prazo_envio timestamptz,
  status text not null default 'aberto'
    check (status in ('aberto', 'fechado', 'cancelado')),
  pasta_drive_id text,
  pasta_drive_link text,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint whatsapp_cultos_titulo_data_unique unique (titulo, data_culto)
);

create index if not exists whatsapp_cultos_data_idx
  on public.whatsapp_cultos (data_culto asc);

create index if not exists whatsapp_cultos_status_data_idx
  on public.whatsapp_cultos (status, data_culto asc);

create index if not exists whatsapp_cultos_criado_por_idx
  on public.whatsapp_cultos (criado_por);

create table if not exists public.whatsapp_hinos_projecao (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique default (
    'HP-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  culto_id uuid not null references public.whatsapp_cultos(id) on delete restrict,
  telefone text not null,
  departamento text not null check (char_length(trim(departamento)) between 2 and 80),
  nome_apresentacao text not null check (char_length(trim(nome_apresentacao)) between 2 and 120),
  tipo_midia text not null check (tipo_midia in ('audio', 'video', 'document')),
  nome_original text,
  nome_drive text not null,
  mime_type text,
  tamanho_bytes bigint not null default 0 check (tamanho_bytes >= 0),
  hash_sha256 text not null,
  whatsapp_media_id text,
  arquivo_drive_id text,
  arquivo_drive_link text,
  status text not null default 'recebido'
    check (status in ('recebido', 'em_preparacao', 'pronto', 'precisa_correcao', 'cancelado')),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint whatsapp_hinos_culto_hash_unique unique (culto_id, hash_sha256)
);

create index if not exists whatsapp_hinos_culto_idx
  on public.whatsapp_hinos_projecao (culto_id, criado_em desc);

create index if not exists whatsapp_hinos_status_idx
  on public.whatsapp_hinos_projecao (status, criado_em desc);

create index if not exists whatsapp_hinos_telefone_idx
  on public.whatsapp_hinos_projecao (telefone, criado_em desc);

create or replace function public.atualizar_timestamp_whatsapp_hinos()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists whatsapp_cultos_atualizado_em on public.whatsapp_cultos;
create trigger whatsapp_cultos_atualizado_em
before update on public.whatsapp_cultos
for each row execute function public.atualizar_timestamp_whatsapp_hinos();

drop trigger if exists whatsapp_hinos_atualizado_em on public.whatsapp_hinos_projecao;
create trigger whatsapp_hinos_atualizado_em
before update on public.whatsapp_hinos_projecao
for each row execute function public.atualizar_timestamp_whatsapp_hinos();

alter table public.whatsapp_cultos enable row level security;
alter table public.whatsapp_hinos_projecao enable row level security;

revoke all on public.whatsapp_cultos from anon;
revoke all on public.whatsapp_hinos_projecao from anon;
grant select, insert, update on public.whatsapp_cultos to authenticated;
grant select, update on public.whatsapp_hinos_projecao to authenticated;

drop policy if exists "Equipe autorizada gerencia cultos de hinos" on public.whatsapp_cultos;
create policy "Equipe autorizada gerencia cultos de hinos"
on public.whatsapp_cultos
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and lower(coalesce(u.role, '')) in (
        'administrador', 'dirigente', 'mídia', 'midia',
        'sonoplastia', 'projeção', 'projecao', 'ti'
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and lower(coalesce(u.role, '')) in (
        'administrador', 'dirigente', 'mídia', 'midia',
        'sonoplastia', 'projeção', 'projecao', 'ti'
      )
  )
);

drop policy if exists "Equipe autorizada confere hinos" on public.whatsapp_hinos_projecao;
create policy "Equipe autorizada confere hinos"
on public.whatsapp_hinos_projecao
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and lower(coalesce(u.role, '')) in (
        'administrador', 'dirigente', 'mídia', 'midia',
        'sonoplastia', 'projeção', 'projecao', 'ti'
      )
  )
);

drop policy if exists "Equipe autorizada atualiza hinos" on public.whatsapp_hinos_projecao;
create policy "Equipe autorizada atualiza hinos"
on public.whatsapp_hinos_projecao
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and lower(coalesce(u.role, '')) in (
        'administrador', 'dirigente', 'mídia', 'midia',
        'sonoplastia', 'projeção', 'projecao', 'ti'
      )
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and lower(coalesce(u.role, '')) in (
        'administrador', 'dirigente', 'mídia', 'midia',
        'sonoplastia', 'projeção', 'projecao', 'ti'
      )
  )
);

comment on table public.whatsapp_cultos is
  'Cultos disponíveis no fluxo de envio de hinos do WhatsApp.';
comment on table public.whatsapp_hinos_projecao is
  'Arquivos recebidos pelo WhatsApp e organizados no Google Drive para Som e Projeção.';
