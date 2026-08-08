alter table public.escala_midia
add column if not exists live text;

comment on column public.escala_midia.live is
'Nome do responsável pela transmissão ao vivo na escala da mídia.';
