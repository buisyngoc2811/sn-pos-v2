import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { appendFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const PRODUCT_BUCKET = 'products'
const PRODUCT_TABLE = 'products'
const IMAGE_COLUMN = 'image_path'
const MAX_DIMENSION = 1200
const WEBP_QUALITY = 82
const PAGE_SIZE = 100
const DEFAULT_CONCURRENCY = 3
const supportedExtensions = new Set(['jpg', 'jpeg', 'png'])

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const configuredConcurrency = Number.parseInt(process.env.MIGRATION_CONCURRENCY ?? '', 10)
const concurrency = Number.isInteger(configuredConcurrency) && configuredConcurrency > 0
  ? Math.min(configuredConcurrency, 10)
  : DEFAULT_CONCURRENCY
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.migration.example as a template.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const startedAt = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const logDirectory = resolve('scripts/logs')
const logPath = resolve(logDirectory, `product-image-webp-${startedAt}.jsonl`)

function bytes(value) {
  return typeof value === 'number' ? value : null
}

function extensionFromLocation(value) {
  try {
    const pathname = /^https?:\/\//i.test(value) ? new URL(value).pathname : value.split('?')[0]
    return pathname.split('.').pop()?.toLowerCase() ?? ''
  } catch {
    return ''
  }
}

function extractStoragePath(value) {
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '')

  const url = new URL(value)
  const prefix = `/storage/v1/object/public/${PRODUCT_BUCKET}/`
  if (!url.pathname.startsWith(prefix)) return null

  return decodeURIComponent(url.pathname.slice(prefix.length))
}

function isPublicStorageUrl(value) {
  return /^https?:\/\//i.test(value) && extractStoragePath(value) !== null
}

function deterministicWebpPath(productId, sourceValue) {
  const digest = createHash('sha256').update(sourceValue).digest('hex').slice(0, 16)
  return `migrated-webp/${productId}-${digest}.webp`
}

function publicUrlFor(path) {
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl
}

async function writeLog(entry) {
  const record = { timestamp: new Date().toISOString(), ...entry }
  console.log(JSON.stringify(record))
  await appendFile(logPath, `${JSON.stringify(record)}\n`)
}

async function downloadSource(sourceValue, storagePath) {
  if (storagePath) {
    const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).download(storagePath)
    if (error) throw error
    return Buffer.from(await data.arrayBuffer())
  }

  const response = await fetch(sourceValue)
  if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function existingDestinationSize(path) {
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).download(path)
  if (error) return null
  return Buffer.from(await data.arrayBuffer()).byteLength
}

async function migrateProduct(product) {
  const oldValue = product[IMAGE_COLUMN]
  const oldExtension = extensionFromLocation(oldValue)
  const oldStoragePath = extractStoragePath(oldValue)
  const baseLog = {
    productId: product.id,
    oldImageUrl: oldValue,
    oldSize: null,
    newImageUrl: null,
    newSize: null,
  }

  if (oldExtension === 'webp') {
    await writeLog({ ...baseLog, newImageUrl: oldValue, status: 'skipped', reason: 'already_webp' })
    return
  }

  if (!supportedExtensions.has(oldExtension)) {
    await writeLog({ ...baseLog, status: 'skipped', reason: `unsupported_extension:${oldExtension || 'none'}` })
    return
  }

  const destinationPath = deterministicWebpPath(product.id, oldValue)
  const newImageUrl = publicUrlFor(destinationPath)
  const migrationLogBase = { ...baseLog, newImageUrl }

  try {
    const sourceBuffer = await downloadSource(oldValue, oldStoragePath)
    const outputBuffer = await sharp(sourceBuffer, { animated: false })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    const migrationLog = {
      ...migrationLogBase,
      oldSize: bytes(sourceBuffer.byteLength),
      newSize: bytes(outputBuffer.byteLength),
    }

    if (dryRun) {
      await writeLog({ ...migrationLog, status: 'dry_run' })
      return
    }

    const existingSize = await existingDestinationSize(destinationPath)
    if (existingSize === null) {
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_BUCKET)
        .upload(destinationPath, outputBuffer, { contentType: 'image/webp', upsert: false })
      if (uploadError) throw uploadError
    }

    // Preserve the current database convention: paths stay paths; legacy public URLs stay URLs.
    const nextValue = isPublicStorageUrl(oldValue) ? newImageUrl : destinationPath
    const { data: updatedRows, error: updateError } = await supabase
      .from(PRODUCT_TABLE)
      .update({ [IMAGE_COLUMN]: nextValue })
      .eq('id', product.id)
      .eq(IMAGE_COLUMN, oldValue)
      .select('id')
    if (updateError) throw updateError
    if (!updatedRows?.length) throw new Error('Product image changed before migration could update it; original was retained.')

    if (oldStoragePath && oldStoragePath !== destinationPath) {
      const { error: deleteError } = await supabase.storage.from(PRODUCT_BUCKET).remove([oldStoragePath])
      if (deleteError) {
        await writeLog({ ...migrationLog, status: 'migrated_old_retained', reason: deleteError.message })
        return
      }
    }

    await writeLog({ ...migrationLog, status: 'success', reason: existingSize === null ? 'uploaded' : 'reused_existing_webp' })
  } catch (error) {
    await writeLog({ ...migrationLogBase, status: 'failed', reason: error instanceof Error ? error.message : String(error) })
  }
}

async function fetchProducts() {
  const products = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(PRODUCT_TABLE)
      .select(`id, ${IMAGE_COLUMN}`)
      .not(IMAGE_COLUMN, 'is', null)
      .neq(IMAGE_COLUMN, '')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    products.push(...data)
    if (data.length < PAGE_SIZE) return products
  }
}

async function runWithConcurrency(items) {
  let index = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index]
      index += 1
      await migrateProduct(item)
    }
  }))
}

await mkdir(logDirectory, { recursive: true })
await writeLog({ status: 'started', dryRun, concurrency, bucket: PRODUCT_BUCKET, table: PRODUCT_TABLE, column: IMAGE_COLUMN })

try {
  const products = await fetchProducts()
  await runWithConcurrency(products)
  await writeLog({ status: 'completed', processed: products.length, dryRun, logPath })
} catch (error) {
  await writeLog({ status: 'fatal', reason: error instanceof Error ? error.message : String(error) })
  process.exitCode = 1
}
