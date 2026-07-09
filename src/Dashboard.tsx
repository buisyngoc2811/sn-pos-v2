import { useEffect, useState } from 'react'
import { PageSkeleton } from './components/PageStates'
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import productSheet from './assets/boutique-products.webp'
import { DashboardService } from './services/DashboardService'
import { formatDate, formatNumber, formatTime, formatVnd } from './utils/formatters'

export function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof DashboardService.getDashboardData>> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    DashboardService.getDashboardData().then(setData).catch(setError)
  }, [])

  if (error) throw error
  if (!data) return <PageSkeleton />

  const { activities, bestSellers, chartPoints, kpis, lowInventory, orders, quickActions } = data
  const chartArea = `M ${chartPoints.replaceAll(' ', ' L ')} L 292,126 L 4,126 Z`

  return (
    <div className="dashboard">
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <p className="dashboard-kicker">Ngày {formatDate('2026-07-09')}</p>
          <h2 id="dashboard-title">Chào buổi sáng, SN Store</h2>
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
              <div><span>Theo tuần</span><strong>{formatVnd(78420000)}</strong></div>
              <div><span>Theo tháng</span><strong>{formatVnd(314200000)}</strong></div>
              <span className="revenue-change"><TrendingUp aria-hidden="true" /> 8,2%</span>
            </div>
          </header>
          <div className="chart-wrap">
            <div className="chart-scale" aria-hidden="true">
              <span>{formatNumber(20)} tr ₫</span>
              <span>{formatNumber(10)} tr ₫</span>
              <span>{formatVnd(0)}</span>
            </div>
            <div className="chart-plot">
              <svg
                className="revenue-chart"
                viewBox="0 0 296 130"
                preserveAspectRatio="none"
                role="img"
                aria-label="Doanh thu tăng trong bảy ngày gần nhất và cao nhất vào thứ Năm"
              >
                <defs>
                  <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="4" x2="292" y1="24" y2="24" />
                <line x1="4" x2="292" y1="75" y2="75" />
                <line x1="4" x2="292" y1="126" y2="126" />
                <path className="chart-area" d={chartArea} />
                <polyline className="chart-line" points={chartPoints} />
                <circle className="chart-point" cx="292" cy="24" r="4" />
              </svg>
              <div className="chart-labels" aria-hidden="true">
                <span>T6</span><span>T7</span><span>CN</span><span>T2</span>
                <span>T3</span><span>T4</span><span>T5</span>
              </div>
            </div>
          </div>
        </article>

        <article className="panel today-panel">
          <header className="panel-header">
            <div>
              <h3>Doanh thu hôm nay</h3>
              <p>Tổng hợp thanh toán</p>
            </div>
            <span className="summary-badge">24 đơn hàng</span>
          </header>
          <div className="sales-total">
            <span>Doanh thu thuần</span>
            <strong>{formatVnd(12845000)}</strong>
          </div>
          <div className="payment-list">
            <div>
              <span className="payment-icon"><CreditCard aria-hidden="true" /></span>
              <span><strong>Thẻ</strong><small>16 lượt thanh toán</small></span>
              <b>{formatVnd(8925000)}</b>
            </div>
            <div>
              <span className="payment-icon cash"><Banknote aria-hidden="true" /></span>
              <span><strong>Tiền mặt</strong><small>8 lượt thanh toán</small></span>
              <b>{formatVnd(3920000)}</b>
            </div>
          </div>
          <footer className="sales-footer">
            <span>Giá trị đơn trung bình</span>
            <strong>{formatVnd(535200)}</strong>
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
                  className="seller-image"
                  style={{ backgroundImage: `url(${productSheet})`, backgroundPosition: product.position }}
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
