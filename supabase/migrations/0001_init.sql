-- FinanceOS — schema inicial (Módulo 1)
-- Todas as tabelas de domínio possuem user_id e RLS por dono do registro.

create extension if not exists pgcrypto;

-- ============ util: updated_at automático ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text not null default 'pt-BR',
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ cost_centers ============
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  status text not null default 'ativo' check (status in ('ativo','arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ accounts ============
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (type in ('conta_corrente','conta_digital','poupanca','dinheiro','carteira','investimento')),
  color text,
  icon text,
  initial_balance numeric(14,2) not null default 0,
  status text not null default 'ativa' check (status in ('ativa','arquivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ credit_cards ============
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  bank text,
  brand text,
  last_digits text,
  credit_limit numeric(14,2),
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  color text,
  status text not null default 'ativo' check (status in ('ativo','arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ categories / subcategories ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('receita','despesa')),
  color text,
  icon text,
  monthly_goal numeric(14,2),
  monthly_limit numeric(14,2),
  status text not null default 'ativa' check (status in ('ativa','arquivada')),
  sort_order int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  status text not null default 'ativa' check (status in ('ativa','arquivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ tags ============
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ============ merchants / aliases ============
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  document text,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  color text,
  icon text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, raw_text)
);

-- ============ importação ============
create table public.imported_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  origin text,
  status text not null default 'aguardando' check (status in ('aguardando','processando','revisao_necessaria','concluido','falhou')),
  error_message text,
  transactions_found int not null default 0,
  errors_found int not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  imported_file_id uuid not null references public.imported_files(id) on delete cascade,
  status text not null default 'aguardando' check (status in ('aguardando','processando','concluido','falhou')),
  attempts int not null default 0,
  log text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.raw_extractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  imported_file_id uuid not null references public.imported_files(id) on delete cascade,
  raw_text text,
  raw_data jsonb,
  extraction_method text,
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

-- ============ transactions ============
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  date date not null,
  original_description text,
  friendly_description text,
  amount numeric(14,2) not null,
  type text not null check (type in ('receita','despesa','transferencia','pagamento_fatura','estorno','reembolso','cashback','tarifa','juros','iof','imposto','saque','deposito')),
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  payment_method text,
  notes text,
  imported_file_id uuid references public.imported_files(id) on delete set null,
  import_batch_id uuid,
  status text not null default 'confirmada' check (status in ('revisao_pendente','confirmada','ignorada')),
  confidence numeric(4,3),
  installment_number smallint,
  installment_total smallint,
  fingerprint text,
  is_possible_duplicate boolean not null default false,
  duplicate_of_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  amount numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.transaction_tags (
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

-- ============ orçamentos e metas ============
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id) on delete cascade,
  cost_center_id uuid references public.cost_centers(id) on delete cascade,
  period_month smallint not null check (period_month between 1 and 12),
  period_year smallint not null,
  limit_amount numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  start_date date not null default current_date,
  target_date date,
  status text not null default 'em_andamento' check (status in ('em_andamento','concluida','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ parcelamentos e assinaturas ============
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  installment_amount numeric(14,2) not null,
  total_amount numeric(14,2) not null,
  total_installments smallint not null,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid references public.merchants(id) on delete set null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  current_amount numeric(14,2),
  frequency text not null default 'mensal' check (frequency in ('mensal','anual','semanal','outro')),
  last_charge_date date,
  next_expected_date date,
  status text not null default 'ativa' check (status in ('sugerida','ativa','rejeitada','cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ anexos, conciliação, regras ============
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  related_transaction_id uuid references public.transactions(id) on delete cascade,
  type text not null check (type in ('pagamento_fatura','transferencia_interna','estorno','reembolso','duplicidade','tarifa','saque','deposito')),
  status text not null default 'pendente' check (status in ('pendente','confirmado','rejeitado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  field text not null check (field in ('descricao','estabelecimento','valor','conta','cartao')),
  operator text not null check (operator in ('contem','igual','comeca_com','termina_com','regex','maior_que','menor_que')),
  search_value text not null,
  action_type text not null check (action_type in ('categorizar','definir_empresa','definir_centro_custo','marcar_transferencia','ignorar')),
  action_value text,
  priority int not null default 0,
  status text not null default 'ativa' check (status in ('ativa','inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ notificações, insights, auditoria ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date,
  period_end date,
  insight_type text,
  content text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  source text,
  created_at timestamptz not null default now()
);

-- ============ índices ============
create index idx_accounts_user on public.accounts (user_id, status);
create index idx_credit_cards_user on public.credit_cards (user_id, status);
create index idx_categories_user on public.categories (user_id, status);
create index idx_subcategories_category on public.subcategories (category_id);
create index idx_merchants_user on public.merchants (user_id);
create index idx_merchant_aliases_lookup on public.merchant_aliases (user_id, raw_text);
create index idx_imported_files_user_status on public.imported_files (user_id, status);
create index idx_import_jobs_file on public.import_jobs (imported_file_id);
create index idx_raw_extractions_file on public.raw_extractions (imported_file_id);
create index idx_transactions_user_date on public.transactions (user_id, date desc);
create index idx_transactions_user_category on public.transactions (user_id, category_id);
create index idx_transactions_user_account on public.transactions (user_id, account_id);
create index idx_transactions_user_card on public.transactions (user_id, credit_card_id);
create index idx_transactions_fingerprint on public.transactions (user_id, fingerprint);
create index idx_transactions_status on public.transactions (user_id, status);
create index idx_budgets_period on public.budgets (user_id, period_year, period_month);
create index idx_notifications_user_unread on public.notifications (user_id, read);
create index idx_automation_rules_user_priority on public.automation_rules (user_id, priority desc);

-- ============ triggers de updated_at ============
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles','accounts','credit_cards','categories','subcategories','merchants',
      'imported_files','transactions','budgets','financial_goals','installments',
      'subscriptions','reconciliation_items','automation_rules','cost_centers'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.credit_cards enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.tags enable row level security;
alter table public.merchants enable row level security;
alter table public.merchant_aliases enable row level security;
alter table public.imported_files enable row level security;
alter table public.import_jobs enable row level security;
alter table public.raw_extractions enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.cost_centers enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_goals enable row level security;
alter table public.installments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attachments enable row level security;
alter table public.reconciliation_items enable row level security;
alter table public.automation_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_insights enable row level security;
alter table public.audit_logs enable row level security;

create policy "own_profile" on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'accounts','credit_cards','categories','subcategories','tags','merchants','merchant_aliases',
      'imported_files','import_jobs','raw_extractions','transactions','transaction_splits',
      'transaction_tags','cost_centers','budgets','financial_goals','installments','subscriptions',
      'attachments','reconciliation_items','automation_rules','notifications','ai_insights','audit_logs'
    ])
  loop
    execute format(
      'create policy "owner_all" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ============ provisionamento automático no cadastro ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  insert into public.categories (user_id, name, type, color, sort_order, is_default) values
    (new.id, 'Alimentação', 'despesa', '#f97316', 1, true),
    (new.id, 'Mercado', 'despesa', '#84cc16', 2, true),
    (new.id, 'Farmácia', 'despesa', '#14b8a6', 3, true),
    (new.id, 'Saúde', 'despesa', '#06b6d4', 4, true),
    (new.id, 'Transporte', 'despesa', '#3b82f6', 5, true),
    (new.id, 'Combustível', 'despesa', '#6366f1', 6, true),
    (new.id, 'Educação', 'despesa', '#8b5cf6', 7, true),
    (new.id, 'Moradia', 'despesa', '#a855f7', 8, true),
    (new.id, 'Assinaturas', 'despesa', '#d946ef', 9, true),
    (new.id, 'Investimentos', 'despesa', '#ec4899', 10, true),
    (new.id, 'Lazer', 'despesa', '#f43f5e', 11, true),
    (new.id, 'Compras', 'despesa', '#eab308', 12, true),
    (new.id, 'Presentes', 'despesa', '#f59e0b', 13, true),
    (new.id, 'Pets', 'despesa', '#22c55e', 14, true),
    (new.id, 'Impostos', 'despesa', '#64748b', 15, true),
    (new.id, 'Serviços', 'despesa', '#0ea5e9', 16, true),
    (new.id, 'Trabalho', 'despesa', '#475569', 17, true),
    (new.id, 'Empresa', 'despesa', '#334155', 18, true),
    (new.id, 'Viagem', 'despesa', '#0d9488', 19, true),
    (new.id, 'Outros', 'despesa', '#78716c', 20, true),
    (new.id, 'Salário', 'receita', '#22c55e', 21, true),
    (new.id, 'Freelance', 'receita', '#16a34a', 22, true),
    (new.id, 'Rendimentos', 'receita', '#15803d', 23, true),
    (new.id, 'Reembolso', 'receita', '#166534', 24, true),
    (new.id, 'Outras Receitas', 'receita', '#14532d', 25, true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
