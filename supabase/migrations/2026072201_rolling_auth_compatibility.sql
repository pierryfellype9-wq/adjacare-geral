-- Migração aditiva: não remove nem altera dados existentes.
alter table public.users
  add column if not exists auth_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists migrated_to_auth_at timestamptz null;

create unique index if not exists users_auth_user_id_unique
  on public.users (auth_user_id)
  where auth_user_id is not null;

create index if not exists users_email_lower_idx
  on public.users (lower(email));

comment on column public.users.auth_user_id is
  'Vinculo gradual com Supabase Auth durante a migracao sem downtime.';
comment on column public.users.migrated_to_auth_at is
  'Data em que o login legado foi migrado para Supabase Auth.';
