create table if not exists public.app_push_tokens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  role text,
  platform text not null default 'android'
    check (platform in ('android', 'ios', 'web')),
  ativo boolean not null default true,
  notificar_hinos boolean not null default true,
  notificar_avisos boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists app_push_tokens_auth_user_id_idx
  on public.app_push_tokens (auth_user_id);

create index if not exists app_push_tokens_role_ativo_idx
  on public.app_push_tokens (role, ativo);

alter table public.app_push_tokens enable row level security;

revoke all on table public.app_push_tokens from anon, authenticated;
