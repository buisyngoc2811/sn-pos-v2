import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Eye,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { PageIntro, Pagination, SearchField } from './components/PageUI'
import { DialogSurface, DrawerHeader, OverlayBackdrop } from './components/OverlayBackdrop'
import { FilterSelect } from './components/FormControls'
import { EmptyState, PageSkeleton } from './components/PageStates'
import {
  customerActivityFilters as activityFilters,
  customerTiers as tiers,
} from './data/mockData'
import { CustomerService, type Customer } from './services/CustomerService'
import { formatDate, formatNumber, formatVnd } from './utils/formatters'
import './ProductsPage.css'
import './OrdersPage.css'
import './CustomersPage.css'

function initials(name: string) {
  return name.split(' ').map((word) => word[0]).join('')
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <OverlayBackdrop className="order-drawer-backdrop" onClose={onClose}>
      <DialogSurface as="aside" className="order-drawer customer-drawer" labelledBy="customer-profile-title">
        <DrawerHeader
          label="Hồ sơ khách hàng"
          title={customer.name}
          titleId="customer-profile-title"
          closeLabel="Đóng hồ sơ khách hàng"
          onClose={onClose}
        />
        <div className="order-drawer-content">
          <section className="customer-profile-card">
            <div className="customer-profile-avatar">{initials(customer.name)}</div>
            <div><strong>{customer.name}</strong><span>Khách hàng từ {customer.joined}</span></div>
            <span className={`customer-tier ${customer.tier.toLowerCase()}`}>{customer.tier}</span>
          </section>

          <section className="customer-contact-card">
            <a href={`mailto:${customer.email}`}><Mail /><span><small>Thư điện tử</small><strong>{customer.email}</strong></span></a>
            <a href={`tel:${customer.phone}`}><Phone /><span><small>Điện thoại</small><strong>{customer.phone}</strong></span></a>
            <div><MapPin /><span><small>Địa chỉ</small><strong>TP. Hồ Chí Minh</strong></span></div>
          </section>

          <section className="customer-metrics">
            <div><span>Tổng chi tiêu</span><strong>{formatVnd(customer.spent)}</strong></div>
            <div><span>Tổng đơn hàng</span><strong>{customer.orders}</strong></div>
            <div><span>Giá trị đơn trung bình</span><strong>{formatVnd(customer.spent / customer.orders)}</strong></div>
          </section>

          <section className="loyalty-card">
            <header><div><Sparkles /><span><strong>{formatNumber(customer.points)} điểm</strong><small>Hạng {customer.tier}</small></span></div><b>{formatNumber(Math.min(100, Math.round(customer.points / 15)))}%</b></header>
            <span className="loyalty-progress"><i style={{ width: `${Math.min(100, customer.points / 15)}%` }} /></span>
            <p>Còn {formatNumber(Math.max(0, 1500 - customer.points))} điểm để nhận ưu đãi tiếp theo</p>
          </section>

          <section className="drawer-section">
            <header><h3>Lịch sử mua hàng</h3><span>{customer.orders} đơn hàng</span></header>
            <ul className="purchase-history">
              {customer.purchases.map((purchase) => (
                <li key={purchase.id}><span><strong>{purchase.id}</strong><small>{formatDate(purchase.date)} · {purchase.items}</small></span><b>{formatVnd(purchase.total)}</b></li>
              ))}
            </ul>
          </section>
        </div>
        <footer className="order-drawer-footer"><button type="button"><ShoppingBag /> Xem tất cả đơn hàng</button><button type="button" onClick={onClose}>Xong</button></footer>
      </DialogSurface>
    </OverlayBackdrop>
  )
}

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('Tất cả khách hàng')
  const [activity, setActivity] = useState('Mọi hoạt động')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await CustomerService.getAll()
      setCustomers(data)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomers()
  }, [])

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return customers.filter((customer) =>
      (!normalized || customer.name.toLowerCase().includes(normalized) || customer.email.toLowerCase().includes(normalized) || customer.phone.includes(normalized)) &&
      (tier === 'Tất cả khách hàng' || customer.tier === tier) &&
      (activity === 'Mọi hoạt động' || (activity === 'Mua hàng hôm nay' ? customer.lastOrder.startsWith('Hôm nay') : true)),
    )
  }, [activity, query, tier, customers])

  if (error) throw error
  if (loading) return <PageSkeleton />

  return (
    <div className="customers-page">
      <PageIntro kicker="Danh sách khách hàng" title="Khách hàng" description="Xem lịch sử mua hàng và điểm thành viên." action={<span className="customer-count"><UserRound /> {customers.length} khách hàng</span>} />
      <section className="customers-stats">
        <div><span>Tổng khách hàng</span><strong>248</strong><small>12 tham gia trong tháng</small></div>
        <div><span>Khách quay lại</span><strong>68%</strong><small>Đã mua hàng nhiều hơn một lần</small></div>
        <div><span>Chi tiêu trung bình</span><strong>{formatVnd(842000)}</strong><small>Mỗi khách hàng</small></div>
        <div><span>Điểm thành viên</span><strong>{formatNumber(18400)}</strong><small>Hiện có thể sử dụng</small></div>
      </section>
      <section className="customers-panel">
        <header className="products-toolbar">
          <SearchField label="Tìm khách hàng" placeholder="Tìm tên, thư điện tử hoặc số điện thoại" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="product-filters">
            <FilterSelect label="Hạng thành viên" value={tier} options={tiers} onChange={(event) => setTier(event.target.value)} icon={<ChevronDown aria-hidden="true" />} />
            <FilterSelect label="Hoạt động gần đây" value={activity} options={activityFilters} onChange={(event) => setActivity(event.target.value)} icon={<SlidersHorizontal aria-hidden="true" />} />
          </div>
        </header>
        <div className="customers-table-wrap">
          <table className="customers-table">
            <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Đơn hàng</th><th>Tổng chi tiêu</th><th>Thành viên</th><th>Đơn gần nhất</th><th><span className="sr-only">Xem</span></th></tr></thead>
            <tbody>
              {visibleCustomers.map((customer) => (
                <tr key={customer.id} onClick={() => setSelectedCustomer(customer)}>
                  <td><div className="customer-cell"><span>{initials(customer.name)}</span><div><strong>{customer.name}</strong><small>Tham gia {customer.joined}</small></div></div></td>
                  <td><strong>{customer.email}</strong><small>{customer.phone}</small></td>
                  <td>{customer.orders}</td>
                  <td><strong>{formatVnd(customer.spent)}</strong></td>
                  <td><span className={`customer-tier ${customer.tier.toLowerCase()}`}>{customer.tier}</span><small>{formatNumber(customer.points)} điểm</small></td>
                  <td>{customer.lastOrder}</td>
                  <td><button type="button" aria-label={`Xem ${customer.name}`} onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer) }}><Eye /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCustomers.length === 0 && (
            <EmptyState
              title="Không tìm thấy khách hàng"
              description="Hãy thử thay đổi từ khóa hoặc bộ lọc."
            />
          )}
        </div>
        <Pagination label="Các trang khách hàng" summary={<>Đang hiển thị {visibleCustomers.length} trên {customers.length} khách hàng</>} page={page} onPageChange={setPage} />
      </section>
      {selectedCustomer && <CustomerDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
    </div>
  )
}
