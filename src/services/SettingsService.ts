import { supabase, handleServiceError } from '../utils/supabase'

export type StoreSettings = {
  id: string
  store_name: string
  timezone: string
  currency: string
  tax_rate: number
}

export const SettingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) handleServiceError(error)
      if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
      return data as StoreSettings
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
