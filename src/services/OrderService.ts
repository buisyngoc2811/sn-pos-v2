import { supabase, handleServiceError } from '../utils/supabase'

export type OrderStatus = 'Hoàn tất' | 'Đã hoàn tiền' | 'Tạm giữ'
export type OrderPayment = 'Thẻ' | 'Tiền mặt' | 'Chuyển khoản / QR'

export type OrderLineItem = {
  id: string
  name: string
  detail: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  customer: string
  email: string
  date: string
  time: string
  items: number
  payment: OrderPayment
  status: OrderStatus
  subtotal: number
  discount: number
  tax: number
  total: number
  lineItems: OrderLineItem[]
}

type OrderRow = {
  id: string
  order_number: string
  status: 'completed' | 'held' | 'refunded'
  payment_method: 'cash' | 'card' | 'bank_transfer_qr'
  subtotal_vnd: number
  discount_vnd: number
  tax_vnd: number
  total_vnd: number
  completed_at: string | null
  created_at: string
  customers: {
    name: string
    email: string | null
  } | null
  order_items: Array<{
    id: string
    quantity: number
    unit_price_vnd: number
    product_name_snapshot: string
    variant_snapshot: string | null
    sku_snapshot: string
  }>
}

const statusToVietnamese: Record<OrderRow['status'], OrderStatus> = {
  completed: 'Hoàn tất',
  refunded: 'Đã hoàn tiền',
  held: 'Tạm giữ',
}

const paymentToVietnamese: Record<OrderRow['payment_method'], OrderPayment> = {
  cash: 'Tiền mặt',
  card: 'Thẻ',
  bank_transfer_qr: 'Chuyển khoản / QR',
}

function getDateParts(value: string) {
  const date = new Date(value)
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? ''
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date),
  }
}

export const OrderService = {
  async getAll(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_method, subtotal_vnd, discount_vnd, tax_vnd, total_vnd, completed_at, created_at, customers(name, email), order_items(id, quantity, unit_price_vnd, product_name_snapshot, variant_snapshot, sku_snapshot)')
        .order('completed_at', { ascending: false })

      if (error) handleServiceError(error)

      return (data as unknown as OrderRow[]).map((row) => {
        const completedAt = row.completed_at ?? row.created_at
        const { date, time } = getDateParts(completedAt)
        const lineItems = row.order_items.map((item) => ({
          id: item.id,
          name: item.product_name_snapshot,
          detail: item.variant_snapshot ?? item.sku_snapshot,
          quantity: item.quantity,
          price: item.unit_price_vnd * item.quantity,
        }))

        return {
          id: `#${row.order_number}`,
          customer: row.customers?.name ?? 'Khách lẻ',
          email: row.customers?.email ?? 'Không có email',
          date,
          time,
          items: row.order_items.reduce((total, item) => total + item.quantity, 0),
          payment: paymentToVietnamese[row.payment_method],
          status: statusToVietnamese[row.status],
          subtotal: row.subtotal_vnd,
          discount: row.discount_vnd,
          tax: row.tax_vnd,
          total: row.total_vnd,
          lineItems,
        }
      })
    } catch (e) {
      handleServiceError(e)
    }
  },
}
