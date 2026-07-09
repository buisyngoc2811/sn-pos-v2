import { supabase, handleServiceError } from '../utils/supabase'
import {
  dashboardActivities as mockActivities,
  dashboardBestSellers as mockBestSellers,
  dashboardChartPoints as mockChartPoints,
  dashboardKpis as mockKpis,
  dashboardLowInventory as mockLowInventory,
  dashboardOrders as mockOrders,
  dashboardQuickActions as mockQuickActions,
} from '../data/mockData'
import { formatTime } from '../utils/formatters'

export const DashboardService = {
  async getDashboardData() {
    try {
      // Fetch recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, status, total_vnd, completed_at, created_at, customers(name), order_items(quantity)')
        .order('completed_at', { ascending: false })
        .limit(5)

      if (ordersError) handleServiceError(ordersError)

      // Fetch low inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('product_variants')
        .select('sku, size, color, stock_quantity, products(name)')
        .lte('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(4)

      if (inventoryError) handleServiceError(inventoryError)

      const orders = ordersData ? (ordersData as any[]).map(o => {
        const itemsCount = o.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        return {
          id: `#${o.order_number}`,
          customer: o.customers?.name ?? 'Khách lẻ',
          items: `${itemsCount} sản phẩm`,
          time: formatTime(o.completed_at ?? o.created_at),
          total: o.total_vnd,
          status: o.status === 'completed' ? 'Đã thanh toán' : o.status === 'refunded' ? 'Đã hoàn tiền' : 'Tạm giữ'
        }
      }) : mockOrders

      const lowInventory = inventoryData ? (inventoryData as any[]).map(i => {
        const colorSize = [i.color, i.size].filter(Boolean).join(' · ')
        return {
          name: i.products?.name ?? '',
          detail: colorSize,
          sku: i.sku,
          stock: i.stock_quantity,
          tone: i.stock_quantity <= 2 ? 'rose' : 'sand'
        }
      }) : mockLowInventory

      return {
        activities: mockActivities,
        bestSellers: mockBestSellers,
        chartPoints: mockChartPoints,
        kpis: mockKpis,
        lowInventory,
        orders,
        quickActions: mockQuickActions,
      }
    } catch (e) {
      handleServiceError(e)
    }
  }
}
