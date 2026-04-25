-- Industry Watch schema
-- Supabase SQL Editor で実行してください

create extension if not exists "uuid-ossp";

create table if not exists industries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default uuid_generate_v4(),
  industry_id uuid not null references industries(id) on delete cascade,
  name text not null,
  url text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sources_industry_idx on sources(industry_id);

create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references sources(id) on delete cascade,
  industry_id uuid not null references industries(id) on delete cascade,
  title text not null,
  url text not null,
  summary text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (source_id, url)
);
create index if not exists items_industry_published_idx
  on items(industry_id, published_at desc nulls last);

-- 初期データ: ライブ配信業界
insert into industries (name, slug) values ('ライブ配信', 'live-streaming')
  on conflict (slug) do nothing;

insert into sources (industry_id, name, url)
select i.id, s.name, s.url
from industries i
cross join (values
  ('Google News: Pococha',   'https://news.google.com/rss/search?q=%22Pococha%22&hl=ja&gl=JP&ceid=JP:ja'),
  ('Google News: IRIAM',     'https://news.google.com/rss/search?q=%22IRIAM%22&hl=ja&gl=JP&ceid=JP:ja'),
  ('Google News: REALITY',   'https://news.google.com/rss/search?q=%22REALITY%22+%E9%85%8D%E4%BF%A1&hl=ja&gl=JP&ceid=JP:ja'),
  ('Google News: Mirrativ',  'https://news.google.com/rss/search?q=%22Mirrativ%22&hl=ja&gl=JP&ceid=JP:ja'),
  ('Google News: 17LIVE',    'https://news.google.com/rss/search?q=%2217LIVE%22&hl=ja&gl=JP&ceid=JP:ja'),
  ('Google News: ライブ配信業界','https://news.google.com/rss/search?q=%E3%83%A9%E3%82%A4%E3%83%96%E9%85%8D%E4%BF%A1+%E6%A5%AD%E7%95%8C&hl=ja&gl=JP&ceid=JP:ja')
) as s(name, url)
where i.slug = 'live-streaming'
  and not exists (select 1 from sources s2 where s2.industry_id = i.id and s2.url = s.url);

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

-- RLS は今回は使わない（service_role key 経由でのみアクセス）
alter table industries      disable row level security;
alter table sources         disable row level security;
alter table items           disable row level security;
alter table daily_summaries disable row level security;
