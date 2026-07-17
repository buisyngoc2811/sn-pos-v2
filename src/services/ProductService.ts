import { supabase, handleServiceError } from '../utils/supabase'
import { ImageService, type ImageUploadNotice, type ImageUploadStatus } from './ImageService'
import { getStoragePublicUrl, STORAGE_BUCKETS } from './storageBuckets'

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
  short_description?: string | null
  description?: string | null
  imagePath?: string
  variantList: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    price_vnd: number
    stock_quantity: number
  }>
}

export type ProductInput = {
  name: string
  category: string
  status: ProductStatus
  short_description?: string | null
  description?: string | null
  imageFile?: File | null
  onImageUploadStatus?: (status: ImageUploadStatus) => void
  onImageUploadNotice?: (notice: ImageUploadNotice) => void
  variants: Array<{
    id?: string
    sku: string
    size: string | null
    color: string | null
    price: number
    stock: number
  }>
}

export type ProductDeleteResult = {
  mode: 'deleted' | 'archived'
  message?: string
}

type ProductRow = {
  id: string
  name: string
  short_description?: string | null
  description?: string | null
  status: 'active' | 'draft' | 'archived'
  image_path?: string | null
  categories: { name: string } | null
  product_variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
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

async function getCategoryId(category: string, allowInactive = false) {
  try {
    let query = supabase
      .from('categories')
      .select('id')
      .eq('name', category)

    if (!allowInactive) query = query.eq('is_active', true)

    const { data, error } = await query.single()

    if (error) handleServiceError(error)
    if (!data) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')
    return data.id as string
  } catch (e) {
    handleServiceError(e)
  }
}

export const ProductService = {
  async getAll(options: { includeArchived?: boolean } = {}): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('id, name, short_description, description, status, image_path, categories(name), product_variants(id, sku, size, color, price_vnd, stock_quantity)')
        .order('created_at')

      if (!options.includeArchived) {
        query = query.neq('status', 'archived')
      }

      const { data, error } = await query

      if (error) handleServiceError(error)

      return (data as unknown as ProductRow[]).map((row, index) => {
        const variants = row.product_variants ?? []
        const firstVariant = variants[0]

        return {
          id: row.id,
          name: row.name,
          short_description: row.short_description,
          description: row.description,
          category: row.categories?.name ?? '',
          sku: firstVariant?.sku ?? '',
          variants: `${variants.length} biến thể`,
          stock: variants.reduce((total, variant) => total + variant.stock_quantity, 0),
          price: firstVariant?.price_vnd ?? 0,
          status: statusToVietnamese[row.status],
          position: positions[index % positions.length],
          imagePath: getStoragePublicUrl(row.image_path, STORAGE_BUCKETS.products),
          variantList: variants.map(v => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, price_vnd: v.price_vnd, stock_quantity: v.stock_quantity }))
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
        .eq('is_active', true)
        .order('sort_order')

      if (error) handleServiceError(error)
      return (data || []).map((category) => category.name)
    } catch (e) {
      handleServiceError(e)
    }
  },

  async create(input: ProductInput) {
    if (!input.name?.trim()) throw new Error('Tên sản phẩm không được để trống')
    if (!input.variants?.length) throw new Error('Sản phẩm phải có ít nhất 1 biến thể')
    if (!input.category?.trim()) throw new Error('Danh mục không được để trống')

    try {
      const categoryId = await getCategoryId(input.category)
      let image_path = null
      
      if (input.imageFile) {
        image_path = await ImageService.uploadImage(input.imageFile, undefined, input.onImageUploadStatus, input.onImageUploadNotice)
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          category_id: categoryId,
          name: input.name,
          short_description: input.short_description?.trim() || null,
          description: input.description?.trim() || null,
          status: statusToDatabase[input.status],
          image_path,
        })
        .select('id')
        .single()

      if (productError) handleServiceError(productError)
      if (!product) throw new Error('Không nhận được dữ liệu phản hồi từ máy chủ')

      const variantsToInsert = input.variants.map(v => ({
        product_id: product.id,
        sku: v.sku,
        size: v.size || null,
        color: v.color || null,
        price_vnd: v.price,
        stock_quantity: v.stock,
      }))

      const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert)

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
    if (!input.variants?.length) throw new Error('Sản phẩm phải có ít nhất 1 biến thể')
    if (!input.category?.trim()) throw new Error('Danh mục không được để trống')

    try {
      const categoryId = await getCategoryId(input.category, true)
      
      let newImagePath = undefined
      if (input.imageFile) {
        newImagePath = await ImageService.uploadImage(input.imageFile, undefined, input.onImageUploadStatus, input.onImageUploadNotice)
      }

      // Get old image to delete later
      const { data: oldProduct } = await supabase.from('products').select('image_path').eq('id', id).single()

      const updateData: any = {
        category_id: categoryId,
        name: input.name,
        short_description: input.short_description?.trim() || null,
        description: input.description?.trim() || null,
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

      // Upsert variants
      const { data: existingVariants, error: variantLookupError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)

      if (variantLookupError) handleServiceError(variantLookupError)
      
      const existingIds = new Set((existingVariants || []).map(v => v.id))
      const inputIds = new Set(input.variants.map(v => v.id).filter(Boolean))

      const idsToDelete = [...existingIds].filter(id => !inputIds.has(id))
      
      if (idsToDelete.length > 0) {
        const { count, error: movementError } = await supabase
          .from('inventory_movements')
          .select('id', { count: 'exact', head: true })
          .in('product_variant_id', idsToDelete)

        if (movementError) handleServiceError(movementError)
        if ((count ?? 0) > 0) {
          throw new Error('Không thể xóa biến thể đã có lịch sử tồn kho. Hãy lưu trữ sản phẩm nếu không còn bán.')
        }

        const { error: deleteError } = await supabase.from('product_variants').delete().in('id', idsToDelete)
        if (deleteError) handleServiceError(deleteError)
      }

      for (const v of input.variants) {
        if (v.id) {
          const { error: updateVariantError } = await supabase
            .from('product_variants')
            .update({
              sku: v.sku,
              size: v.size || null,
              color: v.color || null,
              price_vnd: v.price,
              stock_quantity: v.stock,
            })
            .eq('id', v.id)
          if (updateVariantError) handleServiceError(updateVariantError)
        } else {
          const { error: insertVariantError } = await supabase
            .from('product_variants')
            .insert({
              product_id: id,
              sku: v.sku,
              size: v.size || null,
              color: v.color || null,
              price_vnd: v.price,
              stock_quantity: v.stock,
            })
          if (insertVariantError) handleServiceError(insertVariantError)
        }
      }
    } catch (e) {
      handleServiceError(e)
    }
  },

  async delete(id: string): Promise<ProductDeleteResult> {
    try {
      const { data: product, error: productLookupError } = await supabase
        .from('products')
        .select('image_path, product_variants(id)')
        .eq('id', id)
        .single()

      if (productLookupError) handleServiceError(productLookupError)
      if (!product) throw new Error('Không tìm thấy sản phẩm')

      const variantIds = (product.product_variants ?? []).map((variant) => variant.id)
      if (variantIds.length > 0) {
        const { count, error: movementError } = await supabase
          .from('inventory_movements')
          .select('id', { count: 'exact', head: true })
          .in('product_variant_id', variantIds)

        if (movementError) handleServiceError(movementError)

        if ((count ?? 0) > 0) {
          const { error: archiveError } = await supabase
            .from('products')
            .update({ status: 'archived' })
            .eq('id', id)

          if (archiveError) handleServiceError(archiveError)

          return {
            mode: 'archived',
            message: 'Sản phẩm đã có lịch sử tồn kho nên được lưu trữ thay vì xóa vĩnh viễn.',
          }
        }
      }

      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) handleServiceError(error)
      if (product.image_path) {
        await ImageService.deleteImage(product.image_path)
      }
      return { mode: 'deleted' }
    } catch (e) {
      handleServiceError(e)
    }
  },
}
