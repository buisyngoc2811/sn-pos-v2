import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  CreditCard,
  Eye,
  ReceiptText,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import { PageIntro, Pagination, SearchField } from './components/PageUI'
import { DialogSurface, DrawerHeader, OverlayBackdrop } from './components/OverlayBackdrop'
import { FilterSelect } from './components/FormControls'
import { PageSkeleton } from './components/PageStates'
import { OrderService, type Order } from './services/OrderService'
import { formatDate, formatNumber, formatTime, formatVnd } from './utils/formatters'
import './ProductsPage.css'
import './OrdersPage.css'

const statuses = ['Tất cả trạng thái', 'Hoàn tất', 'Đã hoàn tiền', 'Tạm giữ']
const payments = ['Tất cả thanh toán', 'Thẻ', 'Tiền mặt', 'Chuyển khoản / QR']

function getStatusClass(status: Order['status']) {
  if (status === 'Đã hoàn tiền') return 'refunded'
  if (status === 'Tạm giữ') return 'on-hold'
  return 'completed'
}

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <OverlayBackdrop className="order-drawer-backdrop" onClose={onClose}>
      <DialogSurface as="aside" className="order-drawer" labelledBy="order-drawer-title">
        <DrawerHeader
          label="Chi tiết đơn hàng"
          title={order.id}
          titleId="order-drawer-title"
          closeLabel="Đóng chi tiết đơn hàng"
          onClose={onClose}
        />
        <div className="order-drawer-content">
          <section className="order-customer-card">
            <div className="order-avatar">{order.customer === 'Khách lẻ' ? 'WC' : order.customer.split(' ').map((word) => word[0]).join('')}</div>
            <div><strong>{order.customer}</strong><span>{order.email}</span></div>
            <span className={`orders-status ${getStatusClass(order.status)}`}>{order.status}</span>
          </section>

          <section className="drawer-section">
            <header><h3>Sản phẩm</h3><span>{order.items} sản phẩm</span></header>
            <ul className="drawer-item-list">
              {order.lineItems.map((item) => (
                <li key={item.id}><span><strong>{item.name}</strong><small>{item.detail} · SL {item.quantity}</small></span><b>{formatVnd(item.price)}</b></li>
              ))}
            </ul>
          </section>

          <section className="drawer-section payment-detail">
            <header><h3>Tổng hợp thanh toán</h3><span className="payment-method">{order.payment === 'Thẻ' ? <CreditCard /> : <Banknote />}{order.payment}</span></header>
            <dl>
              <div><dt>Tạm tính</dt><dd>{formatVnd(order.subtotal)}</dd></div>
              {order.discount > 0 && <div><dt>Giảm giá</dt><dd>-{formatVnd(order.discount)}</dd></div>}
              <div><dt>Thuế</dt><dd>{formatVnd(order.tax)}</dd></div>
              <div><dt>Tổng cộng</dt><dd>{formatVnd(order.total)}</dd></div>
            </dl>
          </section>

          <section className="drawer-section">
            <header><h3>Dòng thời gian</h3></header>
            <ol className="order-timeline">
              {order.status === 'Đã hoàn tiền' && <li className="refund"><span><RotateCcw /></span><div><strong>Đã hoàn tiền đơn hàng</strong><small>{formatDate(order.date)} · {formatTime(order.time)}</small></div></li>}
              <li><span><CircleCheck /></span><div><strong>Đã nhận thanh toán</strong><small>{formatDate(order.date)} · {formatTime(order.time)}</small></div></li>
              <li><span><ReceiptText /></span><div><strong>Đã tạo đơn hàng</strong><small>{formatDate(order.date)} · {formatTime(order.time)}</small></div></li>
            </ol>
          </section>
        </div>
        <footer className="order-drawer-footer"><button type="button" onClick={() => window.print()}><ReceiptText /> In hóa đơn</button><button type="button" onClick={onClose}>Xong</button></footer>
      </DialogSurface>
    </OverlayBackdrop>
  )
}

export function OrdersPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Tất cả trạng thái')
  const [payment, setPayment] = useState('Tất cả thanh toán')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [page, setPage] = useState(1)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    OrderService.getAll()
      .then((items) => {
        if (!active) return
        setOrders(items)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return orders.filter((order) =>
      (!normalized || order.id.toLowerCase().includes(normalized) || order.customer.toLowerCase().includes(normalized)) &&
      (status === 'Tất cả trạng thái' || order.status === status) &&
      (payment === 'Tất cả thanh toán' || order.payment === payment),
    )
  }, [payment, query, status, orders])

  if (error) throw error
  if (loading) return <PageSkeleton />

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  const todayOrders = orders.filter((order) => order.date === today).length
  const completedOrders = orders.filter((order) => order.status === 'Hoàn tất')
  const refundedOrders = orders.filter((order) => order.status === 'Đã hoàn tiền').length
  const heldOrders = orders.filter((order) => order.status === 'Tạm giữ').length
  const completedRevenue = completedOrders.reduce((total, order) => total + order.total, 0)
  const refundedRevenue = orders.filter((order) => order.status === 'Đã hoàn tiền').reduce((total, order) => total + order.total, 0)
  const orderDates = orders.map((order) => order.date).sort()
  const orderDateRange = orderDates.length ? `${formatDate(orderDates[0])}–${formatDate(orderDates.at(-1) ?? orderDates[0])}` : 'Chưa có đơn hàng'

  return (
    <div className="orders-page">
      <PageIntro
        kicker="Lịch sử bán hàng"
        title="Đơn hàng"
        description="Xem giao dịch, thanh toán và trạng thái đơn hàng."
        action={<span className="orders-date"><Clock3 /> {orderDateRange}</span>}
      />

      <section className="orders-stats">
        <div><span>Đơn hàng hôm nay</span><strong>{formatNumber(todayOrders)}</strong><small>Dữ liệu trực tiếp hôm nay</small></div>
        <div><span>Hoàn tất</span><strong>{formatNumber(completedOrders.length)}</strong><small>{formatVnd(completedRevenue)} đã thu</small></div>
        <div><span>Tạm giữ</span><strong>{formatNumber(heldOrders)}</strong><small>Đang chờ hoàn tất</small></div>
        <div><span>Đã hoàn tiền</span><strong>{formatNumber(refundedOrders)}</strong><small>{formatVnd(refundedRevenue)} đã hoàn lại</small></div>
      </section>

      <section className="orders-panel">
        <header className="products-toolbar">
          <SearchField label="Tìm đơn hàng" placeholder="Tìm đơn hàng hoặc khách hàng" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="product-filters">
            <FilterSelect label="Trạng thái đơn hàng" value={status} options={statuses} onChange={(event) => setStatus(event.target.value)} icon={<ChevronDown aria-hidden="true" />} />
            <FilterSelect label="Phương thức thanh toán" value={payment} options={payments} onChange={(event) => setPayment(event.target.value)} icon={<SlidersHorizontal aria-hidden="true" />} />
          </div>
        </header>
        <div className="orders-table-wrap">
          <table className="orders-page-table">
            <thead><tr><th>Đơn hàng</th><th>Khách hàng</th><th>Ngày</th><th>Sản phẩm</th><th>Thanh toán</th><th>Trạng thái</th><th>Tổng cộng</th><th><span className="sr-only">Xem</span></th></tr></thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)}>
                  <td><strong>{order.id}</strong></td>
                  <td><span className="order-customer"><strong>{order.customer}</strong><small>{order.email}</small></span></td>
                  <td><strong>{formatDate(order.date)}</strong><small>{formatTime(order.time)}</small></td>
                  <td>{order.items}</td>
                  <td><span className="table-payment">{order.payment === 'Thẻ' ? <CreditCard /> : <Banknote />}{order.payment}</span></td>
                  <td><span className={`orders-status ${getStatusClass(order.status)}`}>{order.status === 'Hoàn tất' && <Check />}{order.status}</span></td>
                  <td><strong>{formatVnd(order.total)}</strong></td>
                  <td><button type="button" aria-label={`Xem đơn hàng ${order.id}`} onClick={(event) => { event.stopPropagation(); setSelectedOrder(order) }}><Eye /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <div className="orders-empty" role="status"><ReceiptText /><strong>Không tìm thấy đơn hàng</strong><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
        </div>
        <Pagination label="Các trang đơn hàng" summary={<>Đang hiển thị {visibleOrders.length} trên {orders.length} đơn hàng</>} page={page} onPageChange={setPage} />
      </section>
      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}
