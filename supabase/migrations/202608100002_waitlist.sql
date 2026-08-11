create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null unique check (char_length(email) <= 254),
  company text check (company is null or char_length(company) <= 120),
  role text check (role is null or char_length(role) <= 80),
  source text not null default 'lista-de-espera' check (char_length(source) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waitlist_leads_created_at on public.waitlist_leads(created_at desc);

alter table public.waitlist_leads enable row level security;

-- Não há políticas públicas: submissões e consultas passam exclusivamente pela API server-side.
revoke all on table public.waitlist_leads from anon, authenticated;
