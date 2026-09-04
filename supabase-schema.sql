-- 루틴보드 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

create table if not exists rb_routines (
  id uuid primary key default gen_random_uuid(),
  share_code text unique not null,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists rb_reports (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references rb_routines(id) on delete cascade,
  report_date date not null default current_date,
  health text not null default 'good' check (health in ('good', 'warning', 'risk')),
  progress_summary text,
  risks_issues text,
  next_week_plan text,
  created_at timestamptz not null default now()
);

create table if not exists rb_tasks (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references rb_routines(id) on delete cascade,
  title text not null,
  owner_name text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date date,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists rb_risks (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references rb_routines(id) on delete cascade,
  title text not null,
  probability text not null default 'medium' check (probability in ('low', 'medium', 'high')),
  impact text not null default 'medium' check (impact in ('low', 'medium', 'high')),
  owner text,
  mitigation_plan text,
  status text not null default 'open' check (status in ('open', 'mitigating', 'closed')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists rb_retro_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references rb_routines(id) on delete cascade,
  category text not null check (category in ('good', 'improve', 'action')),
  content text not null,
  author_name text not null default '익명',
  created_at timestamptz not null default now()
);

create index if not exists rb_reports_routine_id_idx on rb_reports (routine_id);
create index if not exists rb_tasks_routine_id_idx on rb_tasks (routine_id);
create index if not exists rb_risks_routine_id_idx on rb_risks (routine_id);
create index if not exists rb_retro_items_routine_id_idx on rb_retro_items (routine_id);

alter table rb_routines enable row level security;
alter table rb_reports enable row level security;
alter table rb_tasks enable row level security;
alter table rb_risks enable row level security;
alter table rb_retro_items enable row level security;

-- MVP 정책: 링크(share_code)를 아는 사람은 누구나 읽고 쓸 수 있습니다.
-- 별도 로그인이 없는 대신, 링크 자체가 비밀번호 역할을 합니다.
-- 실제 회사 내부 정보를 다루게 되면 나중에 이메일 인증 등으로 강화하는 것을 권장합니다.

drop policy if exists "public read rb_routines" on rb_routines;
create policy "public read rb_routines" on rb_routines for select using (true);
drop policy if exists "public insert rb_routines" on rb_routines;
create policy "public insert rb_routines" on rb_routines for insert with check (true);

drop policy if exists "public read rb_reports" on rb_reports;
create policy "public read rb_reports" on rb_reports for select using (true);
drop policy if exists "public insert rb_reports" on rb_reports;
create policy "public insert rb_reports" on rb_reports for insert with check (true);
drop policy if exists "public update rb_reports" on rb_reports;
create policy "public update rb_reports" on rb_reports for update using (true);
drop policy if exists "public delete rb_reports" on rb_reports;
create policy "public delete rb_reports" on rb_reports for delete using (true);

drop policy if exists "public read rb_tasks" on rb_tasks;
create policy "public read rb_tasks" on rb_tasks for select using (true);
drop policy if exists "public insert rb_tasks" on rb_tasks;
create policy "public insert rb_tasks" on rb_tasks for insert with check (true);
drop policy if exists "public update rb_tasks" on rb_tasks;
create policy "public update rb_tasks" on rb_tasks for update using (true);
drop policy if exists "public delete rb_tasks" on rb_tasks;
create policy "public delete rb_tasks" on rb_tasks for delete using (true);

drop policy if exists "public read rb_risks" on rb_risks;
create policy "public read rb_risks" on rb_risks for select using (true);
drop policy if exists "public insert rb_risks" on rb_risks;
create policy "public insert rb_risks" on rb_risks for insert with check (true);
drop policy if exists "public update rb_risks" on rb_risks;
create policy "public update rb_risks" on rb_risks for update using (true);
drop policy if exists "public delete rb_risks" on rb_risks;
create policy "public delete rb_risks" on rb_risks for delete using (true);

drop policy if exists "public read rb_retro_items" on rb_retro_items;
create policy "public read rb_retro_items" on rb_retro_items for select using (true);
drop policy if exists "public insert rb_retro_items" on rb_retro_items;
create policy "public insert rb_retro_items" on rb_retro_items for insert with check (true);
drop policy if exists "public delete rb_retro_items" on rb_retro_items;
create policy "public delete rb_retro_items" on rb_retro_items for delete using (true);
