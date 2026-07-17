import { useEffect, useState } from 'react'
import { PageSkeleton } from './components/PageStates'
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
} from 'lucide-react'
import { DashboardService } from './services/DashboardService'
import { SettingsService, type StoreSettings } from './services/SettingsService'
import { formatTime, formatVnd } from './utils/formatters'

function getGreetingHour(date: Date, timeZone?: string) {
  if (!timeZone) return date.getHours()

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(date)
    const hour = parts.find((part) => part.type === 'hour')?.value
    return hour ? Number(hour) : date.getHours()
  } catch {
    return date.getHours()
  }
}

function formatDashboardDate(date: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }
}

function getGreeting(hour: number) {
  if (hour >= 5 && hour <= 10) return 'Chào buổi sáng'
  if (hour >= 11 && hour <= 12) return 'Chào buổi trưa'
  if (hour >= 13 && hour <= 17) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function formatRevenueDay(date: string, includeDate = false) {
  const localDate = new Date(`${date}T12:00:00+07:00`)
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
    .format(localDate)
    .replace('.', '')
    .replace('Thứ ', 'T')

  if (!includeDate) return weekday

  const calendarDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(localDate)
  return `${weekday}, ${calendarDate}`
}

export function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof DashboardService.getDashboardData>> | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState<Error | null>(null)
  const [activeRevenueDay, setActiveRevenueDay] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    let refreshing = false

    const loadDashboard = async () => {
      if (refreshing) return
      refreshing = true

      try {
        const [dashboardData, storeSettings] = await Promise.all([
          DashboardService.getDashboardData(),
          SettingsService.getSettings().catch(() => null),
        ])
        if (!active) return
        setData(dashboardData)
        setSettings(storeSettings)
        setActiveRevenueDay(null)
        setError(null)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError : new Error('Không thể tải bảng điều khiển'))
      } finally {
        refreshing = false
      }
    }

    const refreshOnFocus = () => {
      setNow(new Date())
      void loadDashboard()
    }
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') refreshOnFocus()
    }

    void loadDashboard()
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
    }
  }, [])

  if (error) throw error
  if (!data) return <PageSkeleton />

  const { activities, bestSellers, revenueDays, kpis, lowInventory, orders, paymentSummary, quickActions, todaySummary } = data
  const greetingHour = getGreetingHour(now, settings?.timezone?.trim() || undefined)
  const greeting = getGreeting(greetingHour)
  const storeName = settings?.store_name?.trim() || 'SN Store'
  const chartWidth = 420
  const chartHeight = 192
  const plotTop = 8
  const plotBottom = 174
  const highestRevenue = Math.max(...revenueDays.map((day) => day.revenue))
  const chartMax = highestRevenue > 0 ? highestRevenue * 1.15 : 1
  const step = chartWidth / revenueDays.length
  const barWidth = Math.min(30, step * 0.48)
  const revenueToY = (revenue: number) => plotBottom - (revenue / chartMax) * (plotBottom - plotTop)
  const allDaysEmpty = todaySummary.weekRevenue === 0
  const activeDay = activeRevenueDay === null ? null : revenueDays[activeRevenueDay]

  return (
    <div className="dashboard">
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <p className="dashboard-kicker">Ngày {formatDashboardDate(now, settings?.timezone?.trim() || undefined)}</p>
          <h2 id="dashboard-title">{greeting}, {storeName}</h2>
          <p>Tình hình cửa hàng hôm nay.</p>
        </div>
        <div className="trading-status">
          <span aria-hidden="true" />
          Cửa hàng đang mở
        </div>
      </section>

      <section className="kpi-grid" aria-label="Chỉ số chính hôm nay">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <article className="kpi-card" key={kpi.label}>
              <div className={`kpi-icon ${kpi.tone}`}>
                <Icon aria-hidden="true" />
              </div>
              <div className="kpi-copy">
                <span>{kpi.label}</span>
                <strong>{typeof kpi.value === 'number' ? formatVnd(kpi.value) : kpi.value}</strong>
                <small>
                  {kpi.label === 'Doanh thu hôm nay' && <ArrowUpRight aria-hidden="true" />}
                  {kpi.note}
                </small>
              </div>
            </article>
          )
        })}
      </section>

      <section className="dashboard-main-grid">
        <article className="panel revenue-panel">
          <header className="panel-header">
            <div>
              <h3>Doanh thu</h3>
              <p>7 ngày gần nhất</p>
            </div>
            <div className="revenue-periods">
              <div><span>Tổng tuần</span><strong>{formatVnd(todaySummary.weekRevenue)}</strong></div>
              <span className="revenue-live"><i aria-hidden="true" /> Trực tiếp</span>
            </div>
          </header>
          <div className="revenue-chart-wrap">
            <div className="revenue-chart-scale" aria-hidden="true">
              <span>{formatVnd(chartMax)}</span>
              <span>{formatVnd(chartMax / 2)}</span>
              <span>{formatVnd(0)}</span>
            </div>
            <div className="revenue-chart-plot">
              <svg
                className="revenue-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Biểu đồ doanh thu bảy ngày gần nhất"
              >
                {[plotTop, (plotTop + plotBottom) / 2, plotBottom].map((y) => (
                  <line key={y} className="revenue-grid-line" x1="0" x2={chartWidth} y1={y} y2={y} />
                ))}
                {revenueDays.map((day, index) => {
                  const x = index * step + (step - barWidth) / 2
                  const barHeight = day.revenue ? Math.max(4, plotBottom - revenueToY(day.revenue)) : 0
                  const y = day.revenue ? revenueToY(day.revenue) : plotBottom
                  const isHighest = day.revenue > 0 && day.revenue === highestRevenue

                  return (
                    <g
                      key={day.date}
                      className={`revenue-bar-group ${isHighest ? 'is-highest' : ''}`}
                      tabIndex={0}
                      role="button"
                      aria-label={`${formatRevenueDay(day.date, true)}: ${formatVnd(day.revenue)}, ${day.orders} đơn hàng`}
                      onPointerEnter={() => setActiveRevenueDay(index)}
                      onPointerLeave={() => setActiveRevenueDay(null)}
                      onFocus={() => setActiveRevenueDay(index)}
                      onBlur={() => setActiveRevenueDay(null)}
                      onClick={() => setActiveRevenueDay((current) => current === index ? null : index)}
                    >
                      <rect className="revenue-bar-hitarea" x={index * step} y="0" width={step} height={plotBottom} />
                      {barHeight > 0 && <rect className="revenue-bar" x={x} y={y} width={barWidth} height={barHeight} rx="5" ry="5" />}
                    </g>
                  )
                })}
              </svg>
              <div className="revenue-chart-labels" aria-hidden="true">
                {revenueDays.map((day) => <span key={day.date}>{formatRevenueDay(day.date)}</span>)}
              </div>
              {activeDay && (
                <div
                  className="revenue-tooltip"
                  style={{
                    left: `${((activeRevenueDay! + 0.5) / revenueDays.length) * 100}%`,
                    transform: activeRevenueDay === 0 ? 'translateX(0)' : activeRevenueDay === revenueDays.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  <strong>{formatRevenueDay(activeDay.date, true)}</strong>
                  <span>{formatVnd(activeDay.revenue)}</span>
                  <small>{activeDay.orders} đơn hàng</small>
                </div>
              )}
              {allDaysEmpty && <p className="revenue-empty-message">Chưa có doanh thu trong 7 ngày gần nhất.</p>}
            </div>
          </div>
        </article>

        <article className="panel today-panel">
          <header className="panel-header">
            <div>
              <h3>Doanh thu hôm nay</h3>
              <p>Tổng hợp thanh toán</p>
            </div>
            <span className="summary-badge">{todaySummary.orderCount} đơn hàng</span>
          </header>
          <div className="sales-total">
            <span>Doanh thu thuần</span>
            <strong>{formatVnd(todaySummary.revenue)}</strong>
          </div>
          <div className="payment-list">
            {paymentSummary.map((payment) => (
              <div key={payment.method}>
                <span className={`payment-icon ${payment.method === 'cash' ? 'cash' : ''}`}>{payment.method === 'cash' ? <Banknote aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span>
                <span><strong>{payment.label}</strong><small>{payment.count} lượt thanh toán</small></span>
                <b>{formatVnd(payment.total)}</b>
              </div>
            ))}
          </div>
          <footer className="sales-footer">
            <span>Giá trị đơn trung bình</span>
            <strong>{formatVnd(todaySummary.averageOrder)}</strong>
          </footer>
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="panel orders-panel">
          <header className="panel-header">
            <div>
              <h3>Đơn hàng gần đây</h3>
              <p>Giao dịch mới nhất hôm nay</p>
            </div>
            <a className="panel-link" href="/orders">Xem tất cả <ArrowRight aria-hidden="true" /></a>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Đơn hàng</th><th>Khách hàng</th><th>Giờ</th><th>Trạng thái</th><th>Tổng cộng</th></tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td><strong>{order.customer}</strong><small>{order.items}</small></td>
                    <td>{formatTime(order.time)}</td>
                    <td><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                    <td><strong>{formatVnd(order.total)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel stock-panel">
          <header className="panel-header">
            <div>
              <h3>Sắp hết hàng</h3>
              <p>Sản phẩm cần nhập thêm sớm</p>
            </div>
            <a className="panel-link" href="/inventory">Kho hàng <ArrowRight aria-hidden="true" /></a>
          </header>
          <ul className="stock-list">
            {lowInventory.map((product) => (
              <li key={product.sku}>
                <span className={`product-swatch ${product.tone}`} aria-hidden="true" />
                <span className="stock-product">
                  <strong>{product.name}</strong>
                  <small>{product.detail} · {product.sku}</small>
                </span>
                <span className={`stock-count ${product.stock <= 2 ? 'critical' : ''}`}>
                  Còn {product.stock}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-insights-grid">
        <article className="panel best-sellers-panel">
          <header className="panel-header">
            <div>
              <h3>Sản phẩm bán chạy</h3>
              <p>Nổi bật nhất tháng này</p>
            </div>
            <a className="panel-link" href="/products">Xem sản phẩm <ArrowRight aria-hidden="true" /></a>
          </header>
          <ol className="best-seller-list">
            {bestSellers.map((product, index) => (
              <li key={product.name}>
                <span className="seller-rank">{index + 1}</span>
                <span
                  className={`seller-image${product.imagePath ? '' : ' is-empty'}`}
                  style={product.imagePath ? { backgroundImage: `url(${product.imagePath})` } : undefined}
                  role="img"
                  aria-label={`${product.name}, màu ${product.detail}`}
                />
                <span className="seller-product">
                  <strong>{product.name}</strong>
                  <small>{product.detail} · đã bán {product.sold}</small>
                </span>
                <strong className="seller-revenue">{formatVnd(product.revenue)}</strong>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel activity-panel">
          <header className="panel-header">
            <div>
              <h3>Hoạt động gần đây</h3>
              <p>Hoạt động mới trong cửa hàng</p>
            </div>
            <span className="live-indicator"><i aria-hidden="true" /> Trực tiếp</span>
          </header>
          <ol className="activity-list">
            {activities.map((activity) => {
              const Icon = activity.icon
              return (
                <li key={activity.title}>
                  <span className={`activity-icon ${activity.tone}`}><Icon aria-hidden="true" /></span>
                  <span className="activity-copy">
                    <strong>{activity.title}</strong>
                    <small>{activity.detail}{'amount' in activity && typeof activity.amount === 'number' ? ` · ${formatVnd(activity.amount)}` : ''}</small>
                  </span>
                  <time>{activity.time}</time>
                </li>
              )
            })}
          </ol>
        </article>
      </section>

      <section className="panel quick-actions-panel" aria-labelledby="quick-actions-title">
        <header className="quick-actions-heading">
          <h3 id="quick-actions-title">Thao tác nhanh</h3>
          <p>Tác vụ thường dùng</p>
        </header>
        <div className="quick-action-list">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button type="button" key={action.label}>
                <span><Icon aria-hidden="true" /></span>
                <span><strong>{action.label}</strong><small>{action.detail}</small></span>
                <ArrowRight aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
