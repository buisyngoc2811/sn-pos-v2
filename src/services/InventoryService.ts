import { supabase, handleServiceError } from '../utils/supabase'

export type InventoryItem = {
  id: string
  name: string
  sku: string
  category: string
  variant: string
  stock: number
  reorder: number
  value: number
  position: string
}

export type InventoryMovement = {
  product: string
  detail: string
  amount: number
  time: string
  type: 'in' | 'out'
}

type InventoryRow = {
  id: string
  sku: string
  size: string | null
  color: string | null
  price_vnd: number
  stock_quantity: number
  reorder_level: number
  products: {
    name: string
    categories: {
      name: string
    } | null
  } | null
}

type MovementRow = {
  quantity_change: number
  created_at: string
  note: string | null
  product_variants: {
    size: string | null
    color: string | null
    products: {
      name: string
    } | null
  } | null
}

const positions = ['0% 0%', '33.333% 0%', '66.666% 0%', '100% 0%', '0% 100%', '33.333% 100%', '66.666% 100%', '100% 100%']

function formatClock(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function buildVariantLabel(color: string | null, size: string | null, sku: string) {
  const parts = [color, size].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : sku
}

export const InventoryService = {
  async getAll(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, sku, size, color, price_vnd, stock_quantity, reorder_level, products(name, categories(name))')
        .order('created_at')

      if (error) handleServiceError(error)

      return (data as unknown as InventoryRow[]).map((row, index) => ({
        id: row.id,
        name: row.products?.name ?? '',
        sku: row.sku,
        category: row.products?.categories?.name ?? '',
        variant: buildVariantLabel(row.color, row.size, row.sku),
        stock: row.stock_quantity,
        reorder: row.reorder_level,
        value: row.price_vnd * row.stock_quantity,
        position: positions[index % positions.length],
      }))
    } catch (e) {
      handleServiceError(e)
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('sort_order')

      if (error) handleServiceError(error)

      return (data || []).map((category) => category.name)
    } catch (e) {
      handleServiceError(e)
    }
  },

  async getMovements(): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('quantity_change, created_at, note, product_variants(size, color, products(name))')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) handleServiceError(error)

      return (data as unknown as MovementRow[]).map((row) => {
        const productName = row.product_variants?.products?.name ?? ''
        const variantLabel = buildVariantLabel(row.product_variants?.color ?? null, row.product_variants?.size ?? null, productName)

        return {
          product: productName,
          detail: row.note ?? (variantLabel || 'Cập nhật tồn kho'),
          amount: row.quantity_change,
          time: formatClock(row.created_at),
          type: row.quantity_change >= 0 ? 'in' : 'out',
        }
      })
    } catch (e) {
      handleServiceError(e)
    }
  },
}
