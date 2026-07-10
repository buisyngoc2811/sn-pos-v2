import {
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  PackagePlus,
  PackageX,
  Plus,
  ReceiptText,
  ShoppingBag,
  UserPlus,
} from 'lucide-react'

export type ProductStatus = 'Đang bán' | 'Bản nháp' | 'Đã lưu trữ'

export type Product = {
  id: number
  name: string
  category: string
  sku: string
  variants: string
  stock: number
  price: number
  status: ProductStatus
  position: string
  short_description?: string | null
  description?: string | null
}

export const products: Product[] = [
  { id: 1, name: 'Áo cardigan len gân', category: 'Áo', sku: 'KN-024', variants: '3 kích cỡ', stock: 8, price: 680000, status: 'Đang bán', position: '0% 0%' },
  { id: 2, name: 'Quần linen ống rộng', category: 'Quần & váy', sku: 'LP-018', variants: '4 kích cỡ', stock: 12, price: 820000, status: 'Đang bán', position: '33.333% 0%' },
  { id: 3, name: 'Áo thun ôm cơ bản', category: 'Áo', sku: 'TS-041', variants: '5 kích cỡ', stock: 18, price: 380000, status: 'Đang bán', position: '66.666% 0%' },
  { id: 4, name: 'Chân váy midi satin', category: 'Quần & váy', sku: 'SK-012', variants: '3 kích cỡ', stock: 5, price: 740000, status: 'Đang bán', position: '100% 0%' },
  { id: 5, name: 'Áo blazer may đo màu ngà', category: 'Áo khoác', sku: 'BZ-006', variants: '3 kích cỡ', stock: 6, price: 1280000, status: 'Đang bán', position: '0% 100%' },
  { id: 6, name: 'Đầm quấn màu berry', category: 'Đầm', sku: 'DR-029', variants: '4 kích cỡ', stock: 9, price: 960000, status: 'Đang bán', position: '33.333% 100%' },
  { id: 7, name: 'Quần jean ống đứng', category: 'Quần & váy', sku: 'DN-015', variants: '7 kích cỡ', stock: 14, price: 880000, status: 'Đang bán', position: '66.666% 100%' },
  { id: 8, name: 'Áo gile len vặn thừng', category: 'Áo', sku: 'KN-031', variants: '3 kích cỡ', stock: 7, price: 620000, status: 'Bản nháp', position: '100% 100%' },
  { id: 9, name: 'Áo cardigan len mềm', category: 'Áo', sku: 'KN-019', variants: '4 kích cỡ', stock: 2, price: 720000, status: 'Đang bán', position: '0% 0%' },
  { id: 10, name: 'Chân váy lụa dự tiệc', category: 'Quần & váy', sku: 'SK-008', variants: '3 kích cỡ', stock: 0, price: 860000, status: 'Đã lưu trữ', position: '100% 0%' },
]

export const productCategories = ['Tất cả danh mục', 'Áo', 'Quần & váy', 'Đầm', 'Áo khoác']
export const productStatuses = ['Tất cả trạng thái', 'Đang bán', 'Bản nháp', 'Đã lưu trữ']

export type PosProduct = {
  id: number
  name: string
  category: string
  size: string
  stock: number
  price: number
  position: string
  short_description?: string | null
  description?: string | null
}

export type PosCartItem = PosProduct & { quantity: number }

export const posCategories = ['Tất cả', 'Hàng mới', 'Áo', 'Quần & váy', 'Đầm', 'Áo khoác']

export const posProducts: PosProduct[] = [
  { id: 1, name: 'Áo cardigan len gân', category: 'Áo', size: 'S–L', stock: 8, price: 680000, position: '0% 0%' },
  { id: 2, name: 'Quần linen ống rộng', category: 'Quần & váy', size: 'XS–L', stock: 12, price: 820000, position: '33.333% 0%' },
  { id: 3, name: 'Áo thun ôm cơ bản', category: 'Áo', size: 'XS–XL', stock: 18, price: 380000, position: '66.666% 0%' },
  { id: 4, name: 'Chân váy midi satin', category: 'Quần & váy', size: 'S–L', stock: 5, price: 740000, position: '100% 0%' },
  { id: 5, name: 'Áo blazer may đo màu ngà', category: 'Áo khoác', size: 'S–L', stock: 6, price: 1280000, position: '0% 100%' },
  { id: 6, name: 'Đầm quấn màu berry', category: 'Đầm', size: 'XS–L', stock: 9, price: 960000, position: '33.333% 100%' },
  { id: 7, name: 'Quần jean ống đứng', category: 'Quần & váy', size: '24–32', stock: 14, price: 880000, position: '66.666% 100%' },
  { id: 8, name: 'Áo gile len vặn thừng', category: 'Hàng mới', size: 'S–L', stock: 7, price: 620000, position: '100% 100%' },
]

export const initialPosCart: PosCartItem[] = [
  { ...posProducts[0], quantity: 1 },
  { ...posProducts[3], quantity: 1 },
  { ...posProducts[2], quantity: 2 },
]

export type InventoryItem = {
  id: number
  name: string
  sku: string
  category: string
  variant: string
  stock: number
  reorder: number
  value: number
  position: string
}

export const inventory: InventoryItem[] = [
  { id: 1, name: 'Áo cardigan len gân', sku: 'KN-024-PK-M', category: 'Áo', variant: 'Hồng đất · M', stock: 2, reorder: 6, value: 1360000, position: '0% 0%' },
  { id: 2, name: 'Quần linen ống rộng', sku: 'LP-018-CR-S', category: 'Quần & váy', variant: 'Kem · S', stock: 3, reorder: 5, value: 2460000, position: '33.333% 0%' },
  { id: 3, name: 'Áo thun ôm cơ bản', sku: 'TS-041-BK-XS', category: 'Áo', variant: 'Đen · XS', stock: 18, reorder: 8, value: 6840000, position: '66.666% 0%' },
  { id: 4, name: 'Chân váy midi satin', sku: 'SK-012-BL-M', category: 'Quần & váy', variant: 'Hồng phấn · M', stock: 5, reorder: 6, value: 3700000, position: '100% 0%' },
  { id: 5, name: 'Áo blazer may đo màu ngà', sku: 'BZ-006-IV-L', category: 'Áo khoác', variant: 'Trắng ngà · L', stock: 6, reorder: 4, value: 7680000, position: '0% 100%' },
  { id: 6, name: 'Đầm quấn màu berry', sku: 'DR-029-BR-S', category: 'Đầm', variant: 'Đỏ berry · S', stock: 9, reorder: 5, value: 8640000, position: '33.333% 100%' },
  { id: 7, name: 'Quần jean ống đứng', sku: 'DN-015-LW-28', category: 'Quần & váy', variant: 'Xanh nhạt · 28', stock: 14, reorder: 6, value: 12320000, position: '66.666% 100%' },
  { id: 8, name: 'Áo gile len vặn thừng', sku: 'KN-031-OA-M', category: 'Áo', variant: 'Màu yến mạch · M', stock: 7, reorder: 5, value: 4340000, position: '100% 100%' },
  { id: 9, name: 'Chân váy lụa dự tiệc', sku: 'SK-008-BK-S', category: 'Quần & váy', variant: 'Đen · S', stock: 0, reorder: 4, value: 0, position: '100% 0%' },
]

export const inventoryMovements = [
  { product: 'Áo cardigan len gân', detail: 'Nhập hàng thủ công', amount: 6, time: '10:24', type: 'in' },
  { product: 'Áo thun ôm cơ bản', detail: 'Đơn hàng #1048', amount: -2, time: '10:42', type: 'out' },
  { product: 'Chân váy midi satin', detail: 'Đơn hàng #1047', amount: -1, time: '10:18', type: 'out' },
  { product: 'Áo blazer may đo màu ngà', detail: 'Điều chỉnh tồn kho', amount: 1, time: '09:46', type: 'in' },
  { product: 'Quần linen ống rộng', detail: 'Đơn hàng #1046', amount: -1, time: '09:56', type: 'out' },
]

export const inventoryCategories = ['Tất cả danh mục', 'Áo', 'Quần & váy', 'Đầm', 'Áo khoác']
export const inventoryStockFilters = ['Tất cả tồn kho', 'Còn hàng', 'Sắp hết hàng', 'Hết hàng']

export type OrderStatus = 'Hoàn tất' | 'Đã hoàn tiền' | 'Tạm giữ'

export type Order = {
  id: string
  customer: string
  email: string
  date: string
  time: string
  items: number
  payment: 'Thẻ' | 'Tiền mặt' | 'Chuyển khoản / QR'
  status: OrderStatus
  total: number
}

export const orders: Order[] = [
  { id: '#1048', customer: 'Emma Wilson', email: 'emma.w@example.com', date: '2026-07-09', time: '10:42', items: 2, payment: 'Thẻ', status: 'Hoàn tất', total: 1280000 },
  { id: '#1047', customer: 'Olivia Martin', email: 'olivia.m@example.com', date: '2026-07-09', time: '10:18', items: 1, payment: 'Thẻ', status: 'Hoàn tất', total: 645000 },
  { id: '#1046', customer: 'Khách lẻ', email: 'Không có email', date: '2026-07-09', time: '09:56', items: 3, payment: 'Tiền mặt', status: 'Hoàn tất', total: 1860000 },
  { id: '#1045', customer: 'Sophia Lee', email: 'sophia.lee@example.com', date: '2026-07-09', time: '09:31', items: 2, payment: 'Thẻ', status: 'Đã hoàn tiền', total: 920000 },
  { id: '#1044', customer: 'Mia Garcia', email: 'mia.g@example.com', date: '2026-07-09', time: '09:08', items: 4, payment: 'Thẻ', status: 'Hoàn tất', total: 2145000 },
  { id: '#1043', customer: 'Ava Thompson', email: 'ava.t@example.com', date: '2026-07-08', time: '17:42', items: 2, payment: 'Tiền mặt', status: 'Tạm giữ', total: 1160000 },
  { id: '#1042', customer: 'Khách lẻ', email: 'Không có email', date: '2026-07-08', time: '16:26', items: 1, payment: 'Tiền mặt', status: 'Hoàn tất', total: 380000 },
  { id: '#1041', customer: 'Isabella Brown', email: 'isabella@example.com', date: '2026-07-08', time: '15:58', items: 3, payment: 'Thẻ', status: 'Hoàn tất', total: 2480000 },
]

export const orderStatuses = ['Tất cả trạng thái', 'Hoàn tất', 'Đã hoàn tiền', 'Tạm giữ']
export const orderPayments = ['Tất cả thanh toán', 'Thẻ', 'Tiền mặt']
export const orderLineItemTemplates = {
  primary: { name: 'Áo cardigan len gân', detail: 'Hồng đất · M', price: 680000 },
  secondary: { name: 'Áo thun ôm cơ bản', detail: 'Đen · S' },
}

export type Customer = {
  id: number
  name: string
  email: string
  phone: string
  joined: string
  orders: number
  spent: number
  points: number
  tier: 'Thành viên' | 'Hồng' | 'VIP'
  lastOrder: string
}

export const customers: Customer[] = [
  { id: 1, name: 'Emma Wilson', email: 'emma.w@example.com', phone: '(555) 014-8231', joined: '2026-03-12', orders: 12, spent: 9480000, points: 948, tier: 'VIP', lastOrder: 'Hôm nay, 10:42' },
  { id: 2, name: 'Olivia Martin', email: 'olivia.m@example.com', phone: '(555) 012-4418', joined: '2026-04-04', orders: 8, spent: 6245000, points: 625, tier: 'Hồng', lastOrder: 'Hôm nay, 10:18' },
  { id: 3, name: 'Sophia Lee', email: 'sophia.lee@example.com', phone: '(555) 016-3902', joined: '2026-01-22', orders: 10, spent: 7860000, points: 694, tier: 'Hồng', lastOrder: 'Hôm nay, 09:31' },
  { id: 4, name: 'Mia Garcia', email: 'mia.g@example.com', phone: '(555) 018-7741', joined: '2026-02-18', orders: 15, spent: 12485000, points: 1249, tier: 'VIP', lastOrder: 'Hôm nay, 09:08' },
  { id: 5, name: 'Ava Thompson', email: 'ava.t@example.com', phone: '(555) 019-2107', joined: '2026-05-06', orders: 5, spent: 3860000, points: 386, tier: 'Thành viên', lastOrder: 'Hôm qua, 17:42' },
  { id: 6, name: 'Isabella Brown', email: 'isabella@example.com', phone: '(555) 011-9034', joined: '2025-12-09', orders: 18, spent: 15640000, points: 1564, tier: 'VIP', lastOrder: 'Hôm qua, 15:58' },
  { id: 7, name: 'Charlotte Davis', email: 'charlotte@example.com', phone: '(555) 013-6680', joined: '2026-06-11', orders: 3, spent: 2240000, points: 224, tier: 'Thành viên', lastOrder: '07/07/2026' },
]

export const customerPurchases = [
  { id: '#1048', date: '2026-07-09', items: 'Áo cardigan, áo thun ôm', total: 1280000 },
  { id: '#1012', date: '2026-06-24', items: 'Chân váy midi satin', total: 740000 },
  { id: '#0986', date: '2026-06-08', items: 'Quần linen, áo gile len', total: 1440000 },
]

export const customerTiers = ['Tất cả khách hàng', 'Thành viên', 'Hồng', 'VIP']
export const customerActivityFilters = ['Mọi hoạt động', 'Mua hàng hôm nay', 'Mua hàng tuần này']

export const dashboardKpis = [
  { label: 'Doanh thu hôm nay', value: 12845000, note: '12,4% so với hôm qua', icon: Banknote, tone: 'pink' },
  { label: 'Đơn hàng', value: '24', note: '5 nhiều hơn hôm qua', icon: ReceiptText, tone: 'violet' },
  { label: 'Sản phẩm đã bán', value: '38', note: '1,6 sản phẩm mỗi đơn', icon: ShoppingBag, tone: 'blue' },
  { label: 'Sắp hết hàng', value: '6', note: '2 cần xử lý hôm nay', icon: PackageX, tone: 'amber' },
]

export const dashboardOrders = [
  { id: '#1048', customer: 'Emma Wilson', items: '2 sản phẩm', time: '10:42', total: 1280000, status: 'Đã thanh toán' },
  { id: '#1047', customer: 'Olivia Martin', items: '1 sản phẩm', time: '10:18', total: 645000, status: 'Đã thanh toán' },
  { id: '#1046', customer: 'Khách lẻ', items: '3 sản phẩm', time: '09:56', total: 1860000, status: 'Đã thanh toán' },
  { id: '#1045', customer: 'Sophia Lee', items: '2 sản phẩm', time: '09:31', total: 920000, status: 'Đã hoàn tiền' },
  { id: '#1044', customer: 'Mia Garcia', items: '4 sản phẩm', time: '09:08', total: 2145000, status: 'Đã thanh toán' },
]

export const dashboardLowInventory = [
  { name: 'Áo cardigan len gân', detail: 'Hồng đất · M', sku: 'KN-024-PK-M', stock: 2, tone: 'rose' },
  { name: 'Quần linen ống rộng', detail: 'Kem · S', sku: 'LP-018-CR-S', stock: 3, tone: 'sand' },
  { name: 'Áo thun ôm cơ bản', detail: 'Đen · XS', sku: 'TS-041-BK-XS', stock: 4, tone: 'ink' },
  { name: 'Chân váy midi satin', detail: 'Hồng phấn · M', sku: 'SK-012-BL-M', stock: 5, tone: 'blush' },
]

export const dashboardBestSellers = [
  { name: 'Áo cardigan len gân', detail: 'Hồng đất', sold: 34, revenue: 23120000, position: '0% 0%' },
  { name: 'Đầm quấn màu berry', detail: 'Đỏ berry trầm', sold: 27, revenue: 25920000, position: '33.333% 100%' },
  { name: 'Quần linen ống rộng', detail: 'Kem', sold: 23, revenue: 18860000, position: '33.333% 0%' },
  { name: 'Chân váy midi satin', detail: 'Hồng phấn', sold: 19, revenue: 14060000, position: '100% 0%' },
]

export const dashboardActivities = [
  { title: 'Đơn #1048 đã hoàn tất', detail: 'Emma Wilson', amount: 1280000, time: '4 phút trước', icon: CircleDollarSign, tone: 'sale' },
  { title: 'Đã điều chỉnh tồn kho', detail: 'Áo cardigan len gân · +6 sản phẩm', time: '28 phút trước', icon: PackagePlus, tone: 'stock' },
  { title: 'Đã thêm khách hàng', detail: 'Olivia Martin', time: '1 giờ trước', icon: UserPlus, tone: 'customer' },
  { title: 'Đơn #1045 đã hoàn tiền', detail: 'Sophia Lee', amount: 920000, time: '2 giờ trước', icon: ClipboardCheck, tone: 'order' },
]

export const dashboardQuickActions = [
  { label: 'Bán hàng mới', detail: 'Bắt đầu thanh toán', icon: Plus },
  { label: 'Thêm item', detail: 'Tạo mẫu mới', icon: PackagePlus },
  { label: 'Thêm khách hàng', detail: 'Lưu thông tin khách hàng', icon: UserPlus },
  { label: 'Xem đơn hàng', detail: 'Xem doanh thu hôm nay', icon: ReceiptText },
]

export const dashboardChartPoints = '4,112 52,92 100,98 148,64 196,76 244,46 292,24'

export const reportRevenuePoints = '4,132 42,118 80,124 118,90 156,98 194,68 232,78 270,42 308,54 346,24'

export const reportBestProducts = [
  { name: 'Đầm quấn màu berry', item: 27, revenue: 25920000, share: 88 },
  { name: 'Áo cardigan len gân', item: 34, revenue: 23120000, share: 78 },
  { name: 'Quần linen ống rộng', item: 23, revenue: 18860000, share: 63 },
  { name: 'Chân váy midi satin', item: 19, revenue: 14060000, share: 47 },
]

export const reportHours = [
  { label: '9:00', value: 42 }, { label: '10:00', value: 76 }, { label: '11:00', value: 58 },
  { label: '12:00', value: 36 }, { label: '13:00', value: 49 }, { label: '14:00', value: 68 },
  { label: '15:00', value: 88 }, { label: '16:00', value: 72 }, { label: '17:00', value: 54 },
]
