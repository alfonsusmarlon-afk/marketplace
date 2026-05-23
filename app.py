from flask import Flask, render_template, request, jsonify
from models import db, User, Product, CartItem, WishlistItem, Order, OrderItem, Message
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "marketplace.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db.init_app(app)
with app.app_context(): db.create_all()

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

# HALAMAN BARU: Pesanan Pembeli
@app.route('/orders')
def orders_page(): return render_template('orders.html')

@app.route('/api/products', methods=['GET'])
def get_products():
    lunas_orders = Order.query.filter(Order.status.in_(['lunas', 'verifikasi_kirim', 'dikirim', 'verifikasi_terima', 'selesai'])).all()
    sold_product_ids = {item.product_id for order in lunas_orders for item in order.items}
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products if p.id not in sold_product_ids])

@app.route('/api/products/<int:product_id>', methods=['GET', 'PUT'])
def handle_product(product_id):
    product = Product.query.get_or_404(product_id)
    if request.method == 'PUT':
        data = request.get_json()
        product.title, product.price, product.description = data.get('title', product.title), data.get('price', product.price), data.get('description', product.description)
        db.session.commit()
    return jsonify(product.to_dict())

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    product = Product(title=data['title'], description=data['description'], price=data['price'], category=data['category'], condition=data['condition'], location=data['location'], seller_id=data.get('seller_id', 1), free_shipping=data.get('free_shipping', False))
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@app.route('/api/store/<int:seller_id>', methods=['GET'])
def get_store_dashboard(seller_id):
    my_products = Product.query.filter_by(seller_id=seller_id).all()
    orders = Order.query.all()
    items_data, total_revenue = [], 0
    for p in my_products:
        status, order_status, order_id = 'Tersedia', '-', None
        for order in orders:
            for item in order.items:
                if item.product_id == p.id:
                    status, order_status, order_id = 'Terjual', order.status, order.id
                    if order.status == 'selesai': total_revenue += item.price
                    break
            if status == 'Terjual': break
        items_data.append({'id': p.id, 'title': p.title, 'price': p.price, 'status': status, 'order_status': order_status, 'order_id': order_id})
    return jsonify({'items': items_data, 'total_revenue': total_revenue})

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first(): return jsonify({'error': 'Email terdaftar'}), 400
    user = User(name=data['name'], email=data['email'], password=generate_password_hash(data['password']), avatar=data['name'][0].upper())
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password, data['password']): return jsonify({'error': 'Email/pass salah'}), 401
    return jsonify(user.to_dict())

@app.route('/api/cart/<int:user_id>', methods=['GET'])
def get_cart(user_id): return jsonify([item.to_dict() for item in CartItem.query.filter_by(user_id=user_id).all()])
@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    cart_item = CartItem.query.filter_by(user_id=data['user_id'], product_id=data['product_id']).first()
    if cart_item: cart_item.quantity += data.get('quantity', 1)
    else: db.session.add(CartItem(user_id=data['user_id'], product_id=data['product_id'], quantity=data.get('quantity', 1)))
    db.session.commit()
    return '', 201
@app.route('/api/cart/<int:cart_id>', methods=['DELETE'])
def remove_from_cart(cart_id): db.session.delete(CartItem.query.get_or_404(cart_id)); db.session.commit(); return '', 204

@app.route('/api/wishlist/<int:user_id>', methods=['GET'])
def get_wishlist(user_id): return jsonify([item.to_dict() for item in WishlistItem.query.filter_by(user_id=user_id).all()])
@app.route('/api/wishlist', methods=['POST'])
def add_wishlist():
    data = request.get_json()
    if not WishlistItem.query.filter_by(user_id=data['user_id'], product_id=data['product_id']).first():
        db.session.add(WishlistItem(user_id=data['user_id'], product_id=data['product_id']))
        db.session.commit()
    return '', 201

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    order = Order(user_id=data['user_id'], total_price=data['total_price'], status='pending')
    for item in data.get('items', []): order.items.append(OrderItem(product_id=item['product_id'], quantity=item['quantity'], price=item['price']))
    db.session.add(order)
    CartItem.query.filter_by(user_id=data['user_id']).delete()
    db.session.commit()
    return jsonify(order.to_dict()), 201

@app.route('/api/orders/buyer/<int:buyer_id>', methods=['GET'])
def get_buyer_orders(buyer_id):
    return jsonify([o.to_dict() for o in Order.query.filter_by(user_id=buyer_id).order_by(Order.created_at.desc()).all()])

# API UPLOAD BUKTI (BASE64)
@app.route('/api/orders/<int:order_id>/proof', methods=['PUT'])
def upload_order_proof(order_id):
    data = request.get_json()
    order = Order.query.get_or_404(order_id)
    if data['type'] == 'shipping':
        order.shipping_proof = data['image']
        order.status = 'verifikasi_kirim'
    elif data['type'] == 'receipt':
        order.receipt_proof = data['image']
        order.status = 'verifikasi_terima'
    db.session.commit()
    return jsonify(order.to_dict())

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    from sqlalchemy import func
    return jsonify({'total_users': User.query.count(), 'total_products': Product.query.count(), 'total_orders': Order.query.count(), 'total_revenue': db.session.query(func.sum(Order.total_price)).scalar() or 0})

@app.route('/api/admin/orders', methods=['GET'])
def get_all_orders(): return jsonify([o.to_dict() for o in Order.query.order_by(Order.created_at.desc()).all()])

@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    order.status = request.get_json().get('status', order.status)
    db.session.commit()
    return jsonify(order.to_dict())

# API ADMIN MEMANTAU SEMUA CHAT USER
@app.route('/api/admin/all_chats', methods=['GET'])
def get_all_system_chats():
    msgs = Message.query.order_by(Message.created_at.desc()).limit(100).all()
    return jsonify([m.to_dict() for m in msgs])

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.get_json()
    msg = Message(sender_id=data['sender_id'], recipient_id=data['recipient_id'], content=data['content'])
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201

@app.route('/api/messages/<int:user_id>', methods=['GET'])
def get_user_messages(user_id):
    msgs = Message.query.filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).order_by(Message.created_at.asc()).all()
    return jsonify([m.to_dict() for m in msgs])

@app.route('/api/messages/unread/<int:user_id>', methods=['GET'])
def get_unread_count(user_id): return jsonify({'unread_count': Message.query.filter_by(recipient_id=user_id, is_read=False).count()})

@app.route('/api/messages/read', methods=['POST'])
def mark_messages_read():
    data = request.get_json()
    for msg in Message.query.filter_by(sender_id=data.get('partner_id'), recipient_id=data.get('user_id'), is_read=False).all(): msg.is_read = True
    db.session.commit()
    return jsonify({'status': 'success'})

if __name__ == '__main__': app.run(debug=True, port=5000)