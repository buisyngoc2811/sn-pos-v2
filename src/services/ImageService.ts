import { supabase, handleServiceError } from '../utils/supabase'
import { STORAGE_BUCKETS, type StorageBucket } from './storageBuckets'

function handleImageStorageError(error: any): never {
  if (error?.message?.toLowerCase().includes('bucket not found')) {
    throw new Error('Chưa thiết lập kho lưu ảnh. Vui lòng chạy migration tạo Storage buckets rồi thử lại.')
  }
  handleServiceError(error)
}

export const ImageService = {
  async uploadImage(file: File, bucket: StorageBucket = STORAGE_BUCKETS.products): Promise<string> {
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
        .from(bucket)
        .upload(fileName, file)

      if (error) handleImageStorageError(error)

      return fileName
    } catch (e) {
      handleImageStorageError(e)
    }
  },

  async deleteImage(path: string, bucket: StorageBucket = STORAGE_BUCKETS.products): Promise<void> {
    if (!path) return
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) handleImageStorageError(error)
    } catch (e) {
      handleImageStorageError(e)
    }
  }
}
