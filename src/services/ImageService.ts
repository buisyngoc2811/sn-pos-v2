import { supabase, handleServiceError } from '../utils/supabase'
import { STORAGE_BUCKETS, type StorageBucket } from './storageBuckets'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_CONVERTED_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PRODUCT_IMAGE_DIMENSION = 1200
const IMAGE_QUALITY = 0.82

export type ImageUploadStatus = 'processing' | 'uploading' | 'complete'
export type ImageUploadNotice = 'jpeg-fallback'

type DecodedImage = {
  source: CanvasImageSource
  width: number
  height: number
  dispose: () => void
}

function imageExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function isHeicFile(file: File): boolean {
  return ['image/heic', 'image/heif'].includes(file.type.toLowerCase()) || ['heic', 'heif'].includes(imageExtension(file))
}

function logProcessingFailure(file: File, stage: string, error: unknown) {
  if (!import.meta.env.DEV) return
  console.warn('Product image processing failed.', {
    name: file.name,
    type: file.type || '(missing)',
    size: file.size,
    stage,
    error: error instanceof Error ? error.message : String(error),
  })
}

export function validateProductImageFile(file: File): void {
  const type = file.type.toLowerCase()
  const hasKnownExtension = ALLOWED_IMAGE_EXTENSIONS.includes(imageExtension(file))
  // iPhone capture can report an empty or generic MIME type. The decoding step
  // remains the final validation for those files instead of rejecting them here.
  const isProvisionalMobileMime = !type || type === 'application/octet-stream' || type.startsWith('image/')
  if (!ALLOWED_IMAGE_TYPES.includes(type) && !hasKnownExtension && !isProvisionalMobileMime) {
    throw new Error('Chỉ chấp nhận ảnh JPG, JPEG, PNG, HEIC, HEIF hoặc WebP')
  }

  if (file.size <= 0) throw new Error('Tệp ảnh không hợp lệ hoặc đang trống')
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh sản phẩm tối đa là 15MB trước khi tối ưu')
}

function makeProcessedFileName(file: File, extension: 'webp' | 'jpg'): string {
  const baseName = file.name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'product-image'
  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${baseName}-${uniqueId}.${extension}`
}

async function decodeHeic(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import('heic2any')
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: IMAGE_QUALITY })
    const blob = Array.isArray(converted) ? converted[0] : converted
    if (!blob || blob.size === 0) throw new Error('HEIC decoder returned an empty image')
    return new File([blob], makeProcessedFileName(file, 'jpg'), { type: 'image/jpeg', lastModified: Date.now() })
  } catch (error) {
    logProcessingFailure(file, 'heic-decode', error)
    throw new Error('Không thể đọc ảnh HEIC/HEIF trên thiết bị này. Hãy thử chụp ảnh JPEG hoặc chọn ảnh khác.')
  }
}

async function loadWithImageBitmap(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap !== 'function') return null

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
  } catch (firstError) {
    logProcessingFailure(file, 'create-image-bitmap-oriented', firstError)
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
    } catch (secondError) {
      logProcessingFailure(file, 'create-image-bitmap', secondError)
      return null
    }
  }
}

function loadWithHtmlImage(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    const cleanup = () => URL.revokeObjectURL(objectUrl)

    image.onload = () => {
      cleanup()
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => undefined })
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('Browser image decoder could not read the file'))
    }
    image.src = objectUrl
  })
}

async function loadImage(file: File): Promise<DecodedImage> {
  const bitmap = await loadWithImageBitmap(file)
  if (bitmap) return bitmap
  return loadWithHtmlImage(file)
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const [header, encoded] = dataUrl.split(',')
  const mime = header.match(/^data:([^;]+);base64$/)?.[1]
  if (!mime || !encoded) return null
  try {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  if (typeof canvas.toBlob === 'function') {
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, IMAGE_QUALITY))
      if (blob) return blob
    } catch {
      // Older WebViews can expose toBlob but fail at runtime; use dataURL below.
    }
  }

  try {
    return dataUrlToBlob(canvas.toDataURL(type, IMAGE_QUALITY))
  } catch {
    return null
  }
}

async function processProductImage(file: File): Promise<{ file: File; usedJpegFallback: boolean }> {
  validateProductImageFile(file)
  const decoderFile = isHeicFile(file) ? await decodeHeic(file) : file

  let image: DecodedImage
  try {
    image = await loadImage(decoderFile)
  } catch (error) {
    logProcessingFailure(file, 'image-decode', error)
    throw new Error('Không thể đọc ảnh đã chọn. Hãy thử ảnh JPG, PNG, WebP hoặc HEIC/HEIF khác.')
  }

  try {
    if (!image.width || !image.height) throw new Error('Image dimensions are unavailable')
    const scale = Math.min(1, MAX_PRODUCT_IMAGE_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image.source, 0, 0, width, height)

    const webpBlob = await canvasToBlob(canvas, 'image/webp')
    if (webpBlob?.size && webpBlob.type === 'image/webp') {
      if (webpBlob.size > MAX_CONVERTED_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh sau khi tối ưu vẫn vượt quá 5MB. Vui lòng chọn ảnh có độ phân giải thấp hơn.')
      return {
        file: new File([webpBlob], makeProcessedFileName(file, 'webp'), { type: 'image/webp', lastModified: Date.now() }),
        usedJpegFallback: false,
      }
    }

    logProcessingFailure(file, 'webp-encode', new Error('Canvas does not support WebP encoding'))
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg')
    if (!jpegBlob?.size || jpegBlob.type !== 'image/jpeg') {
      throw new Error('Không thể tối ưu ảnh trên thiết bị này. Vui lòng thử ảnh khác.')
    }
    if (jpegBlob.size > MAX_CONVERTED_PRODUCT_IMAGE_BYTES) throw new Error('Ảnh sau khi tối ưu vẫn vượt quá 5MB. Vui lòng chọn ảnh có độ phân giải thấp hơn.')

    return {
      file: new File([jpegBlob], makeProcessedFileName(file, 'jpg'), { type: 'image/jpeg', lastModified: Date.now() }),
      usedJpegFallback: true,
    }
  } catch (error) {
    logProcessingFailure(file, 'canvas-process', error)
    throw error instanceof Error ? error : new Error('Không thể tối ưu ảnh. Vui lòng thử lại.')
  } finally {
    image.dispose()
  }
}

function handleImageStorageError(error: any): never {
  if (error?.message?.toLowerCase().includes('bucket not found')) {
    throw new Error('Chưa thiết lập kho lưu ảnh. Vui lòng chạy migration tạo Storage buckets rồi thử lại.')
  }
  handleServiceError(error)
}

export const ImageService = {
  async uploadImage(
    file: File,
    bucket: StorageBucket = STORAGE_BUCKETS.products,
    onStatus?: (status: ImageUploadStatus) => void,
    onNotice?: (notice: ImageUploadNotice) => void,
  ): Promise<string> {
    try {
      onStatus?.('processing')
      const processed = bucket === STORAGE_BUCKETS.products ? await processProductImage(file) : { file, usedJpegFallback: false }

      if (bucket !== STORAGE_BUCKETS.products) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Kích thước ảnh tối đa là 5MB')
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Chỉ chấp nhận định dạng JPEG, PNG và WebP')
      }

      if (processed.usedJpegFallback) onNotice?.('jpeg-fallback')
      onStatus?.('uploading')
      const { error } = await supabase.storage
        .from(bucket)
        .upload(processed.file.name, processed.file, { contentType: processed.file.type })

      if (error) handleImageStorageError(error)
      onStatus?.('complete')
      return processed.file.name
    } catch (error) {
      handleImageStorageError(error)
    }
  },

  async deleteImage(path: string, bucket: StorageBucket = STORAGE_BUCKETS.products): Promise<void> {
    if (!path) return
    try {
      const { error } = await supabase.storage.from(bucket).remove([path])
      if (error) handleImageStorageError(error)
    } catch (error) {
      handleImageStorageError(error)
    }
  },
}
