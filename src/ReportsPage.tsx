import { useEffect, useState } from 'react'
import { PageSkeleton } from './components/PageStates'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  FileText,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { ReportService } from './services/ReportService'
import { formatNumber, formatVnd } from './utils/formatters'
import './ReportsPage.css'

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
const toDateInputValue = (date: Date) => {
  const parts = dayFormatter.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
const addDaysToKey = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function ReportsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof ReportService.getReportData>> | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const today = toDateInputValue(new Date())
  const [startDate, setStartDate] = useState(() => addDaysToKey(today, -8))
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setData(null)
    ReportService.getReportData(startDate, endDate)
      .then((reportData) => {
        if (!active) return
        setData(reportData)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [endDate, startDate])

  const exportCsv = () => {
    if (!data) return
    const rows = [
      ['SN POS báo cáo', `${startDate} đến ${endDate}`],
      ['Doanh thu thuần', String(data.revenue)],
      ['Tổng đơn hàng', String(data.orderCount)],
      ['Sản phẩm đã bán', String(data.itemsSold)],
      ['Giá trị đơn trung bình', String(Math.round(data.averageOrder))],
      [],
      ['Sản phẩm bán chạy', 'Số lượng', 'Doanh thu'],
      ...data.bestProducts.map((product) => [product.name, String(product.item), String(product.revenue)]),
      [],
      ['Danh mục', 'Doanh thu', 'Tỷ trọng'],
      ...data.categorySummary.map((category) => [category.name, String(category.value), `${category.share}%`]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sn-pos-report-${startDate}-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (error) throw error
  if (loading && !data) return <PageSkeleton />
  if (!data) return <PageSkeleton />

  const { averageOrder, bestProducts, categorySummary, customerStats, hours, itemsSold, orderCount, revenue, revenueChartMax, revenueLabels, revenuePoints, startDate: reportStartDate, endDate: reportEndDate } = data
  const revenueArea = `M ${revenuePoints.replaceAll(' ', ' L ')} L 346,142 L 4,142 Z`
  const lastRevenuePoint = revenuePoints.split(' ').at(-1)?.split(',').map(Number) ?? [346, 142]
  const categoryClasses = ['tops', 'bottoms', 'dresses', 'outerwear']

  return (
    <div className="reports-page">
      <section className="reports-intro">
        <div><p className="reports-kicker">Hiệu suất cửa hàng</p><h2>Báo cáo</h2><p>Tổng quan hiệu suất bán hàng, sản phẩm và khách hàng.</p></div>
        <div className="reports-controls">
          <label className="date-range"><CalendarDays /><span><small>Từ ngày</small><input type="date" value={startDate} aria-label="Ngày bắt đầu báo cáo" onChange={(event) => setStartDate(event.target.value)} /></span><i /><span><small>Đến ngày</small><input type="date" value={endDate} aria-label="Ngày kết thúc báo cáo" onChange={(event) => setEndDate(event.target.value)} /></span></label>
          <button type="button" className="export-button" disabled={loading} onClick={exportCsv}><Download /> {loading ? 'Đang tải...' : 'Xuất CSV'}</button>
          <button type="button" className="export-icon" aria-label="Xuất PDF"><FileText /></button>
        </div>
      </section>

      <section className="report-kpis" aria-label="Tổng hợp bán hàng">
        <article><span className="report-kpi-icon"><TrendingUp /></span><div><span>Doanh thu thuần</span><strong>{formatVnd(revenue)}</strong><small className="positive"><ArrowUpRight /> Dữ liệu trực tiếp</small></div></article>
        <article><span className="report-kpi-icon"><ReceiptText /></span><div><span>Tổng đơn hàng</span><strong>{formatNumber(orderCount)}</strong><small className="positive"><ArrowUpRight /> Đơn đã hoàn tất</small></div></article>
        <article><span className="report-kpi-icon"><ShoppingBag /></span><div><span>Sản phẩm đã bán</span><strong>{formatNumber(itemsSold)}</strong><small className="positive"><ArrowUpRight /> Theo order items</small></div></article>
        <article><span className="report-kpi-icon"><UsersRound /></span><div><span>Giá trị đơn trung bình</span><strong>{formatVnd(averageOrder)}</strong><small className="negative"><ArrowDownRight /> Tính từ đơn thực tế</small></div></article>
      </section>

      <section className="reports-primary-grid">
        <article className="report-panel revenue-report">
          <header className="report-panel-header"><div><h3>Tổng quan doanh thu</h3><p>Doanh thu thuần hằng ngày trong khoảng đã chọn</p></div><div className="report-total"><span>Tổng doanh thu</span><strong>{formatVnd(revenue)}</strong></div></header>
          <div className="report-chart">
            <div className="report-y-axis"><span>{formatVnd(revenueChartMax)}</span><span>{formatVnd(revenueChartMax / 2)}</span><span>{formatVnd(0)}</span></div>
            <div className="report-chart-plot">
              <svg viewBox="0 0 350 146" preserveAspectRatio="none" role="img" aria-label={`Xu hướng doanh thu từ ${reportStartDate} đến ${reportEndDate}`}>
                <defs><linearGradient id="report-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
                <line x1="4" x2="346" y1="24" y2="24" /><line x1="4" x2="346" y1="83" y2="83" /><line x1="4" x2="346" y1="142" y2="142" />
                <path d={revenueArea} className="report-area" /><polyline points={revenuePoints} className="report-line" /><circle cx={lastRevenuePoint[0]} cy={lastRevenuePoint[1]} r="4" />
              </svg>
              <div className="report-x-axis">{revenueLabels.filter((_, index) => index % 2 === 0).map((label) => <span key={label}>{label}</span>)}</div>
            </div>
          </div>
        </article>

        <article className="report-panel category-report">
          <header className="report-panel-header"><div><h3>Doanh thu theo danh mục</h3><p>Tỷ trọng doanh thu thuần</p></div></header>
          <div className="category-chart-wrap">
            <div className="category-donut" role="img" aria-label={categorySummary.map((category) => `${category.name} ${category.share}%`).join(', ')}><span><strong>{formatVnd(revenue)}</strong><small>Tổng</small></span></div>
            <ul className="category-legend">
              {categorySummary.map((category, index) => <li key={category.name}><i className={categoryClasses[index] ?? 'outerwear'} /><span>{category.name}</span><strong>{category.share}%</strong></li>)}
            </ul>
          </div>
        </article>
      </section>

      <section className="reports-secondary-grid">
        <article className="report-panel">
          <header className="report-panel-header"><div><h3>Sản phẩm bán chạy</h3><p>Xếp hạng theo doanh thu</p></div><span className="report-label">Phân tích sản phẩm</span></header>
          <ol className="product-ranking">
            {bestProducts.map((product, index) => <li key={`${product.name}-${index}`}><span className="rank-number">{index + 1}</span><span className="rank-product"><strong>{product.name}</strong><small>{formatNumber(product.item)} sản phẩm đã bán</small></span><span className="rank-bar"><i style={{ width: `${product.share}%` }} /></span><strong>{formatVnd(product.revenue)}</strong></li>)}
          </ol>
        </article>

        <article className="report-panel">
          <header className="report-panel-header"><div><h3>Doanh thu theo giờ</h3><p>Lượng giao dịch trung bình</p></div><span className="report-label">Phân tích bán hàng</span></header>
          <div className="hour-chart" role="img" aria-label="Doanh số đạt đỉnh lúc 15 giờ">
            {hours.map((hour) => <div key={hour.label}><span><i style={{ height: `${hour.value}%` }} /></span><small>{hour.label}</small></div>)}
          </div>
        </article>
      </section>

      <section className="report-panel customer-report">
        <header className="report-panel-header"><div><h3>Phân tích khách hàng</h3><p>Hành vi mua sắm trong khoảng đã chọn</p></div><span className="report-label">Đã phân tích {formatNumber(customerStats.analyzedOrders)} đơn hàng</span></header>
        <div className="customer-analytics">
          <div><span>Khách quay lại</span><strong>{customerStats.returningRate}%</strong><small>{formatNumber(customerStats.returningOrders)} đơn hàng</small><i><b style={{ width: `${customerStats.returningRate}%` }} /></i></div>
          <div><span>Khách hàng mới</span><strong>{customerStats.newRate}%</strong><small>{formatNumber(customerStats.newOrders)} đơn hàng</small><i><b style={{ width: `${customerStats.newRate}%` }} /></i></div>
          <div><span>Chi tiêu trung bình</span><strong>{formatVnd(customerStats.averageSpend)}</strong><small>Trên {formatNumber(customerStats.customerCount)} khách hàng</small></div>
          <div><span>Hạng thành viên cao nhất</span><strong>VIP</strong><small>Dựa trên dữ liệu khách hàng</small></div>
        </div>
      </section>
    </div>
  )
}
