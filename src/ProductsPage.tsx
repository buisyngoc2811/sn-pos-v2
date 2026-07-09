import { useMemo, useState, useEffect } from 'react'
import {
  ChevronDown,
  Grid2X2,
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
import productSheet from './assets/boutique-products.webp'
import { ProductService, type Product, type ProductInput } from './services/ProductService'
import { formatVnd } from './utils/formatters'
import './ProductsPage.css'

const statuses = ['Tất cả trạng thái', 'Đang bán', 'Bản nháp', 'Đã lưu trữ']

function ProductThumb({ product, large = false }: { product: Product; large?: boolean }) {
  const style = product.imagePath
    ? { backgroundImage: `url(${product.imagePath})`, backgroundSize: 'cover' }
    : { backgroundImage: `url(${productSheet})`, backgroundPosition: product.position }

  return (
    <span
      className={large ? 'product-page-image large' : 'product-page-image'}
      style={style}
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
  onClose,
}: {
  mode: 'add' | 'edit'
  product?: Product
  categories: string[]
  onSave: (input: ProductInput) => Promise<void>
  onClose: () => void
}) {
  const isEdit = mode === 'edit'

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
          const file = form.get('image') as File
          await onSave({
            name: String(form.get('name')),
            category: String(form.get('category')),
            sku: String(form.get('sku')),
            price: Number(form.get('price')),
            stock: Number(form.get('stock')),
            status: String(form.get('status')) as ProductInput['status'],
            imageFile: file?.size > 0 ? file : null
          })
        }}>
          <div className="dialog-form-grid">
            <FormField label="Tên sản phẩm" wide>
              <input name="name" required defaultValue={product?.name} placeholder="Ví dụ: Áo cardigan len gân" autoFocus />
            </FormField>
            <FormSelect name="category" label="Danh mục" options={categories} defaultValue={product?.category ?? categories[0]} />
            <FormField label="SKU">
              <input name="sku" required defaultValue={product?.sku} placeholder="Ví dụ: KN-024" />
            </FormField>
            <FormField label="Giá">
              <span className="money-input"><i>₫</i><input name="price" type="number" inputMode="numeric" min="0" step="1000" defaultValue={product?.price} placeholder="0" /></span>
            </FormField>
            <FormField label="Tồn kho ban đầu">
              <input name="stock" type="number" inputMode="numeric" min="0" defaultValue={product?.stock ?? 0} />
            </FormField>
            <FormSelect name="status" label="Trạng thái" options={statuses.slice(1)} defaultValue={product?.status ?? 'Đang bán'} wide />
            <FormField label="Ảnh sản phẩm" wide>
              <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp" />
            </FormField>
          </div>
          <footer className="dialog-footer">
            <button className="dialog-cancel" type="button" onClick={onClose}>Hủy</button>
            <button className="dialog-submit" type="submit">{isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
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

  const filteredProduct = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return products.filter((product) =>
      (!normalized || product.name.toLowerCase().includes(normalized) || product.sku.toLowerCase().includes(normalized)) &&
      (category === 'Tất cả danh mục' || product.category === category) &&
      (status === 'Tất cả trạng thái' || product.status === status),
    )
  }, [category, products, query, status])

  const openDialog = (type: 'edit' | 'delete', product: Product) => {
    setSelectedProduct(product)
    setDialog(type)
  }

  const deleteProduct = async () => {
    if (selectedProduct) {
      try {
        await ProductService.delete(selectedProduct.id)
        setProducts((current) => current.filter((product) => product.id !== selectedProduct.id))
      } catch (e: any) {
        alert(e.message || 'Có lỗi xảy ra')
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
                    <td><div className="table-product"><ProductThumb product={product} /><span><strong>{product.name}</strong><small>{product.sku} · {product.variants}</small></span></div></td>
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
                  <div><span>{product.category}</span><h3>{product.name}</h3><small>{product.sku} · {product.variants}</small></div>
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
        onSave={async (input) => {
          try {
            if (dialog === 'edit' && selectedProduct) {
              await ProductService.update(selectedProduct.id, input)
            } else {
              await ProductService.create(input)
            }
            await loadProducts()
            setDialog(null)
            setSelectedProduct(null)
          } catch (e: any) {
            alert(e.message || 'Có lỗi xảy ra')
          }
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
