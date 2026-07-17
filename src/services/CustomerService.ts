import { supabase, handleServiceError } from '../utils/supabase'

export type CustomerTier = 'Thành viên' | 'Hồng' | 'VIP'

export type CustomerPurchase = {
  id: string
  date: string
  items: string
  total: number
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  joined: string
  orders: number
  spent: number
  points: number
  nextRewardThreshold: number
  tier: CustomerTier
  lastOrder: string
  purchases: CustomerPurchase[]
}

export type CustomerInput = {
  name: string
  email?: string
  phone?: string
  membership_tier?: 'member' | 'pink' | 'vip'
}

export type PosCustomer = {
  id: string
  name: string
  phone: string
}

type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  membership_tier: 'member' | 'pink' | 'vip'
  loyalty_points: number
  created_at: string
}

type OrderRow = {
  customer_id: string | null
  order_number: string
  total_vnd: number
  completed_at: string | null
  created_at: string
  order_items: Array<{
    product_name_snapshot: string
  }>
}

type LoyaltyProgramRow = {
  next_reward_threshold: number
}

const tierToVietnamese: Record<CustomerRow['membership_tier'], CustomerTier> = {
  member: 'Thành viên',
  pink: 'Hồng',
  vip: 'VIP',
}

const fallbackNextRewardThreshold = 1500

function formatDateValue(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function formatRelativeOrder(value: string) {
  return `Hôm nay, ${new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))}`
}

export const CustomerService = {
  async create(input: CustomerInput) {
    if (!input.name?.trim()) throw new Error('Tên khách hàng không được để trống')
    if (input.phone && !/^[0-9+() -]{9,15}$/.test(input.phone)) throw new Error('Số điện thoại không hợp lệ')
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Email không hợp lệ')

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          membership_tier: input.membership_tier ?? 'member',
        })
        .select()
        .single()

      if (error) handleServiceError(error)
      if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
      return data
    } catch (e) {
      handleServiceError(e)
    }
  },

  async searchForPos(query: string): Promise<PosCustomer[]> {
    const normalized = query.trim()

    try {
      let request = supabase
        .from('customers')
        .select('id, name, phone')
        .order('created_at', { ascending: false })
        .limit(8)

      if (normalized) {
        request = request.or(`name.ilike.%${normalized}%,phone.ilike.%${normalized}%`)
      }

      const { data, error } = await request

      if (error) handleServiceError(error)
      return ((data ?? []) as Array<{ id: string; name: string; phone: string | null }>).map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone ?? '',
      }))
    } catch (e) {
      handleServiceError(e)
    }
  },

  async update(id: string, input: Partial<CustomerInput>) {
    if (input.name !== undefined && !input.name.trim()) throw new Error('Tên khách hàng không được để trống')
    if (input.phone && !/^[0-9+() -]{9,15}$/.test(input.phone)) throw new Error('Số điện thoại không hợp lệ')
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Email không hợp lệ')

    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: input.name,
          email: input.email,
          phone: input.phone,
          membership_tier: input.membership_tier,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) handleServiceError(error)
      if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
      return data
    } catch (e) {
      handleServiceError(e)
    }
  },

  async getAll(): Promise<Customer[]> {
    try {
      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, email, phone, membership_tier, loyalty_points, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('customer_id, order_number, total_vnd, completed_at, created_at, order_items(product_name_snapshot)')
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
      ])

      if (customersResult.error) handleServiceError(customersResult.error)
      if (ordersResult.error) handleServiceError(ordersResult.error)

      let nextRewardThreshold = fallbackNextRewardThreshold
      try {
        const { data: loyaltyProgram, error: loyaltyProgramError } = await supabase
          .from('loyalty_program_settings')
          .select('next_reward_threshold')
          .eq('id', true)
          .maybeSingle()

        if (loyaltyProgramError) {
          console.warn('Loyalty settings unavailable; using the display fallback.', loyaltyProgramError.message)
        } else if (loyaltyProgram) {
          const configuredThreshold = (loyaltyProgram as LoyaltyProgramRow).next_reward_threshold
          if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) nextRewardThreshold = configuredThreshold
        }
      } catch (error) {
        console.warn('Loyalty settings unavailable; using the display fallback.', error)
      }

      const ordersByCustomer = new Map<string, OrderRow[]>()
      for (const order of (ordersResult.data as unknown as OrderRow[])) {
        if (!order.customer_id) continue
        const existing = ordersByCustomer.get(order.customer_id) ?? []
        existing.push(order)
        ordersByCustomer.set(order.customer_id, existing)
      }

      return (customersResult.data as unknown as CustomerRow[]).map((row) => {
        const customerOrders = ordersByCustomer.get(row.id) ?? []
        const sortedOrders = [...customerOrders].sort((a, b) => new Date((b.completed_at ?? b.created_at)).getTime() - new Date((a.completed_at ?? a.created_at)).getTime())
        const latestOrder = sortedOrders[0]

        return {
          id: row.id,
          name: row.name,
          email: row.email ?? 'Không có email',
          phone: row.phone ?? '',
          joined: formatDateValue(row.created_at),
          orders: customerOrders.length,
          spent: customerOrders.reduce((total, order) => total + order.total_vnd, 0),
          points: row.loyalty_points,
          nextRewardThreshold,
          tier: tierToVietnamese[row.membership_tier],
          lastOrder: latestOrder ? formatRelativeOrder(latestOrder.completed_at ?? latestOrder.created_at) : '',
          purchases: customerOrders.slice(0, 3).map((order) => ({
            id: `#${order.order_number}`,
            date: (order.completed_at ?? order.created_at).slice(0, 10),
            items: order.order_items.map((item) => item.product_name_snapshot).join(', '),
            total: order.total_vnd,
          })),
        }
      })
    } catch (e) {
      handleServiceError(e)
    }
  },

  async delete(id: string) {
    try {
      const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id)

      if (countError) handleServiceError(countError)

      if (count && count > 0) {
        throw new Error('Không thể xóa khách hàng đã có lịch sử mua hàng.')
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) handleServiceError(error)
    } catch (e) {
      handleServiceError(e)
    }
  },
}
