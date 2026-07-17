import { supabase, handleServiceError } from '../utils/supabase'

export type SalesDataResetResult = {
  restored_units: number
  deleted_order_items: number
  deleted_inventory_movements: number
  deleted_orders: number
}

export const SystemDataService = {
  async isStoreOwner(): Promise<boolean> {
    const { data, error } = await supabase
      .from('store_owners')
      .select('user_id')
      .limit(1)
      .maybeSingle()

    if (error) return false
    return Boolean(data)
  },

  async resetTestSalesData(): Promise<SalesDataResetResult> {
    try {
      const { data, error } = await supabase.rpc('reset_test_sales_data')
      if (error) handleServiceError(error)
      return data as SalesDataResetResult
    } catch (error) {
      handleServiceError(error)
    }
  },
}
