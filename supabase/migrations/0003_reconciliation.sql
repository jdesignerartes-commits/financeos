-- FinanceOS — saldo informado de extrato para conciliação (Módulo 11)

create table public.statement_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id) on delete cascade,
  period_month smallint not null check (period_month between 1 and 12),
  period_year smallint not null,
  informed_balance numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint statement_balances_one_target check (
    (account_id is not null and credit_card_id is null)
    or (account_id is null and credit_card_id is not null)
  )
);

-- índices únicos parciais: unique() normal não bloqueia duplicatas quando uma das colunas é null
create unique index statement_balances_account_unique on public.statement_balances
  (user_id, account_id, period_year, period_month) where account_id is not null;
create unique index statement_balances_card_unique on public.statement_balances
  (user_id, credit_card_id, period_year, period_month) where credit_card_id is not null;

alter table public.statement_balances enable row level security;

create policy "owner_all" on public.statement_balances for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.statement_balances
  for each row execute function public.set_updated_at();
