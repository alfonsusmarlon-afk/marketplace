from flask import Flask, render_template, request, jsonify
from models import db, User, Product, CartItem, WishlistItem, Order, OrderItem, Review, Notification, Message
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)

# ===== DATABASE CONFIG =====
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "marketplace.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db.init_app(app)

# ===== CREATE TABLES =====
with app.app_context():
    db.create_all()

# ===== ROUTES: PAGES =====
@app.route('/')
@app.route('/home')
def home():
    return render_template('index.html')

@app.route('/browse')
def browse():
    return render_template('browse.html')

@app.route('/detail/<int:product_id>')
def detail(product_id):
    return render_template('detail.html', product_id=product_id)

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/upload')
def upload():
    return render_template('upload.html')

@app.route('/payment')
def payment():
    return render_template('payment.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/notifications')
def notifications():
    return render_template('notifications.html')

@app.route('/wishlist')
def wishlist():
    return render_template('wishlist.html')

@app.route('/store')
def store():
    return render_template('store.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# ===== API: PRODUCTS =====
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    # Get user from session/token - for now using first user or demo
    user_id = data.get('seller_id', 1)
    
    product = Product(
        title=data['title'],
        description=data['description'],
        price=data['price'],
        category=data['category'],
        condition=data['condition'],
        location=data['location'],
        seller_id=user_id,
        trusted=data.get('trusted', False),
        free_shipping=data.get('free_shipping', False),
        rating=data.get('rating', 4.5)
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    product.title = data.get('title', product.title)
    product.description = data.get('description', product.description)
    product.price = data.get('price', product.price)
    product.category = data.get('category', product.category)
    product.condition = data.get('condition', product.condition)
    product.location = data.get('location', product.location)
    product.trusted = data.get('trusted', product.trusted)
    product.free_shipping = data.get('free_shipping', product.free_shipping)
    
    db.session.commit()
    return jsonify(product.to_dict())

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return '', 204

# ===== API: AUTH =====
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email sudah terdaftar'}), 400
    
    user = User(
        name=data['name'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        avatar=data['name'][0].upper() if data['name'] else 'A'
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Email atau password salah'}), 401
    
    return jsonify(user.to_dict())

# ===== API: CART =====
@app.route('/api/cart/<int:user_id>', methods=['GET'])
def get_cart(user_id):
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in cart_items])

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    
    cart_item = CartItem.query.filter_by(
        user_id=data['user_id'],
        product_id=data['product_id']
    ).first()
    
    if cart_item:
        cart_item.quantity += data.get('quantity', 1)
    else:
        cart_item = CartItem(
            user_id=data['user_id'],
            product_id=data['product_id'],
            quantity=data.get('quantity', 1)
        )
        db.session.add(cart_item)
    
    db.session.commit()
    return jsonify(cart_item.to_dict()), 201

@app.route('/api/cart/<int:cart_id>', methods=['DELETE'])
def remove_from_cart(cart_id):
    cart_item = CartItem.query.get_or_404(cart_id)
    db.session.delete(cart_item)
    db.session.commit()
    return '', 204

# ===== API: WISHLIST =====
@app.route('/api/wishlist/<int:user_id>', methods=['GET'])
def get_wishlist(user_id):
    wishlist_items = WishlistItem.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in wishlist_items])

@app.route('/api/wishlist', methods=['POST'])
def add_to_wishlist():
    data = request.get_json()
    
    wishlist_item = WishlistItem.query.filter_by(
        user_id=data['user_id'],
        product_id=data['product_id']
    ).first()
    
    if not wishlist_item:
        wishlist_item = WishlistItem(
            user_id=data['user_id'],
            product_id=data['product_id']
        )
        db.session.add(wishlist_item)
        db.session.commit()
    
    return jsonify(wishlist_item.to_dict()), 201

@app.route('/api/wishlist/<int:wishlist_id>', methods=['DELETE'])
def remove_from_wishlist(wishlist_id):
    wishlist_item = WishlistItem.query.get_or_404(wishlist_id)
    db.session.delete(wishlist_item)
    db.session.commit()
    return '', 204

# ===== API: ORDERS =====
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    order = Order(
        user_id=data['user_id'],
        total_price=data['total_price'],
        status='pending'
    )
    
    for item in data.get('items', []):
        order_item = OrderItem(
            product_id=item['product_id'],
            quantity=item['quantity'],
            price=item['price']
        )
        order.items.append(order_item)
    
    db.session.add(order)
    
    # Clear cart
    CartItem.query.filter_by(user_id=data['user_id']).delete()
    
    db.session.commit()
    return jsonify(order.to_dict()), 201

@app.route('/api/orders/<int:user_id>', methods=['GET'])
def get_user_orders(user_id):
    orders = Order.query.filter_by(user_id=user_id).all()
    return jsonify([order.to_dict() for order in orders])

# ===== API: REVIEWS =====
@app.route('/api/reviews/<int:product_id>', methods=['GET'])
def get_product_reviews(product_id):
    reviews = Review.query.filter_by(product_id=product_id).all()
    return jsonify([review.to_dict() for review in reviews])

@app.route('/api/reviews', methods=['POST'])
def create_review():
    data = request.get_json()
    
    review = Review(
        product_id=data['product_id'],
        reviewer_id=data['reviewer_id'],
        rating=data['rating'],
        comment=data.get('comment')
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201

# ===== API: NOTIFICATIONS =====
@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([notif.to_dict() for notif in notifications])

@app.route('/api/notifications', methods=['POST'])
def create_notification():
    data = request.get_json()
    
    notif = Notification(
        user_id=data['user_id'],
        message=data['message'],
        type=data.get('type')
    )
    db.session.add(notif)
    db.session.commit()
    return jsonify(notif.to_dict()), 201

# ===== API: MESSAGES =====
@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.get_json()
    
    message = Message(
        sender_id=data['sender_id'],
        recipient_id=data['recipient_id'],
        product_id=data.get('product_id'),
        content=data['content']
    )
    db.session.add(message)
    db.session.commit()
    return jsonify(message.to_dict()), 201

@app.route('/api/messages/<int:user_id>', methods=['GET'])
def get_user_messages(user_id):
    messages = Message.query.filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).order_by(Message.created_at.desc()).all()
    return jsonify([msg.to_dict() for msg in messages])

# ===== API: ADMIN =====
@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    from sqlalchemy import func
    
    total_users = User.query.count()
    total_products = Product.query.count()
    total_orders = Order.query.count()
    total_revenue = db.session.query(func.sum(Order.total_price)).scalar() or 0
    
    return jsonify({
        'total_users': total_users,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_revenue': total_revenue
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
