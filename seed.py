from app import app
from models import db, User, Product
from werkzeug.security import generate_password_hash

with app.app_context():
    print("Mereset tabel database...")
    db.drop_all()  # Menghapus tabel lama tanpa menghapus file
    
    print("Membangun ulang struktur...")
    db.create_all()

    # 1. AKUN ADMIN
    admin = User(name='Super Admin', email='admin@example.com', password=generate_password_hash('123456'), is_admin=True)
    # 2. AKUN PENJUAL DEMO
    seller = User(name='Toko Pak Budi', email='seller@example.com', password=generate_password_hash('123456'))
    # 3. AKUN PEMBELI DEMO
    buyer = User(name='Siswanto Pembeli', email='buyer@example.com', password=generate_password_hash('123456'))

    db.session.add_all([admin, seller, buyer])
    db.session.commit()

    # Masukkan 1 barang otomatis untuk penjual
    p1 = Product(title='Laptop Bekas Mulus', description='Jarang pakai, masih sangat mulus.', price=2500000, category='elektronik', condition='Sangat Baik', location='Surabaya', seller_id=seller.id)
    db.session.add(p1)
    db.session.commit()

    print("=========================================")
    print("✅ DATABASE BERHASIL DIRESET & DIPERBARUI")
    print("=========================================")
    print("Gunakan akun ini untuk login:")
    print("👉 Admin   : admin@example.com  (Pass: 123456)")
    print("👉 Penjual : seller@example.com (Pass: 123456)")
    print("👉 Pembeli : buyer@example.com  (Pass: 123456)")
    print("=========================================")