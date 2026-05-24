from app import app
from models import db, User, Product
from werkzeug.security import generate_password_hash

# Pastikan konfigurasi URI mengarah ke PostgreSQL yang sama dengan app.py
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:123456@localhost:5432/marketplace_db'

with app.app_context():
    print("Mereset tabel database di PostgreSQL...")
    db.drop_all()
    
    print("Membangun ulang struktur tabel sejati...")
    db.create_all()

    admin = User(name='Super Admin', email='admin@example.com', password=generate_password_hash('123456'), is_admin=True)
    seller = User(name='Toko Pak Budi', email='seller@example.com', password=generate_password_hash('123456'))
    buyer = User(name='Siswanto Pembeli', email='buyer@example.com', password=generate_password_hash('123456'))

    db.session.add_all([admin, seller, buyer])
    db.session.commit()

    p1 = Product(title='Laptop Bekas Mulus', description='Jarang pakai, sangat mulus.', price=2500000, category='elektronik', condition='Sangat Baik', location='Surabaya', seller_id=seller.id, image='')
    db.session.add(p1)
    db.session.commit()

    print("=========================================")
    print("✅ DATABASE POSTGRESQL BERHASIL DI-SEED!")
    print("=========================================")