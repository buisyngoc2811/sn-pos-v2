# Product image WebP migration

This one-time migration converts existing JPG, JPEG, and PNG product images to WebP. Back up the database and the `products` Storage bucket before running it.

## Scope

- Storage bucket: `products`
- Database field: `public.products.image_path`
- Images are resized inside a 1200 × 1200 box without upscaling and converted with WebP quality 0.82.
- The current app convention is preserved: storage paths remain paths, while legacy public URLs remain public URLs.

The current schema has one product-image column, so there are no additional product-image fields to migrate.

## Setup

1. Copy `.env.migration.example` to `.env.migration`.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not use a browser anon key, commit this file, or expose the service-role key to frontend code.
3. Optionally set `MIGRATION_CONCURRENCY` (default: 3; maximum: 10).

## Commands

Dry run: downloads and converts images, but does not upload, update the database, or delete originals.

```powershell
node --env-file=.env.migration scripts/migrate-product-images-to-webp.mjs --dry-run
```

Real migration:

```powershell
node --env-file=.env.migration scripts/migrate-product-images-to-webp.mjs
```

## Safety and verification

- Each run writes JSONL records to `scripts/logs/`; these logs are ignored by Git.
- The script skips rows already ending in `.webp` and uses a deterministic `migrated-webp/<product-id>-<hash>.webp` destination. Re-running it does not create duplicate migrated objects.
- It uploads the new object before updating `image_path`, and deletes an original only after a successful database update. A failure leaves the original intact and processing continues for other products.
- Verify the final log has `success` or `skipped` for each product, then check that `public.products.image_path` points to `.webp` storage paths/URLs and load product thumbnails in the app.

## Rollback

Use the JSONL log's `productId`, `oldImageUrl`, and `newImageUrl` fields to restore `public.products.image_path` to the old value. The script deletes originals only after a successful update, so restore deleted originals from the Storage backup taken before migration. Do not remove migrated WebP objects until the database field has been restored and verified.
