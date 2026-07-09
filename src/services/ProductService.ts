import { supabase, handleServiceError } from '../utils/supabase'
import { ImageService } from './ImageService'

export type ProductStatus = 'Đang bán' | 'Bản nháp' | 'Đã lưu trữ'

export type Product = {
  id: string
  name: string
  category: string
  sku: string
  variants: string
  stock: number
  price: number
  status: ProductStatus
  position: string
  imagePath?: string
}

export type ProductInput = {
  name: string
  category: string
  sku: string
  price: number
  stock: number
  status: ProductStatus
  imageFile?: File | null
}

type ProductRow = {
  id: string
  name: string
  status: 'active' | 'draft' | 'archived'
  image_path?: string | null
  categories: { name: string } | null
  product_variants: Array<{
    id: string
    sku: string
    price_vnd: number
    stock_quantity: number
  }>
}

const statusToVietnamese: Record<ProductRow['status'], ProductStatus> = {
  active: 'Đang bán',
  draft: 'Bản nháp',
  archived: 'Đã lưu trữ',
}

const statusToDatabase: Record<ProductStatus, ProductRow['status']> = {
  'Đang bán': 'active',
  'Bản nháp': 'draft',
  'Đã lưu trữ': 'archived',
}

const positions = ['0% 0%', '33.333% 0%', '66.666% 0%', '100% 0%', '0% 100%', '33.333% 100%', '66.666% 100%', '100% 100%']

async function getCategoryId(category: string) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('name', category)
      .single()

    if (error) handleServiceError(error)
    if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
    return data.id as string
  } catch (e) {
    handleServiceError(e)
  }
}

export const ProductService = {
  async getAll(): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, status, image_path, categories(name), product_variants(id, sku, price_vnd, stock_quantity)')
        .order('created_at')

      if (error) handleServiceError(error)

      return (data as unknown as ProductRow[]).map((row, index) => {
        const variants = row.product_variants ?? []
        const firstVariant = variants[0]

        return {
          id: row.id,
          name: row.name,
          category: row.categories?.name ?? '',
          sku: firstVariant?.sku ?? '',
          variants: `${variants.length} biến thể`,
          stock: variants.reduce((total, variant) => total + variant.stock_quantity, 0),
          price: firstVariant?.price_vnd ?? 0,
          status: statusToVietnamese[row.status],
          position: positions[index % positions.length],
          imagePath: row.image_path ? supabase.storage.from('products').getPublicUrl(row.image_path).data.publicUrl : undefined,
        }
      })
    } catch (e) {
      handleServiceError(e)
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('sort_order')

      if (error) handleServiceError(error)
      return (data || []).map((category) => category.name)
    } catch (e) {
      handleServiceError(e)
    }
  },

  async create(input: ProductInput) {
    if (!input.name?.trim()) throw new Error('Tên sản phẩm không được để trống')
    if (input.price < 0) throw new Error('Giá sản phẩm không hợp lệ')
    if (input.stock < 0) throw new Error('Số lượng tồn kho không hợp lệ')
    if (!input.category?.trim()) throw new Error('Danh mục không được để trống')

    try {
      const categoryId = await getCategoryId(input.category)
      let image_path = null
      
      if (input.imageFile) {
        image_path = await ImageService.uploadImage(input.imageFile)
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          category_id: categoryId,
          name: input.name,
          status: statusToDatabase[input.status],
          image_path,
        })
        .select('id')
        .single()

      if (productError) handleServiceError(productError)
      if (!product) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')

      const { error: variantError } = await supabase.from('product_variants').insert({
        product_id: product.id,
        sku: input.sku,
        price_vnd: input.price,
        stock_quantity: input.stock,
      })

      if (variantError) {
        await supabase.from('products').delete().eq('id', product.id)
        handleServiceError(variantError)
      }
    } catch (e) {
      handleServiceError(e)
    }
  },

  async update(id: string, input: ProductInput) {
    if (!input.name?.trim()) throw new Error('Tên sản phẩm không được để trống')
    if (input.price < 0) throw new Error('Giá sản phẩm không hợp lệ')
    if (input.stock < 0) throw new Error('Số lượng tồn kho không hợp lệ')
    if (!input.category?.trim()) throw new Error('Danh mục không được để trống')

    try {
      const categoryId = await getCategoryId(input.category)
      
      let newImagePath = undefined
      if (input.imageFile) {
        newImagePath = await ImageService.uploadImage(input.imageFile)
      }

      // Get old image to delete later
      const { data: oldProduct } = await supabase.from('products').select('image_path').eq('id', id).single()

      const updateData: any = {
        category_id: categoryId,
        name: input.name,
        status: statusToDatabase[input.status],
      }
      if (newImagePath) updateData.image_path = newImagePath

      const { error: productError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)

      if (productError) handleServiceError(productError)

      if (newImagePath && oldProduct?.image_path) {
        await ImageService.deleteImage(oldProduct.image_path)
      }

      const { data: variant, error: variantLookupError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)
        .order('created_at')
        .limit(1)
        .single()

      if (variantLookupError) handleServiceError(variantLookupError)
      if (!variant) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')

      const { error: variantError } = await supabase
        .from('product_variants')
        .update({
          sku: input.sku,
          price_vnd: input.price,
          stock_quantity: input.stock,
        })
        .eq('id', variant.id)

      if (variantError) handleServiceError(variantError)
    } catch (e) {
      handleServiceError(e)
    }
  },

  async delete(id: string) {
    try {
      const { data: oldProduct } = await supabase.from('products').select('image_path').eq('id', id).single()
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) handleServiceError(error)
      if (oldProduct?.image_path) {
        await ImageService.deleteImage(oldProduct.image_path)
      }
    } catch (e) {
      handleServiceError(e)
    }
  },
}
