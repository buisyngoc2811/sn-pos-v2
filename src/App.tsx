import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  UsersRound,
  X,
} from 'lucide-react'
import { PageErrorBoundary, PageSkeleton } from './components/PageStates'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './LoginPage'

type PagePath = 'dashboard' | 'sales' | 'products' | 'inventory' | 'orders' | 'customers' | 'reports' | 'settings'

const primaryNavigation = [
  { label: 'Tổng quan', eyebrow: 'Tổng quan cửa hàng', path: 'dashboard', icon: LayoutDashboard },
  { label: 'Bán hàng', eyebrow: 'Điểm bán hàng', path: 'sales', icon: ShoppingBag },
  { label: 'Sản phẩm', eyebrow: 'Danh mục sản phẩm', path: 'products', icon: Package },
  { label: 'Tồn kho', eyebrow: 'Quản lý kho', path: 'inventory', icon: Boxes },
  { label: 'Đơn hàng', eyebrow: 'Quản lý bán hàng', path: 'orders', icon: ClipboardList },
  { label: 'Khách hàng', eyebrow: 'Quan hệ khách hàng', path: 'customers', icon: UsersRound },
  { label: 'Báo cáo', eyebrow: 'Phân tích', path: 'reports', icon: BarChart3 },
  { label: 'Cài đặt', eyebrow: 'Thiết lập cửa hàng', path: 'settings', icon: Settings },
] satisfies ReadonlyArray<{
  label: string
  eyebrow: string
  path: PagePath
  icon: typeof LayoutDashboard
}>

const pages: Record<PagePath, ComponentType> = {
  dashboard: lazy(() => import('./Dashboard').then(({ Dashboard }) => ({ default: Dashboard }))),
  sales: lazy(() => import('./PosPage').then(({ PosPage }) => ({ default: PosPage }))),
  products: lazy(() => import('./ProductsPage').then(({ ProductsPage }) => ({ default: ProductsPage }))),
  inventory: lazy(() => import('./InventoryPage').then(({ InventoryPage }) => ({ default: InventoryPage }))),
  orders: lazy(() => import('./OrdersPage').then(({ OrdersPage }) => ({ default: OrdersPage }))),
  customers: lazy(() => import('./CustomersPage').then(({ CustomersPage }) => ({ default: CustomersPage }))),
  reports: lazy(() => import('./ReportsPage').then(({ ReportsPage }) => ({ default: ReportsPage }))),
  settings: lazy(() => import('./SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage }))),
}

function getPageFromLocation(): PagePath {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return path in pages ? path as PagePath : 'dashboard'
}

function App() {
  const { session, signOut } = useAuth()
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [currentPage, setCurrentPage] = useState<PagePath>(getPageFromLocation)
  const mainRef = useRef<HTMLElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const navigationCloseRef = useRef<HTMLButtonElement>(null)
  const currentNavigation = primaryNavigation.find((item) => item.path === currentPage)!
  const CurrentPage = pages[currentPage]
  const hasPageSearch = ['sales', 'products', 'inventory', 'orders', 'customers'].includes(currentPage)

  useEffect(() => {
    if (window.location.pathname === '/' || !(window.location.pathname.slice(1) in pages)) {
      window.history.replaceState(null, '', `/${currentPage}`)
    }

    const syncPageWithUrl = () => setCurrentPage(getPageFromLocation())
    window.addEventListener('popstate', syncPageWithUrl)
    return () => window.removeEventListener('popstate', syncPageWithUrl)
  }, [currentPage])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    if (!isNavigationOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNavigationOpen(false)
        menuTriggerRef.current?.focus()
      }
    }

    navigationCloseRef.current?.focus()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isNavigationOpen])

  const focusPageSearch = () => {
    mainRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (document.querySelector('[aria-modal="true"]')) return
        const search = mainRef.current?.querySelector<HTMLInputElement>('input[type="search"]')
        if (!search) return
        event.preventDefault()
        search.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const navigateTo = (page: PagePath) => {
    if (page !== currentPage) {
      window.history.pushState(null, '', `/${page}`)
      setCurrentPage(page)
      requestAnimationFrame(() => mainRef.current?.focus())
    }
    setIsNavigationOpen(false)
  }

  const closeNavigation = () => {
    setIsNavigationOpen(false)
    requestAnimationFrame(() => menuTriggerRef.current?.focus())
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung
      </a>

      <div
        className={`navigation-backdrop ${isNavigationOpen ? 'is-visible' : ''}`}
        aria-hidden="true"
        onClick={closeNavigation}
      />

      <aside
        className={`sidebar ${isNavigationOpen ? 'is-open' : ''}`}
        aria-label="Điều hướng chính"
      >
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            SN
          </div>
          <div className="brand-copy">
            <strong>SN Store</strong>
            <span>Điểm bán hàng</span>
          </div>
          <button
            ref={navigationCloseRef}
            className="icon-button sidebar-close"
            type="button"
            aria-label="Đóng điều hướng"
            onClick={closeNavigation}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="navigation">
          <span className="navigation-label">Khu vực làm việc</span>
          <ul>
            {primaryNavigation.map((item) => {
              const Icon = item.icon
              const isActive = item.path === currentPage
              return (
                <li key={item.label}>
                  <a
                    className={`navigation-item ${isActive ? 'is-active' : ''}`}
                    href={`/${item.path}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      navigateTo(item.path)
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="store-status">
            <span className="status-dot" aria-hidden="true" />
            <span className="store-status-copy">
              <strong>Cửa hàng trực tuyến</strong>
              <small>Sẵn sàng bán hàng</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="shell-body">
        <header className="header">
          <div className="header-start">
            <button
              ref={menuTriggerRef}
              className="icon-button menu-trigger"
              type="button"
              aria-label="Mở điều hướng"
              aria-expanded={isNavigationOpen}
              onClick={() => setIsNavigationOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <PanelLeftClose className="desktop-rail-icon" aria-hidden="true" />
            <div className="page-heading">
              <span className="eyebrow">{currentNavigation.eyebrow}</span>
              <h1>{currentNavigation.label}</h1>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="search-trigger"
              type="button"
              aria-label={hasPageSearch ? 'Tìm kiếm trong trang' : 'Trang này không có ô tìm kiếm'}
              aria-keyshortcuts="Control+K Meta+K"
              disabled={!hasPageSearch}
              onClick={focusPageSearch}
            >
              <Search aria-hidden="true" />
              <span>Tìm kiếm</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={isDark ? 'Dùng giao diện sáng' : 'Dùng giao diện tối'}
              onClick={() => setIsDark((current) => !current)}
            >
              {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            <button className="profile-button" type="button" aria-label="Đăng xuất" onClick={signOut}>
              <span className="profile-avatar" aria-hidden="true">
                SN
              </span>
              <span className="profile-copy">
                <strong>SN Store</strong>
                <small>Đăng xuất</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </header>

        <main ref={mainRef} id="main-content" className="main-content" tabIndex={-1}>
          <PageErrorBoundary key={currentPage}>
            <Suspense fallback={<PageSkeleton />}>
              <CurrentPage />
            </Suspense>
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
