import { useMemo, useState, useEffect, type ChangeEvent } from 'react'
import {
  Camera,
  ChevronDown,
  Grid2X2,
  ImagePlus,
  List,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { PageIntro, Pagination, SearchField } from './components/PageUI'
import { ConfirmationDialog, DialogSurface, OverlayBackdrop } from './components/OverlayBackdrop'
import { FilterSelect, FormField, FormSelect } from './components/FormControls'
import { PageSkeleton } from './components/PageStates'
import { ProductService, type Product, type ProductInput } from './services/ProductService'
import { validateProductImageFile, type ImageUploadStatus } from './services/ImageService'
import { formatVnd } from './utils/formatters'
import './ProductsPage.css'

const statuses = ['Tất cả trạng thái', 'Đang bán', 'Bản nháp', 'Đã lưu trữ']

const makeSku = (category: string) => {
  const categoryCode = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase() || 'SP'
  return `SN-${categoryCode}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

const formatPriceInput = (value: string | number | undefined) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : ''
}

const parsePriceInput = (value: string) => Number(value.replace(/\D/g, ''))

function ProductThumb({ product, large = false }: { product: Product; large?: boolean }) {
  return (
    <span
      className={`${large ? 'product-page-image large' : 'product-page-image'}${product.imagePath ? '' : ' is-empty'}`}
      style={product.imagePath ? { backgroundImage: `url(${product.imagePath})` } : undefined}
      role="img"
      aria-label={`Ảnh sản phẩm ${product.name}`}
    />
  )
}

function ProductDialog({
  mode,
  product,
  categories,
  onSave,
  onImageFallback,
  onClose,
}: {
  mode: 'add' | 'edit'
  product?: Product
  categories: string[]
  onSave: (input: ProductInput) => Promise<void>
  onImageFallback: () => void
  onClose: () => void
}) {
  const isEdit = mode === 'edit'
  const [saveError, setSaveError] = useState('')
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(product?.imagePath ?? '')
  const [imageUploadStatus, setImageUploadStatus] = useState<ImageUploadStatus | 'idle'>('idle')
  const [imageProcessingNotice, setImageProcessingNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const [variants, setVariants] = useState(
    product?.variantList?.length
      ? product.variantList.map(v => ({
          id: v.id,
          sku: v.sku,
          size: v.size || '',
          color: v.color || '',
          priceInput: formatPriceInput(v.price_vnd),
          stockInput: String(v.stock_quantity),
        }))
      : [{ id: Math.random().toString(36).substring(2, 9), sku: makeSku(categories[0] ?? 'SP'), size: '', color: '', priceInput: '', stockInput: '0' }]
  )

  useEffect(() => {
    if (isEdit) return
    setVariants((current) => {
      if (current.length !== 1 || current[0].sku.includes('-')) return current
      const next = [...current]
      next[0] = { ...next[0], sku: makeSku(category) }
      return next
    })
  }, [category, isEdit])

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateProductImageFile(file)
      setSaveError('')
      setImageProcessingNotice('')
    } catch (error) {
      event.target.value = ''
      setSaveError(error instanceof Error ? error.message : 'Không thể sử dụng ảnh này.')
      return
    }
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  return (
    <OverlayBackdrop className="dialog-backdrop" onClose={onClose}>
      <DialogSurface className="product-dialog" labelledBy="product-dialog-title">
        <header className="dialog-header">
          <div>
            <span>{isEdit ? 'Chi tiết sản phẩm' : 'Mẫu mới'}</span>
            <h2 id="product-dialog-title">{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
          </div>
          <button type="button" aria-label="Đóng hộp thoại" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <form onSubmit={async (event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          setSaveError('')
          setIsSaving(true)
          if (imageFile) setImageUploadStatus('processing')
          try {
            await onSave({
              name: String(form.get('name')),
              short_description: String(form.get('short_description') ?? '').trim() || null,
              description: product?.description ?? null,
              category,
              status: String(form.get('status')) as ProductInput['status'],
              imageFile,
              onImageUploadStatus: setImageUploadStatus,
              onImageUploadNotice: (notice) => {
                if (notice === 'jpeg-fallback') {
                  setImageProcessingNotice('Thiết bị không hỗ trợ WebP, ảnh đã được tối ưu và lưu dưới dạng JPEG.')
                  onImageFallback()
                }
              },
              variants: variants.map(v => ({
                id: v.id.includes('-') ? v.id : undefined,
                sku: v.sku,
                size: v.size.trim(),
                color: v.color.trim(),
                price: parsePriceInput(v.priceInput),
                stock: parseInt(v.stockInput, 10) || 0,
              }))
            })
          } catch (error: any) {
            setSaveError(error.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.')
          } finally {
            setIsSaving(false)
            setImageUploadStatus('idle')
          }
        }}>
          <div className="dialog-scroll-body">
            <div className="dialog-form-grid">
              <FormField label="Tên sản phẩm" wide>
                <input name="name" required defaultValue={product?.name} placeholder="Ví dụ: Áo cardigan len gân" autoFocus />
              </FormField>
              <FormField label="Mô tả sản phẩm" wide>
                <textarea name="short_description" defaultValue={product?.short_description ?? ''} rows={3} placeholder="VD: Yếm cổ, hở lưng, họa tiết caro đỏ, phong cách Pháp/Âu Mỹ" />
              </FormField>
              <FormSelect name="category" label="Danh mục" options={categories} value={category} onChange={(event) => setCategory(event.target.value)} />
              <FormSelect name="status" label="Trạng thái" options={statuses.slice(1)} defaultValue={product?.status ?? 'Đang bán'} />
              <div className="product-image-picker">
                <span>Ảnh sản phẩm</span>
                <div className={`product-image-preview${imagePreview ? '' : ' is-empty'}`}>
                  {imagePreview ? <img src={imagePreview} alt="Xem trước ảnh sản phẩm" /> : <ImagePlus aria-hidden="true" />}
                </div>
                <div className="product-image-actions">
                  <label className="product-image-capture"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={handleImageChange} disabled={isSaving} /><Camera aria-hidden="true" /> Chụp ảnh sản phẩm</label>
                  <label><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleImageChange} disabled={isSaving} /><ImagePlus aria-hidden="true" /> Chọn ảnh có sẵn</label>
                </div>
                {imageUploadStatus !== 'idle' && <p className="product-image-status" role="status">{imageUploadStatus === 'processing' ? 'Đang xử lý và tối ưu ảnh…' : imageUploadStatus === 'uploading' ? 'Đang tải ảnh lên…' : 'Đã tải ảnh lên.'}</p>}
                {imageProcessingNotice && <p className="product-image-status" role="status">{imageProcessingNotice}</p>}
              </div>
              <div className="variants-section">
                <div className="variants-section-header">
                  <span>Biến thể sản phẩm (Size, Màu)</span>
                  <button type="button" onClick={() => setVariants([...variants, { id: Math.random().toString(36).substring(2, 9), sku: makeSku(category), size: '', color: '', priceInput: '', stockInput: '0' }])}>
                    <Plus aria-hidden="true" /> Thêm biến thể
                  </button>
                </div>
                <div className="variants-list">
                  {variants.map((v, i) => (
                    <div key={v.id} className="variant-row">
                      <FormField label={i === 0 ? "Size" : "\u00A0"}>
                        <input value={v.size} onChange={e => {
                          const newVars = [...variants]; newVars[i].size = e.target.value; setVariants(newVars)
                        }} placeholder="Ví dụ: S, M" />
                      </FormField>
                      <FormField label={i === 0 ? "Màu sắc" : "\u00A0"}>
                        <input value={v.color} onChange={e => {
                          const newVars = [...variants]; newVars[i].color = e.target.value; setVariants(newVars)
                        }} placeholder="Ví dụ: Đỏ" />
                      </FormField>
                      <FormField label={i === 0 ? "SKU" : "\u00A0"}>
                        <input value={v.sku} onChange={e => {
                          const newVars = [...variants]; newVars[i].sku = e.target.value; setVariants(newVars)
                        }} placeholder="SKU" required />
                      </FormField>
                      <FormField label={i === 0 ? "Giá (₫)" : "\u00A0"}>
                        <input type="text" inputMode="numeric" value={v.priceInput} onChange={e => {
                          const newVars = [...variants]; newVars[i].priceInput = formatPriceInput(e.target.value); setVariants(newVars)
                        }} placeholder="0" required />
                      </FormField>
                      <FormField label={i === 0 ? "Tồn kho" : "\u00A0"}>
                        <input type="number" inputMode="numeric" min="0" value={v.stockInput} onChange={e => {
                          const newVars = [...variants]; newVars[i].stockInput = e.target.value; setVariants(newVars)
                        }} required />
                      </FormField>
                      <button type="button" className="variant-row-delete" style={{ alignSelf: i === 0 ? 'flex-end' : 'center' }} onClick={() => {
                        if (variants.length > 1) {
                          setVariants(variants.filter((_, idx) => idx !== i))
                        } else {
                          alert('Phải có ít nhất 1 biến thể')
                        }
                      }}>
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {saveError && <p className="dialog-error" role="alert">{saveError}</p>}
          </div>
          <footer className="dialog-footer">
            <button className="dialog-cancel" type="button" onClick={onClose}>Hủy</button>
            <button className="dialog-submit" type="submit" disabled={isSaving}>{isSaving ? (imageFile ? 'Đang lưu ảnh…' : 'Đang lưu…') : isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
          </footer>
        </form>
      </DialogSurface>
    </OverlayBackdrop>
  )
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadProducts = async () => {
    try {
      setLoading(true)
      const [productData, categoryData] = await Promise.all([
        ProductService.getAll(),
        ProductService.getCategories(),
      ])
      setProducts(productData)
      setCategories(categoryData)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  const [view, setView] = useState<'list' | 'grid'>('list')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tất cả danh mục')
  const [status, setStatus] = useState('Tất cả trạng thái')
  const [dialog, setDialog] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [productMessage, setProductMessage] = useState('')

  const filteredProduct = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const includesQuery = (value?: string | null) => Boolean(value?.toLowerCase().includes(normalized))
    return products.filter((product) =>
      (!normalized || includesQuery(product.name) || includesQuery(product.sku) || product.variantList.some((variant) => includesQuery(variant.sku)) || includesQuery(product.short_description) || includesQuery(product.description)) &&
      (category === 'Tất cả danh mục' || product.category === category) &&
      (status === 'Tất cả trạng thái' ? product.status !== 'Đã lưu trữ' : product.status === status),
    )
  }, [category, products, query, status])

  const openDialog = (type: 'edit' | 'delete', product: Product) => {
    setSelectedProduct(product)
    setDialog(type)
  }

  const deleteProduct = async () => {
    if (selectedProduct) {
      try {
        const result = await ProductService.delete(selectedProduct.id)
        if (result.mode === 'archived') {
          setProducts((current) => current.map((product) => product.id === selectedProduct.id ? { ...product, status: 'Đã lưu trữ' } : product))
          setProductMessage(result.message ?? 'Sản phẩm đã được lưu trữ.')
        } else {
          setProducts((current) => current.filter((product) => product.id !== selectedProduct.id))
          setProductMessage('Sản phẩm đã được xóa.')
        }
      } catch (e: any) {
        setProductMessage(e.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.')
      }
    }
    setDialog(null)
    setSelectedProduct(null)
  }

  if (error) throw error
  if (loading) return <PageSkeleton />

  return (
    <div className="products-page">
      <PageIntro
        kicker="Danh mục sản phẩm"
        title="Sản phẩm"
        description="Quản lý mẫu mã, giá bán và tình trạng sản phẩm."
        action={<button className="add-product-button" type="button" onClick={() => setDialog('add')}>
          <Plus aria-hidden="true" /> Thêm sản phẩm
        </button>}
      />
      {productMessage && <p className="products-toast" role="status">{productMessage}</p>}

      <section className="products-stats" aria-label="Tổng hợp sản phẩm">
        <div><span>Tất cả sản phẩm</span><strong>{products.length}</strong><small>Trong 4 danh mục</small></div>
        <div><span>Đang bán</span><strong>{products.filter((product) => product.status === 'Đang bán').length}</strong><small>Hiển thị khi thanh toán</small></div>
        <div><span>Sắp hết hàng</span><strong>{products.filter((product) => product.stock > 0 && product.stock <= 5).length}</strong><small>Cần xử lý</small></div>
        <div><span>Hết hàng</span><strong>{products.filter((product) => product.stock === 0).length}</strong><small>Không thể bán</small></div>
      </section>

      <section className="products-panel">
        <header className="products-toolbar">
          <SearchField
            label="Tìm sản phẩm"
            placeholder="Tìm sản phẩm hoặc SKU"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
          <div className="product-filters">
            <FilterSelect label="Danh mục" value={category} options={['Tất cả danh mục', ...categories]} onChange={(event) => setCategory(event.target.value)} icon={<ChevronDown aria-hidden="true" />} />
            <FilterSelect label="Trạng thái" value={status} options={statuses} onChange={(event) => setStatus(event.target.value)} icon={<SlidersHorizontal aria-hidden="true" />} />
            <div className="view-toggle" aria-label="Kiểu hiển thị sản phẩm">
              <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="Dạng danh sách" aria-pressed={view === 'list'}><List /></button>
              <button type="button" className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="Dạng lưới" aria-pressed={view === 'grid'}><Grid2X2 /></button>
            </div>
          </div>
        </header>

        {filteredProduct.length > 0 ? view === 'list' ? (
          <div className="products-table-wrap">
            <table className="products-table">
              <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>
                {filteredProduct.map((product) => (
                  <tr key={product.id}>
                    <td><div className="table-product"><ProductThumb product={product} /><span><strong>{product.name}</strong>{product.short_description && <p className="product-short-description">{product.short_description}</p>}<small>{product.sku} · {product.variants}</small></span></div></td>
                    <td>{product.category}</td>
                    <td><strong>{formatVnd(product.price)}</strong></td>
                    <td><span className={`stock-indicator ${product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : ''}`}><i />{product.stock === 0 ? 'Hết hàng' : `${product.stock} sản phẩm`}</span></td>
                    <td><span className={`product-status ${product.status.toLowerCase()}`}>{product.status}</span></td>
                    <td><div className="row-actions"><button type="button" aria-label={`Sửa ${product.name}`} onClick={() => openDialog('edit', product)}><Pencil /></button><button type="button" aria-label={`Xóa ${product.name}`} onClick={() => openDialog('delete', product)}><Trash2 /></button><button type="button" aria-label={`Thao tác khác cho ${product.name}`}><MoreHorizontal /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProduct.map((product) => (
              <article className="product-manage-card" key={product.id}>
                <div className="manage-image-wrap"><ProductThumb product={product} large /><span className={`product-status ${product.status.toLowerCase()}`}>{product.status}</span></div>
                <div className="manage-card-body">
                  <div><span>{product.category}</span><h3>{product.name}</h3>{product.short_description && <p className="product-short-description">{product.short_description}</p>}<small>{product.sku} · {product.variants}</small></div>
                  <div className="manage-price-row"><strong>{formatVnd(product.price)}</strong><span className={`stock-indicator ${product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : ''}`}><i />{product.stock === 0 ? 'Hết hàng' : `${product.stock} sản phẩm`}</span></div>
                  <div className="manage-card-actions"><button type="button" onClick={() => openDialog('edit', product)}><Pencil /> Sửa</button><button type="button" aria-label={`Xóa ${product.name}`} onClick={() => openDialog('delete', product)}><Trash2 /></button></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="products-empty" role="status"><PackagePlus /><strong>Không tìm thấy sản phẩm</strong><p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p><button type="button" onClick={() => { setQuery(''); setCategory('Tất cả danh mục'); setStatus('Tất cả trạng thái') }}>Xóa bộ lọc</button></div>
        )}

        <Pagination
          label="Các trang sản phẩm"
          summary={<>Đang hiển thị {filteredProduct.length} trên {products.length} sản phẩm</>}
          page={page}
          onPageChange={setPage}
        />
      </section>

      {(dialog === 'add' || dialog === 'edit') && <ProductDialog
        mode={dialog}
        product={selectedProduct ?? undefined}
        categories={categories}
        onImageFallback={() => setProductMessage('Thiết bị không hỗ trợ WebP; ảnh đã được tối ưu và lưu dưới dạng JPEG.')}
        onSave={async (input) => {
          if (dialog === 'edit' && selectedProduct) {
            await ProductService.update(selectedProduct.id, input)
          } else {
            await ProductService.create(input)
          }
          await loadProducts()
          setDialog(null)
          setSelectedProduct(null)
        }}
        onClose={() => setDialog(null)}
      />}
      {dialog === 'delete' && selectedProduct && (
        <ConfirmationDialog
          backdropClassName="dialog-backdrop"
          className="delete-dialog"
          title="Xóa sản phẩm?"
          titleId="delete-title"
          description={<>“{selectedProduct.name}” sẽ bị xóa khỏi danh mục. Thao tác này không thể hoàn tác.</>}
          descriptionId="delete-description"
          icon={<span className="delete-icon"><Trash2 aria-hidden="true" /></span>}
          cancelLabel="Hủy"
          confirmLabel="Xóa sản phẩm"
          onCancel={() => setDialog(null)}
          onConfirm={deleteProduct}
        />
      )}
    </div>
  )
}
