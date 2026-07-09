import { supabase, handleServiceError } from '../utils/supabase'

export const ImageService = {
  async uploadImage(file: File): Promise<string> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Kích thước ảnh tối đa là 5MB')
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Chỉ chấp nhận định dạng JPEG, PNG và WebP')
    }

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`

      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, file)

      if (error) handleServiceError(error)

      return fileName
    } catch (e) {
      handleServiceError(e)
    }
  },

  async deleteImage(path: string): Promise<void> {
    if (!path) return
    try {
      const { error } = await supabase.storage
        .from('products')
        .remove([path])

      if (error) handleServiceError(error)
    } catch (e) {
      handleServiceError(e)
    }
  }
}
