import { supabase } from '../utils/supabase'

export const STORAGE_BUCKETS = {
  products: 'products',
  storeAssets: 'store-assets',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

export function getStoragePublicUrl(pathOrUrl: string | null | undefined, bucket: StorageBucket): string | undefined {
  if (!pathOrUrl) return undefined
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl
}
