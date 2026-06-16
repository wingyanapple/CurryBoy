-- ============================================================
-- CurryBoy 更新：Foodpanda 平台佣金自動扣除
-- 你已經有資料都安全 Run，舊紀錄會自動重新計算。
-- 用法：Supabase → SQL Editor → New query → 貼上 → Run
-- ============================================================

-- 重新定義「當日總營業額」：Foodpanda 入原數，計算時自動扣佣金
--   2026-05-21 ~ 2026-09-30：扣 15%（×0.85）
--   2026-10-01 起          ：扣 30%（×0.70）
--   之前日子                ：唔扣（×1.0）

alter table daily_revenue drop column if exists total;

alter table daily_revenue add column total numeric(12,2)
  generated always as (
    curryboy + keeta + foodpanda * (
      case
        when date >= date '2026-10-01' then 0.70
        when date >= date '2026-05-21' then 0.85
        else 1.0
      end
    )
  ) stored;

-- 完成 ✅（如果日後佣金率有變，再 Run 一次呢段、改返個百分比就得）
