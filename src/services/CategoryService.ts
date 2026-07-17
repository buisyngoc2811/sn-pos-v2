import { handleServiceError, supabase } from '../utils/supabase'

export type ProductCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_active: boolean
  productCount: number
}

type CategoryRow = Omit<ProductCategory, 'productCount'> & {
  products?: Array<{ count: number }> | null
}

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ')

const slugify = (value: string) => normalizeName(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'danh-muc'

const mapCategory = (row: CategoryRow): ProductCategory => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  sort_order: row.sort_order,
  is_active: row.is_active,
  productCount: row.products?.[0]?.count ?? 0,
})

const friendlyCategoryError = (error: unknown): never => {
  if ((error as { code?: string })?.code === '23505') {
    throw new Error('Tên hoặc đường dẫn danh mục này đã tồn tại. Vui lòng dùng tên khác.')
  }
  handleServiceError(error)
}

export const CategoryService = {
  async getAll(): Promise<ProductCategory[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, sort_order, is_active, products(count)')
        .order('sort_order')
        .order('name')

      if (error) handleServiceError(error)
      return ((data ?? []) as unknown as CategoryRow[]).map(mapCategory)
    } catch (error) {
      handleServiceError(error)
    }
  },

  async create(name: string, description?: string): Promise<ProductCategory> {
    const cleanName = normalizeName(name)
    if (!cleanName) throw new Error('Tên danh mục không được để trống.')

    try {
      const { data: lastCategory, error: orderError } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (orderError) handleServiceError(orderError)

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: cleanName,
          slug: slugify(cleanName),
          description: normalizeName(description ?? '') || null,
          sort_order: (lastCategory?.sort_order ?? 0) + 1,
          is_active: true,
        })
        .select('id, name, slug, description, sort_order, is_active, products(count)')
        .single()

      if (error) friendlyCategoryError(error)
      return mapCategory(data as unknown as CategoryRow)
    } catch (error) {
      return friendlyCategoryError(error)
    }
  },

  async rename(id: string, name: string, description?: string): Promise<void> {
    const cleanName = normalizeName(name)
    if (!cleanName) throw new Error('Tên danh mục không được để trống.')
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: cleanName, slug: slugify(cleanName), description: normalizeName(description ?? '') || null })
        .eq('id', id)
      if (error) friendlyCategoryError(error)
    } catch (error) {
      friendlyCategoryError(error)
    }
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', id)
      if (error) handleServiceError(error)
    } catch (error) {
      handleServiceError(error)
    }
  },

  async delete(category: ProductCategory): Promise<void> {
    if (category.productCount > 0) {
      throw new Error(`Không thể xóa “${category.name}” vì đang có ${category.productCount} sản phẩm sử dụng danh mục này.`)
    }
    try {
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', category.id)
      if (countError) handleServiceError(countError)
      if ((count ?? 0) > 0) throw new Error(`Không thể xóa “${category.name}” vì danh mục vừa được sử dụng bởi một sản phẩm.`)

      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) handleServiceError(error)
    } catch (error) {
      handleServiceError(error)
    }
  },
}
