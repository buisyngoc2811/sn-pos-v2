import { useEffect, useState, type FormEvent } from 'react'
import { BarChart3, Check, Eye, EyeOff, PackageCheck, ShoppingBag } from 'lucide-react'
import { supabase } from './utils/supabase'
import { SettingsService, type StoreSettings } from './services/SettingsService'
import './LoginPage.css'

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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const storeName = settings?.store_name?.trim() || 'NAHÉLLA'
  const storeLogoUrl = settings?.store_logo_path ? SettingsService.getStoreAssetUrl(settings.store_logo_path) : ''
  const storeInitials = getStoreInitials(storeName)
  const features = [
    { icon: ShoppingBag, title: 'Bán hàng nhanh', text: 'Thanh toán gọn trong vài thao tác.' },
    { icon: PackageCheck, title: 'Quản lý tồn kho', text: 'Theo dõi từng sản phẩm rõ ràng.' },
    { icon: BarChart3, title: 'Báo cáo tức thời', text: 'Nắm doanh thu ngay khi cần.' },
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
    <div className="login-page">
      <main className="login-shell">
        <section className="login-brand-panel">
          <div className="login-brand-gradient" />
          <div className="login-orb login-orb-left" />
          <div className="login-orb login-orb-top" />
          <div className="login-orb login-orb-bottom" />
          <div className="login-brand-tile" />

          <div className="login-brand-content">
            <div className="login-brand-lockup">
              <div className="login-logo login-logo-light">
                {storeLogoUrl ? <img src={storeLogoUrl} alt={`${storeName} logo`} /> : storeInitials}
              </div>
              <div>
                <p className="login-brand-name">SN POS</p>
                <p className="login-store-name">{storeName}</p>
              </div>
            </div>

            <div className="login-brand-copy">
              <p className="login-brand-eyebrow">Fashion retail workspace</p>
              <h1 className="login-brand-heading">
                Quản lý bán hàng<br />gọn, nhanh và chính xác
              </h1>
              <p className="login-brand-description">
                Tất cả công việc bán hàng, tồn kho, đơn hàng và báo cáo của cửa hàng trong một nơi thật trực quan.
              </p>

              <div className="login-features">
                {features.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="login-feature">
                    <Icon aria-hidden="true" />
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="login-brand-note">
              <span><Check aria-hidden="true" /></span>
              Thiết kế cho nhịp làm việc của cửa hàng thời trang.
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-card">
            <div className="login-mobile-lockup">
              <div className="login-logo login-logo-pink">
                {storeLogoUrl ? <img src={storeLogoUrl} alt={`${storeName} logo`} /> : storeInitials}
              </div>
              <span>SN POS</span>
            </div>

            <header className="login-header">
              <p>Đăng nhập an toàn</p>
              <h2>Chào mừng trở lại</h2>
              <span>Đăng nhập để tiếp tục quản lý cửa hàng</span>
            </header>

            {error && (
              <div role="alert" className="login-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <label className="login-field" htmlFor="login-email">
                <span>Email</span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="login-input"
                  placeholder="email@cuahang.com"
                />
              </label>

              <label className="login-field" htmlFor="login-password">
                <span>Mật khẩu</span>
                <span className="login-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="login-input"
                    placeholder="Nhập mật khẩu"
                  />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="login-password-toggle" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <div className="login-options">
                <label className="login-remember">
                  <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                  <span className="login-remember-short">Ghi nhớ</span><span className="login-remember-full">Ghi nhớ đăng nhập</span>
                </label>
                <a href="#forgot-password" className="login-forgot-link">Quên mật khẩu?</a>
              </div>

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            <footer className="login-footer">
              SN POS V2 <span>•</span> Developed by Sy Ngoc
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}
