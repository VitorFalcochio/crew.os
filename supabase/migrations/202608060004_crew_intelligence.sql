alter table public.activities
  add column if not exists status text not null default 'info',
  add column if not exists impact jsonb not null default '{}',
  add column if not exists autonomy_policy jsonb not null default '{}',
  add column if not exists requires_approval boolean not null default false,
  add column if not exists approval_id uuid references public.approvals on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists source text not null default 'system';

create table if not exists public.employee_autonomy_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade,
  action_key text not null,
  action_label text not null,
  mode text not null check (mode in ('observe', 'approval_required', 'autonomous', 'blocked')),
  limits jsonb not null default '[]',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, action_key)
);

create table if not exists public.employee_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade,
  period_type text not null check (period_type in ('day', 'week', 'month')),
  period_start date not null,
  period_end date not null,
  tasks_executed integer not null default 0,
  money_saved numeric(12,2) not null default 0,
  revenue_generated numeric(12,2) not null default 0,
  time_saved_minutes integer not null default 0,
  issues_found integer not null default 0,
  risk_prevented integer not null default 0,
  pending_approvals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, period_type, period_start)
);

create table if not exists public.crew_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  period_type text not null check (period_type in ('day', 'week')),
  period_start date not null,
  period_end date not null,
  title text not null,
  summary text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_type, period_start)
);

create table if not exists public.briefing_items (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references public.crew_briefings on delete cascade,
  employee_id uuid references public.digital_employees on delete set null,
  item_order integer not null,
  headline text not null,
  message text not null,
  metrics jsonb not null default '{}',
  tone text not null default 'neutral' check (tone in ('positive', 'warning', 'neutral')),
  created_at timestamptz not null default now(),
  unique (briefing_id, item_order)
);

create index if not exists idx_employee_autonomy_lookup on public.employee_autonomy_policies(organization_id, employee_id, action_key);
create index if not exists idx_employee_metrics_lookup on public.employee_metrics(organization_id, employee_id, period_type, period_start desc);
create index if not exists idx_crew_briefings_lookup on public.crew_briefings(organization_id, period_type, period_start desc);
create index if not exists idx_briefing_items_lookup on public.briefing_items(briefing_id, item_order);
create index if not exists idx_activities_status on public.activities(organization_id, status, created_at desc);
create index if not exists idx_activities_approval on public.activities(approval_id) where approval_id is not null;

alter table public.activities enable row level security;
alter table public.employee_autonomy_policies enable row level security;
alter table public.employee_metrics enable row level security;
alter table public.crew_briefings enable row level security;
alter table public.briefing_items enable row level security;

-- These policies already exist in older installations. Recreate them so this
-- migration remains safe both for a fresh database and for an upgraded one.
drop policy if exists activities_tenant_select on public.activities;
drop policy if exists activities_tenant_insert on public.activities;
create policy activities_tenant_select on public.activities for select using (public.is_organization_member(organization_id));
create policy activities_tenant_insert on public.activities for insert with check (public.is_organization_member(organization_id));
create policy autonomy_tenant_select on public.employee_autonomy_policies for select using (public.is_organization_member(organization_id));
create policy autonomy_tenant_manage on public.employee_autonomy_policies for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy metrics_tenant_select on public.employee_metrics for select using (public.is_organization_member(organization_id));
create policy metrics_tenant_manage on public.employee_metrics for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy briefings_tenant_select on public.crew_briefings for select using (public.is_organization_member(organization_id));
create policy briefings_tenant_manage on public.crew_briefings for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id) and created_by = auth.uid());
create policy briefing_items_tenant_select on public.briefing_items for select using (
  exists (select 1 from public.crew_briefings b where b.id = briefing_id and public.is_organization_member(b.organization_id))
);
create policy briefing_items_tenant_manage on public.briefing_items for all using (
  exists (select 1 from public.crew_briefings b where b.id = briefing_id and public.is_organization_manager(b.organization_id))
) with check (
  exists (select 1 from public.crew_briefings b where b.id = briefing_id and public.is_organization_manager(b.organization_id))
);

drop trigger if exists employee_autonomy_policies_updated on public.employee_autonomy_policies;
drop trigger if exists employee_metrics_updated on public.employee_metrics;
drop trigger if exists crew_briefings_updated on public.crew_briefings;
create trigger employee_autonomy_policies_updated before update on public.employee_autonomy_policies for each row execute function public.touch_updated_at();
create trigger employee_metrics_updated before update on public.employee_metrics for each row execute function public.touch_updated_at();
create trigger crew_briefings_updated before update on public.crew_briefings for each row execute function public.touch_updated_at();
