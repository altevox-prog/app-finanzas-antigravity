-- ==============================================================================
-- SCHEMA SUPABASE PARA PRESU APP (SINCRONIZACIÓN MULTIDISPOSITIVO OFFLINE-FIRST)
-- Ejecuta este script en el "SQL Editor" de tu proyecto de Supabase.
-- ==============================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. TABLA DE PERFILES DE USUARIO
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  photo_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. TABLA DE CUENTAS
create table if not exists public.accounts (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text,
  currency text default 'COP',
  balance numeric default 0,
  initial_balance numeric default 0,
  icon text,
  color text,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 4. TABLA DE CATEGORÍAS
create table if not exists public.categories (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text default 'expense',
  icon text,
  color text,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 5. TABLA DE TRANSACCIONES
create table if not exists public.transactions (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  amount numeric not null,
  original_amount numeric,
  original_currency text default 'COP',
  exchange_rate numeric,
  category_id text,
  account_id text,
  date text,
  notes text,
  description text,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 6. TABLA DE PAGOS RECURRENTES Y SUSCRIPCIONES
create table if not exists public.recurring_payments (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount numeric default 0,
  type text default 'expense',
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 7. TABLA DE DEUDAS Y PRÉSTAMOS
create table if not exists public.debts (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text,
  person_name text,
  type text,
  total_amount numeric default 0,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 8. TABLA DE INVERSIONES Y PATRIMONIO
create table if not exists public.investments (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text,
  ticker text,
  category text,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

-- 9. TABLA DE COPIA DE SEGURIDAD GENERAL (Safety Net)
create table if not exists public.user_sync_backup (
  user_id uuid references auth.users on delete cascade primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - CADA USUARIO SOLO ACCEDE A SUS PROPIOS REGISTROS
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.debts enable row level security;
alter table public.investments enable row level security;
alter table public.user_sync_backup enable row level security;

-- Políticas de lectura, inserción, actualización y borrado por usuario
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can manage own accounts" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own recurring" on public.recurring_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own debts" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own investments" on public.investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own backup" on public.user_sync_backup for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==============================================================================
-- PUBLICACIÓN EN TIEMPO REAL (REALTIME)
-- Permite que los cambios en un dispositivo se reflejen inmediatamente en otros.
-- ==============================================================================

begin;
  -- Asegurar que la publicación realtime incluya las tablas principales
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table 
    public.accounts, 
    public.categories, 
    public.transactions, 
    public.recurring_payments, 
    public.debts, 
    public.investments;
commit;
