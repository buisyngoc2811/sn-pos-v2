import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, BadgeCheck, Landmark, Moon, ReceiptText, ShieldAlert, Store, Upload } from 'lucide-react'
import { DialogSurface, OverlayBackdrop } from './components/OverlayBackdrop'
import { PageSkeleton } from './components/PageStates'
import { PageIntro } from './components/PageUI'
import { ImageService } from './services/ImageService'
import { SettingsService, type StoreSettings } from './services/SettingsService'
import { STORAGE_BUCKETS } from './services/storageBuckets'
import { SystemDataService } from './services/SystemDataService'

type BankSettingsForm = Pick<
  StoreSettings,
  'bank_name' | 'bank_account_number' | 'bank_account_holder' | 'transfer_note_prefix'
>

type StoreSettingsForm = Pick<
  StoreSettings,
  'store_name' | 'store_logo_path' | 'tax_rate'
>

const getVietQrBankCode = (bankName: string) => {
  const normalized = bankName.trim().toLowerCase()
  if (/^\d+$/.test(normalized)) return normalized
  if (['mb', 'mb bank', 'mbbank', 'military bank'].includes(normalized)) return '970422'
  return bankName.trim()
}

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [storeForm, setStoreForm] = useState<StoreSettingsForm>({
    store_name: '',
    store_logo_path: '',
    tax_rate: 0,
  })
  const [bankForm, setBankForm] = useState<BankSettingsForm>({
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    transfer_note_prefix: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isStoreSaving, setIsStoreSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const [isStoreOwner, setIsStoreOwner] = useState(false)
  const [isOwnerLoading, setIsOwnerLoading] = useState(true)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [resetAcknowledged, setResetAcknowledged] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  useEffect(() => {
    SettingsService.getSettings()
      .then((data) => {
        if (!data) {
          setError(new Error('Chưa có dữ liệu cài đặt cửa hàng. Vui lòng tạo bản ghi store_settings trước.'))
          return
        }
        setSettings(data)
        setStoreForm({
          store_name: data.store_name ?? '',
          store_logo_path: data.store_logo_path ?? '',
          tax_rate: data.tax_rate ?? 0,
        })
        setBankForm({
          bank_name: data.bank_name ?? '',
          bank_account_number: data.bank_account_number ?? '',
          bank_account_holder: data.bank_account_holder ?? '',
          transfer_note_prefix: data.transfer_note_prefix ?? '',
        })
      })
      .catch(setError)
  }, [])

  useEffect(() => {
    SystemDataService.isStoreOwner()
      .then(setIsStoreOwner)
      .finally(() => setIsOwnerLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  const storedLogoUrl = SettingsService.getStoreAssetUrl(storeForm.store_logo_path)
  const activeLogoUrl = logoPreviewUrl || storedLogoUrl
  const hasBankInfo = Boolean(bankForm.bank_name.trim() && bankForm.bank_account_number.trim() && bankForm.bank_account_holder.trim())
  const qrPreviewUrl = useMemo(() => {
    if (!hasBankInfo) return ''
    const params = new URLSearchParams({
      amount: '250000',
      addInfo: `${bankForm.transfer_note_prefix.trim() || 'SN'} DEMO`,
      accountName: bankForm.bank_account_holder.trim(),
    })
    return `https://api.vietqr.io/image/${encodeURIComponent(getVietQrBankCode(bankForm.bank_name))}-${encodeURIComponent(bankForm.bank_account_number.trim())}-compact2.png?${params.toString()}`
  }, [bankForm, hasBankInfo])

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const handleStoreSave = async () => {
    if (!settings) return
    setIsStoreSaving(true)
    setSaveError('')
    try {
      let storeLogoPath = storeForm.store_logo_path
      if (logoFile) {
        storeLogoPath = await ImageService.uploadImage(logoFile, STORAGE_BUCKETS.storeAssets)
      }
      const updates = { ...storeForm, store_logo_path: storeLogoPath }
      await SettingsService.updateSettings(settings.id, updates)
      setSettings({ ...settings, ...updates })
      setStoreForm(updates)
      setLogoFile(null)
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
        setLogoPreviewUrl('')
      }
    } catch (error: any) {
      setSaveError(error.message || 'Không thể lưu thông tin cửa hàng. Vui lòng thử lại.')
    } finally {
      setIsStoreSaving(false)
    }
  }

  const handleBankSave = async () => {
    if (!settings) return
    setIsSaving(true)
    setSaveError('')
    try {
      await SettingsService.updateSettings(settings.id, bankForm)
      setSettings({ ...settings, ...bankForm })
    } catch (error: any) {
      setSaveError(error.message || 'Không thể lưu thông tin thanh toán. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const closeResetDialog = () => {
    if (isResetting) return
    setIsResetDialogOpen(false)
    setResetPhrase('')
    setResetAcknowledged(false)
    setResetError('')
  }

  const handleResetSalesData = async () => {
    if (resetPhrase !== 'XOA DU LIEU' || !resetAcknowledged || isResetting) return
    setIsResetting(true)
    setResetError('')

    try {
      const result = await SystemDataService.resetTestSalesData()
      sessionStorage.removeItem('sn-pos-v2:pos-cart')
      setResetSuccess(`Đã xóa ${result.deleted_orders} đơn hàng thử nghiệm và khôi phục ${result.restored_units} sản phẩm vào kho.`)
      setIsResetDialogOpen(false)
      window.setTimeout(() => window.location.reload(), 1600)
    } catch (resetFailure) {
      setResetError(resetFailure instanceof Error ? resetFailure.message : 'Không thể xóa dữ liệu bán hàng. Vui lòng thử lại.')
    } finally {
      setIsResetting(false)
    }
  }

  if (error) throw error
  if (!settings) return <PageSkeleton />

  return (
    <div className="settings-page">
      <PageIntro kicker="Thiết lập cửa hàng" title="Cài đặt" description="Thông tin và tùy chọn hiển thị của cửa hàng." />
      {saveError && <p className="settings-error" role="alert">{saveError}</p>}
      {resetSuccess && <p className="settings-success" role="status">{resetSuccess}</p>}

      <section className="settings-panel" aria-labelledby="store-settings-title">
        <header>
          <span className="settings-icon"><Store aria-hidden="true" /></span>
          <div>
            <h3 id="store-settings-title">Thông tin cửa hàng</h3>
            <p>Thông tin hiển thị trên hệ thống bán hàng.</p>
          </div>
        </header>
        <div className="settings-store-grid">
          <div className="settings-form">
            <label><span>Tên cửa hàng</span><input value={storeForm.store_name} onChange={(event) => setStoreForm({ ...storeForm, store_name: event.target.value })} /></label>
            <label className="settings-upload"><span>Logo / ảnh đại diện</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} /><strong><Upload aria-hidden="true" /> Chọn ảnh</strong></label>
            <label><span>Thuế VAT (%)</span><input type="number" inputMode="decimal" min="0" step="0.1" value={storeForm.tax_rate} onChange={(event) => setStoreForm({ ...storeForm, tax_rate: Number(event.target.value) })} /></label>
            <button type="button" disabled={isStoreSaving} onClick={handleStoreSave}>
              {isStoreSaving ? 'Đang lưu...' : 'Lưu thông tin cửa hàng'}
            </button>
          </div>
          <aside className="store-preview-card" aria-label="Xem trước cửa hàng">
            <div className="store-preview-logo">
              {activeLogoUrl ? <img src={activeLogoUrl} alt="" /> : <span>{storeForm.store_name.slice(0, 2).toUpperCase() || 'SN'}</span>}
            </div>
            <div>
              <strong>{storeForm.store_name || 'SN Store'}</strong>
              <small>Boutique POS</small>
            </div>
            <span className="store-preview-status"><BadgeCheck aria-hidden="true" /> Đang hoạt động</span>
          </aside>
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="bank-settings-title">
        <header>
          <span className="settings-icon"><Landmark aria-hidden="true" /></span>
          <div>
            <h3 id="bank-settings-title">Thanh toán & ngân hàng</h3>
            <p>Thông tin nhận chuyển khoản và tạo nội dung thanh toán.</p>
          </div>
        </header>
        <div className="settings-bank-grid">
          <div className="settings-form">
            <label><span>Ngân hàng / mã VietQR</span><input placeholder="VD: MB Bank hoặc 970422" value={bankForm.bank_name} onChange={(event) => setBankForm({ ...bankForm, bank_name: event.target.value })} /></label>
            <label><span>Số tài khoản</span><input value={bankForm.bank_account_number} onChange={(event) => setBankForm({ ...bankForm, bank_account_number: event.target.value })} /></label>
            <label><span>Chủ tài khoản</span><input value={bankForm.bank_account_holder} onChange={(event) => setBankForm({ ...bankForm, bank_account_holder: event.target.value })} /></label>
            <label><span>Tiền tố nội dung CK</span><input value={bankForm.transfer_note_prefix} onChange={(event) => setBankForm({ ...bankForm, transfer_note_prefix: event.target.value })} /></label>
            <button type="button" disabled={isSaving} onClick={handleBankSave}>
              {isSaving ? 'Đang lưu...' : 'Lưu thanh toán'}
            </button>
          </div>
          <aside className="qr-preview-card" aria-label="Xem trước mã QR">
            {qrPreviewUrl ? <img src={qrPreviewUrl} alt="QR chuyển khoản mẫu" /> : <span>QR</span>}
            <strong>{hasBankInfo ? 'QR chuyển khoản mẫu' : 'Chưa đủ thông tin QR'}</strong>
            <small>{hasBankInfo ? `${bankForm.transfer_note_prefix || 'SN'} DEMO · 250.000đ` : 'Nhập ngân hàng, số tài khoản và chủ tài khoản.'}</small>
          </aside>
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="receipt-settings-title">
        <header>
          <span className="settings-icon"><ReceiptText aria-hidden="true" /></span>
          <div>
            <h3 id="receipt-settings-title">Hóa đơn</h3>
            <p>Hóa đơn dùng tên cửa hàng, logo và thông tin thanh toán đã lưu.</p>
          </div>
        </header>
        <dl>
          <div><dt>Mẫu in</dt><dd>POS 80mm</dd></div>
          <div><dt>Thuế VAT</dt><dd>{storeForm.tax_rate}%</dd></div>
          <div><dt>Tiền tệ</dt><dd>{settings.currency === 'VND' ? 'Đồng Việt Nam (VND)' : settings.currency}</dd></div>
        </dl>
      </section>

      <section className="settings-panel" aria-labelledby="display-settings-title">
        <header>
          <span className="settings-icon"><Moon aria-hidden="true" /></span>
          <div>
            <h3 id="display-settings-title">Giao diện</h3>
            <p>Dùng nút trên thanh đầu trang để chuyển chế độ sáng hoặc tối.</p>
          </div>
        </header>
        <dl>
          <div><dt>Múi giờ</dt><dd>{settings.timezone === 'Asia/Ho_Chi_Minh' ? 'Châu Á / Thành phố Hồ Chí Minh' : settings.timezone}</dd></div>
          <div><dt>Phong cách</dt><dd>Dark boutique</dd></div>
        </dl>
      </section>

      <section className="settings-panel settings-system-panel" aria-labelledby="system-data-title">
        <header>
          <span className="settings-icon danger"><ShieldAlert aria-hidden="true" /></span>
          <div>
            <h3 id="system-data-title">Dữ liệu hệ thống</h3>
            <p>Xóa đơn hàng, doanh thu và dữ liệu giao dịch thử nghiệm. Sản phẩm và cài đặt cửa hàng được giữ nguyên.</p>
          </div>
        </header>
        <div className="settings-danger-action">
          <div>
            <strong>Xóa dữ liệu bán hàng thử nghiệm</strong>
            <small>Chỉ chủ cửa hàng đã được xác thực mới có thể thực hiện thao tác này.</small>
          </div>
          <button type="button" className="settings-danger-button" disabled={isOwnerLoading || !isStoreOwner} onClick={() => setIsResetDialogOpen(true)}>
            <AlertTriangle aria-hidden="true" /> Xóa dữ liệu bán hàng thử nghiệm
          </button>
        </div>
      </section>

      {isResetDialogOpen && (
        <OverlayBackdrop className="dialog-backdrop" onClose={closeResetDialog} dismissOnBackdrop={false} dismissOnEscape={false}>
          <DialogSurface className="settings-reset-dialog" labelledBy="reset-sales-title" describedBy="reset-sales-description" kind="alertdialog">
            <span className="settings-reset-icon"><AlertTriangle aria-hidden="true" /></span>
            <h2 id="reset-sales-title">Xóa dữ liệu bán hàng thử nghiệm?</h2>
            <p id="reset-sales-description">Thao tác này không thể hoàn tác.</p>
            <div className="settings-reset-summary">
              <div><strong>Sẽ xóa</strong><span>Đơn hàng, chi tiết đơn, doanh thu và lịch sử biến động kho từ đơn hàng.</span></div>
              <div><strong>Sẽ giữ nguyên</strong><span>Sản phẩm, biến thể, danh mục, ảnh, khách hàng và cài đặt cửa hàng.</span></div>
              <div><strong>Kho hàng</strong><span>Số lượng đã bán trong đơn hoàn tất sẽ được cộng trả về biến thể tương ứng.</span></div>
            </div>
            <label className="settings-reset-field">
              <span>Nhập <strong>XOA DU LIEU</strong> để xác nhận</span>
              <input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} disabled={isResetting} autoComplete="off" />
            </label>
            <label className="settings-reset-check">
              <input type="checkbox" checked={resetAcknowledged} onChange={(event) => setResetAcknowledged(event.target.checked)} disabled={isResetting} />
              <span>Tôi hiểu thao tác này không thể hoàn tác.</span>
            </label>
            {resetError && <p className="settings-error" role="alert">{resetError}</p>}
            <footer>
              <button type="button" onClick={closeResetDialog} disabled={isResetting}>Hủy</button>
              <button type="button" className="settings-danger-button" onClick={handleResetSalesData} disabled={isResetting || resetPhrase !== 'XOA DU LIEU' || !resetAcknowledged}>
                {isResetting ? 'Đang xóa dữ liệu…' : 'Xóa vĩnh viễn'}
              </button>
            </footer>
          </DialogSurface>
        </OverlayBackdrop>
      )}
    </div>
  )
}
