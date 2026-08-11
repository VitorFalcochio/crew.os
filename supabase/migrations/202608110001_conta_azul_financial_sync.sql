-- Conta Azul read-only financial synchronization.

create table if not exists public.financial_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  provider text not null,
  external_id text not null,
  profile text not null check (profile in ('customer','supplier','both','other')),
  name text not null,
  trade_name text,
  document text,
  email text,
  active boolean not null default true,
  metadata jsonb not null default '{}',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_id)
);

create table if not exists public.financial_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  provider text not null,
  external_account_id text not null,
  account_name text not null,
  account_type text,
  balance numeric(14,2) not null,
  active boolean not null default true,
  balance_at timestamptz not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_account_id)
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  connection_id uuid not null references public.integrations on delete cascade,
  provider text not null,
  status text not null check (status in ('running','succeeded','failed')),
  counts jsonb not null default '{}',
  error_message text,
  initiated_by uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists idx_sync_runs_one_active
  on public.integration_sync_runs(organization_id, connection_id)
  where status = 'running';
create index if not exists idx_financial_contacts_lookup on public.financial_contacts(organization_id, provider, profile, active);
create index if not exists idx_financial_balances_lookup on public.financial_balances(organization_id, provider, balance_at desc);
create index if not exists idx_sync_runs_history on public.integration_sync_runs(organization_id, started_at desc);

alter table public.financial_contacts enable row level security;
alter table public.financial_balances enable row level security;
alter table public.integration_sync_runs enable row level security;

create policy financial_contacts_select on public.financial_contacts for select using (public.is_organization_member(organization_id));
create policy financial_contacts_manage on public.financial_contacts for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy financial_balances_select on public.financial_balances for select using (public.is_organization_member(organization_id));
create policy financial_balances_manage on public.financial_balances for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy integration_sync_runs_select on public.integration_sync_runs for select using (public.is_organization_manager(organization_id));

create trigger financial_contacts_updated before update on public.financial_contacts for each row execute function public.touch_updated_at();
create trigger financial_balances_updated before update on public.financial_balances for each row execute function public.touch_updated_at();
