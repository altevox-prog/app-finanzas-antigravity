-- ==============================================================================
-- MIGRACIÓN OPCIONAL: ESQUEMA RELACIONAL DE ACTIVOS Y LOTES DE INVERSIÓN
-- Complementa la consolidación lógica en frontend y la tabla public.investments
-- ==============================================================================

-- 1. TABLA DE ACTIVOS CONSOLIDADOS
create table if not exists public.investments_assets (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  ticker text,
  name text not null,
  category text default 'variable',
  asset_type text default 'stock',
  currency text default 'USD',
  current_price numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 2. TABLA DE LOTES DE COMPRA (TRANSACCIONES DE INVERSIÓN)
create table if not exists public.investment_lots (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  asset_id text not null,
  date date not null default current_date,
  shares_count numeric not null default 0,
  purchase_price_per_share numeric not null default 0,
  broker_fee numeric default 0,
  notes text default '',
  created_at timestamptz default now(),
  primary key (id, user_id)
);

-- RLS
alter table public.investments_assets enable row level security;
alter table public.investment_lots enable row level security;

create policy "Users can manage own investments_assets"
  on public.investments_assets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own investment_lots"
  on public.investment_lots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
