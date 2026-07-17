import { supabase, handleServiceError } from '../utils/supabase'
import { getStoragePublicUrl, STORAGE_BUCKETS } from './storageBuckets'

export type PosProductVariant = {
  id: string
  sku: string
  size: string
  color: string
  stock: number
  price: number
}

export type PosProduct = {
  id: string
  name: string
  short_description?: string | null
  description?: string | null
  category: string
  variants: PosProductVariant[]
  position: string
  imagePath?: string
}

export type PosCartItem = PosProductVariant & {
  productId: string
  name: string
  category: string
  quantity: number
  imagePath?: string
}
export type PosPaymentMethod = 'cash' | 'card' | 'bank_transfer_qr'

const positions = ['0% 0%', '33.333% 0%', '66.666% 0%', '100% 0%', '0% 100%', '33.333% 100%', '66.666% 100%', '100% 100%']
const toVndInteger = (value: number) => Math.round(Number.isFinite(value) ? value : 0)

export const PosService = {
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase.from('categories').select('name').order('sort_order')
      if (error) handleServiceError(error)
      return ['Tất cả', ...(data || []).map(c => c.name)]
    } catch (e) {
      handleServiceError(e)
    }
  },

  async getProducts(): Promise<PosProduct[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, short_description, description, image_path, categories(name), product_variants(id, sku, size, color, stock_quantity, price_vnd)')
        .eq('status', 'active')
        .order('created_at')

      if (error) handleServiceError(error)

      return (data as any[]).map((row, index) => {
        const variants = row.product_variants ?? []
        return {
          id: row.id,
          name: row.name,
          short_description: row.short_description,
          description: row.description,
          category: row.categories?.name ?? '',
          variants: variants.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            size: v.size ?? '',
            color: v.color ?? '',
            stock: v.stock_quantity,
            price: v.price_vnd
          })),
          position: positions[index % positions.length],
          imagePath: getStoragePublicUrl(row.image_path, STORAGE_BUCKETS.products),
        }
      })
    } catch (e) {
      handleServiceError(e)
    }
  },

  async checkout(cart: PosCartItem[], subtotal: number, discount: number, tax: number, total: number, paymentMethod: PosPaymentMethod, checkoutRequestId: string, customerId?: string | null) {
    if (!cart || cart.length === 0) throw new Error('Giỏ hàng trống')
    if (subtotal < 0 || discount < 0 || tax < 0 || total < 0) throw new Error('Giá trị đơn hàng không hợp lệ')
    if (cart.some((item) => item.quantity <= 0)) throw new Error('Số lượng sản phẩm không hợp lệ')

    try {
      const { data, error } = await supabase.rpc('complete_sale', {
        p_items: cart.map((item) => ({ variant_id: item.id, quantity: item.quantity })),
        p_discount_vnd: toVndInteger(discount),
        p_tax_vnd: toVndInteger(tax),
        p_total_vnd: toVndInteger(total),
        p_payment_method: paymentMethod,
        p_customer_id: customerId || null,
        p_checkout_request_id: checkoutRequestId,
      })
      if (error) handleServiceError(error)
      if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
      return data as { orderNumber: string; completedAt: string; pointsEarned: number }
    } catch (e) {
      handleServiceError(e)
    }
  }
}
