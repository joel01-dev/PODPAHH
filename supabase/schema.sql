-- ============================================================================
-- PODPAHH — PRODUCTION SCHEMA PARA SUPABASE (SQL Editor)
-- ----------------------------------------------------------------------------
-- CÓMO USAR:
--   1. Abra el SQL Editor del proyecto Supabase (https://supabase.com/dashboard)
--   2. Pegue TODO este script y ejecute (RUN)
--   3. Después ejecute el script de migración local: scripts/migrate-local.js
--
-- Esquema replica fiel do backend local (data/podpahh_db.json):
--   products  -> catálogo (67 itens), prices NUMERIC, stock
--   customers -> contas com senha HASH scrypt (NUNCA texto puro)
--   orders    -> pedidos iniciados no checkout WhatsApp
--   settings  -> whatssapp da loja + admin credencial
--
-- SEGURANÇA (production):
--   * Row Level Security (RLS) ATIVO em todas as tabelas
--   * anon: somente LEITURA do catálogo (stock > 0) + INSERÇÃO legal de
--     pedidos e clientes. Nada mais.
--   * Service role (SECRET KEY) ignora RLS = uso admin no servidor.
--   * Coluna settings.admin PASSÍVEL DE LEITURA apenas via service role.
--   * NUNCA exponha a SECRET KEY no navegador.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
do $$
begin
  create type public.product_category as enum (
    'descartaveis', 'aparelhos', 'e-liquids',
    'acessorios', 'resistencias', 'outlet'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- TABLE: products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id            text primary key,                -- 'prod_32511' (compatível com frontend)
  source_id     text,                            -- id original da fonte (WooCommerce)
  name          text not null,
  price         numeric(10,2) not null default 0,
  old_price     numeric(10,2) not null default 0,
  category      public.product_category not null default 'descartaveis',
  image         text,
  url           text,
  stock         integer not null default 0,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.products is 'Catálogo de produtos PODPAHH';
comment on column public.products.id is 'ID legado no formato prod_*';

-- ----------------------------------------------------------------------------
-- TABLE: customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id            text primary key,                -- 'usr_<timestamp>'
  name          text not null,
  email         text not null unique,
  password      text not null,                   -- HASH scrypt "salt:hash", nunca texto puro
  phone         text not null,                   -- 11 dígitos, sem +55
  created_at    timestamptz not null default now()
);

comment on table public.customers is 'Clientes/contas da loja';
comment on column public.customers.password is 'hash scrypt salt:hash — nunca texto puro';

-- ----------------------------------------------------------------------------
-- TABLE: orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id            text primary key,                -- 'ord_<timestamp>'
  customer_id   text references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  items         jsonb not null default '[]'::jsonb,
  subtotal      numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  address       text,
  payment_method text not null default 'PIX',
  status        public.order_status not null default 'pending',
  created_at    timestamptz not null default now()
);

comment on table public.orders is 'Pedidos iniciados no checkout';

-- ----------------------------------------------------------------------------
-- TABLE: settings (linha única)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id              boolean primary key default true check (id = true), -- singleton
  whatsapp        text not null default '5547999453628',
  whatsapp_message text not null default '',
  admin_username  text,
  admin_pass_hash text,                        -- hash scrypt; só service role lê
  updated_at      timestamptz not null default now()
);

comment on table public.settings is 'Configurações da loja (linha única)';
comment on column public.settings.admin_pass_hash is 'hash scrypt da senha admin — só via service role';

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_products_category   on public.products(category);
create index if not exists idx_products_stock      on public.products(stock);
create index if not exists idx_products_source_id  on public.products(source_id);
create index if not exists idx_customers_email     on public.customers(email);
create index if not exists idx_customers_phone     on public.customers(phone);
create index if not exists idx_orders_created_at   on public.orders(created_at desc);
create index if not exists idx_orders_phone        on public.orders(customer_phone);

-- ----------------------------------------------------------------------------
-- TRIGGER: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.products  enable row level security;
alter table public.customers enable row level security;
alter table public.orders    enable row level security;
alter table public.settings  enable row level security;

-- ============================================================================
-- GRANTS (baseline)
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables  in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ============================================================================
-- POLICIES
-- ============================================================================

-- ---------------- PRODUCTS ----------------
-- anon: só lê produtos com estoque > 0 (catálogo público)
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (stock > 0);

-- ---------------- CUSTOMERS ----------------
-- anon: pode criar conta (inserção). NUNCA pode ler a tabela.
drop policy if exists "customers_anon_insert" on public.customers;
create policy "customers_anon_insert"
  on public.customers for insert
  to anon
  with check (true);

-- ---------------- ORDERS ----------------
-- anon: pode criar pedido. NÃO pode ler pedidos alheios.
drop policy if exists "orders_anon_insert" on public.orders;
create policy "orders_anon_insert"
  on public.orders for insert
  to anon
  with check (true);

-- ---------------- SETTINGS ----------------
-- anon: pode LER apenas whatsapp e whatsapp_message.
-- admin_username/admin_pass_hash ficam invisíveis via column-level policy.
drop policy if exists "settings_anon_read_public" on public.settings;
create policy "settings_anon_read_public"
  on public.settings for select
  to anon, authenticated
  using (true);

-- Revoga colunas sensíveis para anon (column-level security)
revoke select (admin_username, admin_pass_hash)
  on public.settings from anon, authenticated;
grant select (whatsapp, whatsapp_message) on public.settings to anon, authenticated;

-- ============================================================================
-- SEED (config inicial)
-- ============================================================================
insert into public.settings (id, whatsapp, whatsapp_message)
values (true, '5547999453628', '')
on conflict (id) do nothing;

-- ============================================================================
-- VALIDAÇÃO
-- ============================================================================
-- Descomente para conferir o estado:
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('products','customers','orders','settings');
-- select policyname, permissive, cmd, qual from pg_policies
--   where schemaname = 'public' order by policyname;