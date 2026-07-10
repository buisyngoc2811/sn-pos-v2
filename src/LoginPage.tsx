import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './utils/supabase'
import { SettingsService, type StoreSettings } from './services/SettingsService'

function getStoreInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SN'
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const storeName = settings?.store_name?.trim() || 'NAHÉLLA'
  const storeLogoUrl = settings?.store_logo_path ? SettingsService.getStoreAssetUrl(settings.store_logo_path) : ''
  const storeInitials = getStoreInitials(storeName)
  const highlights = [
    { label: 'Thanh toán', value: 'Nhanh', detail: 'Tối ưu thao tác bán hàng tại quầy' },
    { label: 'Tồn kho', value: 'Rõ ràng', detail: 'Theo dõi sản phẩm và biến thể dễ quét' },
    { label: 'Doanh thu', value: 'Tức thời', detail: 'Nắm số liệu quan trọng mỗi ngày' },
  ]

  useEffect(() => {
    SettingsService.getSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
  }, [])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#100d10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(236,72,153,0.16),transparent_30%),radial-gradient(circle_at_84%_72%,rgba(255,255,255,0.06),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <main className="relative z-10 flex min-h-svh items-start justify-center px-4 py-4 sm:px-6 sm:py-6 lg:min-h-screen lg:items-center lg:px-8 lg:py-8">
        <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,0.94fr)] lg:items-stretch">
          <section className="relative order-2 hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-7 lg:order-1 lg:block lg:min-h-[600px]">
            <div className="pointer-events-none absolute right-6 top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/10 text-sm font-bold text-white shadow-lg shadow-black/20">
                    {storeLogoUrl ? <img className="h-full w-full object-cover" src={storeLogoUrl} alt="" /> : storeInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">SN POS</p>
                    <p className="text-xs text-white/55">{storeName}</p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-[#ff9cc2]">
                  Premium Boutique POS
                </span>
              </div>

              <div className="my-10 max-w-2xl lg:my-auto">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff9cc2]">Boutique Fashion Point of Sale</p>
                <h1 className="mt-4 max-w-xl text-[2.35rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-5xl">
                  Quản lý boutique thời trang gọn, nhanh và sang.
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-white/64">
                  SN POS gom bán hàng, tồn kho và doanh thu vào một màn hình làm việc tinh gọn cho cửa hàng thời trang hiện đại.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {highlights.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-black/16 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-200 hover:border-primary/30 hover:bg-white/[0.065]"
                    >
                      <p className="text-[11px] font-medium text-white/46">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold tracking-tight text-white">{item.value}</p>
                      <p className="mt-2 text-xs leading-5 text-white/52">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/46">
                <span>Developed by Sy Ngoc</span>
                <span>Version 2.0.0</span>
              </div>
            </div>
          </section>

          <section className="order-1 flex items-stretch lg:order-2">
            <div className="flex w-full flex-col justify-start rounded-[24px] border border-white/10 bg-[#171216]/88 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:rounded-[28px] sm:p-7 lg:min-h-[600px] lg:justify-between">
              <div className="mb-5 flex items-center justify-between gap-4 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {storeLogoUrl ? <img className="h-full w-full object-cover" src={storeLogoUrl} alt="" /> : storeInitials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{storeName}</p>
                    <p className="text-xs text-white/48">SN POS V2</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[11px] text-white/52">
                  v2.0.0
                </span>
              </div>

              <div>
                <div className="mb-5 sm:mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff9cc2]">Secure access</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Đăng nhập hệ thống</h2>
                  <p className="mt-2 text-sm leading-6 text-white/56">Truy cập bảng điều khiển bán hàng của bạn</p>
                </div>
                
                {error && (
                  <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-3 sm:gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-white/70">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-white/12 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-white/32 hover:border-white/18 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="admin@example.com"
                    />
                  </label>
                  
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-white/70">Mật khẩu</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-white/12 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-white/32 hover:border-white/18 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="••••••••"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition duration-200 hover:bg-primary/90 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-60"
                  >
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                  </button>
                </form>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-white/42 sm:mt-8 sm:pt-5">
                SN POS V2 • Developed by Sy Ngoc
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden px-4 text-center text-[11px] text-white/34 sm:block">
        © 2026 Sy Ngoc. All rights reserved.
      </footer>
    </div>
  )
}
