# Reset Business Data

Use `supabase/reset-business-data.sql` to clear demo/test operational data before handing SN POS V2 to the shop owner.

This reset keeps store settings unchanged:

- Store name and branding paths
- Logo references
- Bank and VietQR settings
- VAT settings
- Auth users
- Supabase storage bucket configuration

It clears business data used by POS, products, inventory, orders, customers, dashboard, and reports.

## How To Run

1. Open the target Supabase project.
2. Go to **SQL Editor**.
3. Open `supabase/reset-business-data.sql` from this repo.
4. Review the comments, especially the `categories` delete.
5. Paste the SQL into Supabase SQL Editor.
6. Run the script.
7. Refresh the app and confirm:
   - Products are empty.
   - Orders are empty.
   - Customers are empty.
   - Inventory movements are empty.
   - Dashboard and reports show empty/zero states.
   - Settings still show the correct branding, VAT, and bank/VietQR data.

## Storage Images

The reset does not delete Supabase Storage files by default. Product image files can be removed only after confirming the `products` bucket contains demo-only files. The SQL file includes a commented optional cleanup block for reviewed storage cleanup.

Do not delete:

- `store_settings`
- `auth.users`
- Storage buckets or bucket configuration
