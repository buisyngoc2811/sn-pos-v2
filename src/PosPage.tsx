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
import { PageSkeleton } from './components/PageStates'
import {
  type PosCartItem,
  type PosPaymentMethod,
  type PosProduct,
  type PosProductVariant,
  PosService,
} from './services/PosService'
import { SettingsService, type StoreSettings } from './services/SettingsService'
import { CustomerService, type PosCustomer } from './services/CustomerService'
import { DialogSurface, OverlayBackdrop } from './components/OverlayBackdrop'
import { formatDate, formatTime, formatVnd } from './utils/formatters'
import './PosPage.css'

type ReceiptData = {
  orderNumber: string
  completedAt: string
  cart: PosCartItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PosPaymentMethod
}

const escapeReceiptHtml = (value: string | number) =>
  String(value).replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }

    return entities[character]
  })

const paymentOptions: Array<{ value: PosPaymentMethod; label: string }> = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'card', label: 'Thẻ' },
  { value: 'bank_transfer_qr', label: 'Chuyển khoản / QR' },
]

const missingBankValue = 'Chưa thiết lập'
const posCartStorageKey = 'sn-pos-v2:pos-cart'

type PersistedPosCart = {
  cart: PosCartItem[]
  discountInput: string
  appliedDiscount: { type: 'none' | 'fixed' | 'percent', value: number }
}

const emptyDiscount: PersistedPosCart['appliedDiscount'] = { type: 'none', value: 0 }

const readPersistedCart = (): PersistedPosCart => {
  if (typeof window === 'undefined') {
    return { cart: [], discountInput: '', appliedDiscount: emptyDiscount }
  }

  try {
    const raw = window.sessionStorage.getItem(posCartStorageKey)
    if (!raw) return { cart: [], discountInput: '', appliedDiscount: emptyDiscount }

    const parsed = JSON.parse(raw) as Partial<PersistedPosCart>
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      discountInput: typeof parsed.discountInput === 'string' ? parsed.discountInput : '',
      appliedDiscount: parsed.appliedDiscount?.type ? parsed.appliedDiscount : emptyDiscount,
    }
  } catch {
    return { cart: [], discountInput: '', appliedDiscount: emptyDiscount }
  }
}

const writePersistedCart = (payload: PersistedPosCart) => {
  if (typeof window === 'undefined') return

  if (payload.cart.length === 0) {
    window.sessionStorage.removeItem(posCartStorageKey)
    return
  }

  window.sessionStorage.setItem(posCartStorageKey, JSON.stringify(payload))
}

const getVietQrBankCode = (bankName: string) => {
  const normalized = bankName.trim().toLowerCase()
  if (/^\d+$/.test(normalized)) return normalized
  if (['mb', 'mb bank', 'mbbank', 'military bank'].includes(normalized)) return '970422'
  return bankName.trim()
}

const formatVariantSummary = (variants: PosProductVariant[]) => {
  const sizes = [...new Set(variants.map((variant) => variant.size).filter(Boolean))]
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))]
  return [sizes.join(', '), colors.join(', ')].filter(Boolean).join(' • ')
}

function ProductImage({ product, compact = false }: { product: { name: string; imagePath?: string }; compact?: boolean }) {
  return (
    <span
      className={`${compact ? 'cart-product-image' : 'product-image'}${product.imagePath ? '' : ' is-empty'}`}
      style={product.imagePath ? { backgroundImage: `url(${product.imagePath})` } : undefined}
      role="img"
      aria-label={`Ảnh sản phẩm ${product.name}`}
    />
  )
}

export function PosPage() {
  const persistedCart = useMemo(readPersistedCart, [])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tất cả')
  const [currentPage, setCurrentPage] = useState(1)
  const [cart, setCart] = useState<PosCartItem[]>(persistedCart.cart)
  const [categories, setCategories] = useState<string[]>(['Tất cả'])
  const [products, setProducts] = useState<PosProduct[]>([])
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isQrPaymentOpen, setIsQrPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash')
  const [transferReceived, setTransferReceived] = useState(false)
  const [transferNote, setTransferNote] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null)
  const [isCustomerOpen, setIsCustomerOpen] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([])
  const [newCustomerName, setNewCustomerName] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [isSavingCustomer, setIsSavingCustomer] = useState(false)
  const [discountInput, setDiscountInput] = useState(persistedCart.discountInput)
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: 'none' | 'fixed' | 'percent', value: number }>(persistedCart.appliedDiscount)
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<PosProduct | null>(null)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
  const [showMobileCartFeedback, setShowMobileCartFeedback] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const checkoutRef = useRef<HTMLButtonElement>(null)

  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      PosService.getCategories(),
      PosService.getProducts(),
      SettingsService.getSettings(),
    ])
      .then(([cats, prods, settings]) => {
        setCategories(cats)
        setProducts(prods)
        setStoreSettings(settings)
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

  useEffect(() => {
    if (!isCustomerOpen) return

    let isActive = true
    CustomerService.searchForPos(customerQuery)
      .then((customers) => {
        if (isActive) setCustomerResults(customers)
      })
      .catch((e: any) => {
        if (isActive) setCustomerMessage(e.message || 'Không thể tìm khách hàng lúc này.')
      })

    return () => {
      isActive = false
    }
  }, [customerQuery, isCustomerOpen])

  const visibleItemsAll = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const includesQuery = (value?: string | null) => Boolean(value?.toLowerCase().includes(normalizedQuery))
    return products.filter((product) => {
      const matchesCategory = category === 'Tất cả' || product.category === category
      const matchesQuery = !normalizedQuery || includesQuery(product.name) || product.variants.some((variant) => includesQuery(variant.sku)) || includesQuery(product.short_description) || includesQuery(product.description)
      return matchesCategory && matchesQuery
    })
  }, [category, query, products])

  const itemsPerPage = 8
  const totalPages = Math.ceil(visibleItemsAll.length / itemsPerPage)
  const visibleItems = visibleItemsAll.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [category, query])

  useEffect(() => {
    if (cart.length === 0) setIsMobileCartOpen(false)
  }, [cart.length])

  useEffect(() => {
    if (!showMobileCartFeedback) return

    const timeout = window.setTimeout(() => setShowMobileCartFeedback(false), 1200)
    return () => window.clearTimeout(timeout)
  }, [showMobileCartFeedback])

  useEffect(() => {
    writePersistedCart({ cart, discountInput, appliedDiscount })
  }, [appliedDiscount, cart, discountInput])

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  
  let discountVnd = 0
  if (appliedDiscount.type === 'fixed') {
    discountVnd = appliedDiscount.value
  } else if (appliedDiscount.type === 'percent') {
    discountVnd = subtotal * (appliedDiscount.value / 100)
  }
  if (discountVnd > subtotal) {
    discountVnd = subtotal
  }

  const taxRate = storeSettings?.tax_rate ?? 0
  const tax = (subtotal - discountVnd) * (taxRate / 100)
  const total = subtotal - discountVnd + tax
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0)
  const bankName = storeSettings?.bank_name ?? ''
  const bankAccountNumber = storeSettings?.bank_account_number ?? ''
  const bankAccountHolder = storeSettings?.bank_account_holder ?? ''
  const transferNotePrefix = storeSettings?.transfer_note_prefix ?? ''
  const isBankInfoMissing = !bankName.trim() || !bankAccountNumber.trim() || !bankAccountHolder.trim()
  const normalizedCustomerPhone = customerQuery.replace(/\D/g, '')
  const canCreateCustomer = normalizedCustomerPhone.length >= 9 && !customerResults.some((customer) => customer.phone.replace(/\D/g, '') === normalizedCustomerPhone)
  const vietQrImageUrl = useMemo(() => {
    if (isBankInfoMissing || !transferNote.trim()) return ''
    const bankCode = getVietQrBankCode(bankName)
    const params = new URLSearchParams({
      amount: String(Math.round(total)),
      addInfo: transferNote.trim(),
      accountName: bankAccountHolder.trim(),
    })
    return `https://api.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(bankAccountNumber.trim())}-compact2.png?${params.toString()}`
  }, [bankAccountHolder, bankAccountNumber, bankName, isBankInfoMissing, total, transferNote])

  const printReceipt = () => {
    if (!receipt) return

    const printWindow = window.open('', 'sn-pos-thermal-receipt', 'popup=yes,width=420,height=700')
    if (!printWindow) {
      window.alert('Không thể mở cửa sổ in. Vui lòng cho phép cửa sổ bật lên rồi thử lại.')
      return
    }

    const [datePart, timePart = ''] = receipt.completedAt.split('T')
    const paymentLabel = paymentOptions.find((option) => option.value === receipt.paymentMethod)?.label ?? '—'
    const receiptRows = receipt.cart.map((item) => `
      <div class="receipt-item">
        <strong>${escapeReceiptHtml(item.name)}</strong>
        <span class="receipt-quantity">${escapeReceiptHtml(item.quantity)}</span>
        <span class="receipt-unit-price">${escapeReceiptHtml(formatVnd(item.price))}</span>
        <span class="receipt-amount">${escapeReceiptHtml(formatVnd(item.price * item.quantity))}</span>
      </div>
    `).join('')

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hóa đơn #${escapeReceiptHtml(receipt.orderNumber)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        width: 80mm;
        min-width: 80mm;
        min-height: 0;
        margin: 0;
        padding: 0;
        background: #fff;
        color: #111;
      }
      body { font: 11px/1.4 Arial, Helvetica, sans-serif; }
      .receipt {
        width: 80mm;
        max-width: 80mm;
        min-height: 0;
        margin: 0;
        padding: 4mm;
        background: #fff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .receipt-header { padding: 0 0 2.5mm; border-bottom: 1px dashed #9a9a9a; text-align: center; }
      .store-name { display: block; font-size: 15px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; }
      .receipt-header h1 { margin: 1.5mm 0 .5mm; font-size: 12px; }
      .receipt-header p, .receipt-header small { display: block; margin: 0; color: #3f3f3f; }
      .receipt-meta, .receipt-summary { display: grid; gap: 1mm; margin: 2.5mm 0; }
      .receipt-meta { padding-bottom: 2.5mm; border-bottom: 1px dashed #9a9a9a; }
      .receipt-meta div, .receipt-summary div { display: flex; justify-content: space-between; gap: 3mm; }
      .receipt-meta dd, .receipt-summary dd { margin: 0; text-align: right; font-weight: 700; }
      .receipt-items { margin: 0; padding: 0 0 2.5mm; border-bottom: 1px dashed #9a9a9a; }
      .receipt-item {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 7mm 15mm 18mm;
        gap: 1.2mm;
        align-items: start;
        padding: 1.1mm 0;
        border-bottom: 1px dotted #b4b4b4;
      }
      .receipt-item:last-child { border-bottom: 0; }
      .receipt-item strong { min-width: 0; overflow-wrap: anywhere; font-weight: 700; }
      .receipt-item span { text-align: right; white-space: nowrap; }
      .receipt-item-head { padding-top: 0; font-size: 9px; font-weight: 800; text-transform: uppercase; }
      .receipt-item-head span:first-child { text-align: left; }
      .receipt-summary { padding-top: 0; }
      .receipt-total { margin-top: 1mm; padding-top: 1.5mm; border-top: 1px dashed #777; font-size: 12px; font-weight: 800; }
      .receipt-total dd { font-size: 13px; }
      .receipt-footer { margin: 3mm 0 0; padding-top: 2.5mm; border-top: 1px dashed #9a9a9a; text-align: center; font-weight: 600; }
      @media print {
        html, body { width: 80mm; min-width: 80mm; margin: 0; padding: 0; }
        .receipt { width: 80mm; max-width: 80mm; margin: 0; padding: 4mm; }
      }
      @media print and (max-width: 58mm) {
        @page { size: 58mm auto; }
        html, body, .receipt { width: 58mm; min-width: 58mm; max-width: 58mm; }
        .receipt { padding: 3mm; }
        .receipt-item { grid-template-columns: minmax(0, 1fr) 7mm 18mm; }
        .receipt-unit-price { display: none; }
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="receipt-header">
        <strong class="store-name">${escapeReceiptHtml(storeSettings?.store_name ?? 'SN Store')}</strong>
        <h1>Thanh toán thành công</h1>
        <p>Đơn hàng #${escapeReceiptHtml(receipt.orderNumber)}</p>
        <small>${escapeReceiptHtml(formatDate(datePart))} · ${escapeReceiptHtml(formatTime(timePart.substring(0, 5)))}</small>
      </header>
      <dl class="receipt-meta">
        <div><dt>Mã đơn</dt><dd>#${escapeReceiptHtml(receipt.orderNumber)}</dd></div>
        <div><dt>Thu ngân</dt><dd>SN POS</dd></div>
        <div><dt>Thanh toán</dt><dd>${escapeReceiptHtml(paymentLabel)}</dd></div>
      </dl>
      <section class="receipt-items" aria-label="Sản phẩm đã bán">
        <div class="receipt-item receipt-item-head"><span>Sản phẩm</span><span>SL</span><span class="receipt-unit-price">Đơn giá</span><span>Thành tiền</span></div>
        ${receiptRows}
      </section>
      <dl class="receipt-summary">
        <div><dt>Tạm tính</dt><dd>${escapeReceiptHtml(formatVnd(receipt.subtotal))}</dd></div>
        <div><dt>Giảm giá</dt><dd>${escapeReceiptHtml(receipt.discount > 0 ? `-${formatVnd(receipt.discount)}` : '—')}</dd></div>
        <div><dt>Thuế ${escapeReceiptHtml(taxRate)}%</dt><dd>${escapeReceiptHtml(formatVnd(receipt.tax))}</dd></div>
        <div class="receipt-total"><dt>Tổng cộng</dt><dd>${escapeReceiptHtml(formatVnd(receipt.total))}</dd></div>
      </dl>
      <p class="receipt-footer">Cảm ơn quý khách và hẹn gặp lại.</p>
    </main>
    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () { window.print(); }, 50);
      });
      window.addEventListener('afterprint', function () {
        window.setTimeout(function () { window.close(); }, 0);
      });
    </script>
  </body>
</html>`)
    printWindow.document.close()
  }

  const applyDiscount = () => {
    const val = discountInput.trim()
    if (!val) {
      setAppliedDiscount({ type: 'none', value: 0 })
      return
    }
    
    if (val.endsWith('%')) {
      const num = parseFloat(val.slice(0, -1))
      if (isNaN(num) || num < 0) {
        alert('Giảm giá phần trăm không hợp lệ.')
        return
      }
      if (num > 100) {
        alert('Giảm giá không được vượt quá 100%.')
        return
      }
      setAppliedDiscount({ type: 'percent', value: num })
    } else {
      const num = parseInt(val.replace(/\D/g, ''), 10)
      if (isNaN(num) || num < 0) {
        alert('Số tiền giảm giá không hợp lệ.')
        return
      }
      if (num > subtotal) {
        alert('Giảm giá không được vượt quá tạm tính.')
        return
      }
      setAppliedDiscount({ type: 'fixed', value: num })
    }
  }

  const addToCart = (product: PosProduct) => {
    const totalStock = product.variants.reduce((total, v) => total + v.stock, 0)
    if (totalStock <= 0) return

    if (product.variants.length === 1) {
      addVariantToCart(product, product.variants[0])
    } else {
      setVariantSelectorProduct(product)
    }
  }

  const addVariantToCart = (product: PosProduct, variant: PosProductVariant) => {
    if (variant.stock <= 0) return

    setCart((current) => {
      const existing = current.find((item) => item.id === variant.id)
      if (existing) {
        return current.map((item) =>
          item.id === variant.id
            ? { ...item, quantity: Math.min(item.quantity + 1, variant.stock) }
            : item,
        )
      }
      return [...current, { 
        ...variant, 
        productId: product.id,
        name: product.name,
        category: product.category,
        imagePath: product.imagePath,
        quantity: 1 
      }]
    })
    setVariantSelectorProduct(null)
    if (window.matchMedia('(max-width: 899px)').matches) {
      setShowMobileCartFeedback(true)
    }
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

  const clearCart = () => {
    setCart([])
    setDiscountInput('')
    setAppliedDiscount(emptyDiscount)
    writePersistedCart({ cart: [], discountInput: '', appliedDiscount: emptyDiscount })
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    const prefix = transferNotePrefix.trim() || 'SN'
    setTransferNote(`${prefix} ${Date.now()}`)
    setPaymentMethod('cash')
    setTransferReceived(false)
    setIsMobileCartOpen(false)
    setIsPaymentOpen(true)
    setIsQrPaymentOpen(false)
  }

  const confirmCheckout = async () => {
    if (cart.length === 0) return
    if (paymentMethod === 'bank_transfer_qr' && !transferReceived) return
    setIsCheckingOut(true)
    try {
      const result = await PosService.checkout(cart, subtotal, discountVnd, tax, total, paymentMethod, selectedCustomer?.id)
      if (result) {
        setReceipt({
          orderNumber: result.orderNumber,
          completedAt: result.completedAt,
          cart: [...cart],
          subtotal,
          discount: discountVnd,
          tax,
          total,
          paymentMethod
        })
        setIsPaymentOpen(false)
        setIsQrPaymentOpen(false)
        clearCart()
        const prods = await PosService.getProducts()
        setProducts(prods)
      }
    } catch (e: any) {
      alert(e.message || 'Thanh toán thất bại')
    } finally {
      setIsCheckingOut(false)
    }
  }

  const choosePaymentMethod = (method: PosPaymentMethod) => {
    setPaymentMethod(method)
    setTransferReceived(false)
    if (method === 'bank_transfer_qr') {
      setIsPaymentOpen(false)
      setIsQrPaymentOpen(true)
    }
  }

  const openCustomerModal = () => {
    setCustomerQuery(selectedCustomer?.phone || '')
    setNewCustomerName('')
    setCustomerMessage('')
    setIsCustomerOpen(true)
  }

  const createCustomer = async () => {
    if (!normalizedCustomerPhone || !newCustomerName.trim()) {
      setCustomerMessage('Vui lòng nhập tên khách hàng.')
      return
    }

    setIsSavingCustomer(true)
    setCustomerMessage('')
    try {
      const customer = await CustomerService.create({
        name: newCustomerName.trim(),
        phone: customerQuery.trim(),
      })
      const nextCustomer = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone ?? '',
      }
      setSelectedCustomer(nextCustomer)
      setIsCustomerOpen(false)
      setCustomerQuery('')
      setNewCustomerName('')
    } catch (e: any) {
      setCustomerMessage(e.message || 'Không thể tạo khách hàng. Vui lòng thử lại.')
    } finally {
      setIsSavingCustomer(false)
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

  const renderCartContent = (mode: 'desktop' | 'mobile') => (
    <>
      <header className="cart-header">
        <div>
          <span className="cart-eyebrow">Đơn hàng hiện tại</span>
          <h2 id={mode === 'desktop' ? 'cart-title' : 'mobile-cart-title'}>Giỏ hàng <span>{itemCount}</span></h2>
        </div>
        <button
          type="button"
          className="clear-cart"
          disabled={cart.length === 0}
          onClick={clearCart}
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
                <div className="cart-item-info">
                  <strong>{item.name}</strong>
                  <small>{item.sku} · {[item.size, item.color].filter(Boolean).join(' · ')}</small>
                  <strong className="cart-item-price">{formatVnd(item.price)}</strong>
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
            <span className="empty-cart-icon" aria-hidden="true">
              <ShoppingBag size={26} />
            </span>
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
            <input
              type="text"
              placeholder="Mã hoặc số tiền"
              aria-label="Mã hoặc số tiền giảm giá"
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyDiscount()}
            />
            <button type="button" onClick={applyDiscount}>Áp dụng</button>
          </span>
        </label>

        <dl className="payment-summary">
          <div><dt>Tạm tính</dt><dd>{formatVnd(subtotal)}</dd></div>
          <div><dt>Giảm giá</dt><dd>{discountVnd > 0 ? `-${formatVnd(discountVnd)}` : '—'}</dd></div>
          <div><dt>Thuế <span>{taxRate}%</span></dt><dd>{formatVnd(tax)}</dd></div>
          <div className="payment-total"><dt>Tổng cộng</dt><dd>{formatVnd(total)}</dd></div>
        </dl>

        <button
          ref={mode === 'desktop' ? checkoutRef : undefined}
          className="checkout-button"
          type="button"
          disabled={cart.length === 0}
          aria-keyshortcuts={mode === 'desktop' ? 'Enter' : undefined}
          onClick={handleCheckout}
        >
          <span><ReceiptText aria-hidden="true" /> Thanh toán</span>
          <strong>{formatVnd(total)}</strong>
        </button>
        {mode === 'desktop' && <p className="checkout-hint">Nhấn <kbd>Enter</kbd> để tiếp tục thanh toán</p>}
      </div>
    </>
  )

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
          <button className="customer-button" type="button" onClick={openCustomerModal}>
            <UserRound aria-hidden="true" />
            {selectedCustomer ? selectedCustomer.name : 'Thêm khách hàng'}
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
          <>
            <div className="product-grid">
              {visibleItems.map((product) => {
                const totalStock = product.variants.reduce((total, v) => total + v.stock, 0)
                const price = product.variants[0]?.price ?? 0
                const variantSummary = formatVariantSummary(product.variants)
                return (
                  <article
                    className={`product-card ${totalStock <= 0 ? 'out-of-stock' : ''}`}
                    key={product.id}
                    tabIndex={totalStock > 0 ? 0 : undefined}
                    aria-disabled={totalStock <= 0}
                    onClick={() => addToCart(product)}
                    onKeyDown={(event) => {
                      if (totalStock <= 0) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        addToCart(product)
                      }
                    }}
                  >
                    <ProductImage product={product} />
                    <span className="product-details">
                      <span className="product-category">{product.category}</span>
                      <strong>{product.name}</strong>
                      {product.short_description && <span className="pos-product-description">{product.short_description}</span>}
                      <span className="product-selling-meta">
                        {variantSummary && <span className="product-variant-summary">{variantSummary}</span>}
                        <span className={`stock-pill ${totalStock <= 0 ? 'out' : ''}`}>{totalStock > 0 ? `Còn ${totalStock}` : 'Hết hàng'}</span>
                      </span>
                      <span className="product-bottom">
                        <b>{formatVnd(price)}</b>
                        <button
                          className="add-product"
                          type="button"
                          disabled={totalStock <= 0}
                          onClick={(event) => {
                            event.stopPropagation()
                            addToCart(product)
                          }}
                          aria-label={`Thêm ${product.name}, giá ${formatVnd(price)}, vào giỏ hàng`}
                        >
                          <Plus aria-hidden="true" />
                        </button>
                      </span>
                    </span>
                  </article>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="pos-pagination">
                <button 
                  type="button" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    className={currentPage === page ? 'is-active' : ''}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  type="button" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </>
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
        {renderCartContent('desktop')}
      </aside>

      {cart.length > 0 && (
        <div className={`mobile-cart-bar ${showMobileCartFeedback ? 'is-confirming' : ''}`} role="region" aria-label="Giỏ hàng hiện tại">
          <button type="button" onClick={() => setIsMobileCartOpen(true)}>
            <span>{showMobileCartFeedback ? 'Đã thêm vào giỏ' : `Giỏ hàng • ${itemCount} sản phẩm • ${formatVnd(total)}`}</span>
            <strong>Mở giỏ</strong>
          </button>
        </div>
      )}

      {isMobileCartOpen && (
        <OverlayBackdrop className="mobile-cart-backdrop" onClose={() => setIsMobileCartOpen(false)}>
          <DialogSurface className="mobile-cart-sheet" labelledBy="mobile-cart-title" as="aside">
            <button className="mobile-cart-grip" type="button" aria-label="Đóng giỏ hàng" onClick={() => setIsMobileCartOpen(false)} />
            {renderCartContent('mobile')}
          </DialogSurface>
        </OverlayBackdrop>
      )}

      {isCustomerOpen && (
        <OverlayBackdrop className="receipt-backdrop" onClose={() => !isSavingCustomer && setIsCustomerOpen(false)}>
          <DialogSurface className="receipt-modal customer-modal" labelledBy="customer-title">
            <div className="receipt-content">
              <header className="receipt-header">
                <UserRound aria-hidden="true" />
                <h2 id="customer-title">Khách hàng</h2>
                <p>{selectedCustomer ? selectedCustomer.name : 'Khách lẻ'}</p>
              </header>

              <label className="customer-search-field">
                <span>Tìm theo SĐT hoặc tên</span>
                <input
                  type="search"
                  value={customerQuery}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value)
                    setCustomerMessage('')
                  }}
                  placeholder="Nhập số điện thoại hoặc tên"
                />
              </label>

              <div className="customer-results">
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setIsCustomerOpen(false)
                    }}
                  >
                    <strong>{customer.name}</strong>
                    <span>{customer.phone || 'Chưa có SĐT'}</span>
                  </button>
                ))}
              </div>

              {canCreateCustomer && (
                <div className="customer-create-box">
                  <strong>Tạo khách mới với SĐT này</strong>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    placeholder="Tên khách hàng"
                  />
                  <button type="button" disabled={isSavingCustomer} onClick={createCustomer}>
                    {isSavingCustomer ? 'Đang tạo...' : 'Tạo và chọn khách'}
                  </button>
                </div>
              )}

              {customerMessage && <p className="customer-message">{customerMessage}</p>}
            </div>

            <footer className="receipt-actions">
              <button type="button" className="receipt-secondary-button" disabled={isSavingCustomer} onClick={() => {
                setSelectedCustomer(null)
                setIsCustomerOpen(false)
              }}>
                Bỏ qua - Khách lẻ
              </button>
              <button type="button" className="receipt-close" disabled={isSavingCustomer} onClick={() => setIsCustomerOpen(false)}>
                Đóng
              </button>
            </footer>
          </DialogSurface>
        </OverlayBackdrop>
      )}

      {isPaymentOpen && (
        <OverlayBackdrop className="receipt-backdrop" onClose={() => !isCheckingOut && setIsPaymentOpen(false)}>
          <DialogSurface className="receipt-modal payment-modal" labelledBy="payment-title">
            <div className="receipt-content">
              <header className="receipt-header">
                <ReceiptText aria-hidden="true" />
                <h2 id="payment-title">Xác nhận thanh toán</h2>
                <p>{formatVnd(total)}</p>
              </header>

              <fieldset className="payment-methods">
                <legend>Phương thức thanh toán</legend>
                {paymentOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={() => choosePaymentMethod(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            </div>

            <footer className="receipt-actions">
              <button type="button" className="receipt-new" disabled={isCheckingOut || paymentMethod === 'bank_transfer_qr'} onClick={confirmCheckout}>
                {isCheckingOut ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
              </button>
              <button type="button" className="receipt-close" disabled={isCheckingOut} onClick={() => setIsPaymentOpen(false)}>
                Hủy
              </button>
            </footer>
          </DialogSurface>
        </OverlayBackdrop>
      )}

      {isQrPaymentOpen && (
        <OverlayBackdrop className="receipt-backdrop" onClose={() => !isCheckingOut && setIsQrPaymentOpen(false)}>
          <DialogSurface className="receipt-modal payment-modal qr-payment-modal" labelledBy="qr-payment-title">
            <div className="receipt-content">
              <header className="receipt-header">
                <ReceiptText aria-hidden="true" />
                <h2 id="qr-payment-title">Quét mã chuyển khoản</h2>
                <p>{formatVnd(total)}</p>
              </header>

              <section className="bank-transfer-panel" aria-labelledby="bank-transfer-title">
                <h3 id="bank-transfer-title">Thông tin chuyển khoản</h3>
                {isBankInfoMissing && (
                  <p>Chưa có đủ thông tin ngân hàng. Vui lòng cập nhật trong Cài đặt trước khi nhận chuyển khoản.</p>
                )}
                {vietQrImageUrl && (
                  <img src={vietQrImageUrl} alt="QR chuyển khoản" />
                )}
                <dl>
                  <div><dt>Số tiền</dt><dd>{formatVnd(total)}</dd></div>
                  <div><dt>Ngân hàng</dt><dd>{bankName || missingBankValue}</dd></div>
                  <div><dt>Số tài khoản</dt><dd>{bankAccountNumber || missingBankValue}</dd></div>
                  <div><dt>Chủ tài khoản</dt><dd>{bankAccountHolder || missingBankValue}</dd></div>
                  <div><dt>Nội dung CK</dt><dd>{transferNote}</dd></div>
                </dl>
                <button
                  type="button"
                  className={transferReceived ? 'is-confirmed' : ''}
                  disabled={isBankInfoMissing}
                  onClick={() => setTransferReceived(true)}
                >
                  {transferReceived ? 'Đã xác nhận nhận tiền' : 'Đã nhận tiền'}
                </button>
              </section>
            </div>

            <footer className="receipt-actions">
              <button type="button" className="receipt-new" disabled={isCheckingOut || isBankInfoMissing || !transferReceived} onClick={confirmCheckout}>
                {isCheckingOut ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
              </button>
              <button type="button" className="receipt-close" disabled={isCheckingOut} onClick={() => setIsQrPaymentOpen(false)}>
                Hủy
              </button>
            </footer>
          </DialogSurface>
        </OverlayBackdrop>
      )}

      {variantSelectorProduct && (
        <OverlayBackdrop className="dialog-backdrop" onClose={() => setVariantSelectorProduct(null)}>
          <DialogSurface className="delete-dialog" labelledBy="variant-dialog-title">
            <header className="dialog-header">
              <div>
                <span>Chọn phân loại</span>
                <h2 id="variant-dialog-title">{variantSelectorProduct.name}</h2>
              </div>
              <button type="button" aria-label="Đóng hộp thoại" onClick={() => setVariantSelectorProduct(null)}><X aria-hidden="true" /></button>
            </header>
            <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
              {variantSelectorProduct.variants.map(v => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => addVariantToCart(variantSelectorProduct, v)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px',
                    border: '1px solid var(--border)', background: 'var(--card)', cursor: v.stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: v.stock > 0 ? 1 : 0.5, textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--foreground)' }}>{[v.size, v.color].filter(Boolean).join(' · ') || 'Mặc định'}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{v.sku} · {v.stock} sản phẩm</span>
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--accent-foreground)' }}>{formatVnd(v.price)}</strong>
                </button>
              ))}
            </div>
          </DialogSurface>
        </OverlayBackdrop>
      )}

      {receipt && (
        <OverlayBackdrop className="receipt-backdrop" onClose={() => setReceipt(null)}>
          <DialogSurface className="receipt-modal receipt-print-modal receipt-print receipt-print-area" labelledBy="receipt-title">
            <div className="receipt-content receipt-print-content">
              <header className="receipt-header receipt-print-header">
                <ReceiptText aria-hidden="true" />
                <strong className="receipt-store-name">{storeSettings?.store_name ?? 'SN Store'}</strong>
                <span className="receipt-store-subtitle">Boutique POS Receipt</span>
                <h2 id="receipt-title">Thanh toán thành công</h2>
                <p>Đơn hàng #{receipt.orderNumber}</p>
                <small>{formatDate(receipt.completedAt.split('T')[0])} · {formatTime(receipt.completedAt.split('T')[1].substring(0, 5))}</small>
              </header>

              <dl className="receipt-meta">
                <div><dt>Mã đơn</dt><dd>#{receipt.orderNumber}</dd></div>
                <div><dt>Thời gian</dt><dd>{formatDate(receipt.completedAt.split('T')[0])} {formatTime(receipt.completedAt.split('T')[1].substring(0, 5))}</dd></div>
                <div><dt>Thu ngân</dt><dd>SN POS</dd></div>
                <div><dt>Thanh toán</dt><dd>{paymentOptions.find((option) => option.value === receipt.paymentMethod)?.label}</dd></div>
              </dl>

              <div className="receipt-items" role="table" aria-label="Sản phẩm đã bán">
                <div className="receipt-item receipt-item-head" role="row">
                  <span role="columnheader">Sản phẩm</span>
                  <span role="columnheader">SL</span>
                  <span role="columnheader">Đơn giá</span>
                  <span role="columnheader">Thành tiền</span>
                </div>
                {receipt.cart.map((item, index) => (
                  <div key={index} className="receipt-item" role="row">
                    <strong role="cell">{item.name}</strong>
                    <span role="cell">{item.quantity}</span>
                    <span role="cell">{formatVnd(item.price)}</span>
                    <span role="cell">{formatVnd(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <dl className="receipt-summary">
                <div><dt>Tạm tính</dt><dd>{formatVnd(receipt.subtotal)}</dd></div>
                <div><dt>Giảm giá</dt><dd>{receipt.discount > 0 ? `-${formatVnd(receipt.discount)}` : '—'}</dd></div>
                <div><dt>Thuế {taxRate}%</dt><dd>{formatVnd(receipt.tax)}</dd></div>
                <div className="receipt-total"><dt>Tổng cộng</dt><dd>{formatVnd(receipt.total)}</dd></div>
              </dl>

              <p className="receipt-thank-you">Cảm ơn quý khách và hẹn gặp lại.</p>
            </div>
            
            <footer className="receipt-actions print-hidden">
              <button type="button" className="receipt-print-button" onClick={printReceipt}>
                In hóa đơn
              </button>
              <button type="button" className="receipt-new" onClick={() => setReceipt(null)}>
                Đơn mới
              </button>
              <button type="button" className="receipt-close" onClick={() => setReceipt(null)}>
                Đóng
              </button>
            </footer>
          </DialogSurface>
        </OverlayBackdrop>
      )}
    </div>
  )
}
