import { supabase, handleServiceError } from '../utils/supabase'
import { STORAGE_BUCKETS, type StorageBucket } from './storageBuckets'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_CONVERTED_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PRODUCT_IMAGE_DIMENSION = 1200
const WEBP_QUALITY = 0.82

export function validateProductImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WebP')
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('Ảnh sản phẩm tối đa là 15MB trước khi tối ưu')
  }
}

function makeWebpFileName(file: File): string {
  const baseName = file.name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product-image'

  return `${baseName}-${crypto.randomUUID()}.webp`
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Không thể đọc tệp ảnh đã chọn'))
    }
    image.src = objectUrl
  })
}

async function convertProductImageToWebp(file: File): Promise<File> {
  validateProductImageFile(file)

  let image: HTMLImageElement
  try {
    image = await loadImage(file)
  } catch {
    throw new Error('Không thể đọc ảnh để tối ưu. Vui lòng chọn một ảnh JPG, PNG hoặc WebP hợp lệ.')
  }

  const sourceWidth = image.naturalWidth
  const sourceHeight = image.naturalHeight
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Không thể xác định kích thước ảnh để tối ưu.')
  }

  const scale = Math.min(1, MAX_PRODUCT_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Trình duyệt không hỗ trợ tối ưu ảnh bằng canvas.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  const webpBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
  })

  if (!webpBlob || webpBlob.type !== 'image/webp') {
    throw new Error('Không thể chuyển đổi ảnh sang WebP. Vui lòng thử lại bằng trình duyệt khác.')
  }

  if (webpBlob.size > MAX_CONVERTED_PRODUCT_IMAGE_BYTES) {
    throw new Error('Ảnh sau khi tối ưu vẫn vượt quá 5MB. Vui lòng chọn ảnh có độ phân giải thấp hơn.')
  }

  return new File([webpBlob], makeWebpFileName(file), { type: 'image/webp', lastModified: Date.now() })
}

function handleImageStorageError(error: any): never {
  if (error?.message?.toLowerCase().includes('bucket not found')) {
    throw new Error('Chưa thiết lập kho lưu ảnh. Vui lòng chạy migration tạo Storage buckets rồi thử lại.')
  }
  handleServiceError(error)
}

export const ImageService = {
  async uploadImage(file: File, bucket: StorageBucket = STORAGE_BUCKETS.products): Promise<string> {
    try {
      const uploadFile = bucket === STORAGE_BUCKETS.products
        ? await convertProductImageToWebp(file)
        : file

      if (bucket !== STORAGE_BUCKETS.products) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Kích thước ảnh tối đa là 5MB')
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Chỉ chấp nhận định dạng JPEG, PNG và WebP')
      }

      const { error } = await supabase.storage
        .from(bucket)
        .upload(uploadFile.name, uploadFile, { contentType: uploadFile.type })

      if (error) handleImageStorageError(error)

      return uploadFile.name
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
