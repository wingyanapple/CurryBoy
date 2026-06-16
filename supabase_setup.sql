-- ============================================================
-- CurryBoy 營業小助理 — Supabase 資料庫設定
-- 用法：Supabase Dashboard → 左邊 SQL Editor → New query
--       將呢個檔案全部內容貼上 → 撳 Run
-- ============================================================

-- 1) 本日 / 每日營業額（同一日只有一筆，date 設為唯一）
create table if not exists daily_revenue (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  curryboy   numeric(12,2) not null default 0,
  keeta      numeric(12,2) not null default 0,
  foodpanda  numeric(12,2) not null default 0,
  total      numeric(12,2) generated always as (
               curryboy + keeta + foodpanda * (case
                 when date >= date '2026-10-01' then 0.70
                 when date >= date '2026-05-21' then 0.85
                 else 1.0 end)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 自動更新 updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_daily_revenue_updated on daily_revenue;
create trigger trg_daily_revenue_updated
  before update on daily_revenue
  for each row execute function set_updated_at();

-- 2) 支出
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  category   text not null,
  amount     numeric(12,2) not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_date on expenses(date);

-- 3) 待辦事項
create table if not exists todos (
  id         uuid primary key default gen_random_uuid(),
  category   text not null default '次重要',   -- 重要 / 次重要 / 有空才處理
  content    text not null,
  note       text,
  status     text not null default '未完成',   -- 未完成 / 已完成
  created_at timestamptz not null default now()
);

-- 4) Idea
create table if not exists ideas (
  id         uuid primary key default gen_random_uuid(),
  category   text,
  content    text not null,
  note       text,
  created_at timestamptz not null default now()
);

-- 5) 購物清單
create table if not exists shopping (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  quantity   text,
  category   text,
  note       text,
  status     text not null default '待買',     -- 待買 / 已買
  created_at timestamptz not null default now()
);

-- ============================================================
-- 權限（RLS）
-- 呢個係兩個人共用嘅私人小工具，為咗簡單，容許 publishable key 讀寫。
-- 只要你唔公開你個 Project URL，一般人唔會搵到。
-- 之後想加密碼 / 登入，可以再改呢度。
-- ============================================================
alter table daily_revenue enable row level security;
alter table expenses      enable row level security;
alter table todos         enable row level security;
alter table ideas         enable row level security;
alter table shopping      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['daily_revenue','expenses','todos','ideas','shopping']
  loop
    execute format('drop policy if exists "allow all" on %I;', t);
    execute format(
      'create policy "allow all" on %I for all
       to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- 即時同步（兩部手機其中一部改，另一部會自動更新）
-- ============================================================
alter publication supabase_realtime add table daily_revenue;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table ideas;
alter publication supabase_realtime add table shopping;

-- 完成 ✅
