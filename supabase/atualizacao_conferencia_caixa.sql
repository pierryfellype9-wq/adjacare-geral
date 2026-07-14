-- CONFERÊNCIA, RETIRADA E CAIXA — LOJA TETELESTAI
-- Execute este arquivo completo uma vez no SQL Editor do Supabase.

alter table public.loja_pedidos
  add column if not exists conferido_em timestamptz,
  add column if not exists conferido_por text,
  add column if not exists conferencia_divergencia text,
  add column if not exists retirado_por_nome text,
  add column if not exists retirado_por_celular text,
  add column if not exists retirado_por_operador text,
  add column if not exists retirada_observacoes text;

create table if not exists public.loja_conferencia_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.loja_pedidos(id) on delete cascade,
  pedido_item_id uuid not null unique references public.loja_pedido_itens(id) on delete cascade,
  quantidade_conferida integer not null default 0 check (quantidade_conferida >= 0),
  conferido boolean not null default false,
  divergencia text,
  conferido_por text,
  conferido_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.loja_caixas (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'aberto' check (status in ('aberto','fechado')),
  aberto_por text not null,
  aberto_em timestamptz not null default now(),
  valor_inicial numeric(12,2) not null default 0 check (valor_inicial >= 0),
  fechado_por text,
  fechado_em timestamptz,
  valor_esperado numeric(12,2),
  valor_contado numeric(12,2),
  diferenca numeric(12,2),
  observacoes text
);

create table if not exists public.loja_pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.loja_pedidos(id),
  caixa_id uuid references public.loja_caixas(id),
  forma text not null check (forma in ('dinheiro','pix','cartao_debito','cartao_credito','outro')),
  valor numeric(12,2) not null check (valor > 0),
  status text not null default 'confirmado' check (status in ('confirmado','cancelado','estornado')),
  referencia text,
  observacoes text,
  recebido_por text not null,
  criado_em timestamptz not null default now(),
  cancelado_em timestamptz,
  cancelado_por text
);

create table if not exists public.loja_movimentos_caixa (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null references public.loja_caixas(id),
  pedido_id uuid references public.loja_pedidos(id),
  tipo text not null check (tipo in ('suprimento','sangria','recebimento','estorno')),
  valor numeric(12,2) not null check (valor > 0),
  descricao text,
  operador text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.loja_email_eventos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.loja_pedidos(id) on delete cascade,
  tipo text not null,
  chave text not null,
  destinatario text not null,
  status text not null default 'processando' check (status in ('processando','enviado','erro')),
  automatico boolean not null default false,
  provedor_id text,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique(pedido_id, chave)
);

create index if not exists idx_conferencia_pedido on public.loja_conferencia_itens(pedido_id);
create index if not exists idx_pagamentos_pedido on public.loja_pagamentos(pedido_id, status);
create index if not exists idx_pagamentos_caixa on public.loja_pagamentos(caixa_id, criado_em);
create index if not exists idx_movimentos_caixa on public.loja_movimentos_caixa(caixa_id, criado_em);

alter table public.loja_conferencia_itens disable row level security;
alter table public.loja_caixas disable row level security;
alter table public.loja_pagamentos disable row level security;
alter table public.loja_movimentos_caixa disable row level security;
alter table public.loja_email_eventos disable row level security;
