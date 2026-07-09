import { useEffect, useState } from 'react'
import { Moon, Store } from 'lucide-react'
import { PageSkeleton } from './components/PageStates'
import { PageIntro } from './components/PageUI'
import { SettingsService, type StoreSettings } from './services/SettingsService'

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    SettingsService.getSettings().then(setSettings).catch(setError)
  }, [])

  const handleUpdate = async (field: keyof StoreSettings, currentValue: string) => {
    const newValue = prompt(`Cập nhật ${field}:`, currentValue)
    if (newValue !== null && newValue !== currentValue && settings) {
      try {
        await SettingsService.updateSettings(settings.id, { [field]: newValue })
        setSettings({ ...settings, [field]: newValue })
      } catch (error: any) {
        alert(error.message || 'Có lỗi xảy ra')
      }
    }
  }

  if (error) throw error
  if (!settings) return <PageSkeleton />

  return (
    <div className="settings-page">
      <PageIntro kicker="Thiết lập cửa hàng" title="Cài đặt" description="Thông tin và tùy chọn hiển thị của cửa hàng." />

      <section className="settings-panel" aria-labelledby="store-settings-title">
        <header>
          <span className="settings-icon"><Store aria-hidden="true" /></span>
          <div>
            <h3 id="store-settings-title">Thông tin cửa hàng</h3>
            <p>Thông tin hiển thị trên hệ thống bán hàng.</p>
          </div>
        </header>
        <dl>
          <div onClick={() => handleUpdate('store_name', settings.store_name)} style={{ cursor: 'pointer' }}><dt>Tên cửa hàng</dt><dd>{settings.store_name}</dd></div>
          <div onClick={() => handleUpdate('timezone', settings.timezone)} style={{ cursor: 'pointer' }}><dt>Múi giờ</dt><dd>{settings.timezone === 'Asia/Ho_Chi_Minh' ? 'Châu Á / Thành phố Hồ Chí Minh' : settings.timezone}</dd></div>
          <div onClick={() => handleUpdate('currency', settings.currency)} style={{ cursor: 'pointer' }}><dt>Tiền tệ</dt><dd>{settings.currency === 'VND' ? 'Đồng Việt Nam (VND)' : settings.currency}</dd></div>
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
      </section>
    </div>
  )
}
