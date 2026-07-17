import { supabase, handleServiceError } from '../utils/supabase'

const businessTimeZone = 'Asia/Ho_Chi_Minh'
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: businessTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: businessTimeZone, hour: 'numeric', hour12: false })
const dayKey = (date: Date) => {
  const parts = dayFormatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const startOfBusinessDay = (value: string) => new Date(`${value}T00:00:00+07:00`)
const addDaysToKey = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

const parseLocalDate = (value: string, endOfDay = false) => {
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`)
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
      const todayKey = dayKey(new Date())
      let rangeStart = startDate ? parseLocalDate(startDate) : startOfBusinessDay(addDaysToKey(todayKey, -8))
      let rangeEnd = endDate ? parseLocalDate(endDate, true) : parseLocalDate(todayKey, true)

      if (rangeStart > rangeEnd) {
        const nextStart = startOfBusinessDay(dayKey(rangeEnd))
        rangeEnd = parseLocalDate(dayKey(rangeStart), true)
        rangeStart = nextStart
      }

      const startISO = rangeStart.toISOString()
      const endISO = rangeEnd.toISOString()

      const [ordersResult, itemsResult, variantsResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_id, status, payment_method, total_vnd, completed_at, created_at')
          .eq('status', 'completed')
          .gte('completed_at', startISO)
          .lte('completed_at', endISO)
          .order('completed_at', { ascending: true }),
        supabase
          .from('order_items')
          .select('product_variant_id, product_name_snapshot, quantity, line_total_vnd, orders!inner(status, completed_at, created_at, customer_id)')
          .eq('orders.status', 'completed')
          .gte('orders.completed_at', startISO)
          .lte('orders.completed_at', endISO),
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

      const orders = (ordersResult.data as any[] ?? [])
      const items = (itemsResult.data as any[] ?? [])

      const revenue = orders.reduce((sum, order) => sum + (order.total_vnd ?? 0), 0)
      const orderCount = orders.length
      const itemsSold = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
      const averageOrder = orderCount ? revenue / orderCount : 0

      const revenueByDay = new Map<string, number>()
      for (let date = dayKey(rangeStart); date <= dayKey(rangeEnd); date = addDaysToKey(date, 1)) {
        revenueByDay.set(date, 0)
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
        const hour = Number(hourFormatter.format(new Date(order.completed_at ?? order.created_at)))
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
        revenueChartMax: Math.max(...revenueByDay.values(), 1),
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
