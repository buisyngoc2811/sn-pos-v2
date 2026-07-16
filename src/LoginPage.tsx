import { useEffect, useState, type FormEvent } from 'react'
import { BarChart3, Eye, EyeOff, PackageCheck, ShoppingBag } from 'lucide-react'
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
  const activeLogoUrl = storeLogoUrl || '/sn-pos-logo-master.png'
  const storeInitials = getStoreInitials(storeName)
  const features = [
    { icon: ShoppingBag, title: 'Bán hàng nhanh' },
    { icon: PackageCheck, title: 'Quản lý tồn kho' },
    { icon: BarChart3, title: 'Báo cáo trực quan' },
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
          <div className="login-glow login-glow-one" />
          <div className="login-glow login-glow-two" />
          <div className="login-glass-disc login-glass-disc-one" />
          <div className="login-glass-disc login-glass-disc-two" />
          <div className="login-glass-ribbon" />

          <div className="login-brand-content">
            <div className="login-brand-lockup">
              <div className="login-logo login-logo-light">
                {activeLogoUrl ? <img src={activeLogoUrl} alt="SN POS logo" /> : storeInitials}
              </div>
              <div>
                <p className="login-brand-name">SN POS</p>
                <p className="login-store-name">{storeName}</p>
              </div>
            </div>

            <div className="login-brand-copy">
              <h1 className="login-brand-heading">Quản lý bán hàng<br />thông minh, gọn gàng</h1>
              <p className="login-brand-description">
                Bán hàng, tồn kho, đơn hàng và báo cáo trong một nơi.
              </p>
            </div>

            <div className="login-feature-list">
              {features.map(({ icon: Icon, title }) => (
                <div key={title} className="login-feature-item">
                  <span><Icon aria-hidden="true" /></span>
                  <p>{title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-card">
            <div className="login-mobile-lockup">
              <div className="login-logo login-logo-pink">
                {activeLogoUrl ? <img src={activeLogoUrl} alt="SN POS logo" /> : storeInitials}
              </div>
              <span>SN POS</span>
            </div>

            <header className="login-header">
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
              SN POS V2 <span>·</span> Sy Ngoc
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}
