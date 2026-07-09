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

export function ReportsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof ReportService.getReportData>> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    ReportService.getReportData().then(setData).catch(setError)
  }, [])

  if (error) throw error
  if (!data) return <PageSkeleton />

  const { bestProducts, hours, revenuePoints } = data
  const revenueArea = `M ${revenuePoints.replaceAll(' ', ' L ')} L 346,142 L 4,142 Z`

  return (
    <div className="reports-page">
      <section className="reports-intro">
        <div><p className="reports-kicker">Hiệu suất cửa hàng</p><h2>Báo cáo</h2><p>Tổng quan hiệu suất bán hàng, sản phẩm và khách hàng.</p></div>
        <div className="reports-controls">
          <label className="date-range"><CalendarDays /><span><small>Từ ngày</small><input type="date" defaultValue="2026-07-01" aria-label="Ngày bắt đầu báo cáo" /></span><i /><span><small>Đến ngày</small><input type="date" defaultValue="2026-07-09" aria-label="Ngày kết thúc báo cáo" /></span></label>
          <button type="button" className="export-button"><Download /> Xuất CSV</button>
          <button type="button" className="export-icon" aria-label="Xuất PDF"><FileText /></button>
        </div>
      </section>

      <section className="report-kpis" aria-label="Tổng hợp bán hàng">
        <article><span className="report-kpi-icon"><TrendingUp /></span><div><span>Doanh thu thuần</span><strong>{formatVnd(314200000)}</strong><small className="positive"><ArrowUpRight /> 8,2% so với kỳ trước</small></div></article>
        <article><span className="report-kpi-icon"><ReceiptText /></span><div><span>Tổng đơn hàng</span><strong>{formatNumber(486)}</strong><small className="positive"><ArrowUpRight /> 6,4% so với kỳ trước</small></div></article>
        <article><span className="report-kpi-icon"><ShoppingBag /></span><div><span>Sản phẩm đã bán</span><strong>{formatNumber(742)}</strong><small className="positive"><ArrowUpRight /> 9,7% so với kỳ trước</small></div></article>
        <article><span className="report-kpi-icon"><UsersRound /></span><div><span>Giá trị đơn trung bình</span><strong>{formatVnd(646500)}</strong><small className="negative"><ArrowDownRight /> 1,3% so với kỳ trước</small></div></article>
      </section>

      <section className="reports-primary-grid">
        <article className="report-panel revenue-report">
          <header className="report-panel-header"><div><h3>Tổng quan doanh thu</h3><p>Doanh thu thuần hằng ngày trong khoảng đã chọn</p></div><div className="report-total"><span>Tổng doanh thu</span><strong>{formatVnd(314200000)}</strong></div></header>
          <div className="report-chart">
            <div className="report-y-axis"><span>{formatNumber(50)} tr ₫</span><span>{formatNumber(25)} tr ₫</span><span>{formatVnd(0)}</span></div>
            <div className="report-chart-plot">
              <svg viewBox="0 0 350 146" preserveAspectRatio="none" role="img" aria-label="Xu hướng doanh thu tăng tổng thể từ 01/07/2026 đến 09/07/2026">
                <defs><linearGradient id="report-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
                <line x1="4" x2="346" y1="24" y2="24" /><line x1="4" x2="346" y1="83" y2="83" /><line x1="4" x2="346" y1="142" y2="142" />
                <path d={revenueArea} className="report-area" /><polyline points={revenuePoints} className="report-line" /><circle cx="346" cy="24" r="4" />
              </svg>
              <div className="report-x-axis"><span>01/07</span><span>03/07</span><span>05/07</span><span>07/07</span><span>09/07</span></div>
            </div>
          </div>
        </article>

        <article className="report-panel category-report">
          <header className="report-panel-header"><div><h3>Doanh thu theo danh mục</h3><p>Tỷ trọng doanh thu thuần</p></div></header>
          <div className="category-chart-wrap">
            <div className="category-donut" role="img" aria-label="Áo 38%, Quần và váy 29%, Đầm 21%, Áo khoác 12%"><span><strong>{formatNumber(314.2)} tr ₫</strong><small>Tổng</small></span></div>
            <ul className="category-legend">
              <li><i className="tops" /><span>Áo</span><strong>38%</strong></li>
              <li><i className="bottoms" /><span>Quần & váy</span><strong>29%</strong></li>
              <li><i className="dresses" /><span>Đầm</span><strong>21%</strong></li>
              <li><i className="outerwear" /><span>Áo khoác</span><strong>12%</strong></li>
            </ul>
          </div>
        </article>
      </section>

      <section className="reports-secondary-grid">
        <article className="report-panel">
          <header className="report-panel-header"><div><h3>Sản phẩm bán chạy</h3><p>Xếp hạng theo doanh thu</p></div><span className="report-label">Phân tích sản phẩm</span></header>
          <ol className="product-ranking">
            {bestProducts.map((product, index) => <li key={product.name}><span className="rank-number">{index + 1}</span><span className="rank-product"><strong>{product.name}</strong><small>{formatNumber(product.item)} sản phẩm đã bán</small></span><span className="rank-bar"><i style={{ width: `${product.share}%` }} /></span><strong>{formatVnd(product.revenue)}</strong></li>)}
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
        <header className="report-panel-header"><div><h3>Phân tích khách hàng</h3><p>Hành vi mua sắm trong khoảng đã chọn</p></div><span className="report-label">Đã phân tích 486 đơn hàng</span></header>
        <div className="customer-analytics">
          <div><span>Khách quay lại</span><strong>68%</strong><small>331 đơn hàng</small><i><b style={{ width: '68%' }} /></i></div>
          <div><span>Khách hàng mới</span><strong>32%</strong><small>155 đơn hàng</small><i><b style={{ width: '32%' }} /></i></div>
          <div><span>Chi tiêu trung bình</span><strong>{formatVnd(1267000)}</strong><small>Trên {formatNumber(248)} khách hàng</small></div>
          <div><span>Hạng thành viên cao nhất</span><strong>VIP</strong><small>42 thành viên đang hoạt động</small></div>
        </div>
      </section>
    </div>
  )
}
