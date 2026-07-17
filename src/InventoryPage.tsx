import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  PackageCheck,
  PackageX,
  SlidersHorizontal,
  Warehouse,
} from 'lucide-react'
import { PageIntro, SearchField } from './components/PageUI'
import { FilterSelect } from './components/FormControls'
import { PageSkeleton } from './components/PageStates'
import { InventoryService, type InventoryItem, type InventoryMovement } from './services/InventoryService'
import { SettingsService, type StoreSettings } from './services/SettingsService'
import { formatNumber, formatTime, formatVnd } from './utils/formatters'
import './ProductsPage.css'
import './InventoryPage.css'

const stockFilters = ['Tất cả tồn kho', 'Còn hàng', 'Sắp hết hàng', 'Hết hàng']

function getStockState(item: InventoryItem) {
  if (item.stock === 0) return 'Hết hàng'
  if (item.stock <= item.reorder) return 'Sắp hết hàng'
  return 'Còn hàng'
}

export function InventoryPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tất cả danh mục')
  const [stockFilter, setStockFilter] = useState('Tất cả tồn kho')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<string[]>(['Tất cả danh mục'])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      InventoryService.getAll(),
      InventoryService.getCategories(),
      InventoryService.getMovements(),
      SettingsService.getSettings().catch(() => null),
    ])
      .then(([items, categoryItems, movementItems, storeSettings]) => {
        if (!active) return
        setInventory(items)
        setCategories(['Tất cả danh mục', ...categoryItems])
        setMovements(movementItems)
        setSettings(storeSettings)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err : new Error('Failed to load inventory'))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return inventory.filter((item) =>
      (!normalized || item.name.toLowerCase().includes(normalized) || item.sku.toLowerCase().includes(normalized)) &&
      (category === 'Tất cả danh mục' || item.category === category) &&
      (stockFilter === 'Tất cả tồn kho' || getStockState(item) === stockFilter),
    )
  }, [category, query, stockFilter, inventory])

  if (loading) return <PageSkeleton />
  if (error) throw error

  const inventoryValue = inventory.reduce((total, item) => total + item.value, 0)
  const totalUnits = inventory.reduce((total, item) => total + item.stock, 0)
  const lowStockCount = inventory.filter((item) => item.stock > 0 && item.stock <= item.reorder).length
  const outOfStockCount = inventory.filter((item) => item.stock === 0).length
  const healthyStockRate = inventory.length ? Math.round((inventory.filter((item) => item.stock > item.reorder).length / inventory.length) * 100) : 0
  const storeName = settings?.store_name?.trim() || 'SN Store'

  return (
    <div className="inventory-page">
      <PageIntro
        kicker="Quản lý tồn kho"
        title="Kho hàng"
        description="Theo dõi số lượng, giá trị và biến động tồn kho."
        action={<span className="inventory-updated">Vừa cập nhật</span>}
      />

      <section className="inventory-stats" aria-label="Tổng hợp tồn kho">
        <article><span className="inventory-stat-icon"><Boxes /></span><div><span>Tổng sản phẩm</span><strong>{formatNumber(totalUnits)}</strong><small>Trên {formatNumber(inventory.length)} biến thể</small></div></article>
        <article><span className="inventory-stat-icon value"><CircleDollarSign /></span><div><span>Giá trị tồn kho</span><strong>{formatVnd(inventoryValue)}</strong><small>Theo giá bán lẻ</small></div></article>
        <article><span className="inventory-stat-icon low"><PackageCheck /></span><div><span>Sắp hết hàng</span><strong>{lowStockCount}</strong><small>Dưới ngưỡng nhập thêm</small></div></article>
        <article><span className="inventory-stat-icon out"><PackageX /></span><div><span>Hết hàng</span><strong>{outOfStockCount}</strong><small>Không thể bán</small></div></article>
      </section>

      <section className="inventory-overview-grid">
        <article className="warehouse-card">
          <header><div><span className="warehouse-icon"><Warehouse /></span><div><h3>Kho chính</h3><p>{storeName} · Khu bán hàng và kho phía sau</p></div></div><span className="warehouse-online"><i /> Hoạt động tốt</span></header>
          <div className="warehouse-metrics">
            <div><span>Số lượng khả dụng</span><strong>{totalUnits}</strong></div>
            <div><span>Tình trạng tồn kho</span><strong>{healthyStockRate}%</strong></div>
            <div><span>Biến thể cần xử lý</span><strong>{lowStockCount + outOfStockCount}</strong></div>
          </div>
          <div className="stock-health"><span><i style={{ width: `${healthyStockRate}%` }} /></span><small>{healthyStockRate}% biến thể đang trên ngưỡng nhập thêm</small></div>
        </article>

        <article className="movement-panel" id="movements">
          <header className="inventory-panel-header"><div><h3>Biến động tồn kho</h3><p>Thay đổi tồn kho gần nhất</p></div><a href="#movements">Xem tất cả</a></header>
          <ol className="movement-list">
            {movements.map((movement, index) => (
              <li key={movement.id || `${movement.product}-${movement.time}-${index}`}>
                <span className={`movement-icon ${movement.type}`}>{movement.type === 'in' ? <ArrowDownLeft /> : <ArrowUpRight />}</span>
                <span><strong>{movement.product}</strong><small>{movement.detail} · {formatTime(movement.time)}</small></span>
                <b className={movement.type}>{movement.amount > 0 ? '+' : ''}{movement.amount}</b>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="inventory-table-panel">
        <header className="products-toolbar">
          <SearchField label="Tìm trong kho" placeholder="Tìm sản phẩm hoặc SKU" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="product-filters">
            <FilterSelect label="Danh mục" value={category} options={categories} onChange={(event) => setCategory(event.target.value)} icon={<ChevronDown aria-hidden="true" />} />
            <FilterSelect label="Trạng thái tồn kho" value={stockFilter} options={stockFilters} onChange={(event) => setStockFilter(event.target.value)} icon={<SlidersHorizontal aria-hidden="true" />} />
          </div>
        </header>

        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Khả dụng</th><th>Ngưỡng nhập thêm</th><th>Trạng thái tồn kho</th><th>Giá trị</th></tr></thead>
            <tbody>
              {visibleItems.map((item) => {
                const state = getStockState(item)
                return (
                  <tr key={item.id}>
                    <td><div className="table-product"><span className={`product-page-image${item.imagePath ? '' : ' is-empty'}`} style={item.imagePath ? { backgroundImage: `url(${item.imagePath})` } : undefined} role="img" aria-label={`Ảnh sản phẩm ${item.name}`} /><span><strong>{item.name}</strong><small>{item.variant} · {item.sku}</small></span></div></td>
                    <td>{item.category}</td>
                    <td><strong>{item.stock}</strong> sản phẩm</td>
                    <td>{item.reorder} sản phẩm</td>
                    <td><span className={`inventory-status ${state.toLowerCase().replaceAll(' ', '-')}`}><i />{state}</span></td>
                    <td><strong>{formatVnd(item.value)}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visibleItems.length === 0 && <div className="inventory-empty" role="status"><PackageX /><strong>Không tìm thấy dữ liệu tồn kho</strong><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
        </div>
        <footer className="inventory-table-footer"><span>Đang hiển thị {visibleItems.length} trên {inventory.length} mục tồn kho</span><span>Tổng cộng {totalUnits} sản phẩm</span></footer>
      </section>
    </div>
  )
}
