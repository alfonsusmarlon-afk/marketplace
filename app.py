from flask import Flask, render_template, request, jsonify
from models import db, User, Product, CartItem, WishlistItem, Order, OrderItem, Review, Message
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)

# ===== DATABASE CONFIG =====
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "marketplace.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db.init_app(app)

with app.app_context():
    db.create_all()

# ===== ROUTES: PAGES =====
@app.route('/')
@app.route('/home')
def home(): return render_template('index.html')

@app.route('/browse')
def browse(): return render_template('browse.html')

@app.route('/detail/<int:product_id>')
def detail(product_id): return render_template('detail.html', product_id=product_id)

@app.route('/cart')
def cart(): return render_template('cart.html')

@app.route('/login')
def login(): return render_template('login.html')

@app.route('/register')
def register(): return render_template('register.html')

@app.route('/upload')
def upload(): return render_template('upload.html')

@app.route('/payment')
def payment(): return render_template('payment.html')

@app.route('/chat')
def chat(): return render_template('chat.html')

@app.route('/wishlist')
def wishlist(): return render_template('wishlist.html')

@app.route('/store')
def store(): return render_template('store.html')

@app.route('/admin')
def admin(): return render_template('admin.html')

# ===== API: PRODUCTS =====
@app.route('/api/products', methods=['GET'])
def get_products():
    ordered_items = OrderItem.query.all()
    ordered_product_ids = {item.product_id for item in ordered_items}
    products = Product.query.all()
    
    available_products = []
    for p in products:
        if p.id not in ordered_product_ids:
            p_dict = p.to_dict()
            p_dict['seller_id'] = p.seller_id # (PENTING) Menyisipkan ID Penjual
            available_products.append(p_dict)
            
    return jsonify(available_products)

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    p_dict = product.to_dict()
    p_dict['seller_id'] = product.seller_id
    return jsonify(p_dict)

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    user_id = data.get('seller_id', 1)
    product = Product(
        title=data['title'], description=data['description'], price=data['price'],
        category=data['category'], condition=data['condition'], location=data['location'],
        seller_id=user_id, trusted=data.get('trusted', False),
        free_shipping=data.get('free_shipping', False), rating=data.get('rating', 4.5)
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

# ===== API: STORE DASHBOARD =====
@app.route('/api/store/<int:seller_id>', methods=['GET'])
def get_store_dashboard(seller_id):
    my_products = Product.query.filter_by(seller_id=seller_id).all()
    orders = Order.query.all()
    items_data, total_revenue = [], 0
    
    for p in my_products:
        status, order_status = 'Tersedia', '-'
        for order in orders:
            for item in order.items:
                if item.product_id == p.id:
                    status = 'Terjual'
                    order_status = order.status
                    if order.status == 'lunas': total_revenue += item.price
                    break
            if status == 'Terjual': break
        items_data.append({'id': p.id, 'title': p.title, 'price': p.price, 'category': p.category, 'status': status, 'order_status': order_status})
        
    return jsonify({'items': items_data, 'total_revenue': total_revenue})

# ===== API: AUTH =====
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first(): return jsonify({'error': 'Email sudah terdaftar'}), 400
    user = User(name=data['name'], email=data['email'], password=generate_password_hash(data['password']), avatar=data['name'][0].upper() if data['name'] else 'A')
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password, data['password']): return jsonify({'error': 'Email atau password salah'}), 401
    return jsonify(user.to_dict())

# ===== API: CART & WISHLIST =====
@app.route('/api/cart/<int:user_id>', methods=['GET'])
def get_cart(user_id):
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in cart_items])

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    cart_item = CartItem.query.filter_by(user_id=data['user_id'], product_id=data['product_id']).first()
    if cart_item: cart_item.quantity += data.get('quantity', 1)
    else:
        cart_item = CartItem(user_id=data['user_id'], product_id=data['product_id'], quantity=data.get('quantity', 1))
        db.session.add(cart_item)
    db.session.commit()
    return jsonify(cart_item.to_dict()), 201

@app.route('/api/cart/<int:cart_id>', methods=['DELETE'])
def remove_from_cart(cart_id):
    cart_item = CartItem.query.get_or_404(cart_id)
    db.session.delete(cart_item)
    db.session.commit()
    return '', 204

@app.route('/api/wishlist/<int:user_id>', methods=['GET'])
def get_wishlist(user_id):
    wishlist_items = WishlistItem.query.filter_by(user_id=user_id).all()
    return jsonify([item.to_dict() for item in wishlist_items])

@app.route('/api/wishlist', methods=['POST'])
def add_to_wishlist():
    data = request.get_json()
    wishlist_item = WishlistItem.query.filter_by(user_id=data['user_id'], product_id=data['product_id']).first()
    if not wishlist_item:
        wishlist_item = WishlistItem(user_id=data['user_id'], product_id=data['product_id'])
        db.session.add(wishlist_item)
        db.session.commit()
    return jsonify(wishlist_item.to_dict()), 201

@app.route('/api/wishlist/<int:wishlist_id>', methods=['DELETE'])
def remove_from_wishlist(wishlist_id):
    wishlist_item = WishlistItem.query.get_or_404(wishlist_id)
    db.session.delete(wishlist_item)
    db.session.commit()
    return '', 204

# ===== API: ORDERS & ADMIN =====
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    order = Order(user_id=data['user_id'], total_price=data['total_price'], status='pending')
    for item in data.get('items', []):
        order.items.append(OrderItem(product_id=item['product_id'], quantity=item['quantity'], price=item['price']))
    db.session.add(order)
    CartItem.query.filter_by(user_id=data['user_id']).delete()
    db.session.commit()
    return jsonify(order.to_dict()), 201

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    from sqlalchemy import func
    return jsonify({
        'total_users': User.query.count(),
        'total_products': Product.query.count(),
        'total_orders': Order.query.count(),
        'total_revenue': db.session.query(func.sum(Order.total_price)).scalar() or 0
    })

@app.route('/api/admin/orders', methods=['GET'])
def get_all_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders])

@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.get_json()
    order = Order.query.get_or_404(order_id)
    order.status = data.get('status', order.status)
    db.session.commit()
    return jsonify(order.to_dict())

# ===== API: MESSAGES (CHAT) =====
@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.get_json()
    message = Message(
        sender_id=data['sender_id'],
        recipient_id=data['recipient_id'], # (PENTING) Kini dikirim spesifik ke ID partner
        content=data['content']
    )
    db.session.add(message)
    db.session.commit()
    return jsonify(message.to_dict()), 201

@app.route('/api/messages/<int:user_id>', methods=['GET'])
def get_user_messages(user_id):
    messages = Message.query.filter(
        (Message.sender_id == user_id) | (Message.recipient_id == user_id)
    ).order_by(Message.created_at.asc()).all()
    
    result = []
    for msg in messages:
        data = msg.to_dict()
        rec = User.query.get(msg.recipient_id)
        # (PENTING) Ambil nama lawan bicara
        data['recipient_name'] = rec.name if rec else 'Unknown'
        result.append(data)
        
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)