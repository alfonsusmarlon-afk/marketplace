// ===== DATA & EMOJIS =====
const EMOJIS = { elektronik: '📱', fashion: '👗', furniture: '🪑', kendaraan: '🚗', olahraga: '⚽', buku: '📚', dapur: '🍳', mainan: '🧸', alat: '🔧' };
const API_BASE = '/api';

let products = [];
let cart = [];
let currentProduct = null;
let currentUser = null;
let activeCategory = 'all';
let wishlist = [];

// ===== UTILS =====
function formatPrice(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

// ===== API LOADERS =====
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error('Gagal memuat produk');
    const data = await response.json();
    products = data.map(p => ({
      id: p.id, title: p.title, price: p.price, category: p.category, condition: p.condition, location: p.location,
      rating: p.rating, trusted: p.trusted, freeShip: p.freeShip, seller: p.seller, seller_id: p.seller_id, desc: p.desc
    }));
    return products;
  } catch (error) { console.error('Error:', error); return []; }
}

// ===== RENDER PRODUCT CARD =====
function makeCard(p) {
  const badge = p.trusted ? '<span class="product-badge badge-trusted">Trusted</span>' : p.freeShip ? '<span class="product-badge badge-free">Gratis Ongkir</span>' : '';
  return `<div class="product-card" onclick="window.location.href='/detail/${p.id}'">
    <div class="product-img">${EMOJIS[p.category] || '📦'}${badge}</div>
    <div class="product-info">
      <div class="product-price">${formatPrice(p.price)}</div>
      <div class="product-title">${p.title}</div>
      <div class="product-meta"><span>📍 ${p.location}</span><span>⭐ ${p.rating}</span></div>
    </div>
  </div>`;
}

function renderHome() {
  const grid = document.getElementById('home-grid');
  const reco = document.getElementById('reco-grid');
  const recent = [...products].sort(() => Math.random() - 0.5).slice(0, 5);
  const recommended = [...products].sort((a,b) => b.rating - a.rating).slice(0, 8);
  if (grid) grid.innerHTML = recent.map(p => makeCard(p)).join('');
  if (reco) reco.innerHTML = recommended.map(p => makeCard(p)).join('');
}

function renderBrowse(list) {
  const grid = document.getElementById('browse-grid');
  if (!grid) return;
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) resultsCount.textContent = `Menampilkan ${list.length} produk`;
  if (!list.length) { grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-text">Tidak ada produk ditemukan</div></div>`; return; }
  grid.innerHTML = list.map(p => makeCard(p)).join('');
}

function applyFilters() {
  let list = [...products];
  const cat = document.getElementById('filter-cat') ? document.getElementById('filter-cat').value : '';
  const cond = document.getElementById('filter-cond') ? document.getElementById('filter-cond').value : '';
  const minEl = document.getElementById('filter-min'), maxEl = document.getElementById('filter-max'), sortEl = document.getElementById('filter-sort');
  const min = minEl && minEl.value ? parseFloat(minEl.value) : 0;
  const max = maxEl && maxEl.value ? parseFloat(maxEl.value) : Infinity;
  const sort = sortEl ? sortEl.value : '';
  if (cat) list = list.filter(p => p.category === cat);
  if (cond) list = list.filter(p => p.condition === cond);
  list = list.filter(p => p.price >= min && p.price <= max);
  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a,b) => b.rating - a.rating);
  renderBrowse(list);
}

function resetFilters() {
  ['filter-cat','filter-cond','filter-sort'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const elMin = document.getElementById('filter-min'); if (elMin) elMin.value = '';
  const elMax = document.getElementById('filter-max'); if (elMax) elMax.value = '';
  renderBrowse(products);
}

function filterByCategory(cat, el) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  activeCategory = cat;
  const list = cat === 'all' ? products : products.filter(p => p.category === cat);
  const homeGrid = document.getElementById('home-grid');
  if (homeGrid) homeGrid.innerHTML = list.slice(0, 5).map(p => makeCard(p)).join('');
}

let searchTimeout;
function handleNavSearch(val) {
  if (window.location.pathname !== '/browse') return;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { if (val.trim()) goSearch(val); }, 400);
}
function goSearch(q) {
  const query = q || document.getElementById('nav-search').value.trim();
  if (!query) return;
  if (window.location.pathname !== '/browse') { window.location.href = '/browse?search=' + encodeURIComponent(query);
  } else {
    const results = products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase()) || p.location.toLowerCase().includes(query.toLowerCase()));
    renderBrowse(results);
  }
}

// ===== DETAIL & CART =====
async function addCurrentToCart() {
  if (!currentProduct) return;
  if (!currentUser) { showToast('Silakan masuk terlebih dahulu', ''); window.location.href = '/login'; return; }
  if (currentUser.is_admin) { showToast('⚠️ Admin tidak dapat melakukan pembelian!', 'warning'); return; }
  if (currentProduct.seller_id === currentUser.id || currentProduct.seller === currentUser.name) { showToast('⚠️ Anda tidak bisa membeli barang Anda sendiri!', 'warning'); return; }
  if (cart.find(x => x.id === currentProduct.id)) { showToast('Sudah ada di keranjang', ''); return; }
  try {
    const response = await fetch(`${API_BASE}/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, product_id: currentProduct.id, quantity: 1 }) });
    if (!response.ok) throw new Error('Gagal');
    cart.push({...currentProduct});
    updateCartCount();
    showToast('✅ Berhasil ditambahkan ke keranjang', 'success');
    const btn = document.getElementById('detail-cart-btn');
    if (btn) { btn.textContent = '✅ Sudah di Keranjang'; btn.disabled = true; }
  } catch (error) { showToast('⚠️ Gagal menambahkan ke keranjang', ''); }
}

function renderCart() {
  const empty = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');
  if (!empty || !content) return;
  if (!cart.length) { empty.style.display = 'block'; content.style.display = 'none'; return; }
  empty.style.display = 'none'; content.style.display = 'grid';
  document.getElementById('cart-items-list').innerHTML = cart.map(p => `
    <div class="cart-item">
      <div class="cart-item-img">${EMOJIS[p.category] || '📦'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.title}</div>
        <div class="cart-item-price">${formatPrice(p.price)}</div>
      </div>
      <button class="cart-remove" onclick="removeCart(${p.id})">🗑️</button>
    </div>`).join('');
  const total = cart.reduce((s,p) => s + p.price, 0);
  document.getElementById('cart-qty').textContent = cart.length;
  document.getElementById('cart-subtotal').textContent = formatPrice(total);
  document.getElementById('cart-total').textContent = formatPrice(total);
}

async function loadUserCart(userId) {
  try {
    const response = await fetch(`${API_BASE}/cart/${userId}`);
    if (!response.ok) return;
    const cartItems = await response.json();
    cart = cartItems.map(item => { const product = products.find(p => p.id === item.product_id); return product ? { ...product, quantity: item.quantity, cartItemId: item.id } : null; }).filter(p => p);
    updateCartCount();
  } catch (error) {}
}

function removeCart(id) {
  const cartItem = cart.find(p => p.id === id);
  if (cartItem && cartItem.cartItemId && currentUser) fetch(`${API_BASE}/cart/${cartItem.cartItemId}`, { method: 'DELETE' });
  cart = cart.filter(p => p.id !== id);
  updateCartCount(); renderCart(); showToast('Produk dihapus dari keranjang', '');
}
function updateCartCount() { const c = document.getElementById('cart-count'); if(c) c.textContent = cart.length; }

async function checkout() {
  if (!currentUser) { window.location.href = '/login'; return; }
  if (currentUser.is_admin) return;
  if (cart.length === 0) return;
  const total = cart.reduce((s,p) => s + p.price, 0);
  try {
    await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, total_price: total, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity || 1, price: item.price })) }) });
    cart = []; updateCartCount();
    showToast('🎉 Pesanan dibuat!', 'success');
    setTimeout(() => { window.location.href = '/payment'; }, 1500); 
  } catch(e) { showToast('⚠️ Gagal', ''); }
}

// ===== WISHLIST =====
async function loadUserWishlist(userId) {
  try {
    const response = await fetch(`${API_BASE}/wishlist/${userId}`);
    if (!response.ok) return;
    const wishlistItems = await response.json();
    wishlist = wishlistItems.map(item => item.product_id);
  } catch (error) {}
}

async function toggleWishlist(id) {
  if (!currentUser) { showToast('Silakan masuk terlebih dahulu', ''); window.location.href = '/login'; return; }
  if (currentUser.is_admin) { showToast('⚠️ Admin tidak memakai fitur ini!', 'warning'); return; }
  try {
    if(wishlist.includes(id)) {
      wishlist = wishlist.filter(x => x !== id);
      showToast('💔 Dihapus dari wishlist','');
    } else {
      await fetch(`${API_BASE}/wishlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, product_id: id }) });
      wishlist.push(id); showToast('❤️ Ditambahkan ke wishlist','toast-accent');
    }
    if (window.location.pathname === '/wishlist') renderWishlist();
  } catch (error) {}
}

function toggleWishlistCurrent() {
  if (!currentProduct) return;
  toggleWishlist(currentProduct.id);
  const btn = document.getElementById('detail-wishlist-btn');
  if (btn && wishlist.includes(currentProduct.id)) { btn.textContent = '❤️ Hapus dari Wishlist'; btn.style.background = 'var(--primary)'; btn.style.color = '#fff';
  } else if (btn) { btn.textContent = '🤍 Tambah ke Wishlist'; btn.style.background = ''; btn.style.color = ''; }
}

function renderWishlist() {
  const grid = document.getElementById('wishlist-grid');
  if(!grid) return;
  const items = products.filter(p => wishlist.includes(p.id));
  grid.innerHTML = items.map(p => makeCard(p)).join('');
}

// ===== AUTH =====
async function loginEmail() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Isi email dan kata sandi', ''); return; }
  try {
    const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    if (!response.ok) { showToast('Login gagal', ''); return; }
    const user = await response.json();
    localStorage.setItem('currentUser', JSON.stringify({ name: user.name, id: user.id, is_admin: user.is_admin || false }));
    showToast('✅ Berhasil masuk!', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  } catch (error) { showToast('⚠️ Terjadi kesalahan', ''); }
}

async function registerEmail() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showToast('Lengkapi semua field', ''); return; }
  try {
    const response = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password: pass }) });
    if (!response.ok) { showToast('Registrasi gagal', ''); return; }
    const user = await response.json();
    localStorage.setItem('currentUser', JSON.stringify({ name: user.name, id: user.id, is_admin: user.is_admin || false }));
    showToast('✅ Akun berhasil dibuat!', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1000);
  } catch (error) { showToast('⚠️ Terjadi kesalahan', ''); }
}

function loginWithGoogle() {
  localStorage.setItem('currentUser', JSON.stringify({ name: 'Pengguna Google', id: 999, is_admin: false }));
  showToast('✅ Masuk dengan Google berhasil!', 'success');
  setTimeout(() => { window.location.href = '/'; }, 1000);
}

function logout() {
  localStorage.removeItem('currentUser'); showToast('Berhasil keluar', '');
  setTimeout(() => { window.location.href = '/'; }, 800);
}

// ===== UPLOAD =====
function triggerUpload() { const fileInput = document.getElementById('file-input'); if (fileInput) fileInput.click(); }
function handleFileUpload(input) { if (input.files.length) { document.getElementById('upload-preview').textContent = '🖼️'; showToast(`${input.files.length} foto dipilih`, 'success'); } }
async function submitProduct() {
  if (!currentUser) { window.location.href = '/login'; return; }
  if (currentUser.is_admin) { showToast('⚠️ Admin tidak digunakan untuk berjualan!', 'warning'); return; }
  const title = document.getElementById('up-title').value.trim(), price = document.getElementById('up-price').value, cat = document.getElementById('up-cat').value, cond = document.getElementById('up-cond').value, loc = document.getElementById('up-loc').value.trim(), desc = document.getElementById('up-desc').value.trim();
  if (!title || !price || !cat || !cond || !loc || !desc) { showToast('Lengkapi semua field (*)', ''); return; }
  try {
    const freeOngkir = document.getElementById('up-ongkir').value === 'true';
    await fetch(`${API_BASE}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description: desc, price: parseInt(price), category: cat, condition: cond, location: loc, seller_id: currentUser.id, free_shipping: freeOngkir, rating: 4.5, trusted: false }) });
    showToast('✅ Produk berhasil dipublikasikan!', 'success');
    setTimeout(() => { window.location.href = '/'; }, 1200);
  } catch (error) { showToast('⚠️ Gagal', ''); }
}

// ===== TOAST & DROPDOWN =====
function showToast(msg, type) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.className = 'toast show' + (type === 'success' ? ' toast-success' : type === 'accent' ? ' toast-accent' : '');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleDropdown() { const dropdown = document.getElementById('user-dropdown'); if(dropdown) dropdown.classList.toggle('open'); }
function closeDropdown() { const dropdown = document.getElementById('user-dropdown'); if(dropdown) dropdown.classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.user-menu')) { closeDropdown(); } });

// ===== STORE =====
async function loadStoreDashboard() {
  if (!currentUser || currentUser.is_admin) return;
  try {
      const response = await fetch(`${API_BASE}/store/${currentUser.id}`);
      const data = await response.json();
      const revEl = document.getElementById('store-revenue'); if (revEl) revEl.textContent = formatPrice(data.total_revenue);
      const list = document.getElementById('store-items-list'); if (!list) return;
      if (data.items.length === 0) { list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem;">Anda belum mengupload barang apapun.</td></tr>'; return; }
      list.innerHTML = data.items.map(i => `
          <tr style="border-bottom:1px solid var(--gray-200);">
              <td style="padding:10px; font-weight:bold;">${i.title}</td><td style="padding:10px; color:var(--primary);">${formatPrice(i.price)}</td>
              <td style="padding:10px;"><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:${i.status === 'Terjual' ? 'var(--success)' : 'var(--gray-200)'}; color:${i.status === 'Terjual' ? '#fff' : '#000'};">${i.status}</span></td>
              <td style="padding:10px;">${i.order_status.toUpperCase()}</td>
          </tr>
      `).join('');
  } catch(e) {}
}

// ===== LOGIKA CHAT TERBARU =====
let activeChatPartner = null;
let activeChatName = "";

async function loadChatMessages() {
  if (!currentUser || currentUser.is_admin) return;
  const box = document.getElementById('chat-box');
  if(!box) return;

  // Tangkap param URL jika tombol chat ditekan dari produk
  const params = new URLSearchParams(window.location.search);
  const toId = params.get('to');
  const toName = params.get('name');
  
  if (toId && !activeChatPartner) {
      activeChatPartner = parseInt(toId);
      activeChatName = toName || "Penjual";
  }

  try {
      const response = await fetch(`${API_BASE}/messages/${currentUser.id}`);
      const messages = await response.json();
      
      let contactsMap = new Map();
      if (activeChatPartner) { contactsMap.set(activeChatPartner, activeChatName); }
      
      messages.forEach(m => {
          const isMe = m.sender_id === currentUser.id;
          const partnerId = isMe ? m.recipient_id : m.sender_id;
          const partnerName = isMe ? m.recipient_name : m.sender_name;
          if (!contactsMap.has(partnerId)) { contactsMap.set(partnerId, partnerName); }
      });

      const contactList = document.getElementById('chat-contacts');
      if (contactList) {
          if (contactsMap.size === 0) {
              contactList.innerHTML = '<div style="padding:15px; color:var(--gray-500); font-size:13px; text-align:center;">Belum ada riwayat chat.</div>';
          } else {
              let html = '';
              contactsMap.forEach((name, id) => {
                  const isActive = (id === activeChatPartner);
                  html += `<div onclick="switchChatPartner(${id}, '${name}')" style="padding:12px 15px; border-bottom:1px solid var(--gray-200); cursor:pointer; display:flex; align-items:center; gap:10px; background:${isActive ? 'var(--primary-light)' : 'transparent'}; transition: background 0.2s;">
                      <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">${name[0].toUpperCase()}</div>
                      <div style="font-weight:${isActive ? '700' : '600'}; color:var(--gray-800); font-size:14px;">${name}</div>
                  </div>`;
              });
              contactList.innerHTML = html;
          }
      }

      if (!activeChatPartner && contactsMap.size > 0) {
          activeChatPartner = Array.from(contactsMap.keys())[0];
          activeChatName = contactsMap.get(activeChatPartner);
      }

      if (activeChatPartner) {
          document.getElementById('chat-header-name').textContent = activeChatName;
          document.getElementById('chat-header-avatar').textContent = activeChatName[0].toUpperCase();
          document.getElementById('chat-header-avatar').style.background = 'var(--primary)';
          document.getElementById('chat-input').disabled = false;
          document.getElementById('chat-send-btn').disabled = false;

          const thread = messages.filter(m => (m.sender_id === currentUser.id && m.recipient_id === activeChatPartner) || (m.sender_id === activeChatPartner && m.recipient_id === currentUser.id));

          if (thread.length === 0) {
              box.innerHTML = '<div style="text-align:center; color:var(--gray-500); margin-top:20%;">Kirim pesan pertama Anda!</div>';
          } else {
              box.innerHTML = thread.map(m => {
                  const isMe = m.sender_id === currentUser.id;
                  return `<div style="max-width:75%; padding:10px 15px; border-radius:15px; margin-bottom:10px; ${isMe ? 'background:var(--primary); color:#fff; align-self:flex-end; border-bottom-right-radius:2px;' : 'background:var(--gray-100); color:var(--gray-800); align-self:flex-start; border-bottom-left-radius:2px;'}">
                      ${m.content}
                  </div>`;
              }).join('');
              box.scrollTop = box.scrollHeight;
          }
      }
  } catch(e) { console.error(e); }
}

function switchChatPartner(id, name) {
  activeChatPartner = id;
  activeChatName = name;
  window.history.pushState({}, document.title, window.location.pathname);
  loadChatMessages();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  if(!input || !input.value.trim() || !currentUser || !activeChatPartner) return;
  try {
      await fetch(`${API_BASE}/messages`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ sender_id: currentUser.id, recipient_id: activeChatPartner, content: input.value.trim() })
      });
      input.value = '';
      loadChatMessages();
  } catch(e) { showToast('Gagal mengirim pesan', ''); }
}

// ===== INIT & ROUTER =====
async function initLoginState() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    if (navAuth) navAuth.style.display = 'none';
    if (navUser) { navUser.style.display = 'flex'; navUser.style.alignItems = 'center'; }
    
    const avatarBtn = document.getElementById('user-avatar-btn');
    if (avatarBtn) avatarBtn.textContent = currentUser.name[0].toUpperCase();
    
    const dropName = document.getElementById('dropdown-user-name');
    const dropRole = document.getElementById('dropdown-user-role');
    if (dropName) dropName.textContent = currentUser.name;
    if (dropRole) dropRole.textContent = currentUser.is_admin ? '👑 Administrator' : '👤 Pengguna Reguler';
    
    if (currentUser.is_admin) {
        if(document.getElementById('nav-cart-btn')) document.getElementById('nav-cart-btn').style.display = 'none';
        if(document.getElementById('nav-jual-btn')) document.getElementById('nav-jual-btn').style.display = 'none';
        if(document.getElementById('menu-jual')) document.getElementById('menu-jual').style.display = 'none';
        if(document.getElementById('menu-wishlist')) document.getElementById('menu-wishlist').style.display = 'none';
        if(document.getElementById('menu-chat')) document.getElementById('menu-chat').style.display = 'none';
        if(document.getElementById('menu-toko')) document.getElementById('menu-toko').style.display = 'none';
        const adminMenuItem = document.getElementById('admin-menu-item');
        if (adminMenuItem) adminMenuItem.style.display = 'block';
    } else {
        if(document.getElementById('nav-cart-btn')) document.getElementById('nav-cart-btn').style.display = 'block';
        if(document.getElementById('nav-jual-btn')) document.getElementById('nav-jual-btn').style.display = 'block';
        if(document.getElementById('menu-jual')) document.getElementById('menu-jual').style.display = 'flex';
        if(document.getElementById('menu-wishlist')) document.getElementById('menu-wishlist').style.display = 'flex';
        if(document.getElementById('menu-chat')) document.getElementById('menu-chat').style.display = 'flex';
        if(document.getElementById('menu-toko')) document.getElementById('menu-toko').style.display = 'flex';
        const adminMenuItem = document.getElementById('admin-menu-item');
        if (adminMenuItem) adminMenuItem.style.display = 'none';
        
        await loadUserCart(currentUser.id);
        await loadUserWishlist(currentUser.id);
    }
  }
}

async function initApp() {
  await loadProducts();
  await initLoginState(); 
  
  const path = window.location.pathname;
  
  if (path === '/' || path === '/home') {
    renderHome();
  } else if (path === '/browse') {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    if (q) {
       const el = document.getElementById('nav-search');
       if (el) el.value = q;
       const results = products.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()) || p.location.toLowerCase().includes(q.toLowerCase()));
       renderBrowse(results);
    } else { renderBrowse(products); }
  } else if (path.startsWith('/detail/')) {
    const id = parseInt(path.split('/').pop());
    const p = products.find(x => x.id === id);
    if (p) {
       currentProduct = p;
       const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
       setText('detail-img', EMOJIS[p.category] || '📦');
       setText('detail-price', formatPrice(p.price));
       setText('detail-title', p.title);
       setText('detail-location', p.location);
       setText('detail-condition', p.condition);
       setText('detail-category', p.category.charAt(0).toUpperCase() + p.category.slice(1));
       setText('detail-rating', `${p.rating} / 5.0`);
       setText('detail-desc', p.desc);
       setText('detail-breadcrumb', p.title.slice(0, 30) + '...');
       const name = p.seller || 'Penjual';
       setText('detail-seller-name', name);
       setText('detail-seller-avatar', (name)[0].toUpperCase());
       
       const badge = p.trusted ? '<span class="product-badge badge-trusted" style="position:static;display:inline-block;margin-right:6px">Trusted</span>' : '';
       const freeShip = p.freeShip ? '<span class="product-badge badge-free" style="position:static;display:inline-block">Gratis Ongkir</span>' : '';
       const detailBadge = document.getElementById('detail-badge');
       if (detailBadge) detailBadge.innerHTML = badge + freeShip;
       
       const btn = document.getElementById('detail-cart-btn');
       if (btn && cart.find(x => x.id === id)) { btn.textContent = '✅ Sudah di Keranjang'; btn.disabled = true; }
       
       const wBtn = document.getElementById('detail-wishlist-btn');
       if (wBtn && wishlist.includes(p.id)) { wBtn.textContent = '❤️ Hapus dari Wishlist'; wBtn.style.background = 'var(--primary)'; wBtn.style.color = '#fff'; }
       
       const cBtn = document.getElementById('detail-chat-btn');
       if (cBtn) {
           cBtn.onclick = () => {
               if (!currentUser) { showToast('Silakan masuk terlebih dahulu', ''); window.location.href='/login'; return; }
               if (currentUser.id === p.seller_id || currentUser.name === p.seller) { 
                   showToast('⚠️ Anda tidak bisa chat dengan diri sendiri!', 'warning'); return; 
               }
               // Langsung bawa ke ruang chat bersama ID Penjual ini
               window.location.href = `/chat?to=${p.seller_id}&name=${encodeURIComponent(p.seller || 'Penjual')}`;
           };
       }
       
       if (currentUser && currentUser.is_admin) {
           if (btn) { btn.disabled = true; btn.textContent = '🔒 Area Monitoring'; }
           if (wBtn) { wBtn.disabled = true; wBtn.textContent = '🔒 Area Monitoring'; }
           if (cBtn) { cBtn.disabled = true; cBtn.textContent = '🔒 Area Monitoring'; }
       }
    }
  } else if (path === '/cart') {
    if (!currentUser || currentUser.is_admin) window.location.href = '/'; else renderCart();
  } else if (path === '/wishlist') {
    if (!currentUser || currentUser.is_admin) window.location.href = '/'; else renderWishlist();
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();