import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  Check,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import productSheet from './assets/boutique-products.webp'
import { PageSkeleton } from './components/PageStates'
import { PosService, type PosCartItem as CartItem, type PosProduct as Product } from './services/PosService'
import { formatVnd } from './utils/formatters'
import './PosPage.css'

function ProductImage({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <span
      className={compact ? 'cart-product-image' : 'product-image'}
      style={{
        backgroundImage: `url(${productSheet})`,
        backgroundPosition: product.position,
      }}
      role="img"
      aria-label={`Ảnh sản phẩm ${product.name}`}
    />
  )
}

export function PosPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tất cả')
  const [cart, setCart] = useState<CartItem[]>([])
  const [categories, setCategories] = useState<string[]>(['Tất cả'])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const checkoutRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      PosService.getCategories(),
      PosService.getProducts()
    ])
      .then(([cats, prods]) => {
        setCategories(cats)
        setProducts(prods)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target
      if (document.querySelector('[aria-modal="true"]')) return

      const isEditing = target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      const isPageSurface = target === document.body ||
        (target instanceof HTMLElement && target.tagName === 'MAIN')

      if (event.key === '/' && !isEditing) {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'Enter' && isPageSurface && cart.length > 0) {
        event.preventDefault()
        checkoutRef.current?.click()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart.length])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'Tất cả' || product.category === category
      const matchesQuery = !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0)

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
            : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, difference: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, Math.min(item.stock, item.quantity + difference)) }
            : item,
        )
        .filter((item) => item.id !== id || item.quantity > 0),
    )
  }

  const removeItem = (id: string) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    try {
      await PosService.checkout(cart, subtotal, tax, total)
      setCart([])
      alert('Thanh toán thành công')
      const prods = await PosService.getProducts()
      setProducts(prods)
    } catch (e: any) {
      alert(e.message || 'Thanh toán thất bại')
    }
  }

  const navigateCategories = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % categories.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + categories.length) % categories.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = categories.length - 1
    else return

    event.preventDefault()
    setCategory(categories[nextIndex])
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[nextIndex]?.focus()
  }

  if (error) throw error
  if (loading) return <PageSkeleton />

  return (
    <div className="pos-page">
      <section className="catalog" aria-labelledby="catalog-title">
        <header className="catalog-header">
          <div>
            <span className="pos-kicker">Bán hàng mới</span>
            <h2 id="catalog-title">Chọn sản phẩm</h2>
            <p>{visibleItems.length} mẫu đang có</p>
          </div>
          <button className="customer-button" type="button">
            <UserRound aria-hidden="true" />
            Thêm khách hàng
          </button>
        </header>

        <div className="catalog-tools">
          <label className="product-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm sản phẩm</span>
            <input
              ref={searchRef}
              type="search"
              aria-keyshortcuts="/"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên sản phẩm"
            />
            {query && (
              <button type="button" aria-label="Xóa tìm kiếm" onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}>
                <X aria-hidden="true" />
              </button>
            )}
            <kbd>/</kbd>
          </label>

          <div className="category-filters" aria-label="Lọc theo danh mục">
            {categories.map((item, index) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'is-selected' : ''}
                aria-pressed={category === item}
                tabIndex={category === item ? 0 : -1}
                onKeyDown={(event) => navigateCategories(event, index)}
                onClick={() => setCategory(item)}
              >
                {category === item && <Check aria-hidden="true" />}
                {item}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <div className="product-grid">
            {visibleItems.map((product) => (
              <button
                className="product-card"
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                aria-label={`Thêm ${product.name}, giá ${formatVnd(product.price)}, vào giỏ hàng`}
              >
                <ProductImage product={product} />
                <span className="product-details">
                  <span className="product-category">{product.category}</span>
                  <strong>{product.name}</strong>
                  <span className="product-meta">
                    <span>Kích cỡ {product.size}</span>
                    <span className={product.stock <= 5 ? 'low' : ''}>{product.stock} còn hàng</span>
                  </span>
                  <span className="product-bottom">
                    <b>{formatVnd(product.price)}</b>
                    <span className="add-product" aria-hidden="true"><Plus /></span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="catalog-empty" role="status">
            <Search aria-hidden="true" />
            <strong>Không có mẫu phù hợp</strong>
            <p>Hãy thử tên khác hoặc chọn danh mục khác.</p>
            <button type="button" onClick={() => {
              setQuery('')
              setCategory('Tất cả')
            }}>
              Hiển thị tất cả sản phẩm
            </button>
          </div>
        )}
      </section>

      <aside className="cart-panel" aria-labelledby="cart-title">
        <header className="cart-header">
          <div>
            <span className="cart-eyebrow">Đơn hàng hiện tại</span>
            <h2 id="cart-title">Giỏ hàng <span>{itemCount}</span></h2>
          </div>
          <button
            type="button"
            className="clear-cart"
            disabled={cart.length === 0}
            onClick={() => setCart([])}
          >
            Xóa
          </button>
        </header>

        <div className="cart-items" aria-live="polite">
          {cart.length > 0 ? cart.map((item) => (
            <article className="cart-item" key={item.id}>
              <ProductImage product={item} compact />
              <div className="cart-item-main">
                <div className="cart-item-heading">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.color ? item.color + ' · ' : ''}Kích cỡ {item.size} · {formatVnd(item.price)}</span>
                  </div>
                  <button type="button" aria-label={`Xóa ${item.name}`} onClick={() => removeItem(item.id)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <div className="cart-item-bottom">
                  <div className="quantity-control" aria-label={`Số lượng của ${item.name}`}>
                    <button type="button" aria-label="Giảm số lượng" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus aria-hidden="true" />
                    </button>
                    <output aria-label={`${item.quantity} sản phẩm`}>{item.quantity}</output>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      disabled={item.quantity >= item.stock}
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                  <strong>{formatVnd(item.price * item.quantity)}</strong>
                </div>
              </div>
            </article>
          )) : (
            <div className="empty-cart">
              <ShoppingBag aria-hidden="true" />
              <strong>Giỏ hàng đang trống</strong>
              <p>Chọn sản phẩm để bắt đầu bán hàng.</p>
            </div>
          )}
        </div>

        <div className="cart-checkout">
          <label className="discount-field">
            <span>Giảm giá</span>
            <span className="discount-input">
              <Tag aria-hidden="true" />
              <input type="text" placeholder="Mã hoặc số tiền" aria-label="Mã hoặc số tiền giảm giá" />
              <button type="button">Áp dụng</button>
            </span>
          </label>

          <dl className="payment-summary">
            <div><dt>Tạm tính</dt><dd>{formatVnd(subtotal)}</dd></div>
            <div><dt>Giảm giá</dt><dd>—</dd></div>
            <div><dt>Thuế <span>8%</span></dt><dd>{formatVnd(tax)}</dd></div>
            <div className="payment-total"><dt>Tổng cộng</dt><dd>{formatVnd(total)}</dd></div>
          </dl>

          <button
            ref={checkoutRef}
            className="checkout-button"
            type="button"
            disabled={cart.length === 0}
            aria-keyshortcuts="Enter"
            onClick={handleCheckout}
          >
            <span><ReceiptText aria-hidden="true" /> Thanh toán</span>
            <strong>{formatVnd(total)}</strong>
          </button>
          <p className="checkout-hint">Nhấn <kbd>Enter</kbd> để tiếp tục thanh toán</p>
        </div>
      </aside>
    </div>
  )
}
