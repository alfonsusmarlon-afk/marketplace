// ===== DATA =====
const EMOJIS = {
  elektronik: '📱', fashion: '👗', furniture: '🪑', kendaraan: '🚗',
  olahraga: '⚽', buku: '📚', dapur: '🍳', mainan: '🧸', alat: '🔧'
};

// Start with empty products - will be populated from API
let products = [];

let cart = [];
let currentProduct = null;
let currentUser = null;
let activeCategory = 'all';
let wishlist = [];
let notifications = [
  'Pembayaran berhasil dikonfirmasi',
  'Pesanan sedang diproses'
];

// ===== API CONFIG =====
const API_BASE = '/api';

// ===== LOAD PRODUCTS FROM API =====
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error('Failed to load products');
    const data = await response.json();
    // Map API response to match UI format
    products = data.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      condition: p.condition,
      location: p.location,
      rating: p.rating,
      trusted: p.trusted,
      freeShip: p.freeShip,
      seller: p.seller,
      desc: p.desc,
      created_at: p.created_at
    }));
    return products;
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('⚠️ Gagal memuat produk', 'warning');
    return [];
  }
}

// ===== INIT LOGIN STATE =====
function initLoginState() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById('nav-auth').style.display = 'none';
    document.getElementById('nav-user').style.display = 'flex';
    document.getElementById('nav-user').style.alignItems = 'center';
    document.getElementById('user-avatar-btn').textContent = currentUser.name[0].toUpperCase();
    
    // Show admin menu only for admins
    const adminMenuItem = document.getElementById('admin-menu-item');
    if (adminMenuItem) {
      adminMenuItem.style.display = (currentUser.is_admin ? 'block' : 'none');
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginState);
} else {
  initLoginState();
}

// ===== UTILS =====
function formatPrice(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function condClass(c) {
  return c === 'Sangat Baik' ? 'cond-good' : c === 'Baik' ? 'cond-fair' : 'cond-poor';
}

// ===== PAGES =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  window.scrollTo(0, 0);
  if (page === 'browse') renderBrowse(products);
  if (page === 'cart') renderCart();
  closeDropdown();
}

// ===== RENDER PRODUCT CARD =====
function makeCard(p, onclick) {
  const badge = p.trusted ? '<span class="product-badge badge-trusted">Trusted</span>'
    : p.freeShip ? '<span class="product-badge badge-free">Gratis Ongkir</span>' : '';
  return `<div class="product-card" onclick="window.location.href='/detail/${p.id}'">
    <div class="product-img">${EMOJIS[p.category] || '📦'}${badge}</div>
    <div class="product-info">
      <div class="product-price">${formatPrice(p.price)}</div>
      <div class="product-title">${p.title}</div>
      <div class="product-meta">
        <span class="product-location">📍 ${p.location}</span>
        <span class="product-rating">⭐ ${p.rating}</span>
      </div>
    </div>
  </div>`;
}

// ===== HOME =====
function renderHome() {
  const grid = document.getElementById('home-grid');
  const reco = document.getElementById('reco-grid');
  const recent = [...products].sort(() => Math.random() - 0.5).slice(0, 5);
  const recommended = [...products].sort((a,b) => b.rating - a.rating).slice(0, 8);
  if (grid) grid.innerHTML = recent.map(p => makeCard(p)).join('');
  if (reco) reco.innerHTML = recommended.map(p => makeCard(p)).join('');
}

// ===== BROWSE =====
let browseCurrent = [];

function renderBrowse(list) {
  browseCurrent = list;
  const grid = document.getElementById('browse-grid');
  document.getElementById('results-count').textContent = `Menampilkan ${list.length} produk`;
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada produk ditemukan</div><div class="empty-sub">Coba ubah filter atau kata kunci pencarian</div></div>`;
    return;
  }
  grid.innerHTML = list.map(p => makeCard(p)).join('');
}

function applyFilters() {
  let list = [...products];
  const cat = document.getElementById('filter-cat').value;
  const cond = document.getElementById('filter-cond').value;
  const min = parseFloat(document.getElementById('filter-min').value) || 0;
  const max = parseFloat(document.getElementById('filter-max').value) || Infinity;
  const sort = document.getElementById('filter-sort').value;
  if (cat) list = list.filter(p => p.category === cat);
  if (cond) list = list.filter(p => p.condition === cond);
  list = list.filter(p => p.price >= min && p.price <= max);
  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a,b) => b.rating - a.rating);
  renderBrowse(list);
}

function resetFilters() {
  ['filter-cat','filter-cond','filter-sort'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('filter-min').value = '';
  document.getElementById('filter-max').value = '';
  renderBrowse(products);
}

function filterByCategory(cat, el) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeCategory = cat;
  const list = cat === 'all' ? products : products.filter(p => p.category === cat);
  const homeGrid = document.getElementById('home-grid');
  if (homeGrid) homeGrid.innerHTML = list.slice(0, 5).map(p => makeCard(p)).join('');
}

// ===== SEARCH =====
let searchTimeout;

function handleNavSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { if (val.trim()) goSearch(val); }, 400);
}

function goSearch(q) {
  const query = q || document.getElementById('nav-search').value.trim();
  if (!query) return;
  const results = products.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase()) ||
    p.location.toLowerCase().includes(query.toLowerCase())
  );
  window.location.href = '/browse?search=' + encodeURIComponent(query);
}

// ===== DETAIL =====
function openDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentProduct = p;
  document.getElementById('detail-img').textContent = EMOJIS[p.category] || '📦';
  document.getElementById('detail-price').textContent = formatPrice(p.price);
  document.getElementById('detail-title').textContent = p.title;
  document.getElementById('detail-location').textContent = p.location;
  document.getElementById('detail-condition').textContent = p.condition;
  document.getElementById('detail-category').textContent = p.category.charAt(0).toUpperCase() + p.category.slice(1);
  document.getElementById('detail-rating').textContent = `${p.rating} / 5.0`;
  document.getElementById('detail-desc').textContent = p.desc;
  document.getElementById('detail-breadcrumb').textContent = p.title.slice(0, 30) + '...';
  const name = p.seller || 'Penjual';
  document.getElementById('detail-seller-name').textContent = name;
  document.getElementById('detail-seller-avatar').textContent = name[0].toUpperCase();
  const badge = p.trusted ? '<span class="product-badge badge-trusted" style="position:static;display:inline-block;margin-right:6px">Trusted</span>' : '';
  const freeShip = p.freeShip ? '<span class="product-badge badge-free" style="position:static;display:inline-block">Gratis Ongkir</span>' : '';
  document.getElementById('detail-badge').innerHTML = badge + freeShip;
  const inCart = cart.find(x => x.id === id);
  const btn = document.getElementById('detail-cart-btn');
  btn.textContent = inCart ? '✅ Sudah di Keranjang' : '🛒 Tambah ke Keranjang';
  btn.disabled = !!inCart;
  showPage('detail');
}

async function addCurrentToCart() {
  if (!currentProduct) return;
  if (!currentUser) { showToast('Silakan masuk terlebih dahulu', ''); window.location.href = '/login'; return; }
  if (cart.find(x => x.id === currentProduct.id)) { showToast('Sudah ada di keranjang', ''); return; }
  
  try {
    const response = await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        product_id: currentProduct.id,
        quantity: 1
      })
    });
    
    if (!response.ok) throw new Error('Failed to add to cart');
    
    cart.push({...currentProduct});
    updateCartCount();
    showToast('✅ Berhasil ditambahkan ke keranjang', 'success');
    const btn = document.getElementById('detail-cart-btn');
    if (btn) {
      btn.textContent = '✅ Sudah di Keranjang';
      btn.disabled = true;
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('⚠️ Gagal menambahkan ke keranjang', '');
  }
}

// ===== CART =====
function renderCart() {
  const empty = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');
  if (!cart.length) { empty.style.display = 'block'; content.style.display = 'none'; return; }
  empty.style.display = 'none'; content.style.display = 'grid';
  const list = document.getElementById('cart-items-list');
  list.innerHTML = cart.map(p => `
    <div class="cart-item">
      <div class="cart-item-img">${EMOJIS[p.category] || '📦'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.title}</div>
        <div class="cart-item-price">${formatPrice(p.price)}</div>
        <div class="cart-item-condition">Kondisi: ${p.condition} · ${p.location}</div>
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
    // Map cart items back to products with cart item ID
    cart = cartItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        return {
          ...product,
          quantity: item.quantity,
          cartItemId: item.id
        };
      }
      return null;
    }).filter(p => p);
    updateCartCount();
  } catch (error) {
    console.error('Error loading cart:', error);
  }
}

function removeCart(id) {
  const cartItem = cart.find(p => p.id === id);
  if (cartItem && cartItem.cartItemId && currentUser) {
    // Remove from database
    fetch(`${API_BASE}/cart/${cartItem.cartItemId}`, { method: 'DELETE' })
      .catch(error => console.error('Error removing from cart:', error));
  }
  
  cart = cart.filter(p => p.id !== id);
  updateCartCount();
  renderCart();
  showToast('Produk dihapus dari keranjang', '');
}

function updateCartCount() {
  document.getElementById('cart-count').textContent = cart.length;
}

function toggleWishlistCurrent() {
  if (!currentProduct) return;
  toggleWishlist(currentProduct.id);
  const btn = document.getElementById('detail-wishlist-btn');
  if (btn && wishlist.includes(currentProduct.id)) {
    btn.textContent = '❤️ Hapus dari Wishlist';
    btn.style.background = 'var(--primary)';
    btn.style.color = '#fff';
  } else if (btn) {
    btn.textContent = '🤍 Tambah ke Wishlist';
    btn.style.background = '';
    btn.style.color = '';
  }
}

function checkout() {
  if (!currentUser) { showPage('login'); return; }
  cart = [];
  updateCartCount();
  renderCart();
  showToast('🎉 Pesanan berhasil dibuat! (Fitur pembayaran tersedia Sprint 2)', 'success');
  showPage('home');
}

// ===== AUTH =====
async function loginEmail() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Isi email dan kata sandi', ''); return; }
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    
    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || 'Login gagal', '');
      return;
    }
    
    const user = await response.json();
    setUser(user.name, user.id, user.is_admin || false);
    showToast('✅ Berhasil masuk!', 'success');
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';
    showPage('home');
  } catch (error) {
    console.error('Login error:', error);
    showToast('⚠️ Terjadi kesalahan', '');
  }
}

async function registerEmail() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showToast('Lengkapi semua field', ''); return; }
  if (pass.length < 8) { showToast('Kata sandi minimal 8 karakter', ''); return; }
  
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pass })
    });
    
    if (!response.ok) {
      const error = await response.json();
      showToast(error.error || 'Registrasi gagal', '');
      return;
    }
    
    const user = await response.json();
    setUser(user.name, user.id, user.is_admin || false);
    showToast('✅ Akun berhasil dibuat!', 'success');
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';
    showPage('home');
  } catch (error) {
    console.error('Register error:', error);
    showToast('⚠️ Terjadi kesalahan', '');
  }
}

function loginWithGoogle() {
  setUser('Pengguna Google');
  showToast('✅ Masuk dengan Google berhasil!', 'success');
  showPage('home');
}

function setUser(name, id, isAdmin = false) {
  currentUser = { name, id, is_admin: isAdmin };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  document.getElementById('nav-auth').style.display = 'none';
  document.getElementById('nav-user').style.display = 'flex';
  document.getElementById('nav-user').style.alignItems = 'center';
  document.getElementById('user-avatar-btn').textContent = name[0].toUpperCase();
  
  // Show admin menu only for admins
  const adminMenuItem = document.getElementById('admin-menu-item');
  if (adminMenuItem) {
    adminMenuItem.style.display = isAdmin ? 'block' : 'none';
  }
  
  // Load user's cart and wishlist from database
  loadUserCart(id);
  loadUserWishlist(id);
}

async function loadUserCart(userId) {
  try {
    const response = await fetch(`${API_BASE}/cart/${userId}`);
    if (!response.ok) return;
    const cartItems = await response.json();
    // Map cart items back to products
    cart = cartItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return product ? {...product, quantity: item.quantity} : null;
    }).filter(p => p);
    updateCartCount();
  } catch (error) {
    console.error('Error loading cart:', error);
  }
}

async function loadUserWishlist(userId) {
  try {
    const response = await fetch(`${API_BASE}/wishlist/${userId}`);
    if (!response.ok) return;
    const wishlistItems = await response.json();
    wishlist = wishlistItems.map(item => item.product_id);
  } catch (error) {
    console.error('Error loading wishlist:', error);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  cart = [];
  wishlist = [];
  updateCartCount();
  document.getElementById('nav-auth').style.display = 'flex';
  document.getElementById('nav-user').style.display = 'none';
  showToast('Berhasil keluar', '');
  window.location.href = '/';
}

// ===== UPLOAD =====
function triggerUpload() { 
  document.getElementById('file-input').click(); 
}

function handleFileUpload(input) {
  if (input.files.length) {
    document.getElementById('upload-preview').textContent = '🖼️';
    showToast(`${input.files.length} foto dipilih`, 'success');
  }
}

async function submitProduct() {
  if (!currentUser) { showPage('login'); return; }
  const title = document.getElementById('up-title').value.trim();
  const price = document.getElementById('up-price').value;
  const cat = document.getElementById('up-cat').value;
  const cond = document.getElementById('up-cond').value;
  const loc = document.getElementById('up-loc').value.trim();
  const desc = document.getElementById('up-desc').value.trim();
  if (!title || !price || !cat || !cond || !loc || !desc) {
    showToast('Lengkapi semua field yang wajib diisi (*)', ''); return;
  }
  
  try {
    const freeOngkir = document.getElementById('up-ongkir').value === 'true';
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: desc,
        price: parseInt(price),
        category: cat,
        condition: cond,
        location: loc,
        seller_id: currentUser.id,
        free_shipping: freeOngkir,
        rating: 4.5,
        trusted: false
      })
    });
    
    if (!response.ok) throw new Error('Failed to create product');
    
    const newProduct = await response.json();
    products.unshift({
      id: newProduct.id,
      title: newProduct.title,
      price: newProduct.price,
      category: newProduct.category,
      condition: newProduct.condition,
      location: newProduct.location,
      rating: newProduct.rating,
      trusted: newProduct.trusted,
      freeShip: newProduct.freeShip,
      seller: newProduct.seller,
      desc: newProduct.desc
    });
    
    ['up-title','up-price','up-loc','up-desc'].forEach(id => document.getElementById(id).value = '');
    ['up-cat','up-cond','up-ongkir'].forEach(id => document.getElementById(id).selectedIndex = 0);
    document.getElementById('upload-preview').textContent = '📷';
    renderHome();
    showToast('✅ Produk berhasil dipublikasikan!', 'success');
    showPage('home');
  } catch (error) {
    console.error('Error uploading product:', error);
    showToast('⚠️ Gagal mempublikasikan produk', '');
  }
}

// ===== DROPDOWN =====
function toggleDropdown() {
  document.getElementById('user-dropdown').classList.toggle('open');
}

function closeDropdown() {
  document.getElementById('user-dropdown').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu')) closeDropdown();
});

// ===== TOAST =====
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' toast-success' : type === 'accent' ? ' toast-accent' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== SPRINT 2 FEATURES =====
function completePayment() {
  notifications.unshift('Pembayaran berhasil dilakukan');
  renderNotifications();
  cart = [];
  updateCartCount();
  showToast('✅ Pembayaran berhasil','toast-success');
  showPage('notifications');
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const box = document.getElementById('chat-box');

  if(!input.value.trim()) return;

  box.innerHTML += `
    <div class="chat-message chat-user">
      ${input.value}
    </div>
  `;

  input.value = '';
  box.scrollTop = box.scrollHeight;
}

function renderNotifications() {
  const list = document.getElementById('notification-list');
  if(!list) return;

  list.innerHTML = notifications.map(n => `
    <div class="notification-card">🔔 ${n}</div>
  `).join('');
}

async function toggleWishlist(id) {
  if (!currentUser) { showToast('Silakan masuk terlebih dahulu', ''); window.location.href = '/login'; return; }
  
  try {
    if(wishlist.includes(id)) {
      // Remove from wishlist
      const item = document.querySelector(`[data-wishlist-id="${id}"]`);
      if (item && item.wishlistItemId) {
        await fetch(`${API_BASE}/wishlist/${item.wishlistItemId}`, { method: 'DELETE' });
      }
      wishlist = wishlist.filter(x => x !== id);
      showToast('💔 Dihapus dari wishlist','');
    } else {
      // Add to wishlist
      const response = await fetch(`${API_BASE}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          product_id: id
        })
      });
      if (!response.ok) throw new Error('Failed to add to wishlist');
      const data = await response.json();
      wishlist.push(id);
      showToast('❤️ Ditambahkan ke wishlist','toast-accent');
    }
    renderWishlist();
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    showToast('⚠️ Gagal mengubah wishlist', '');
  }
}

function renderWishlist() {
  const grid = document.getElementById('wishlist-grid');
  if(!grid) return;

  const items = products.filter(p => wishlist.includes(p.id));

  grid.innerHTML = items.map(p => makeCard(p)).join('');
}

function renderStoreProducts() {
  const el = document.getElementById('store-products');
  if(!el) return;

  el.innerHTML = products.slice(0,4).map(p => makeCard(p)).join('');
}

// ===== INIT =====
// Load products from API and render UI
function initApp() {
  loadProducts().then(() => {
    renderHome();
  });
}

// Call init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
