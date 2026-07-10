# Pre-Deploy Live QA Checklist

Live authenticated QA could not be run from this checkout because no test credentials or usable browser session were available. Do not guess credentials. Use this checklist with a real test account against the current Supabase environment.

## Setup

- [ ] Confirm the app uses the intended Supabase project from `.env`.
- [ ] Start the app with `npm run dev` or verify the deployed pre-production URL.
- [ ] Log in with an approved test account.
- [ ] Record the test account email, test date, app URL, and Supabase project URL in the QA notes.
- [ ] Use test product names prefixed with `QA PREDEPLOY` so cleanup is easy.

## Product CRUD

- [ ] Open **Products**.
- [ ] Create a product with name, category, status `Đang bán`, short description, full description, and at least one variant.
- [ ] Confirm the new product appears in the product list without refreshing.
- [ ] Refresh the page and confirm the product still appears.
- [ ] Edit the product name, category, descriptions, status, and first variant values.
- [ ] Confirm edits persist after refresh.
- [ ] Delete the QA product if it has no sales or inventory movement history.
- [ ] If the product has movement history, confirm delete archives it instead of removing it permanently.

## Image Upload

- [ ] Create or edit a QA product and upload a valid image file.
- [ ] Save the product.
- [ ] Confirm the image appears in Products.
- [ ] Open **Sales** and confirm the same image appears on the product card.
- [ ] Refresh and confirm the image still loads.
- [ ] Edit the product and replace the image.
- [ ] Confirm the replacement image appears after save and refresh.

## Variant Create And Edit

- [ ] Add a second variant with unique SKU, size, color, price, and stock.
- [ ] Save and reopen the product editor.
- [ ] Confirm both variants are present with correct values.
- [ ] Edit the second variant price and stock.
- [ ] Save, refresh, and confirm the edited values persist.
- [ ] Try saving a product with no variants and confirm validation prevents it.

## POS Add To Cart And Variant Selection

- [ ] Open **Sales**.
- [ ] Find the QA product.
- [ ] Select the first variant and add it to cart.
- [ ] Confirm the cart item shows the correct product, variant, price, and quantity.
- [ ] Select the second variant and add it to cart.
- [ ] Confirm both variants are represented correctly and do not overwrite each other.
- [ ] Increase and decrease cart quantities.
- [ ] Confirm subtotal, discount, tax, and total recalculate correctly.
- [ ] Attempt to exceed available stock and confirm the UI blocks or shows a clear error.

## Checkout, Stock Deduction, And Order Creation

- [ ] Note the stock quantity for each QA variant before checkout.
- [ ] Complete checkout with **Tiền mặt**.
- [ ] Confirm a success state or receipt/order confirmation appears.
- [ ] Confirm the cart clears after checkout.
- [ ] Return to Products or Inventory and confirm stock was reduced by the sold quantities.
- [ ] Complete a second checkout with **Chuyển khoản / QR** if store payment settings are configured.
- [ ] Confirm both orders are created with the correct payment methods and totals.

## Order Detail And Invoice Print

- [ ] Open **Orders**.
- [ ] Find the QA order by order number, time, total, or item count.
- [ ] Open order detail.
- [ ] Confirm customer label, line items, variants, quantities, subtotal, discount, tax, total, payment method, and status are correct.
- [ ] Trigger invoice print.
- [ ] Confirm the print preview contains store branding, order details, line items, totals, and payment method.
- [ ] Cancel the print dialog or save a PDF for QA evidence.

## Inventory Movements

- [ ] Open **Inventory**.
- [ ] Find the QA product variants.
- [ ] Confirm sale movements were created for each checkout item.
- [ ] Confirm movement quantity is negative for sales.
- [ ] Confirm `quantity_after` matches the stock after checkout.
- [ ] Confirm the movement note references the related order number.

## Reports Date Filter

- [ ] Open **Reports**.
- [ ] Set the date filter to include today.
- [ ] Confirm the QA order revenue and order count are included.
- [ ] Set the date filter to a range that excludes today.
- [ ] Confirm the QA order revenue and order count are excluded.
- [ ] Return to today and confirm charts/tables recover without stale data.

## Dashboard Data

- [ ] Open **Dashboard**.
- [ ] Confirm today revenue, order count, and inventory metrics reflect the QA checkout.
- [ ] Refresh and confirm dashboard data is stable.
- [ ] Check that empty/loading/error states do not remain visible after data loads.

## Store Settings Branding Sync

- [ ] Open **Settings**.
- [ ] Change the store name to a QA value and save.
- [ ] Upload or replace the store logo if available.
- [ ] Confirm the sidebar, header/profile area, login branding, invoice print view, and any receipt/order views use the updated branding.
- [ ] Refresh and confirm branding persists.
- [ ] Restore the original store name and logo before ending QA.

## Cleanup

- [ ] Delete QA products that have no order or inventory history.
- [ ] Archive QA products that cannot be deleted because they have history.
- [ ] Restore store settings changed during QA.
- [ ] Keep QA order records unless the database owner explicitly approves cleanup.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

## QA Result

- Tester:
- Date:
- Environment:
- App URL:
- Supabase project:
- Result: Pass / Fail / Blocked
- Bugs found:
- Bugs fixed:
- Remaining risks:
