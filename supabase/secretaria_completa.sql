-- Estrutura administrativa da Secretaria da Assembleia de Deus, Bairro Jacaré.

create table if not exists public.secretaria_funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null default 'Outras funções',
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.membro_funcoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  funcao_id uuid not null references public.secretaria_funcoes(id) on delete restrict,
  data_inicio date,
  data_fim date,
  ativo boolean not null default true,
  observacao text,
  criado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.secretaria_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete restrict,
  tipo text not null check (tipo in ('Recebimento', 'Mudança', 'Desligamento', 'Reativação')),
  data date not null default current_date,
  origem_destino text,
  motivo text,
  observacao text,
  criado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.secretaria_documentos (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid references public.membros(id) on delete set null,
  tipo text not null check (tipo in ('Carta de recomendação', 'Declaração de membro', 'Certificado', 'Outro')),
  data_emissao date not null default current_date,
  finalidade text,
  observacao text,
  status text not null default 'Emitido' check (status in ('Rascunho', 'Emitido', 'Cancelado')),
  criado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.secretaria_datas_importantes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid references public.membros(id) on delete set null,
  tipo text not null check (tipo in ('Batismo', 'Apresentação', 'Recebimento', 'Outro')),
  data date not null,
  descricao text,
  observacao text,
  criado_por text,
  created_at timestamptz not null default now()
);

create index if not exists membro_funcoes_membro_idx on public.membro_funcoes (membro_id);
drop index if exists public.membro_funcoes_ativo_unique;
create unique index membro_funcoes_ativo_unique
  on public.membro_funcoes (membro_id)
  where ativo = true;
create index if not exists secretaria_movimentacoes_membro_data_idx on public.secretaria_movimentacoes (membro_id, data desc);
create index if not exists secretaria_documentos_membro_data_idx on public.secretaria_documentos (membro_id, data_emissao desc);
create index if not exists secretaria_datas_membro_data_idx on public.secretaria_datas_importantes (membro_id, data desc);

alter table public.secretaria_funcoes enable row level security;
alter table public.membro_funcoes enable row level security;
alter table public.secretaria_movimentacoes enable row level security;
alter table public.secretaria_documentos enable row level security;
alter table public.secretaria_datas_importantes enable row level security;

grant select, insert, update, delete on public.secretaria_funcoes to authenticated;
grant select, insert, update, delete on public.membro_funcoes to authenticated;
grant select, insert, update, delete on public.secretaria_movimentacoes to authenticated;
grant select, insert, update, delete on public.secretaria_documentos to authenticated;
grant select, insert, update, delete on public.secretaria_datas_importantes to authenticated;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'secretaria_funcoes',
    'membro_funcoes',
    'secretaria_movimentacoes',
    'secretaria_documentos',
    'secretaria_datas_importantes'
  ] loop
    execute format('drop policy if exists "secretaria autenticada leitura" on public.%I', tabela);
    execute format('drop policy if exists "secretaria autenticada inclusao" on public.%I', tabela);
    execute format('drop policy if exists "secretaria autenticada alteracao" on public.%I', tabela);
    execute format('drop policy if exists "secretaria autenticada exclusao" on public.%I', tabela);
    execute format('create policy "secretaria autenticada leitura" on public.%I for select to authenticated using (true)', tabela);
    execute format('create policy "secretaria autenticada inclusao" on public.%I for insert to authenticated with check (true)', tabela);
    execute format('create policy "secretaria autenticada alteracao" on public.%I for update to authenticated using (true) with check (true)', tabela);
    execute format('create policy "secretaria autenticada exclusao" on public.%I for delete to authenticated using (true)', tabela);
  end loop;
end $$;

insert into public.secretaria_funcoes (nome, categoria)
values
  ('Auxiliar Dep. Adolescentes', 'Adolescentes'),
  ('Auxiliar Dep. Infantil', 'Infantil'),
  ('1º Guardador de Ofertas', 'Administração'),
  ('2º Guardador de Ofertas', 'Administração'),
  ('1º Líder Assistência Social', 'Assistência Social'),
  ('2º Líder Assistência Social', 'Assistência Social'),
  ('1º Líder de Adolescentes', 'Adolescentes'),
  ('2º Líder de Adolescentes', 'Adolescentes'),
  ('1º Líder de Comunicação', 'Comunicação'),
  ('2º Líder de Comunicação', 'Comunicação'),
  ('1º Líder de Evangelismo', 'Evangelismo'),
  ('2º Líder de Evangelismo', 'Evangelismo'),
  ('1º Líder de Jovens', 'Jovens'),
  ('2º Líder de Jovens', 'Jovens'),
  ('1º Líder Dep. da Família', 'Família'),
  ('2º Líder Dep. da Família', 'Família'),
  ('1º Líder do Círculo de Oração', 'Círculo de Oração'),
  ('2º Líder do Círculo de Oração', 'Círculo de Oração'),
  ('1º Líder do Dep. Infantil', 'Infantil'),
  ('2º Líder do Dep. Infantil', 'Infantil'),
  ('1º Patrimoniador', 'Administração'),
  ('2º Patrimoniador', 'Administração'),
  ('Professor(a) Escola Dominical', 'Escola Bíblica Dominical'),
  ('1º Promotor de Missões', 'Missões'),
  ('2º Promotor de Missões', 'Missões'),
  ('1º Regente Adolescentes', 'Música'),
  ('1º Regente Banda / Orquestra', 'Música'),
  ('1º Regente Círculo de Oração', 'Música'),
  ('1º Regente Coral', 'Música'),
  ('1º Regente Dep. Infantil', 'Música'),
  ('1º Regente Jovens', 'Música'),
  ('1º Responsável pelas Projeções', 'Comunicação'),
  ('2º Responsável pelas Projeções', 'Comunicação'),
  ('1º Responsável pelo Som', 'Sonoplastia'),
  ('2º Responsável pelo Som', 'Sonoplastia'),
  ('1º Secretário(a)', 'Secretaria'),
  ('2º Secretário(a)', 'Secretaria'),
  ('1º Superintendente da EBD', 'Escola Bíblica Dominical'),
  ('2º Superintendente da EBD', 'Escola Bíblica Dominical')
on conflict (nome) do update set categoria = excluded.categoria, ativa = true;
