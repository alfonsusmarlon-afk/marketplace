const EMOJIS = { elektronik: '📱', fashion: '👗', furniture: '🪑', kendaraan: '🚗', olahraga: '⚽', buku: '📚', dapur: '🍳', mainan: '🧸', alat: '🔧' };
const API_BASE = '/api';

let products = [], cart = [], currentProduct = null, currentUser = null, activeCategory = 'all', wishlist = [];
window.wishlistItems = [];

function formatPrice(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) return;
    products = await response.json();
    return products;
  } catch (error) { return []; }
}

function makeCard(p) {
  const badge = p.trusted ? '<span class="product-badge badge-trusted">Trusted</span>' : p.freeShip ? '<span class="product-badge badge-free">Gratis Ongkir</span>' : '';
  const imgContent = p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; border-radius:12px;">` : `<div style="font-size:3rem;">${EMOJIS[p.category] || '📦'}</div>`;
  
  return `<div class="product-card" onclick="window.location.href='/detail/${p.id}'">
    <div class="product-img" style="position:relative; overflow:hidden;">${imgContent}${badge}</div>
    <div class="product-info"><div class="product-price">${formatPrice(p.price)}</div><div class="product-title">${p.title}</div><div class="product-meta"><span>📍 ${p.location}</span><span>⭐ ${p.rating}</span></div></div>
  </div>`;
}

function renderHome() {
  const grid = document.getElementById('home-grid'), reco = document.getElementById('reco-grid');
  if(!products.length) return;
  if (grid) grid.innerHTML = [...products].sort(() => Math.random() - 0.5).slice(0, 5).map(p => makeCard(p)).join('');
  if (reco) reco.innerHTML = [...products].sort((a,b) => b.rating - a.rating).slice(0, 8).map(p => makeCard(p)).join('');
}

function renderBrowse(list) {
  const grid = document.getElementById('browse-grid'); if (!grid) return;
  const rc = document.getElementById('results-count'); if (rc) rc.textContent = `Menampilkan ${list.length} produk`;
  if (!list.length) { grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-text">Tidak ada produk ditemukan</div></div>`; return; }
  grid.innerHTML = list.map(p => makeCard(p)).join('');
}

function applyFilters() {
  let list = [...products];
  const cat = document.getElementById('filter-cat')?.value, cond = document.getElementById('filter-cond')?.value, sort = document.getElementById('filter-sort')?.value;
  const min = parseFloat(document.getElementById('filter-min')?.value) || 0, max = parseFloat(document.getElementById('filter-max')?.value) || Infinity;
  if (cat) list = list.filter(p => p.category === cat);
  if (cond) list = list.filter(p => p.condition === cond);
  list = list.filter(p => p.price >= min && p.price <= max);
  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price); else if (sort === 'price-desc') list.sort((a,b) => b.price - a.price); else if (sort === 'rating') list.sort((a,b) => b.rating - a.rating);
  renderBrowse(list);
}
function resetFilters() { ['filter-cat','filter-cond','filter-sort','filter-min','filter-max'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; }); renderBrowse(products); }

function filterByCategory(cat, el) { 
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    const list = cat === 'all' ? products : products.filter(p => p.category === cat); 
    const homeGrid = document.getElementById('home-grid');
    if (homeGrid) {
        if(list.length === 0) homeGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--gray-500); font-weight:700;">Belum ada produk di kategori ini.</div>';
        else homeGrid.innerHTML = list.map(p => makeCard(p)).join('');
    }
    const browseGrid = document.getElementById('browse-grid');
    if (browseGrid) renderBrowse(list);
}

let searchTimeout;
function handleNavSearch(val) { if (window.location.pathname !== '/browse') return; clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { if (val.trim()) goSearch(val); }, 400); }
function goSearch(q) {
  const query = q || document.getElementById('nav-search').value.trim(); if (!query) return;
  if (window.location.pathname !== '/browse') window.location.href = '/browse?search=' + encodeURIComponent(query);
  else renderBrowse(products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase())));
}

// ===== CART & ORDER =====
async function addCurrentToCart() {
  if (!currentProduct) return;
  if (!currentUser) { showToast('Silakan masuk', ''); window.location.href = '/login'; return; }
  if (currentUser.is_admin) { showToast('Admin dilarang beli!', 'warning'); return; }
  if (currentProduct.seller_id === currentUser.id) { showToast('Tidak bisa beli barang sendiri!', 'warning'); return; }
  try {
    await fetch(`${API_BASE}/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, product_id: currentProduct.id, quantity: 1 }) });
    cart.push({...currentProduct}); document.getElementById('cart-count').textContent = cart.length; showToast('✅ Masuk keranjang', 'success');
  } catch (e) {}
}
function renderCart() {
  const empty = document.getElementById('cart-empty'), content = document.getElementById('cart-content'); if (!empty || !content) return;
  if (!cart.length) { empty.style.display = 'block'; content.style.display = 'none'; return; }
  empty.style.display = 'none'; content.style.display = 'grid';
  document.getElementById('cart-items-list').innerHTML = cart.map(p => {
      const imgContent = p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="font-size:2rem; text-align:center;">${EMOJIS[p.category] || '📦'}</div>`;
      return `<div class="cart-item"><div class="cart-item-img" style="overflow:hidden;">${imgContent}</div><div class="cart-item-info"><div class="cart-item-name">${p.title}</div><div class="cart-item-price">${formatPrice(p.price)}</div></div><button class="cart-remove" onclick="removeCart(${p.id})">🗑️</button></div>`;
  }).join('');
  document.getElementById('cart-qty').textContent = cart.length; document.getElementById('cart-total').textContent = document.getElementById('cart-subtotal').textContent = formatPrice(cart.reduce((s,p) => s + p.price, 0));
}
async function loadUserCart(userId) {
  try { const res = await fetch(`${API_BASE}/cart/${userId}`); const items = await res.json(); cart = items.map(i => i.product ? { ...i.product, cartItemId: i.id } : null).filter(p => p); document.getElementById('cart-count').textContent = cart.length; } catch (e) {}
}
function removeCart(id) { const i = cart.find(p => p.id === id); if (i && i.cartItemId) fetch(`${API_BASE}/cart/${i.cartItemId}`, { method: 'DELETE' }); cart = cart.filter(p => p.id !== id); document.getElementById('cart-count').textContent = cart.length; renderCart(); }

async function checkout() {
  if (!currentUser || currentUser.is_admin || !cart.length) return;
  try { await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, total_price: cart.reduce((s,p) => s + p.price, 0), items: cart.map(i => ({ product_id: i.id, quantity: 1, price: i.price })) }) }); cart = []; showToast('Arahkan ke Pembayaran', 'success'); setTimeout(() => window.location.href = '/payment', 1000); } catch(e) {}
}
function completePayment() { showToast('✅ Transfer Dikonfirmasi. Menunggu Validasi Admin.', 'success'); setTimeout(() => { window.location.href = '/orders'; }, 1500); }

// ===== WISHLIST & UPLOAD =====
async function loadUserWishlist(userId) { try { const res = await fetch(`${API_BASE}/wishlist/${userId}`); const items = await res.json(); wishlist = items.map(i => i.product_id); window.wishlistItems = items.map(i => i.product).filter(p => p); } catch(e) {} }
function renderWishlist() {
  const grid = document.getElementById('wishlist-grid'); if(!grid) return;
  grid.innerHTML = (!window.wishlistItems || window.wishlistItems.length === 0) ? '<div class="empty-state" style="grid-column:1/-1"><div class="empty-text">Wishlist Anda kosong</div></div>' : window.wishlistItems.map(p => makeCard(p)).join('');
}
async function toggleWishlistCurrent() {
  if (!currentUser || currentUser.is_admin) return;
  const pId = currentProduct.id;
  if(wishlist.includes(pId)) { 
      await fetch(`${API_BASE}/wishlist`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, product_id: pId }) });
      wishlist = wishlist.filter(x => x !== pId); if (window.wishlistItems) window.wishlistItems = window.wishlistItems.filter(p => p.id !== pId); showToast('💔 Dihapus', ''); 
  } else { 
      await fetch(`${API_BASE}/wishlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, product_id: pId }) }); 
      wishlist.push(pId); if (currentProduct) window.wishlistItems.push(currentProduct); showToast('❤️ Disimpan','success'); 
  }
  if (window.location.pathname === '/wishlist') renderWishlist();
}

let tempProductImageBase64 = '';
function handleProductImageUpload(input) {
    if(!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => { 
        tempProductImageBase64 = e.target.result; 
        document.getElementById('product-upload-preview').innerHTML = `<img src="${tempProductImageBase64}" style="width:100%; max-height:150px; object-fit:contain; border-radius:8px;">`; 
    };
    reader.readAsDataURL(input.files[0]);
}

async function submitProduct() {
  if (!currentUser || currentUser.is_admin) return;
  const title = document.getElementById('up-title').value.trim(), price = document.getElementById('up-price').value, cat = document.getElementById('up-cat').value, cond = document.getElementById('up-cond').value, loc = document.getElementById('up-loc').value.trim(), desc = document.getElementById('up-desc').value.trim();
  if (!title || !price || !cat || !cond || !loc || !desc) { showToast('Lengkapi semua data (*)', ''); return; }
  
  await fetch(`${API_BASE}/products`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ title, description: desc, price: parseInt(price), category: cat, condition: cond, location: loc, seller_id: currentUser.id, image: tempProductImageBase64 }) 
  });
  showToast('✅ Produk Berhasil Diupload!', 'success'); setTimeout(() => window.location.href = '/', 1200);
}

// ===== AUTH =====
async function loginEmail() {
  const email = document.getElementById('login-email').value.trim(), password = document.getElementById('login-pass').value.trim();
  if(!email || !password) { showToast('Isi semua field', ''); return; }
  try { 
      const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); 
      if (!res.ok) throw new Error(); 
      localStorage.setItem('currentUser', JSON.stringify(await res.json())); 
      window.location.href = '/'; 
  } catch (e) { showToast('Login Gagal, periksa kembali.', ''); }
}
async function registerEmail() {
  const name = document.getElementById('reg-name').value.trim(), email = document.getElementById('reg-email').value.trim(), password = document.getElementById('reg-pass').value.trim();
  if(!name || !email || !password) { showToast('Isi semua field', ''); return; }
  try { 
      const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) }); 
      if (!res.ok) throw new Error(); 
      localStorage.setItem('currentUser', JSON.stringify(await res.json())); 
      window.location.href = '/'; 
  } catch (e) { showToast('Gagal Mendaftar', ''); }
}
function logout() { localStorage.removeItem('currentUser'); window.location.href = '/'; }
function showToast(msg, type) { const t = document.getElementById('toast'); if(!t) return; t.textContent = msg; t.className = 'toast show ' + (type === 'success' ? 'toast-success' : ''); setTimeout(() => t.classList.remove('show'), 3000); }
function toggleDropdown() { document.getElementById('user-dropdown')?.classList.toggle('open'); }
function closeDropdown() { document.getElementById('user-dropdown')?.classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.user-menu')) closeDropdown(); });

// ===== SELLER DASHBOARD =====
async function loadStoreDashboard() {
  if (!currentUser || currentUser.is_admin) return;
  try {
      const res = await fetch(`${API_BASE}/store/${currentUser.id}`); const data = await res.json();
      if(document.getElementById('store-revenue')) document.getElementById('store-revenue').textContent = formatPrice(data.total_revenue);
      const list = document.getElementById('store-items-list'); if (!list) return;
      if (!data.items.length) { list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;">Belum ada barang.</td></tr>'; return; }
      
      list.innerHTML = data.items.map(i => {
          let btn = '-';
          const canEdit = (i.status === 'Tersedia') || (i.status === 'Terjual' && i.order_status === 'pending');
          const cleanDesc = i.desc ? i.desc.replace(/"/g, '&quot;') : ''; 
          
          if (i.status === 'Tersedia') btn = `<button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="openEditModal(${i.id}, '${i.title}', ${i.price}, '${i.category}', '${i.condition}', '${cleanDesc}')">✏️ Edit Lengkap</button>`;
          else if (i.order_status === 'pending') btn = `<button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="openEditModal(${i.id}, '${i.title}', ${i.price}, '${i.category}', '${i.condition}', '${cleanDesc}')">✏️ Edit Lengkap</button> <div style="font-size:11px;color:var(--accent);margin-top:4px">Belum dibayar</div>`;
          else if (i.order_status === 'lunas') btn = `<button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="openProofModal(${i.order_id}, 'shipping')">Upload Resi Kirim</button>`;
          else if (i.order_status === 'verifikasi_kirim') btn = '⏳ Menunggu Admin ACC Kiriman';
          else if (i.order_status === 'dikirim') btn = '🚚 Sedang Dikirim';
          else if (i.order_status === 'verifikasi_terima') btn = '⏳ Menunggu Admin ACC Terima';
          else if (i.order_status === 'selesai') btn = '✅ Uang Cair';

          return `
          <tr style="border-bottom:1px solid var(--gray-200);">
              <td style="padding:15px; font-weight:bold;">${i.title}</td><td style="padding:15px; color:var(--primary); font-weight:bold;">${formatPrice(i.price)}</td>
              <td style="padding:15px;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${i.status === 'Terjual' ? 'var(--success)' : 'var(--gray-200)'}; color:${i.status === 'Terjual' ? '#fff' : '#000'};">${i.status}</span></td>
              <td style="padding:15px;">${btn}</td>
          </tr>`;
      }).join('');
  } catch(e) {}
}

function openEditModal(id, title, price, cat, cond, desc) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = title;
    document.getElementById('edit-price').value = price;
    document.getElementById('edit-cat').value = cat || 'elektronik';
    document.getElementById('edit-cond').value = cond || 'Sangat Baik';
    document.getElementById('edit-desc').value = desc === 'None' ? '' : desc;
    document.getElementById('edit-modal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('edit-modal').style.display = 'none'; }
async function saveEditProduct() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const price = document.getElementById('edit-price').value;
    const category = document.getElementById('edit-cat').value;
    const condition = document.getElementById('edit-cond').value;
    const description = document.getElementById('edit-desc').value.trim();
    if (!title || !price || !description) { showToast('Lengkapi field wajib!', ''); return; }
    try {
        await fetch(`${API_BASE}/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, price: parseInt(price), category, condition, description }) });
        showToast('✅ Berhasil Diupdate!', 'success'); closeEditModal(); loadStoreDashboard();
    } catch(e) { showToast('Gagal', ''); }
}

// ===== ORDERS (BUYER & ULASAN ANTI SPAM) =====
async function loadBuyerOrders() {
  if (!currentUser || currentUser.is_admin) return;
  try {
      const res = await fetch(`${API_BASE}/orders/buyer/${currentUser.id}`); const orders = await res.json();
      const list = document.getElementById('buyer-orders-list'); if (!list) return;
      if (!orders.length) { list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;">Belum ada pesanan.</td></tr>'; return; }
      
      list.innerHTML = orders.map(o => {
          let btn = '-';
          if (o.status === 'pending') btn = '⏳ Menunggu Validasi Bayar Admin';
          else if (o.status === 'lunas') btn = '⏳ Penjual Mengemas';
          else if (o.status === 'verifikasi_kirim') btn = '📦 Proses Kirim';
          else if (o.status === 'dikirim') btn = `<button class="btn btn-accent" style="padding:6px 10px; font-size:12px;" onclick="openProofModal(${o.id}, 'receipt')">Konfirmasi Terima</button>`;
          else if (o.status === 'verifikasi_terima') btn = '⏳ Admin Mengecek Foto Terima';
          else if (o.status === 'selesai') {
              // LOGIKA BARU: Jika dari database is_reviewed True, hilangkan tombol Beri Ulasan
              if (o.is_reviewed) {
                  btn = '<span style="color:var(--success); font-weight:800;">⭐⭐⭐⭐⭐ Sudah Diulas</span>';
              } else {
                  btn = `<button class="btn btn-primary" style="padding:6px 10px; font-size:12px;" onclick="openReviewModal(${o.items[0].product_id})">⭐ Beri Ulasan</button>`;
              }
          }
          return `<tr style="border-bottom:1px solid var(--gray-200);"><td style="padding:15px; font-weight:bold;">#ORD-${o.id}</td><td style="padding:15px; color:var(--primary); font-weight:bold;">${formatPrice(o.total_price)}</td><td style="padding:15px;"><span class="product-badge badge-trusted" style="position:static;">${o.status.toUpperCase()}</span></td><td style="padding:15px;">${btn}</td></tr>`;
      }).join('');
  } catch(e) {}
}

let reviewProductId = null;
function openReviewModal(productId) {
    reviewProductId = productId;
    document.getElementById('review-modal').style.display = 'flex';
}

async function submitReview() {
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value.trim();
    try {
        const res = await fetch(`${API_BASE}/reviews`, { 
            method: 'POST', headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({product_id: reviewProductId, reviewer_id: currentUser.id, rating: parseInt(rating), comment: comment})
        });
        
        if (!res.ok) throw new Error('Gagal atau sudah pernah diulas');
        
        document.getElementById('review-modal').style.display = 'none';
        showToast('Terima kasih atas ulasan Anda!', 'success');
        
        // Refresh tabel pesanan supaya tombol Beri Ulasan langsung berubah
        loadBuyerOrders(); 
    } catch(e) { 
        showToast('Barang ini sudah Anda ulas sebelumnya!', ''); 
        document.getElementById('review-modal').style.display = 'none';
    }
}

async function loadSellerReviews(sellerId) {
    try {
        const res = await fetch(`${API_BASE}/reviews/seller/${sellerId}`);
        const reviews = await res.json();
        const box = document.getElementById('seller-reviews-list');
        if(!box) return;
        if(reviews.length === 0) {
            box.innerHTML = '<div style="color:var(--gray-500); text-align:center; padding: 2rem;">Toko ini belum memiliki ulasan publik.</div>';
            return;
        }
        box.innerHTML = reviews.map(r => `
            <div style="border-bottom:1px solid var(--gray-100); padding-bottom:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="font-weight:800; color:var(--gray-800);">${r.reviewer_name}</span>
                    <span style="color:#FFD700; font-size:14px;">${'⭐'.repeat(r.rating)}</span>
                </div>
                <div style="font-size:14px; color:var(--gray-600); line-height:1.6;">"${r.comment}"</div>
                <div style="font-size:11px; color:var(--gray-400); margin-top:8px;">Tanggal Ulasan: ${new Date(r.created_at).toLocaleDateString('id-ID')}</div>
            </div>
        `).join('');
    } catch(e) {}
}

let tempProofBase64 = '';
function openProofModal(orderId, type) {
    document.getElementById('proof-order-id').value = orderId; document.getElementById('proof-type').value = type;
    document.getElementById('proof-modal-title').textContent = type === 'shipping' ? 'Upload Bukti Resi / Pengiriman' : 'Upload Bukti Barang Diterima';
    document.getElementById('proof-preview').src = ''; document.getElementById('proof-preview').style.display = 'none';
    tempProofBase64 = ''; document.getElementById('proof-modal').style.display = 'flex';
}
function handleProofFile(input) {
    if(!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => { tempProofBase64 = e.target.result; document.getElementById('proof-preview').src = tempProofBase64; document.getElementById('proof-preview').style.display = 'block'; };
    reader.readAsDataURL(input.files[0]);
}
async function submitProof() {
    const id = document.getElementById('proof-order-id').value, type = document.getElementById('proof-type').value;
    if(!tempProofBase64) { showToast('Pilih foto dulu!', ''); return; }
    try {
        await fetch(`${API_BASE}/orders/${id}/proof`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: type, image: tempProofBase64 }) });
        document.getElementById('proof-modal').style.display = 'none'; showToast('✅ Terkirim ke Admin!', 'success');
        if(type==='shipping') loadStoreDashboard(); else loadBuyerOrders();
    } catch(e) { showToast('Gagal', ''); }
}

// ===== REALTIME CHAT =====
let activeChatPartner = null, activeChatName = "", lastMessageCount = 0;
async function checkUnread() {
    if (!currentUser || currentUser.is_admin) return;
    try {
        const res = await fetch(`${API_BASE}/messages/unread/${currentUser.id}`);
        const data = await res.json(); const badge = document.getElementById('nav-chat-badge');
        if (badge) { if (data.unread_count > 0) { badge.textContent = data.unread_count; badge.style.display = 'inline-block'; } else badge.style.display = 'none'; }
    } catch(e) {}
}
async function loadChatMessages(isAutoRefresh = false) {
  if (!currentUser || currentUser.is_admin) return;
  const box = document.getElementById('chat-box'); if(!box) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('to') && params.get('to') !== 'undefined' && !activeChatPartner) { activeChatPartner = parseInt(params.get('to')); activeChatName = params.get('name') || "Pengguna"; }

  try {
      const res = await fetch(`${API_BASE}/messages/${currentUser.id}`); const messages = await res.json();
      let contactsMap = new Map(); if (activeChatPartner) contactsMap.set(activeChatPartner, activeChatName);
      messages.forEach(m => {
          const isMe = m.sender_id === currentUser.id;
          const partnerId = isMe ? m.recipient_id : m.sender_id, partnerName = isMe ? m.recipient_name : m.sender_name;
          if (partnerId && partnerId !== currentUser.id && !contactsMap.has(partnerId)) contactsMap.set(partnerId, partnerName);
      });

      if (!isAutoRefresh) {
          const list = document.getElementById('chat-contacts');
          if (list) {
              list.innerHTML = contactsMap.size === 0 ? '<div style="padding:15px; text-align:center;">Kosong</div>' : Array.from(contactsMap).map(([id, name]) => {
                  const unread = messages.filter(x => x.sender_id === id && x.recipient_id === currentUser.id && !x.is_read).length;
                  return `<div onclick="switchChatPartner(${id}, '${name}')" style="padding:12px 15px; border-bottom:1px solid var(--gray-200); cursor:pointer; display:flex; justify-content:space-between; background:${id === activeChatPartner ? 'var(--primary-light)' : 'transparent'};">
                      <div style="display:flex; align-items:center; gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;">${name[0].toUpperCase()}</div><div style="font-weight:700;">${name}</div></div>${unread > 0 ? `<span style="background:var(--accent); color:#fff; border-radius:50%; font-size:10px; width:18px; height:18px; display:flex; justify-content:center; align-items:center;">${unread}</span>` : ''}
                  </div>`;
              }).join('');
          }
      }

      if (activeChatPartner) {
          await fetch(`${API_BASE}/messages/read`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ user_id: currentUser.id, partner_id: activeChatPartner }) }); if(!isAutoRefresh) checkUnread();
          document.getElementById('chat-header-name').textContent = activeChatName; document.getElementById('chat-header-avatar').textContent = activeChatName[0].toUpperCase();
          document.getElementById('chat-input').disabled = false; document.getElementById('chat-send-btn').disabled = false;
          const thread = messages.filter(m => (m.sender_id === currentUser.id && m.recipient_id === activeChatPartner) || (m.sender_id === activeChatPartner && m.recipient_id === currentUser.id));
          if (thread.length !== lastMessageCount || !isAutoRefresh) {
              box.innerHTML = thread.length === 0 ? '<div style="text-align:center; margin-top:20%;">Mulai ngobrol!</div>' : thread.map(m => `<div style="max-width:75%; padding:10px 15px; border-radius:15px; margin-bottom:10px; ${m.sender_id === currentUser.id ? 'background:var(--primary); color:#fff; align-self:flex-end;' : 'background:var(--gray-100); align-self:flex-start;'}">${m.content}</div>`).join('');
              box.scrollTop = box.scrollHeight; lastMessageCount = thread.length;
          }
      }
  } catch(e) {}
}
function switchChatPartner(id, name) { activeChatPartner = id; activeChatName = name; lastMessageCount = 0; window.history.pushState({}, '', window.location.pathname); loadChatMessages(); }
async function sendMessage() {
  const i = document.getElementById('chat-input'); if(!i.value.trim() || !activeChatPartner) return;
  await fetch(`${API_BASE}/messages`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ sender_id: currentUser.id, recipient_id: activeChatPartner, content: i.value.trim() }) });
  i.value = ''; loadChatMessages(true);
}

// ===== ROUTER UTAMA =====
async function initLoginState() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById('nav-auth').style.display = 'none'; document.getElementById('nav-user').style.display = 'flex';
    document.getElementById('user-avatar-btn').textContent = currentUser.name[0].toUpperCase();
    document.getElementById('dropdown-user-name').textContent = currentUser.name;
    document.getElementById('dropdown-user-role').textContent = currentUser.is_admin ? '👑 Administrator' : '👤 Pengguna Reguler';
    
    if (currentUser.is_admin) {
        ['nav-cart-btn','nav-jual-btn','menu-jual','menu-wishlist','menu-chat','menu-toko', 'menu-orders'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'none'; });
        if(document.getElementById('admin-menu-item')) document.getElementById('admin-menu-item').style.display = 'block';
    } else {
        ['nav-cart-btn','nav-jual-btn','menu-jual','menu-wishlist','menu-chat','menu-toko', 'menu-orders'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = ''; });
        if(document.getElementById('admin-menu-item')) document.getElementById('admin-menu-item').style.display = 'none';
        
        await loadUserCart(currentUser.id); await loadUserWishlist(currentUser.id); checkUnread(); setInterval(checkUnread, 3000);
    }
  }
}

async function initApp() {
  await loadProducts(); await initLoginState(); const path = window.location.pathname;
  if (path === '/' || path === '/home') renderHome();
  else if (path === '/browse') {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) { document.getElementById('nav-search').value = q; renderBrowse(products.filter(p => p.title.toLowerCase().includes(q.toLowerCase()))); } else renderBrowse(products);
  } else if (path.startsWith('/detail/')) {
    const id = parseInt(path.split('/').pop());
    try {
        const res = await fetch(`${API_BASE}/products/${id}`); if (!res.ok) throw new Error();
        const p = await res.json(); currentProduct = p;
        
        ['price','title','location','condition','category','rating','desc'].forEach(k => { if(document.getElementById(`detail-${k}`)) document.getElementById(`detail-${k}`).textContent = p[k]; });
        
        if (p.image) document.getElementById('detail-img-container').innerHTML = `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-radius:var(--radius);">`;
        else document.getElementById('detail-img').textContent = EMOJIS[p.category] || '📦';
        
        document.getElementById('detail-price').textContent = formatPrice(p.price); document.getElementById('detail-seller-avatar').textContent = (p.seller||'P')[0].toUpperCase();
        document.getElementById('detail-seller-name').textContent = p.seller;
        
        loadSellerReviews(p.seller_id);
        
        if (currentUser && currentUser.is_admin) { 
            ['detail-cart-btn','detail-wishlist-btn','detail-chat-btn'].forEach(btnId => { const b=document.getElementById(btnId); if(b){b.disabled=true; b.textContent='🔒 Area Admin';} }); 
        } else if (currentUser && (currentUser.id === p.seller_id || currentUser.name === p.seller)) {
            ['detail-cart-btn','detail-wishlist-btn','detail-chat-btn'].forEach(btnId => { 
                const b = document.getElementById(btnId); 
                if(b) { b.disabled = true; b.style.background = 'var(--gray-200)'; b.style.color = 'var(--gray-500)'; b.style.borderColor = 'var(--gray-300)'; b.textContent = '🔒 Barang Anda Sendiri'; } 
            });
        } else if (document.getElementById('detail-chat-btn')) {
            document.getElementById('detail-chat-btn').onclick = () => {
                if (!currentUser) { showToast('Silakan masuk', ''); window.location.href='/login'; return; }
                window.location.href = `/chat?to=${p.seller_id}&name=${encodeURIComponent(p.seller)}`;
            };
        }
    } catch(e) { showToast('Barang tidak tersedia', ''); setTimeout(() => window.location.href='/', 1500); }
  } else if (path === '/cart') { if (!currentUser || currentUser.is_admin) window.location.href = '/'; else renderCart(); }
  else if (path === '/wishlist') { if (!currentUser || currentUser.is_admin) window.location.href = '/'; else renderWishlist(); }
  else if (path === '/chat' && currentUser && !currentUser.is_admin) { loadChatMessages(); setInterval(() => loadChatMessages(true), 2500); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();