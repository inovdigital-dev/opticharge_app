-- Cache de preços OMIE (evita bater na API a cada visita)
create table if not exists omie_prices (
  id          bigserial primary key,
  date        date not null,
  hour        smallint not null check (hour >= 0 and hour <= 23),
  price_mwh   numeric(10,4) not null,
  fetched_at  timestamptz default now(),
  unique (date, hour)
);

-- Índice para queries por data
create index if not exists omie_prices_date_idx on omie_prices(date);

-- Row Level Security (leitura pública, escrita só pelo server)
alter table omie_prices enable row level security;
create policy "Leitura pública" on omie_prices for select using (true);
create policy "Escrita via service role" on omie_prices for insert with check (true);
create policy "Update via service role" on omie_prices for update using (true);
