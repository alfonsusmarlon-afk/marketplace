from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(1), default='A')
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    products = db.relationship('Product', backref='seller', lazy=True, foreign_keys='Product.seller_id')
    orders = db.relationship('Order', backref='user', lazy=True)
    
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'avatar': self.avatar, 'is_admin': self.is_admin}

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    condition = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    image = db.Column(db.Text, nullable=True) 
    trusted = db.Column(db.Boolean, default=False)
    free_shipping = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Float, default=4.5)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # INI DIA YANG HILANG KEMARIN: Relasi Keranjang dan Wishlist dikembalikan!
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade='all, delete-orphan')
    wishlist_items = db.relationship('WishlistItem', backref='product', lazy=True, cascade='all, delete-orphan')
    
    order_items = db.relationship('OrderItem', backref='product', lazy=True)
    reviews = db.relationship('Review', backref='product', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {'id': self.id, 'title': self.title, 'desc': self.description, 'price': self.price, 'category': self.category, 'condition': self.condition, 'location': self.location, 'seller': self.seller.name if self.seller else 'Unknown', 'seller_id': self.seller_id, 'image': self.image, 'trusted': self.trusted, 'freeShip': self.free_shipping, 'rating': self.rating}

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    def to_dict(self): return {'id': self.id, 'product_id': self.product_id, 'quantity': self.quantity, 'product': self.product.to_dict()}

class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    def to_dict(self): return {'id': self.id, 'product_id': self.product_id, 'product': self.product.to_dict()}

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_price = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending') 
    shipping_proof = db.Column(db.Text, nullable=True) 
    receipt_proof = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self): 
        seller_id = self.items[0].product.seller_id if self.items else None
        seller_name = self.items[0].product.seller.name if self.items and self.items[0].product.seller else 'Unknown'
        return {
            'id': self.id, 'user_id': self.user_id, 'buyer_name': self.user.name, 
            'seller_id': seller_id, 'seller_name': seller_name,
            'total_price': self.total_price, 'status': self.status, 
            'shipping_proof': self.shipping_proof, 'receipt_proof': self.receipt_proof,
            'items': [item.to_dict() for item in self.items], 'created_at': self.created_at.isoformat()
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    def to_dict(self): return {'id': self.id, 'product_id': self.product_id, 'quantity': self.quantity, 'price': self.price, 'product': self.product.to_dict()}

class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    reviewer = db.relationship('User', foreign_keys=[reviewer_id])
    
    def to_dict(self): 
        return {'id': self.id, 'product_id': self.product_id, 'reviewer_name': self.reviewer.name, 'rating': self.rating, 'comment': self.comment, 'created_at': self.created_at.isoformat()}

class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    sender = db.relationship('User', foreign_keys=[sender_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])
    
    def to_dict(self):
        return {
            'id': self.id, 'sender_id': self.sender_id, 'sender_name': self.sender.name if self.sender else 'Unknown',
            'recipient_id': self.recipient_id, 'recipient_name': self.recipient.name if self.recipient else 'Unknown',
            'content': self.content, 'is_read': self.is_read, 'created_at': self.created_at.isoformat()
        }