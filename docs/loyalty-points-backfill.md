# Loyalty-points backfill

Back up the database and apply `202607170003_add_loyalty_points_ledger.sql` before using this tool. It is intentionally not run by the app or during migration deployment.

## Required Supabase schema step

Apply the complete migration before deploying the frontend that reads loyalty settings. From a linked Supabase project, run:

```powershell
npx supabase db push
```

Or open the Supabase SQL Editor and run the complete contents of `supabase/migrations/202607170003_add_loyalty_points_ledger.sql`. The migration creates `public.loyalty_program_settings`, inserts the safe default `(true, 10000, 1500)`, enables RLS, and grants authenticated users read access through the `Authenticated users can view loyalty program settings` select policy.

The configured earning rule is one point for each full 10,000 VND of a completed customer order. The ledger uses the order id as a unique reference, so applying the backfill again cannot duplicate points.

## Check / dry run

Run this read-only check in the Supabase SQL Editor:

```sql
select
  sale_order.id as order_id,
  sale_order.customer_id,
  floor(sale_order.total_vnd::numeric / settings.vnd_per_point)::integer as points_would_be_awarded
from public.orders sale_order
cross join public.loyalty_program_settings settings
left join public.loyalty_point_entries entry on entry.order_id = sale_order.id
where sale_order.status = 'completed'
  and sale_order.customer_id is not null
  and entry.order_id is null
order by sale_order.completed_at, sale_order.id;
```

Each returned row is an eligible completed customer order and the number of points it would receive. No rows are written in this mode.

## Apply once reviewed

```powershell
$env:SUPABASE_URL='https://your-project.supabase.co'
$env:SUPABASE_ANON_KEY='your-anon-key'
$env:LOYALTY_ADMIN_EMAIL='owner@example.com'
$env:LOYALTY_ADMIN_PASSWORD='local-only-password'
npm run backfill:loyalty

# Apply only after reviewing the dry run.
npm run backfill:loyalty -- --apply
```

The result reports `awarded` rows on the first run. A second run returns no rows because every processed order has a `loyalty_point_entries.order_id` record.

## Verify

```sql
select order_id, customer_id, points, created_at
from public.loyalty_point_entries
order by created_at desc;
```

To reverse a mistaken backfill, use the result rows to subtract the matching ledger points from the affected customer records, then delete only those ledger rows. Do not use the sales-data reset unless its deletion scope is intended.
