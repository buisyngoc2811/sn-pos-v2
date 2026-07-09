import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://yvrfwvzpbadwbbamwfzk.supabase.co', 'sb_publishable_d8gejdL0xyQ00y7WSJlmbQ_SbTizIDh')

async function run() {
  // Sign in or sign up
  let { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@snstore.com',
    password: 'password123'
  })
  
  if (!session) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@snstore.com',
      password: 'password123'
    })
    if (signUpError) {
      console.log('SignUp Error:', signUpError)
      return
    }
    session = signUpData.session
  }
  
  if (!session) {
    console.log('No session obtained.')
    return
  }
  
  console.log('Authenticated!')

  // Categories
  const { error: catErr } = await supabase.from('categories').insert([
    { id: '10000000-0000-0000-0000-000000000001', name: 'Áo', slug: 'ao', sort_order: 1 },
    { id: '10000000-0000-0000-0000-000000000002', name: 'Quần & váy', slug: 'quan-va-vay', sort_order: 2 },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Đầm', slug: 'dam', sort_order: 3 },
    { id: '10000000-0000-0000-0000-000000000004', name: 'Áo khoác', slug: 'ao-khoac', sort_order: 4 }
  ])
  if (catErr) console.log('Cat Err', catErr)

  // Products
  const { error: prodErr } = await supabase.from('products').insert([
    { id: '20000000-0000-0000-0000-000000000001', category_id: '10000000-0000-0000-0000-000000000001', name: 'Áo cardigan len gân', description: 'Áo cardigan len gân dáng vừa.', status: 'active', image_path: 'products/cardigan-len-gan.webp' },
    { id: '20000000-0000-0000-0000-000000000002', category_id: '10000000-0000-0000-0000-000000000002', name: 'Quần linen ống rộng', description: 'Quần linen ống rộng mặc hằng ngày.', status: 'active', image_path: 'products/quan-linen-ong-rong.webp' },
    { id: '20000000-0000-0000-0000-000000000003', category_id: '10000000-0000-0000-0000-000000000001', name: 'Áo thun ôm cơ bản', description: 'Áo thun co giãn dáng ôm.', status: 'active', image_path: 'products/ao-thun-om.webp' },
    { id: '20000000-0000-0000-0000-000000000004', category_id: '10000000-0000-0000-0000-000000000003', name: 'Đầm quấn màu berry', description: 'Đầm quấn màu berry trầm.', status: 'active', image_path: 'products/dam-quan-berry.webp' }
  ])
  if (prodErr) console.log('Prod Err', prodErr)

  // Product Variants
  const { error: varErr } = await supabase.from('product_variants').insert([
    { id: '30000000-0000-0000-0000-000000000001', product_id: '20000000-0000-0000-0000-000000000001', sku: 'KN-024-PK-M', size: 'M', color: 'Hồng đất', price_vnd: 680000, stock_quantity: 8, reorder_level: 6 },
    { id: '30000000-0000-0000-0000-000000000002', product_id: '20000000-0000-0000-0000-000000000002', sku: 'LP-018-CR-S', size: 'S', color: 'Kem', price_vnd: 820000, stock_quantity: 12, reorder_level: 5 },
    { id: '30000000-0000-0000-0000-000000000003', product_id: '20000000-0000-0000-0000-000000000003', sku: 'TS-041-BK-S', size: 'S', color: 'Đen', price_vnd: 380000, stock_quantity: 18, reorder_level: 8 },
    { id: '30000000-0000-0000-0000-000000000004', product_id: '20000000-0000-0000-0000-000000000004', sku: 'DR-029-BR-S', size: 'S', color: 'Đỏ berry', price_vnd: 960000, stock_quantity: 9, reorder_level: 5 }
  ])
  if (varErr) console.log('Var Err', varErr)

  // Customers
  const { error: custErr } = await supabase.from('customers').insert([
    { id: '40000000-0000-0000-0000-000000000001', name: 'Nguyễn Minh Anh', email: 'minhanh@example.com', phone: '0901234567', membership_tier: 'pink', loyalty_points: 625, created_at: '2026-04-04T02:00:00Z' },
    { id: '40000000-0000-0000-0000-000000000002', name: 'Trần Ngọc Mai', email: 'ngocmai@example.com', phone: '0912345678', membership_tier: 'vip', loyalty_points: 1249, created_at: '2026-02-18T02:00:00Z' }
  ])
  if (custErr) console.log('Cust Err', custErr)

  // Orders
  const { error: ordErr } = await supabase.from('orders').insert([
    { id: '50000000-0000-0000-0000-000000000001', order_number: '1048', customer_id: '40000000-0000-0000-0000-000000000001', status: 'completed', payment_method: 'card', subtotal_vnd: 1060000, discount_vnd: 0, tax_vnd: 84800, total_vnd: 1144800, completed_at: '2026-07-09T03:42:00Z' }
  ])
  if (ordErr) console.log('Ord Err', ordErr)

  // Order Items
  const { error: itemErr } = await supabase.from('order_items').insert([
    { id: '60000000-0000-0000-0000-000000000001', order_id: '50000000-0000-0000-0000-000000000001', product_variant_id: '30000000-0000-0000-0000-000000000001', product_name_snapshot: 'Áo cardigan len gân', sku_snapshot: 'KN-024-PK-M', variant_snapshot: 'Hồng đất · M', unit_price_vnd: 680000, quantity: 1, line_total_vnd: 680000 },
    { id: '60000000-0000-0000-0000-000000000002', order_id: '50000000-0000-0000-0000-000000000001', product_variant_id: '30000000-0000-0000-0000-000000000003', product_name_snapshot: 'Áo thun ôm cơ bản', sku_snapshot: 'TS-041-BK-S', variant_snapshot: 'Đen · S', unit_price_vnd: 380000, quantity: 1, line_total_vnd: 380000 }
  ])
  if (itemErr) console.log('Item Err', itemErr)

  // Inventory Movements
  const { error: invErr } = await supabase.from('inventory_movements').insert([
    { id: '70000000-0000-0000-0000-000000000001', product_variant_id: '30000000-0000-0000-0000-000000000001', order_id: '50000000-0000-0000-0000-000000000001', type: 'sale', quantity_change: -1, quantity_after: 8, note: 'Bán theo đơn hàng #1048', created_at: '2026-07-09T03:42:00Z' },
    { id: '70000000-0000-0000-0000-000000000002', product_variant_id: '30000000-0000-0000-0000-000000000003', order_id: '50000000-0000-0000-0000-000000000001', type: 'sale', quantity_change: -1, quantity_after: 18, note: 'Bán theo đơn hàng #1048', created_at: '2026-07-09T03:42:00Z' }
  ])
  if (invErr) console.log('Inv Err', invErr)

  // Store Settings
  const { error: setErr } = await supabase.from('store_settings').insert([
    { id: '80000000-0000-0000-0000-000000000001', store_name: 'SN Store', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND', tax_rate: 8 }
  ])
  if (setErr) console.log('Set Err', setErr)

  console.log('Seeding complete!')
}

run()
