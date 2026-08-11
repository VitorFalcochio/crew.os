-- CREW.OS Integration Engine. Reuses integrations, approvals, activities,
-- automation_events, tasks and audit_logs instead of creating parallel domains.

alter table public.integrations
  add column if not exists account_identifier text,
  add column if not exists scopes jsonb not null default '[]',
  add column if not exists capabilities jsonb not null default '[]',
  add column if not exists priority integer not null default 0,
  add column if not exists last_sync_at timestamptz,
  add column if not exists token_expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}',
  add column if not exists health jsonb not null default '{"status":"unknown"}',
  add column if not exists created_at timestamptz not null default now();

alter table public.integrations drop constraint if exists integrations_status_check;
alter table public.integrations add constraint integrations_status_check check (status in ('connected','disconnected','expired','error','requires_reauth'));

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  connection_id uuid not null references public.integrations on delete cascade,
  credential_type text not null check (credential_type in ('oauth2','api_key','client_credentials','webhook_secret')),
  encrypted_payload jsonb not null,
  key_version integer not null default 1,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, connection_id, credential_type)
);

create table if not exists public.employee_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade,
  capability text not null,
  allowed boolean not null default false,
  constraints jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, capability)
);

alter table public.employee_autonomy_policies alter column employee_id drop not null;
alter table public.employee_autonomy_policies drop constraint if exists employee_autonomy_policies_mode_check;
alter table public.employee_autonomy_policies add constraint employee_autonomy_policies_mode_check check (mode in ('observe','approval_required','autonomous','blocked','observe_only','suggest','automatic','automatic_with_limits'));
alter table public.employee_autonomy_policies alter column limits set default '{}';
create unique index if not exists idx_autonomy_org_default on public.employee_autonomy_policies(organization_id, action_key) where employee_id is null;

create table if not exists public.integration_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete restrict,
  task_id uuid references public.tasks on delete set null,
  connection_id uuid not null references public.integrations on delete restrict,
  provider text not null,
  capability text not null,
  idempotency_key text not null,
  status text not null check (status in ('pending','awaiting_approval','executing','succeeded','failed','rejected')),
  input_data jsonb not null default '{}',
  output_data jsonb,
  error_data jsonb,
  approval_id uuid,
  external_id text,
  attempt integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (organization_id, idempotency_key)
);

alter table public.approvals
  add column if not exists integration_action_id uuid references public.integration_actions on delete set null,
  add column if not exists capability text,
  add column if not exists provider text,
  add column if not exists reason text,
  add column if not exists integration_status text check (integration_status is null or integration_status in ('pending','approved','rejected','expired','executed','failed'));
alter table public.integration_actions drop constraint if exists integration_actions_approval_id_fkey;
alter table public.integration_actions add constraint integration_actions_approval_id_fkey foreign key (approval_id) references public.approvals(id) on delete set null;
create unique index if not exists idx_approvals_integration_action on public.approvals(organization_id, integration_action_id) where integration_action_id is not null;

create table if not exists public.integration_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  connection_id uuid not null references public.integrations on delete cascade,
  provider text not null,
  external_id text not null,
  payload_hash text not null,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  error_data jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (organization_id, connection_id, external_id)
);

create table if not exists public.trigger_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  event_type text not null,
  employee_id uuid not null references public.digital_employees on delete cascade,
  conditions jsonb not null default '[]',
  task_template jsonb not null,
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_sync_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  connection_id uuid not null references public.integrations on delete cascade,
  resource text not null,
  cursor text,
  status text not null default 'idle' check (status in ('idle','running','error')),
  last_success_at timestamptz,
  last_error jsonb,
  updated_at timestamptz not null default now(),
  unique (organization_id, connection_id, resource)
);

create index if not exists idx_integrations_resolution on public.integrations(organization_id, status, priority desc);
create index if not exists idx_permissions_lookup on public.employee_permissions(organization_id, employee_id, capability) where allowed;
create index if not exists idx_actions_task on public.integration_actions(organization_id, task_id, created_at desc);
create index if not exists idx_actions_status on public.integration_actions(organization_id, status, created_at desc);
create index if not exists idx_webhook_delivery_created on public.integration_webhook_deliveries(organization_id, provider, received_at desc);
create index if not exists idx_trigger_rules_event on public.trigger_rules(organization_id, event_type) where active;
create index if not exists idx_sync_states_connection on public.integration_sync_states(organization_id, connection_id);

alter table public.integration_credentials enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.integration_actions enable row level security;
alter table public.integration_webhook_deliveries enable row level security;
alter table public.trigger_rules enable row level security;
alter table public.integration_sync_states enable row level security;

-- Deliberately no authenticated policy for credential ciphertext. Only the
-- service role can access the vault table.
create policy employee_permissions_select on public.employee_permissions for select using (public.is_organization_member(organization_id));
create policy employee_permissions_manage on public.employee_permissions for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy integration_actions_select on public.integration_actions for select using (public.is_organization_member(organization_id));
create policy webhook_deliveries_select on public.integration_webhook_deliveries for select using (public.is_organization_manager(organization_id));
create policy trigger_rules_select on public.trigger_rules for select using (public.is_organization_member(organization_id));
create policy trigger_rules_manage on public.trigger_rules for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id) and created_by = auth.uid());
create policy sync_states_select on public.integration_sync_states for select using (public.is_organization_member(organization_id));

create trigger integration_credentials_updated before update on public.integration_credentials for each row execute function public.touch_updated_at();
create trigger employee_permissions_updated before update on public.employee_permissions for each row execute function public.touch_updated_at();
create trigger trigger_rules_updated before update on public.trigger_rules for each row execute function public.touch_updated_at();
create trigger integration_sync_states_updated before update on public.integration_sync_states for each row execute function public.touch_updated_at();
