alter table public.ebd_aulas
  add column if not exists oferta_valor numeric(12,2),
  add column if not exists oferta_registrada_por text,
  add column if not exists oferta_registrada_em timestamptz;

comment on column public.ebd_aulas.oferta_valor is
  'Valor da oferta arrecadada na aula da EBD.';

comment on column public.ebd_aulas.oferta_registrada_por is
  'Nome ou e-mail do usuário que registrou a oferta.';

comment on column public.ebd_aulas.oferta_registrada_em is
  'Data e hora do último registro da oferta.';
