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

  async checkout(cart: PosCartItem[], subtotal: number, discount: number, tax: number, total: number, paymentMethod: PosPaymentMethod, customerId?: string | null) {
    if (!cart || cart.length === 0) throw new Error('Giỏ hàng trống')
    if (subtotal < 0 || discount < 0 || tax < 0 || total < 0) throw new Error('Giá trị đơn hàng không hợp lệ')
    if (cart.some((item) => item.quantity <= 0)) throw new Error('Số lượng sản phẩm không hợp lệ')

    try {
      const quantityById = new Map<string, number>()
      for (const item of cart) {
        quantityById.set(item.id, (quantityById.get(item.id) ?? 0) + item.quantity)
      }

      const { data: stockRows, error: stockError } = await supabase
        .from('product_variants')
        .select('id, stock_quantity')
        .in('id', [...quantityById.keys()])

      if (stockError) handleServiceError(stockError)

      const stockById = new Map((stockRows || []).map((row) => [row.id, row.stock_quantity]))
      for (const item of cart) {
        const currentStock = stockById.get(item.id)
        const requestedQuantity = quantityById.get(item.id) ?? item.quantity
        if (currentStock === undefined) throw new Error(`Không tìm thấy sản phẩm ${item.name}`)
        if (currentStock <= 0) throw new Error(`${item.name} đã hết hàng`)
        if (requestedQuantity > currentStock) throw new Error(`${item.name} chỉ còn ${currentStock} sản phẩm`)
      }

      const orderNumber = Math.floor(Math.random() * 10000).toString()
      const subtotalVnd = toVndInteger(subtotal)
      const discountVnd = toVndInteger(discount)
      const taxVnd = toVndInteger(tax)
      const totalVnd = toVndInteger(total)

      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId || null,
          status: 'completed',
          payment_method: paymentMethod,
          subtotal_vnd: subtotalVnd,
          discount_vnd: discountVnd,
          tax_vnd: taxVnd,
          total_vnd: totalVnd,
          completed_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (orderError) handleServiceError(orderError)
      if (!order) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')

      // 2. Create order_items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_variant_id: item.id,
        product_name_snapshot: item.name,
        sku_snapshot: item.sku,
        variant_snapshot: [item.color, item.size].filter(Boolean).join(' · '),
        unit_price_vnd: toVndInteger(item.price),
        quantity: item.quantity,
        line_total_vnd: toVndInteger(item.price * item.quantity)
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) handleServiceError(itemsError)

      // 3. Reduce inventory and create movements
      for (const item of cart) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.id)
          .gte('stock_quantity', item.quantity)
          .single()
          
        if (variantError) handleServiceError(variantError)
        if (!variant) throw new Error(`${item.name} không đủ hàng để thanh toán`)

        const { data: updatedVariant, error: updateError } = await supabase
          .from('product_variants')
          .update({ stock_quantity: variant.stock_quantity - item.quantity })
          .eq('id', item.id)
          .gte('stock_quantity', item.quantity)
          .select('stock_quantity')
          .single()
            
        if (updateError) handleServiceError(updateError)
        if (!updatedVariant) throw new Error(`${item.name} không đủ hàng để thanh toán`)

        const { error: moveError } = await supabase
          .from('inventory_movements')
          .insert({
            product_variant_id: item.id,
            order_id: order.id,
            type: 'sale',
            quantity_change: -item.quantity,
            quantity_after: variant.stock_quantity - item.quantity,
            note: `Bán theo đơn hàng #${orderNumber}`
          })
            
        if (moveError) handleServiceError(moveError)
      }

      return {
        orderNumber,
        completedAt: new Date().toISOString()
      }
    } catch (e) {
      handleServiceError(e)
    }
  }
}
