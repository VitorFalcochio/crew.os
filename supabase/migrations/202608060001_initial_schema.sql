create extension if not exists pgcrypto;

create type public.employee_status as enum ('trabalhando','aguardando_aprovacao','disponivel','pausado','com_erro','configurando');
create type public.task_status as enum ('recebida','planejando','executando','aguardando_ferramenta','aguardando_aprovacao','concluida','falhou','cancelada');
create type public.approval_status as enum ('pendente','aprovada','recusada','ajuste_solicitado');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  industry text, size text, owner_id uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null, role text not null check (role in ('owner','admin','manager','member','viewer')),
  permissions jsonb not null default '{}', created_at timestamptz not null default now(), unique (organization_id,user_id)
);
create table public.employee_templates (
  id uuid primary key default gen_random_uuid(), name text not null, role_name text not null, department text not null,
  industry text, description text not null, skills jsonb not null default '[]', default_tools jsonb not null default '[]',
  default_permissions jsonb not null default '{}', default_instructions text not null, monthly_price numeric(12,2) not null,
  published boolean not null default false, created_at timestamptz not null default now()
);
create table public.digital_employees (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  template_id uuid references public.employee_templates, name text not null, avatar_url text, role_name text not null,
  department text not null, seniority text not null, description text not null, status public.employee_status not null default 'configurando',
  monthly_price numeric(12,2) not null, configuration jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid references public.digital_employees on delete set null, parent_task_id uuid references public.tasks on delete set null,
  title text not null, description text not null, priority text not null check (priority in ('baixa','media','alta','urgente')),
  status public.task_status not null default 'recebida', due_at timestamptz, requires_approval boolean not null default true,
  created_by uuid not null, input_data jsonb not null default '{}', output_data jsonb, error_data jsonb,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.task_steps (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks on delete cascade,
  employee_id uuid references public.digital_employees on delete set null, step_order integer not null, title text not null,
  status public.task_status not null default 'recebida', input_data jsonb not null default '{}', output_data jsonb,
  started_at timestamptz, completed_at timestamptz, unique(task_id,step_order)
);
create table public.approvals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  task_id uuid not null references public.tasks on delete cascade, employee_id uuid references public.digital_employees on delete set null,
  action_type text not null, title text not null, description text not null, impact text, risk_level text not null check (risk_level in ('baixo','medio','alto')),
  payload jsonb not null default '{}', status public.approval_status not null default 'pendente', requested_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by uuid, resolution_note text
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade, title text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
  sender_type text not null check (sender_type in ('user','employee','system')), sender_id uuid, content text not null,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.employee_memories (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid not null references public.digital_employees on delete cascade,
  memory_type text not null check (memory_type in ('identity','organization','operational')), title text not null, content text not null,
  importance smallint not null default 5 check (importance between 1 and 10), source text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tools (
  id uuid primary key default gen_random_uuid(), key text not null unique, name text not null, description text not null,
  category text not null, configuration_schema jsonb not null default '{}', enabled boolean not null default true
);
create table public.employee_tools (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.digital_employees on delete cascade,
  tool_id uuid not null references public.tools on delete cascade, permissions jsonb not null default '{}', configuration jsonb not null default '{}',
  enabled boolean not null default true, unique(employee_id,tool_id)
);
create table public.integrations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  provider text not null, status text not null, credentials_reference text, configuration jsonb not null default '{}',
  connected_at timestamptz, updated_at timestamptz not null default now(), unique(organization_id,provider)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  employee_id uuid references public.digital_employees on delete set null, task_id uuid references public.tasks on delete set null,
  activity_type text not null, title text not null, description text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade unique,
  plan text not null, included_employees integer not null default 3, additional_employees integer not null default 0,
  base_price numeric(12,2) not null, additional_price numeric(12,2) not null, status text not null,
  current_period_start timestamptz not null, current_period_end timestamptz not null
);

create index idx_members_user on public.organization_members(user_id);
create index idx_employees_org on public.digital_employees(organization_id);
create index idx_tasks_org_status on public.tasks(organization_id,status);
create index idx_approvals_org_status on public.approvals(organization_id,status);
create index idx_activities_org_created on public.activities(organization_id,created_at desc);
create index idx_memories_employee on public.employee_memories(employee_id,memory_type);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members where organization_id=target_organization_id and user_id=auth.uid()) $$;
create or replace function public.is_organization_manager(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members where organization_id=target_organization_id and user_id=auth.uid() and role in ('owner','admin','manager')) $$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.digital_employees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_steps enable row level security;
alter table public.approvals enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.employee_memories enable row level security;
alter table public.employee_tools enable row level security;
alter table public.integrations enable row level security;
alter table public.activities enable row level security;
alter table public.subscriptions enable row level security;
alter table public.employee_templates enable row level security;
alter table public.tools enable row level security;

create policy organizations_select on public.organizations for select using (public.is_organization_member(id));
create policy organizations_update on public.organizations for update using (public.is_organization_manager(id));
create policy members_select on public.organization_members for select using (public.is_organization_member(organization_id));
create policy members_manage on public.organization_members for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy templates_public_read on public.employee_templates for select using (published);
create policy tools_public_read on public.tools for select using (enabled);

create policy employees_tenant_select on public.digital_employees for select using (public.is_organization_member(organization_id));
create policy employees_tenant_write on public.digital_employees for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy tasks_tenant_select on public.tasks for select using (public.is_organization_member(organization_id));
create policy tasks_tenant_insert on public.tasks for insert with check (public.is_organization_member(organization_id) and created_by=auth.uid());
create policy tasks_tenant_update on public.tasks for update using (public.is_organization_manager(organization_id));
create policy approvals_tenant_select on public.approvals for select using (public.is_organization_member(organization_id));
create policy approvals_tenant_update on public.approvals for update using (public.is_organization_manager(organization_id));
create policy conversations_tenant on public.conversations for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy memories_tenant on public.employee_memories for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy integrations_tenant on public.integrations for all using (public.is_organization_manager(organization_id)) with check (public.is_organization_manager(organization_id));
create policy activities_tenant_select on public.activities for select using (public.is_organization_member(organization_id));
create policy subscriptions_tenant_select on public.subscriptions for select using (public.is_organization_member(organization_id));

create policy task_steps_via_task on public.task_steps for select using (exists(select 1 from public.tasks t where t.id=task_id and public.is_organization_member(t.organization_id)));
create policy messages_via_conversation on public.messages for select using (exists(select 1 from public.conversations c where c.id=conversation_id and public.is_organization_member(c.organization_id)));
create policy employee_tools_via_employee on public.employee_tools for select using (exists(select 1 from public.digital_employees e where e.id=employee_id and public.is_organization_member(e.organization_id)));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger organizations_updated before update on public.organizations for each row execute function public.touch_updated_at();
create trigger employees_updated before update on public.digital_employees for each row execute function public.touch_updated_at();
create trigger tasks_updated before update on public.tasks for each row execute function public.touch_updated_at();
create trigger conversations_updated before update on public.conversations for each row execute function public.touch_updated_at();
create trigger memories_updated before update on public.employee_memories for each row execute function public.touch_updated_at();
create trigger integrations_updated before update on public.integrations for each row execute function public.touch_updated_at();
