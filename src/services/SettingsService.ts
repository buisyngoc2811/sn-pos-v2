import { supabase, handleServiceError } from '../utils/supabase'
import { getStoragePublicUrl, STORAGE_BUCKETS } from './storageBuckets'

export type StoreSettings = {
  id: string
  store_name: string
  store_logo_path: string
  timezone: string
  currency: string
  tax_rate: number
  bank_name: string
  bank_account_number: string
  bank_account_holder: string
  bank_qr_image_path: string
  transfer_note_prefix: string
}

export const SettingsService = {
  getStoreAssetUrl(path: string): string {
    return getStoragePublicUrl(path, STORAGE_BUCKETS.storeAssets) ?? ''
  },

  async getSettings(): Promise<StoreSettings | null> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) handleServiceError(error)
      return data as StoreSettings | null
    } catch (e) {
      handleServiceError(e)
    }
  },

  async updateSettings(id: string, updates: Partial<Omit<StoreSettings, 'id'>>): Promise<void> {
    if (!id) throw new Error('Thiếu ID cài đặt')
    if (updates.store_name !== undefined && !updates.store_name.trim()) throw new Error('Tên cửa hàng không được để trống')
    if (updates.tax_rate !== undefined && updates.tax_rate < 0) throw new Error('Thuế không hợp lệ')

    try {
      const { error } = await supabase
        .from('store_settings')
        .update(updates)
        .eq('id', id)

      if (error) handleServiceError(error)
    } catch (e) {
      handleServiceError(e)
    }
  }
}
