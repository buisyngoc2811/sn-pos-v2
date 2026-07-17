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
  Trash2,
  UserRound,
} from 'lucide-react'
import { PageIntro, Pagination, SearchField } from './components/PageUI'
import { ConfirmationDialog, DialogSurface, DrawerHeader, OverlayBackdrop } from './components/OverlayBackdrop'
import { FilterSelect } from './components/FormControls'
import { EmptyState, PageSkeleton } from './components/PageStates'
import { CustomerService, type Customer } from './services/CustomerService'
import { formatDate, formatNumber, formatVnd } from './utils/formatters'
import './ProductsPage.css'
import './OrdersPage.css'
import './CustomersPage.css'

const tiers = ['Tất cả khách hàng', 'Thành viên', 'Hồng', 'VIP']
const activityFilters = ['Mọi hoạt động', 'Mua hàng hôm nay']

function initials(name: string) {
  return name.split(' ').map((word) => word[0]).join('')
}

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const threshold = Math.max(1, customer.nextRewardThreshold)
  const loyaltyProgress = Math.max(0, Math.min(100, Math.round((Math.max(0, customer.points) / threshold) * 100)))
  const remainingPoints = Math.max(0, threshold - Math.max(0, customer.points))

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
            <div><span>Giá trị đơn trung bình</span><strong>{formatVnd(customer.orders ? customer.spent / customer.orders : 0)}</strong></div>
          </section>

          <section className="loyalty-card">
            <header><div><Sparkles /><span><strong>{formatNumber(customer.points)} điểm</strong><small>Hạng {customer.tier}</small></span></div><b>{formatNumber(loyaltyProgress)}%</b></header>
            <span className="loyalty-progress"><i style={{ width: `${loyaltyProgress}%` }} /></span>
            <p>{remainingPoints > 0 ? `Còn ${formatNumber(remainingPoints)} điểm để nhận ưu đãi tiếp theo` : 'Đã đạt mốc ưu đãi hiện tại'}</p>
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
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await CustomerService.getAll()
      setCustomers(data)
      setSelectedCustomer((current) => current ? data.find((customer) => customer.id === current.id) ?? null : null)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return
    try {
      setIsDeleting(true)
      await CustomerService.delete(deletingCustomer.id)
      setToastMessage('Đã xóa khách hàng thành công.')
      setDeletingCustomer(null)
      void loadCustomers()
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e: any) {
      setToastMessage(e.message)
      setDeletingCustomer(null)
      setTimeout(() => setToastMessage(null), 5000)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    void loadCustomers()
  }, [])

  useEffect(() => {
    const refreshCustomers = () => void loadCustomers()
    window.addEventListener('sn-pos-v2:customer-updated', refreshCustomers)
    return () => window.removeEventListener('sn-pos-v2:customer-updated', refreshCustomers)
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

  const totalCustomers = customers.length
  const returningCustomers = customers.filter((c) => c.orders > 1).length
  const returnRate = totalCustomers ? Math.round((returningCustomers / totalCustomers) * 100) : 0
  const purchasingCustomers = customers.filter((c) => c.orders > 0).length
  const totalSpent = customers.reduce((acc, c) => acc + c.spent, 0)
  const avgSpent = purchasingCustomers ? Math.round(totalSpent / purchasingCustomers) : 0
  const totalPoints = customers.reduce((acc, c) => acc + c.points, 0)

  return (
    <div className="customers-page">
      <PageIntro kicker="Danh sách khách hàng" title="Khách hàng" description="Xem lịch sử mua hàng và điểm thành viên." action={<span className="customer-count"><UserRound /> {customers.length} khách hàng</span>} />
      <section className="customers-stats">
        <div><span>Tổng khách hàng</span><strong>{totalCustomers}</strong><small>Tài khoản thành viên</small></div>
        <div><span>Khách quay lại</span><strong>{returnRate}%</strong><small>Đã mua hàng nhiều hơn một lần</small></div>
        <div><span>Chi tiêu trung bình</span><strong>{formatVnd(avgSpent)}</strong><small>Mỗi khách hàng</small></div>
        <div><span>Điểm thành viên</span><strong>{formatNumber(totalPoints)}</strong><small>Hiện có thể sử dụng</small></div>
      </section>
      <section className="customers-panel">
        <header className="products-toolbar">
          <SearchField label="Tìm khách hàng" placeholder="Tìm tên, thư điện tử hoặc số điện thoại" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="product-filters">
            {toastMessage && <p className="products-toast" role="status" style={{ margin: 0 }}>{toastMessage}</p>}
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
                  <td>
                    <div className="row-actions">
                      <button type="button" aria-label={`Xem ${customer.name}`} onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer) }}><Eye /></button>
                      <button type="button" aria-label={`Xóa ${customer.name}`} onClick={(event) => { event.stopPropagation(); setDeletingCustomer(customer) }}><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 ? (
            <EmptyState
              title="Chưa có khách hàng"
              description="Khách hàng sẽ xuất hiện ở đây khi có đơn hàng hoặc được thêm mới."
            />
          ) : visibleCustomers.length === 0 ? (
            <EmptyState
              title="Không tìm thấy khách hàng"
              description="Hãy thử thay đổi từ khóa hoặc bộ lọc."
            />
          ) : null}
        </div>
        <Pagination label="Các trang khách hàng" summary={<>Đang hiển thị {visibleCustomers.length} trên {customers.length} khách hàng</>} page={page} onPageChange={setPage} />
      </section>
      {selectedCustomer && <CustomerDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
      {deletingCustomer && (
        <ConfirmationDialog
          backdropClassName="dialog-backdrop"
          className="delete-dialog"
          title="Xóa khách hàng"
          titleId="delete-customer-title"
          description={`Bạn có chắc chắn muốn xóa khách hàng ${deletingCustomer.name}? Thao tác này không thể hoàn tác.`}
          descriptionId="delete-customer-desc"
          icon={<span className="delete-icon"><Trash2 aria-hidden="true" /></span>}
          cancelLabel="Hủy"
          confirmLabel={isDeleting ? 'Đang xóa...' : 'Xóa khách hàng'}
          cancelDisabled={isDeleting}
          confirmDisabled={isDeleting}
          onCancel={() => setDeletingCustomer(null)}
          onConfirm={handleDeleteCustomer}
        />
      )}
    </div>
  )
}
