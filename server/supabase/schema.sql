create table if not exists public.work_entries (
  id text primary key,
  date text not null,
  assignee text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_entries_date on public.work_entries (date);
create index if not exists idx_work_entries_assignee on public.work_entries (assignee);

alter table public.work_entries enable row level security;
