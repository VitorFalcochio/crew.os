create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org_created on public.audit_logs(organization_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy audit_logs_tenant_select on public.audit_logs for select using (public.is_organization_manager(organization_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_industry text,
  p_size text,
  p_template_ids uuid[],
  p_context jsonb default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_organization_id uuid;
  valid_template_count integer;
begin
  if current_user_id is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if length(trim(p_name)) < 2 then raise exception 'INVALID_ORGANIZATION_NAME'; end if;
  if coalesce(array_length(p_template_ids, 1), 0) not between 1 and 3 then raise exception 'EMPLOYEE_LIMIT_EXCEEDED'; end if;
  select count(*) into valid_template_count from public.employee_templates where id = any(p_template_ids) and published = true;
  if valid_template_count <> array_length(p_template_ids, 1) then raise exception 'INVALID_EMPLOYEE_TEMPLATE'; end if;

  insert into public.organizations (name, slug, industry, size, owner_id)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_industry), ''), p_size, current_user_id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role, permissions)
  values (new_organization_id, current_user_id, 'owner', '{"all":true}');

  insert into public.digital_employees (organization_id, template_id, name, role_name, department, seniority, description, status, monthly_price, configuration)
  select new_organization_id, template.id, template.name, template.role_name, template.department,
    case when template.monthly_price >= 149 then 'Especialista' else 'Pleno' end,
    template.description, 'configurando', template.monthly_price,
    jsonb_build_object('onboarding_context', p_context, 'skills', template.skills, 'tools', template.default_tools, 'instructions', template.default_instructions)
  from public.employee_templates template where template.id = any(p_template_ids) and template.published = true;

  insert into public.employee_tools (employee_id, tool_id, permissions, configuration, enabled)
  select employee.id, tool.id, template.default_permissions, '{}', true
  from public.digital_employees employee
  join public.employee_templates template on template.id = employee.template_id
  cross join lateral jsonb_array_elements_text(template.default_tools) as tool_keys(tool_key)
  join public.tools tool on tool.key = tool_keys.tool_key
  where employee.organization_id = new_organization_id
  on conflict (employee_id, tool_id) do nothing;

  insert into public.subscriptions (organization_id, plan, included_employees, additional_employees, base_price, additional_price, status, current_period_start, current_period_end)
  values (new_organization_id, 'crew_starter', 3, 0, 299, 79, 'trialing', now(), now() + interval '14 days');

  insert into public.activities (organization_id, activity_type, title, description, metadata)
  values (new_organization_id, 'organization_created', 'Empresa configurada', 'A equipe inicial foi contratada e está sendo configurada.', jsonb_build_object('employee_count', array_length(p_template_ids, 1)));
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (new_organization_id, current_user_id, 'create', 'organization', new_organization_id, jsonb_build_object('name', trim(p_name), 'templates', p_template_ids));
  return new_organization_id;
end;
$$;

create or replace function public.resolve_task_approval(
  p_approval_id uuid,
  p_organization_id uuid,
  p_status text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target public.approvals%rowtype;
  next_task_status public.task_status;
begin
  if current_user_id is null or not public.is_organization_manager(p_organization_id) then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('aprovada','recusada','ajuste_solicitado') then raise exception 'INVALID_STATUS'; end if;
  select * into target from public.approvals where id = p_approval_id and organization_id = p_organization_id and status = 'pendente' for update;
  if not found then raise exception 'APPROVAL_NOT_FOUND_OR_RESOLVED'; end if;
  update public.approvals set status = p_status::public.approval_status, resolved_at = now(), resolved_by = current_user_id, resolution_note = p_note where id = target.id;
  next_task_status := case p_status when 'aprovada' then 'executando'::public.task_status when 'recusada' then 'cancelada'::public.task_status else 'planejando'::public.task_status end;
  update public.tasks set status = next_task_status where id = target.task_id and organization_id = p_organization_id;
  insert into public.activities (organization_id, employee_id, task_id, activity_type, title, description, metadata)
  values (p_organization_id, target.employee_id, target.task_id, 'approval_resolved',
    case p_status when 'aprovada' then 'Ação aprovada' when 'recusada' then 'Ação recusada' else 'Ajuste solicitado' end,
    coalesce(p_note, 'Decisão registrada pelo gestor.'), jsonb_build_object('approval_id', target.id, 'status', p_status));
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (p_organization_id, current_user_id, 'resolve', 'approval', target.id, jsonb_build_object('status', 'pendente'), jsonb_build_object('status', p_status, 'note', p_note));
  return jsonb_build_object('approval_id', target.id, 'task_id', target.task_id, 'status', p_status, 'task_status', next_task_status);
end;
$$;

create policy task_steps_tenant_insert on public.task_steps for insert with check (
  exists(select 1 from public.tasks t where t.id=task_id and public.is_organization_manager(t.organization_id))
);
create policy task_steps_tenant_update on public.task_steps for update using (
  exists(select 1 from public.tasks t where t.id=task_id and public.is_organization_manager(t.organization_id))
);
create policy messages_tenant_insert on public.messages for insert with check (
  exists(select 1 from public.conversations c where c.id=conversation_id and public.is_organization_member(c.organization_id))
);
create policy employee_tools_tenant_manage on public.employee_tools for all using (
  exists(select 1 from public.digital_employees e where e.id=employee_id and public.is_organization_manager(e.organization_id))
) with check (
  exists(select 1 from public.digital_employees e where e.id=employee_id and public.is_organization_manager(e.organization_id))
);
create policy activities_tenant_insert on public.activities for insert with check (public.is_organization_member(organization_id));
create policy subscriptions_tenant_manage on public.subscriptions for update using (public.is_organization_manager(organization_id));

revoke all on function public.create_organization_with_owner(text,text,text,text,uuid[],jsonb) from public;
grant execute on function public.create_organization_with_owner(text,text,text,text,uuid[],jsonb) to authenticated;
revoke all on function public.resolve_task_approval(uuid,uuid,text,text) from public;
grant execute on function public.resolve_task_approval(uuid,uuid,text,text) to authenticated;
