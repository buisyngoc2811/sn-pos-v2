import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export function handleServiceError(error: any): never {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.')
  }
  if (error?.code === 'PGRST116') {
    throw new Error('Không tìm thấy dữ liệu hoặc dữ liệu trống.')
  }
  if (error?.message) {
    throw new Error(error.message)
  }
  throw new Error('Có lỗi xảy ra, vui lòng thử lại sau.')
}
