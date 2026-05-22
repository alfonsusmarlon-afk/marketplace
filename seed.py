"""
Database seeder - jalankan dengan: python seed.py
"""
from app import app, db
from models import User, Product
from werkzeug.security import generate_password_hash

def seed_database():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        # ===== CREATE ADMIN USER =====
        admin_user = User(
            name='Admin',
            email='admin@example.com',
            password=generate_password_hash('admin123'),
            avatar='A',
            is_admin=True
        )
        db.session.add(admin_user)
        
        # ===== CREATE DEMO USERS =====
        users = [
            User(
                name='Budi Santoso',
                email='budi@example.com',
                password=generate_password_hash('password123'),
                avatar='B',
                is_admin=False
            ),
            User(
                name='Dewi R',
                email='dewi@example.com',
                password=generate_password_hash('password123'),
                avatar='D',
                is_admin=False
            ),
            User(
                name='Toko Elektronik Maju',
                email='toko@example.com',
                password=generate_password_hash('password123'),
                avatar='T',
                is_admin=False
            ),
            User(
                name='Hendri F',
                email='hendri@example.com',
                password=generate_password_hash('password123'),
                avatar='H',
                is_admin=False
            ),
            User(
                name='Kolektor ID',
                email='kolektor@example.com',
                password=generate_password_hash('password123'),
                avatar='K',
                is_admin=False
            ),
        ]
        
        for user in users:
            db.session.add(user)
        db.session.commit()
        
        # ===== NO DEMO PRODUCTS - START WITH EMPTY MARKETPLACE =====
        # Products will only appear after users upload them
        
        print("✅ Database seeded successfully!")
        print(f"✅ Added 1 admin user: admin@example.com / admin123")
        print(f"✅ Added {len(users)} regular users")
        print("✅ Product list is empty - users can start uploading!")

if __name__ == '__main__':
    seed_database()

