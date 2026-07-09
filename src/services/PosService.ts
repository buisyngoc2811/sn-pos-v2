import { supabase, handleServiceError } from '../utils/supabase'

export type PosProduct = {
  id: string
  name: string
  category: string
  size: string
  color: string | null
  sku: string
  stock: number
  price: number
  position: string
}

export type PosCartItem = PosProduct & { quantity: number }

const positions = ['0% 0%', '33.333% 0%', '66.666% 0%', '100% 0%', '0% 100%', '33.333% 100%', '66.666% 100%', '100% 100%']

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
        .from('product_variants')
        .select('id, sku, size, color, stock_quantity, price_vnd, products(name, categories(name))')
        .order('created_at')

      if (error) handleServiceError(error)

      return (data as any[]).map((row, index) => ({
        id: row.id,
        name: row.products?.name ?? '',
        category: row.products?.categories?.name ?? '',
        size: row.size ?? 'M',
        color: row.color ?? null,
        sku: row.sku,
        stock: row.stock_quantity,
        price: row.price_vnd,
        position: positions[index % positions.length],
      }))
    } catch (e) {
      handleServiceError(e)
    }
  },

  async checkout(cart: PosCartItem[], subtotal: number, tax: number, total: number) {
    if (!cart || cart.length === 0) throw new Error('Giỏ hàng trống')
    if (subtotal < 0 || tax < 0 || total < 0) throw new Error('Giá trị đơn hàng không hợp lệ')

    try {
      const orderNumber = Math.floor(Math.random() * 10000).toString()

      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          status: 'completed',
          payment_method: 'card',
          subtotal_vnd: subtotal,
          discount_vnd: 0,
          tax_vnd: tax,
          total_vnd: total,
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
        unit_price_vnd: item.price,
        quantity: item.quantity,
        line_total_vnd: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) handleServiceError(itemsError)

      // 3. Reduce inventory and create movements
      for (const item of cart) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('id', item.id)
          .single()
          
        if (variantError) handleServiceError(variantError)

        if (variant) {
          const { error: updateError } = await supabase
            .from('product_variants')
            .update({ stock_quantity: variant.stock_quantity - item.quantity })
            .eq('id', item.id)
            
          if (updateError) handleServiceError(updateError)

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
      }
    } catch (e) {
      handleServiceError(e)
    }
  }
}
