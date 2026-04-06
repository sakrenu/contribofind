-- ContriboFind Database Schema
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

create table users (
  id uuid primary key default gen_random_uuid(),
  github_id text unique not null,
  username text not null,
  avatar_url text,
  preferences jsonb default '{"languages": [], "difficulty": "any", "topics": []}',
  last_run_at timestamptz,
  created_at timestamptz default now()
);

create table saved_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  github_issue_id text not null,
  repo_full_name text not null,
  issue_title text not null,
  issue_url text not null,
  match_score int,
  draft_comment text,
  status text default 'not_started'
    check (status in ('not_started', 'in_progress', 'pr_submitted')),
  saved_at timestamptz default now()
);

create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  run_at timestamptz default now(),
  match_count int,
  preferences_snapshot jsonb
);

alter table users enable row level security;
alter table saved_issues enable row level security;
alter table search_history enable row level security;

create policy "users can access own data" on users
  for all using (github_id = current_setting('app.github_id', true));

create policy "users can access own saved issues" on saved_issues
  for all using (user_id = (
    select id from users
    where github_id = current_setting('app.github_id', true)
  ));

create policy "users can access own search history" on search_history
  for all using (user_id = (
    select id from users
    where github_id = current_setting('app.github_id', true)
  ));
