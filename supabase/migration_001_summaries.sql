-- 既存DBへの追加マイグレーション。Supabase SQL Editor で実行してください。
-- 何度実行してもOK（idempotent）。

create table if not exists daily_summaries (
  id uuid primary key default uuid_generate_v4(),
  industry_id uuid not null references industries(id) on delete cascade,
  date date not null,
  summary text not null,
  notable_item_ids uuid[] not null default '{}',
  generated_at timestamptz not null default now(),
  unique (industry_id, date)
);

create index if not exists daily_summaries_industry_date_idx
  on daily_summaries(industry_id, date desc);

alter table daily_summaries disable row level security;
