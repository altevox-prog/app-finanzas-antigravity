-- ==============================================================================
-- MIGRACIÓN: TABLA DE HISTORIAL DE FACTURACIÓN (CUENTAS POR COBRAR)
-- ==============================================================================

create table if not exists public.invoices_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  consecutive text not null,
  client_name text not null,
  issue_date date not null default current_date,
  due_date date,
  total_amount numeric not null default 0,
  account_target text default 'Bancolombia',
  status text not null default 'pending',
  transaction_id text,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table public.invoices_history enable row level security;

-- Política de RLS para el usuario autenticado
drop policy if exists "Users can manage own invoices history" on public.invoices_history;
create policy "Users can manage own invoices history"
  on public.invoices_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Agregar a publicación realtime
alter publication supabase_realtime add table public.invoices_history;