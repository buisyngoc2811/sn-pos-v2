import {
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  PackagePlus,
  PackageX,
  Plus,
  ReceiptText,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'
import { supabase, handleServiceError } from '../utils/supabase'
import { getStoragePublicUrl, STORAGE_BUCKETS } from './storageBuckets'

const positions = ['0% 0%', '33.333% 0%', '66.666% 0%', '100% 0%', '0% 100%', '33.333% 100%', '66.666% 100%', '100% 100%']

const paymentLabels: Record<string, string> = {
  cash: 'Tiền mặt',
  card: 'Thẻ',
  bank_transfer_qr: 'Chuyển khoản / QR',
}

const businessTimeZone = 'Asia/Ho_Chi_Minh'

const businessDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: businessTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dayKey = (date: Date) => {
  const parts = businessDayFormatter.formatToParts(date)
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

const addDaysToKey = (key: string, days: number) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

const startOfBusinessDay = (key: string) => new Date(`${key}T00:00:00+07:00`)

export const DashboardService = {
  async getDashboardData() {
    try {
      const todayKey = dayKey(new Date())
      const weekStartKey = addDaysToKey(todayKey, -6)
      const tomorrowKey = addDaysToKey(todayKey, 1)
      const monthStartKey = `${todayKey.slice(0, 8)}01`
      const weekStart = startOfBusinessDay(weekStartKey)
      const tomorrowStart = startOfBusinessDay(tomorrowKey)
      const monthStart = startOfBusinessDay(monthStartKey)

      const [ordersResult, inventoryResult, itemsResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, payment_method, total_vnd, completed_at, created_at, customers(name), order_items(quantity)')
          .eq('status', 'completed')
          .gte('completed_at', weekStart.toISOString())
          .lt('completed_at', tomorrowStart.toISOString())
          .order('completed_at', { ascending: false })
          .limit(1000),
        supabase
          .from('product_variants')
          .select('sku, size, color, stock_quantity, products(name)')
          .lte('stock_quantity', 5)
          .order('stock_quantity', { ascending: true })
          .limit(4),
        supabase
          .from('order_items')
          .select('product_name_snapshot, variant_snapshot, quantity, line_total_vnd, orders(status, completed_at, created_at), product_variants(products(image_path))')
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
      ])

      if (ordersResult.error) handleServiceError(ordersResult.error)
      if (inventoryResult.error) handleServiceError(inventoryResult.error)
      if (itemsResult.error) handleServiceError(itemsResult.error)
      if (customersResult.error) handleServiceError(customersResult.error)

      const ordersRows = (ordersResult.data as any[] ?? [])
      const todayOrders = ordersRows.filter((order) => dayKey(new Date(order.completed_at)) === todayKey)
      const monthOrders = ordersRows.filter((order) => new Date(order.completed_at) >= monthStart)
      const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total_vnd ?? 0), 0)
      const weekRevenue = ordersRows.reduce((sum, order) => sum + Number(order.total_vnd ?? 0), 0)
      const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total_vnd ?? 0), 0)
      const todayItems = todayOrders.reduce((sum, order) => sum + (order.order_items ?? []).reduce((itemSum: number, item: any) => itemSum + (item.quantity ?? 0), 0), 0)
      const averageOrder = todayOrders.length ? todayRevenue / todayOrders.length : 0

      const revenueByDay = new Map<string, { revenue: number; orders: number }>()
      for (let i = 0; i < 7; i += 1) revenueByDay.set(addDaysToKey(weekStartKey, i), { revenue: 0, orders: 0 })
      for (const order of ordersRows) {
        const key = dayKey(new Date(order.completed_at))
        const current = revenueByDay.get(key)
        if (current) {
          current.revenue += Number(order.total_vnd ?? 0)
          current.orders += 1
        }
      }

      const paymentByMethod = new Map<string, { count: number; total: number }>()
      for (const order of todayOrders) {
        const current = paymentByMethod.get(order.payment_method) ?? { count: 0, total: 0 }
        paymentByMethod.set(order.payment_method, {
          count: current.count + 1,
          total: current.total + Number(order.total_vnd ?? 0),
        })
      }

      const lowInventory = (inventoryResult.data as any[] ?? []).map((item) => {
        const detail = [item.color, item.size].filter(Boolean).join(' · ')
        return {
          name: item.products?.name ?? '',
          detail,
          sku: item.sku,
          stock: item.stock_quantity,
          tone: item.stock_quantity <= 2 ? 'rose' : 'sand',
        }
      })

      const productMap = new Map<string, { name: string; detail: string; sold: number; revenue: number; imagePath?: string }>()
      for (const item of (itemsResult.data as any[] ?? [])) {
        if (item.orders?.status === 'refunded') continue
        const key = item.product_name_snapshot
        const current = productMap.get(key) ?? { name: key, detail: item.variant_snapshot ?? '', sold: 0, revenue: 0, imagePath: getStoragePublicUrl(item.product_variants?.products?.image_path, STORAGE_BUCKETS.products) }
        current.sold += item.quantity ?? 0
        current.revenue += item.line_total_vnd ?? 0
        productMap.set(key, current)
      }

      const bestSellers = [...productMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4)
        .map((product, index) => ({ ...product, position: positions[index % positions.length] }))

      const recentOrders = ordersRows.slice(0, 5).map((order) => {
        const itemsCount = (order.order_items ?? []).reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)
        return {
          id: `#${order.order_number}`,
          customer: order.customers?.name ?? 'Khách lẻ',
          items: `${itemsCount} sản phẩm`,
          time: order.completed_at ?? order.created_at,
          total: order.total_vnd ?? 0,
          status: order.status === 'completed' ? 'Đã thanh toán' : order.status === 'refunded' ? 'Đã hoàn tiền' : 'Tạm giữ',
        }
      })

      return {
        activities: recentOrders.slice(0, 4).map((order) => ({
          title: `Đơn ${order.id} đã hoàn tất`,
          detail: order.customer,
          amount: order.total,
          time: 'Mới cập nhật',
          icon: CircleDollarSign,
          tone: 'sale',
        })),
        bestSellers,
        revenueDays: [...revenueByDay.entries()].map(([date, summary]) => ({
          date,
          revenue: summary.revenue,
          orders: summary.orders,
        })),
        kpis: [
          { label: 'Doanh thu hôm nay', value: todayRevenue, note: `${todayOrders.length} đơn hàng hôm nay`, icon: Banknote, tone: 'pink' },
          { label: 'Đơn hàng', value: String(todayOrders.length), note: `${monthOrders.length} đơn trong tháng`, icon: ReceiptText, tone: 'violet' },
          { label: 'Sản phẩm đã bán', value: String(todayItems), note: todayOrders.length ? `${(todayItems / todayOrders.length).toFixed(1)} sản phẩm mỗi đơn` : 'Chưa có đơn hôm nay', icon: ShoppingBag, tone: 'blue' },
          { label: 'Sắp hết hàng', value: String(lowInventory.length), note: `${lowInventory.filter((item) => item.stock <= 2).length} cần xử lý hôm nay`, icon: PackageX, tone: 'amber' },
        ],
        lowInventory,
        orders: recentOrders,
        paymentSummary: ['card', 'cash', 'bank_transfer_qr'].map((method) => {
          const summary = paymentByMethod.get(method) ?? { count: 0, total: 0 }
          return {
          method,
          label: paymentLabels[method] ?? method,
          count: summary.count,
          total: summary.total,
          }
        }),
        quickActions: [
          { label: 'Bán hàng mới', detail: 'Bắt đầu thanh toán', icon: Plus },
          { label: 'Thêm item', detail: 'Tạo mẫu mới', icon: PackagePlus },
          { label: 'Thêm khách hàng', detail: 'Lưu thông tin khách hàng', icon: UserPlus },
          { label: 'Xem đơn hàng', detail: 'Xem doanh thu hôm nay', icon: ClipboardCheck },
        ],
        todaySummary: {
          averageOrder,
          orderCount: todayOrders.length,
          revenue: todayRevenue,
          weekRevenue,
          monthRevenue,
        },
      }
    } catch (e) {
      handleServiceError(e)
    }
  },
}
