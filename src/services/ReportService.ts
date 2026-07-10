import { supabase, handleServiceError } from '../utils/supabase'

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const dayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDate = (value: string, endOfDay = false) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
}

const makePoints = (values: number[], width = 350, height = 146, padding = 4) => {
  const max = Math.max(...values, 1)
  const step = (width - padding * 2) / Math.max(values.length - 1, 1)
  return values.map((value, index) => {
    const x = padding + index * step
    const y = height - padding - (value / max) * (height - padding * 2)
    return `${Math.round(x)},${Math.round(y)}`
  }).join(' ')
}

export const ReportService = {
  async getReportData(startDate?: string, endDate?: string) {
    try {
      const todayStart = startOfLocalDay(new Date())
      const defaultStart = addDays(todayStart, -8)
      let rangeStart = startDate ? parseLocalDate(startDate) : defaultStart
      let rangeEnd = endDate ? parseLocalDate(endDate, true) : parseLocalDate(dayKey(todayStart), true)

      if (rangeStart > rangeEnd) {
        const nextStart = startOfLocalDay(rangeEnd)
        rangeEnd = parseLocalDate(dayKey(rangeStart), true)
        rangeStart = nextStart
      }

      const startISO = rangeStart.toISOString()
      const endISO = rangeEnd.toISOString()

      const [ordersResult, itemsResult, variantsResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_id, status, payment_method, total_vnd, completed_at, created_at')
          .gte('created_at', startISO)
          .lte('created_at', endISO)
          .order('created_at', { ascending: true }),
        supabase
          .from('order_items')
          .select('product_variant_id, product_name_snapshot, quantity, line_total_vnd, orders!inner(status, completed_at, created_at, customer_id)')
          .gte('orders.created_at', startISO)
          .lte('orders.created_at', endISO),
        supabase
          .from('product_variants')
          .select('id, products(categories(name))'),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
      ])

      if (ordersResult.error) handleServiceError(ordersResult.error)
      if (itemsResult.error) handleServiceError(itemsResult.error)
      if (variantsResult.error) handleServiceError(variantsResult.error)
      if (customersResult.error) handleServiceError(customersResult.error)

      const orders = (ordersResult.data as any[] ?? []).filter((order) => order.status !== 'refunded')
      const items = (itemsResult.data as any[] ?? []).filter((item) => item.orders?.status !== 'refunded')

      const revenue = orders.reduce((sum, order) => sum + (order.total_vnd ?? 0), 0)
      const orderCount = orders.length
      const itemsSold = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
      const averageOrder = orderCount ? revenue / orderCount : 0

      const revenueByDay = new Map<string, number>()
      for (let date = startOfLocalDay(rangeStart); date <= rangeEnd; date = addDays(date, 1)) {
        revenueByDay.set(dayKey(date), 0)
      }
      for (const order of orders) {
        const key = dayKey(new Date(order.completed_at ?? order.created_at))
        if (revenueByDay.has(key)) revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + (order.total_vnd ?? 0))
      }

      const productMap = new Map<string, { name: string; item: number; revenue: number }>()
      for (const item of items) {
        const key = item.product_name_snapshot
        const current = productMap.get(key) ?? { name: key, item: 0, revenue: 0 }
        current.item += item.quantity ?? 0
        current.revenue += item.line_total_vnd ?? 0
        productMap.set(key, current)
      }
      const maxProductRevenue = Math.max(...[...productMap.values()].map((product) => product.revenue), 1)

      const categoryByVariant = new Map<string, string>()
      for (const variant of (variantsResult.data as any[] ?? [])) {
        categoryByVariant.set(variant.id, variant.products?.categories?.name ?? 'Khác')
      }
      const categoryRevenue = new Map<string, number>()
      for (const item of items) {
        const category = categoryByVariant.get(item.product_variant_id) ?? 'Khác'
        categoryRevenue.set(category, (categoryRevenue.get(category) ?? 0) + (item.line_total_vnd ?? 0))
      }

      const hourBuckets = new Map<number, number>()
      for (const order of orders) {
        const hour = new Date(order.completed_at ?? order.created_at).getHours()
        hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + (order.total_vnd ?? 0))
      }
      const maxHour = Math.max(...hourBuckets.values(), 1)
      const selectedHours = [9, 10, 11, 12, 13, 14, 15, 16, 17]

      const customerOrderCount = new Map<string, number>()
      for (const order of orders) {
        if (!order.customer_id) continue
        customerOrderCount.set(order.customer_id, (customerOrderCount.get(order.customer_id) ?? 0) + 1)
      }
      const returningOrders = orders.filter((order) => order.customer_id && (customerOrderCount.get(order.customer_id) ?? 0) > 1).length
      const customerOrders = orders.filter((order) => order.customer_id).length
      const customerCount = customerOrderCount.size
      const returningRate = customerOrders ? Math.round((returningOrders / customerOrders) * 100) : 0
      const newRate = customerOrders ? 100 - returningRate : 0

      return {
        averageOrder,
        bestProducts: [...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 4)
          .map((product) => ({ ...product, share: Math.round((product.revenue / maxProductRevenue) * 100) })),
        categorySummary: [...categoryRevenue.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name, value]) => ({ name, value, share: revenue ? Math.round((value / revenue) * 100) : 0 })),
        customerStats: {
          analyzedOrders: orderCount,
          averageSpend: customerCount ? revenue / customerCount : 0,
          customerCount,
          newOrders: Math.max(customerOrders - returningOrders, 0),
          newRate,
          returningOrders,
          returningRate,
        },
        hours: selectedHours.map((hour) => ({
          label: `${hour}:00`,
          value: Math.round(((hourBuckets.get(hour) ?? 0) / maxHour) * 100),
        })),
        itemsSold,
        orderCount,
        revenue,
        startDate: dayKey(rangeStart),
        endDate: dayKey(rangeEnd),
        revenueLabels: [...revenueByDay.keys()].map((key) => key.slice(5).replace('-', '/')),
        revenuePoints: makePoints([...revenueByDay.values()]),
      }
    } catch (e) {
      handleServiceError(e)
    }
  },
}
