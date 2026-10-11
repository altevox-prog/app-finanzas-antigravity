-- ==============================================================================
-- MIGRACIÓN SUPABASE: COLUMNAS ADICIONALES Y POLÍTICAS DE RLS
-- Ejecuta este script en el "SQL Editor" de tu proyecto de Supabase si deseas
-- tener columnas nativas para transferencias, subcategorías y RLS en profiles.
-- ==============================================================================

-- 1. Asegurar columnas en transactions
alter table if exists public.transactions 
  add column if not exists category_id text,
  add column if not exists is_transfer boolean default false,
  add column if not exists subcategory_id text;

-- 2. Asegurar que las claves foráneas de transactions apunten de forma segura
-- Si ya existe la constraint única o clave primaria compuesta (id, user_id):
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_id_key' or conname = 'transactions_id_unique'
  ) then
    alter table public.transactions add constraint transactions_id_unique unique (id);
  end if;
exception
  when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_id_key' or conname = 'accounts_id_unique'
  ) then
    alter table public.accounts add constraint accounts_id_unique unique (id);
  end if;
exception
  when others then null;
end $$;

-- 3. Habilitar política de INSERT en public.profiles para permitir upsert
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile" 
      on public.profiles for insert 
      with check (auth.uid() = id);
  end if;
end $$;

-- 4. Asegurar columnas de profiles para display_name y photo_url
alter table if exists public.profiles 
  add column if not exists display_name text,
  add column if not exists photo_url text;
