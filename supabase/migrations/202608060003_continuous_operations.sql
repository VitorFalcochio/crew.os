create type public.job_status as enum ('queued','running','waiting_approval','succeeded','failed','dead');

alter table public.approvals add column if not exists idempotency_key text;
create unique index if not exists idx_approvals_idempotency on public.approvals(organization_id,idempotency_key) where idempotency_key is not null;

create table public.automation_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  source text not null, event_type text not null, idempotency_key text not null, payload jsonb not null default '{}',
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  occurred_at timestamptz not null default now(), processed_at timestamptz, created_at timestamptz not null default now(),
  unique(organization_id, source, idempotency_key)
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  task_id uuid references public.tasks on delete cascade, employee_id uuid references public.digital_employees on delete set null,
  job_type text not null, payload jsonb not null default '{}', status public.job_status not null default 'queued', priority integer not null default 50,
  attempt integer not null default 0, max_attempts integer not null default 5, run_after timestamptz not null default now(),
  locked_at timestamptz, locked_by text, idempotency_key text not null, last_error jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
  unique(organization_id, idempotency_key)
);
create table public.recurring_delegations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade, title text not null, description text not null,
  priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')), requires_approval boolean not null default true,
  cadence_minutes integer not null check (cadence_minutes between 15 and 525600), timezone text not null default 'America/Sao_Paulo',
  next_run_at timestamptz not null, active boolean not null default true, created_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tool_executions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  job_id uuid references public.jobs on delete set null, task_id uuid references public.tasks on delete set null,
  employee_id uuid references public.digital_employees on delete set null, tool_key text not null, status text not null check (status in ('running','succeeded','failed','approval_required')),
  input_data jsonb not null default '{}', output_data jsonb, error_data jsonb, duration_ms integer,
  started_at timestamptz not null default now(), completed_at timestamptz, idempotency_key text not null,
  unique(organization_id, idempotency_key)
);
create table public.provider_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  job_id uuid references public.jobs on delete set null, task_id uuid references public.tasks on delete set null,
  employee_id uuid references public.digital_employees on delete set null, provider text not null, model_route text not null,
  provider_request_id text, status text not null check (status in ('running','succeeded','failed')),
  input_tokens integer, output_tokens integer, duration_ms integer, error_code text,
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  external_id text, customer_name text not null, document text, amount numeric(12,2) not null check (amount >= 0),
  due_date date not null, direction text not null check (direction in ('receivable','payable')),
  status text not null check (status in ('open','paid','overdue','cancelled')), source text not null default 'manual',
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id, source, external_id)
);
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade, endpoint_key uuid not null default gen_random_uuid() unique,
  name text not null, event_type text not null, secret_hash text not null, task_template jsonb not null,
  active boolean not null default true, last_received_at timestamptz, created_by uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index idx_jobs_claim on public.jobs(status, run_after, priority desc, created_at) where status in ('queued','running');
create index idx_jobs_task on public.jobs(task_id, created_at desc);
create index idx_recurring_due on public.recurring_delegations(next_run_at) where active;
create index idx_events_org_created on public.automation_events(organization_id, created_at desc);
create index idx_tool_executions_task on public.tool_executions(task_id, started_at);
create index idx_financial_accounts_due on public.financial_accounts(organization_id, due_date, status);

alter table public.automation_events enable row level security;
alter table public.jobs enable row level security;
alter table public.recurring_delegations enable row level security;
alter table public.tool_executions enable row level security;
alter table public.provider_runs enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.webhook_endpoints enable row level security;

create policy events_tenant_select on public.automation_events for select using (public.is_organization_member(organization_id));
create policy events_tenant_insert on public.automation_events for insert with check (public.is_organization_member(organization_id));
create policy jobs_tenant_select on public.jobs for select using (public.is_organization_member(organization_id));
create policy recurring_tenant_select on public.recurring_delegations for select using (public.is_organization_member(organization_id));
create policy recurring_tenant_manage on public.recurring_delegations for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id) and created_by=auth.uid());
create policy tool_executions_tenant_select on public.tool_executions for select using (public.is_organization_member(organization_id));
create policy provider_runs_tenant_select on public.provider_runs for select using (public.is_organization_manager(organization_id));
create policy financial_accounts_tenant_select on public.financial_accounts for select using (public.is_organization_member(organization_id));
create policy financial_accounts_tenant_manage on public.financial_accounts for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy webhooks_tenant_select on public.webhook_endpoints for select using (public.is_organization_manager(organization_id));
create policy webhooks_tenant_manage on public.webhook_endpoints for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id) and created_by=auth.uid());

create trigger jobs_updated before update on public.jobs for each row execute function public.touch_updated_at();
create trigger recurring_updated before update on public.recurring_delegations for each row execute function public.touch_updated_at();
create trigger financial_accounts_updated before update on public.financial_accounts for each row execute function public.touch_updated_at();
create trigger webhook_endpoints_updated before update on public.webhook_endpoints for each row execute function public.touch_updated_at();

create or replace function public.enqueue_task_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.jobs (organization_id,task_id,employee_id,job_type,payload,priority,idempotency_key)
  values (new.organization_id,new.id,new.employee_id,'execute_task',jsonb_build_object('task_id',new.id),case new.priority when 'urgente' then 100 when 'alta' then 75 when 'media' then 50 else 25 end,'task:'||new.id::text)
  on conflict (organization_id,idempotency_key) do nothing;
  return new;
end; $$;
drop trigger if exists enqueue_new_task on public.tasks;
create trigger enqueue_new_task after insert on public.tasks for each row execute function public.enqueue_task_job();

insert into public.jobs (organization_id,task_id,employee_id,job_type,payload,status,priority,idempotency_key)
select task.organization_id,task.id,task.employee_id,'execute_task',jsonb_build_object('task_id',task.id),
  case when task.status='aguardando_aprovacao' then 'waiting_approval'::public.job_status else 'queued'::public.job_status end,
  case task.priority when 'urgente' then 100 when 'alta' then 75 when 'media' then 50 else 25 end,'task:'||task.id::text
from public.tasks task where task.status in ('recebida','planejando','executando','aguardando_ferramenta','aguardando_aprovacao')
on conflict (organization_id,idempotency_key) do nothing;

create or replace function public.enqueue_approved_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status='pendente' and new.status='aprovada' then
    update public.jobs set status='succeeded',completed_at=now() where task_id=new.task_id and status='waiting_approval';
    insert into public.jobs (organization_id,task_id,employee_id,job_type,payload,priority,idempotency_key)
    values (new.organization_id,new.task_id,new.employee_id,'resume_after_approval',jsonb_build_object('approval_id',new.id),90,'approval:'||new.id::text)
    on conflict (organization_id,idempotency_key) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists enqueue_approved_action on public.approvals;
create trigger enqueue_approved_action after update of status on public.approvals for each row execute function public.enqueue_approved_job();

create or replace function public.claim_next_job(p_worker_id text, p_lock_minutes integer default 10)
returns setof public.jobs language plpgsql security definer set search_path = public as $$
declare claimed_id uuid;
begin
  update public.jobs set status='queued',locked_at=null,locked_by=null,run_after=now(),last_error=jsonb_build_object('code','LEASE_EXPIRED')
  where status='running' and locked_at < now() - make_interval(mins => p_lock_minutes);
  select id into claimed_id from public.jobs where status='queued' and run_after<=now()
  order by priority desc,created_at asc for update skip locked limit 1;
  if claimed_id is null then return; end if;
  return query update public.jobs set status='running',locked_at=now(),locked_by=p_worker_id,attempt=attempt+1 where id=claimed_id returning *;
end; $$;

create or replace function public.enqueue_due_recurring_delegations(p_limit integer default 50)
returns integer language plpgsql security definer set search_path = public as $$
declare item public.recurring_delegations%rowtype; created_count integer := 0;
begin
  for item in select * from public.recurring_delegations where active and next_run_at<=now() order by next_run_at for update skip locked limit p_limit loop
    insert into public.tasks (organization_id,employee_id,title,description,priority,status,due_at,requires_approval,created_by,input_data)
    values (item.organization_id,item.employee_id,item.title,item.description,item.priority,'recebida',null,item.requires_approval,item.created_by,jsonb_build_object('recurring_delegation_id',item.id,'scheduled_for',item.next_run_at));
    update public.recurring_delegations set next_run_at=greatest(now(),next_run_at)+make_interval(mins=>cadence_minutes) where id=item.id;
    created_count := created_count + 1;
  end loop;
  return created_count;
end; $$;

revoke all on function public.claim_next_job(text,integer) from public,anon,authenticated;
grant execute on function public.claim_next_job(text,integer) to service_role;
revoke all on function public.enqueue_due_recurring_delegations(integer) from public,anon,authenticated;
grant execute on function public.enqueue_due_recurring_delegations(integer) to service_role;
