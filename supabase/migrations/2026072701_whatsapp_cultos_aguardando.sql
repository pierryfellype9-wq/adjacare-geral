alter table public.whatsapp_cultos
  drop constraint if exists whatsapp_cultos_status_check;

alter table public.whatsapp_cultos
  add constraint whatsapp_cultos_status_check
  check (
    status = any (
      array[
        'aguardando'::text,
        'aberto'::text,
        'fechado'::text,
        'cancelado'::text
      ]
    )
  );

update public.whatsapp_cultos
set status = 'aguardando',
    atualizado_em = now()
where status = 'fechado'
  and data_culto > now();
