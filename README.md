# ReBekas - Marketplace Barang Bekas

Aplikasi marketplace jual-beli barang bekas dengan arsitektur profesional menggunakan **Flask**, **SQLAlchemy Database**, dan template system.

## ✨ Fitur Utama

### Database & Backend
- ✅ **SQLite Database** - Menyimpan semua data pengguna, produk, order, chat, dll
- ✅ **REST API** - Complete API endpoints untuk CRUD operations
- ✅ **Authentication** - Login/Register dengan password hashing
- ✅ **Data Persistence** - Semua data tersimpan dengan baik

### Frontend
- ✅ Jelajahi produk dengan filter & pencarian
- ✅ Lihat detail produk
- ✅ Keranjang belanja
- ✅ Wishlist
- ✅ Chat dengan penjual
- ✅ Notifikasi
- ✅ Upload produk
- ✅ Dashboard toko
- ✅ Admin dashboard

## 📁 Struktur Folder

```
marketplace/
├── app.py                     # Flask application + API endpoints
├── models.py                  # Database models (Users, Products, Orders, etc)
├── seed.py                    # Database seeder dengan demo data
├── marketplace.db             # SQLite database (auto-created)
├── requirements.txt           # Python dependencies
├── README.md                  # File ini
├── DATABASE_GUIDE.md          # Dokumentasi database lengkap
│
├── static/                    # File statis (CSS, JS, assets)
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js          # Updated dengan API integration
│
└── templates/                 # Template HTML (Flask Jinja2)
    ├── base.html
    ├── index.html
    ├── browse.html
    ├── detail.html
    ├── cart.html
    ├── login.html
    ├── register.html
    ├── upload.html
    ├── payment.html
    ├── chat.html
    ├── notifications.html
    ├── wishlist.html
    ├── store.html
    └── admin.html
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Seed Database (Initialize dengan data demo)
```bash
python seed.py
```

### 3. Run Server
```bash
python app.py
```

Server akan berjalan di **http://localhost:5000**

**Atau cukup double-click** `run.bat` untuk automated setup!

---

## 🔐 Demo Accounts (untuk testing)

| Email | Password | Nama |
|-------|----------|------|
| budi@example.com | password123 | Budi Santoso |
| dewi@example.com | password123 | Dewi R |
| toko@example.com | password123 | Toko Elektronik Maju |
| hendri@example.com | password123 | Hendri F |
| kolektor@example.com | password123 | Kolektor ID |

---

## 📊 Database Overview

### Entities
- **Users** - Pengguna (seller + buyer)
- **Products** - Daftar produk
- **CartItems** - Keranjang belanja
- **WishlistItems** - Wishlist
- **Orders** - Pesanan
- **Reviews** - Review produk
- **Messages** - Chat antar user
- **Notifications** - Notifikasi user

### Database Type
- **SQLite** - Default (production-ready)
- Bisa upgrade ke **MySQL** atau **PostgreSQL** dengan mengubah connection string di `app.py`

---

## 🎨 Desain & Teknologi

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python Flask
- **Database**: SQLAlchemy ORM
- **API**: RESTful API
- **Auth**: Password hashing dengan Werkzeug
- **CSS Variables**: Sistem warna konsisten
- **Responsive Design**: Mobile-first approach

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register         Daftar akun baru
POST   /api/auth/login            Login
```

### Products
```
GET    /api/products              Dapatkan semua produk
GET    /api/products/<id>         Dapatkan produk spesifik
POST   /api/products              Buat produk baru
PUT    /api/products/<id>         Update produk
DELETE /api/products/<id>         Hapus produk
```

### Cart
```
GET    /api/cart/<user_id>        Dapatkan keranjang user
POST   /api/cart                  Tambah ke keranjang
DELETE /api/cart/<cart_id>        Hapus dari keranjang
```

### Wishlist
```
GET    /api/wishlist/<user_id>    Dapatkan wishlist user
POST   /api/wishlist              Tambah ke wishlist
DELETE /api/wishlist/<item_id>    Hapus dari wishlist
```

### Orders
```
POST   /api/orders                Buat order baru
GET    /api/orders/<user_id>      Dapatkan order user
```

Untuk endpoint lengkap, lihat **DATABASE_GUIDE.md**

---

## 🔄 Workflow

1. **User Register/Login**
   - Input email & password
   - Server validate & hash password
   - Store di database
   - Client save user info ke localStorage

2. **Browse Products**
   - Fetch data dari `/api/products`
   - Render di homepage dengan filter/search
   - Click produk → load detail

3. **Add to Cart**
   - Click "Tambah ke Keranjang"
   - Store di local array (bisa upgrade ke API)
   - Update cart count di navbar

4. **Upload Produk**
   - Form input (title, price, category, dll)
   - POST ke `/api/products`
   - Auto appear di homepage

5. **Checkout Order**
   - View keranjang
   - Klik checkout
   - Create order di database
   - Clear keranjang

---

## 🔧 Konfigurasi

### Change Database (MySQL/PostgreSQL)
Edit `app.py`:
```python
# MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://user:pass@localhost/marketplace'

# PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/marketplace'
```

### Change Port
```python
app.run(debug=True, port=8000)  # Change port 5000 to 8000
```

### Disable Debug Mode (Production)
```python
app.run(debug=False)
```

---

## 🧪 Testing

Buka browser dan cek:
- [ ] http://localhost:5000 - Homepage muncul
- [ ] Login dengan akun demo
- [ ] Cari & filter produk
- [ ] Lihat detail produk
- [ ] Tambah ke keranjang
- [ ] Upload produk baru
- [ ] Cek navbar user info tetap ada setelah refresh

---

## 📚 Documentation

- **DATABASE_GUIDE.md** - Dokumentasi database lengkap (required reading!)
- **SETUP_GUIDE.md** - Setup project dari nol
- **API Documentation** - Lihat DATABASE_GUIDE.md section API Endpoints

---

## 🔐 Security Notes

- ✅ Password di-hash dengan Werkzeug
- ✅ Input validation di backend
- ✅ CORS ready untuk external API
- ⚠️ TODO: Tambah CSRF protection
- ⚠️ TODO: Tambah rate limiting
- ⚠️ TODO: Tambah JWT authentication

---

## 🚀 Next Steps

### Priority 1 (Essential)
- [ ] Setup payment gateway (Midtrans/Stripe)
- [ ] Implement image upload
- [ ] Sinkronisasi cart dengan database

### Priority 2 (Important)
- [ ] Real-time chat dengan WebSocket
- [ ] Email notifications
- [ ] Admin dashboard stats API

### Priority 3 (Nice to have)
- [ ] User reviews & ratings
- [ ] Product search optimization
- [ ] Email verification
- [ ] Forgot password flow
- [ ] User profile page

---

## 📦 Dependencies

```
Flask==3.0.0              # Web framework
Werkzeug==3.0.1           # Utilities (hashing, etc)
Flask-SQLAlchemy==3.1.1   # Database ORM
Flask-Migrate==4.0.5      # Database migrations
```

---

## 🎓 Learning Resources

- Flask: https://flask.palletsprojects.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- REST API Design: https://restfulapi.net/

---

## 📝 Version History

### v2.0 (Current)
- ✨ Database integration with SQLAlchemy
- ✨ Complete REST API
- ✨ User authentication
- ✨ Data persistence

### v1.0 (Previous)
- HTML/CSS/JavaScript frontend
- Client-side routing
- Demo data

---

## 🆘 Troubleshooting

**Database error saat startup?**
```bash
python seed.py  # Re-initialize database
```

**Port 5000 already in use?**
Edit app.py, ubah `port=5000` ke port lain

**Module not found error?**
```bash
pip install -r requirements.txt --upgrade
```

---

## 📧 Support

Untuk dokumentasi lengkap database, baca **DATABASE_GUIDE.md**

---

**Created for ReBekas Marketplace - Sprint 2 with Database Integration**

✨ Database Integration Complete! Your marketplace data is now safe and persistent! ✨
