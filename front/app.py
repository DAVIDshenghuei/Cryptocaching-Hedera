from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import random
from py_ecc.bn128 import FQ
import requests  # 確保導入 requests 模塊

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///geocaching.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


def poseidon_hash(user_id, prev_hash):
    # Простая реализация Poseidon-подобной хеш-функции в конечном поле BN128
    # В реальном применении следует использовать полную реализацию Poseidon
    p = 21888242871839275222246405745257275088548364400416034343698204186575808495617  # BN128 prime

    # Преобразуем входные данные в элементы конечного поля
    user_id_fq = FQ(user_id)
    prev_hash_fq = FQ(prev_hash)

    # Выполняем операции в конечном поле
    result = (user_id_fq * prev_hash_fq + user_id_fq + prev_hash_fq)

    # Возвращаем числовое значение
    return int(result)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)


class Test(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cache_id = db.Column(db.Integer, db.ForeignKey('cache.id'), nullable=False)
    question = db.Column(db.String(200), nullable=False)
    option_a = db.Column(db.String(200), nullable=False)
    option_b = db.Column(db.String(200), nullable=False)
    option_c = db.Column(db.String(200), nullable=False)
    answer = db.Column(db.String(1), nullable=False)  # a, b, or c


class Cache(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    current_hash = db.Column(db.BigInteger, default=12345)  # I_j value
    tests = db.relationship('Test', backref='cache', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'latitude': self.latitude,
            'longitude': self.longitude
        }


class Verification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    cache_id = db.Column(db.Integer, db.ForeignKey('cache.id'), nullable=False)
    verified = db.Column(db.Boolean, nullable=False)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/')
def index():
    caches = Cache.query.all()
    cache_list = [cache.to_dict() for cache in caches]
    print('Number of caches:', len(cache_list))
    print('First cache:', cache_list[0] if cache_list else 'No caches')
    return render_template('index.html', caches=cache_list)


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))

        user = User(username=username,
                    password_hash=generate_password_hash(password, method='sha256'))
        db.session.add(user)
        db.session.commit()

        return redirect(url_for('login'))
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


@app.route('/cache/<int:cache_id>')
def cache_detail(cache_id):
    cache = Cache.query.get_or_404(cache_id)
    already_verified = False
    if current_user.is_authenticated:
        verification = Verification.query.filter_by(
            user_id=current_user.id,
            cache_id=cache_id
        ).first()
        already_verified = verification is not None
    return render_template('cache_detail.html', cache=cache, already_verified=already_verified)


@app.route('/verify/<int:cache_id>')
@login_required
def verify_cache(cache_id):
    # Проверяем, не верифицировал ли пользователь уже этот тайник
    existing_verification = Verification.query.filter_by(
        user_id=current_user.id,
        cache_id=cache_id
    ).first()

    if existing_verification:
        flash('You have already verified this cache')
        return redirect(url_for('cache_detail', cache_id=cache_id))

    # Получаем тайник и его тесты
    cache = Cache.query.get_or_404(cache_id)
    # Выбираем случайный тест
    random_test = random.choice(cache.tests)

    return render_template('test.html', cache=cache, test=random_test)


@app.route('/submit_test/<int:cache_id>', methods=['POST'])
@login_required
def submit_test(cache_id):
    print("Received request")
    test_id = request.form.get('test_id')
    user_answer = request.form.get('answer')

    test = Test.query.get_or_404(test_id)
    cache = Cache.query.get_or_404(cache_id)

    # Проверяем ответ
    if user_answer == test.answer:
        # Создаем запись о верификации
        verification = Verification(
            user_id=current_user.id,
            cache_id=cache_id,
            verified=True
        )
        db.session.add(verification)

        # Обновляем хеш тайника
        new_hash = poseidon_hash(current_user.id, cache.current_hash)
        cache.current_hash = new_hash

        db.session.commit()
        return redirect(url_for('verification_success', cache_id=cache_id))
    else:
        # Создаем запись о неудачной верификации
        verification = Verification(
            user_id=current_user.id,
            cache_id=cache_id,
            verified=False
        )
        db.session.add(verification)
        db.session.commit()
        return redirect(url_for('verification_failure'))


@app.route('/submit_test', methods=['POST'])
def handle_request():
    print("Received request")  # 確認請求是否到達
    test_id = request.form.get('test_id')
    user_answer = request.form.get('answer')
    
    # 在這裡可以添加更多的邏輯來處理請求
    print(f"Test ID: {test_id}, User Answer: {user_answer}")

    # 返回一個簡單的響應
    return jsonify({"message": "Request received", "test_id": test_id, "user_answer": user_answer}), 200


def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        a, b = 0, 1
        for _ in range(2, n + 1):
            a, b = b, a + b
        return b


@app.route('/success')
@login_required
def verification_success():
    user_id = current_user.id
    cache_id = request.args.get('cache_id', type=int)
    cache = Cache.query.get_or_404(cache_id)
    return render_template('verification_success.html',
                           user_id=user_id,
                           current_hash=cache.current_hash)


@app.route('/failure')
@login_required
def verification_failure():
    return render_template('verification_failure.html')


@app.route('/add_cache', methods=['GET', 'POST'])
@login_required
def add_cache():
    if not current_user.is_admin:
        flash('Only admins can add new caches')
        return redirect(url_for('index'))

    if request.method == 'POST':
        cache = Cache(
            name=request.form['name'],
            description=request.form['description'],
            latitude=float(request.form['latitude']),
            longitude=float(request.form['longitude'])
        )
        db.session.add(cache)
        db.session.commit()

        # Создаем 3 теста для тайника
        tests = [
            Test(
                cache_id=cache.id,
                question=request.form[f'question{i}'],
                option_a=request.form[f'option{i}_a'],
                option_b=request.form[f'option{i}_b'],
                option_c=request.form[f'option{i}_c'],
                answer=request.form[f'answer{i}']
            ) for i in range(1, 4)
        ]
        db.session.add_all(tests)
        db.session.commit()

        return redirect(url_for('index'))

    return render_template('add_cache.html')


def create_admin():
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin', method='sha256'),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()


def create_test_cache():
    if Cache.query.count() == 0:
        test_cache = Cache(
            name='Test Cache',
            description='This is a test cache location',
            latitude=46.5197,
            longitude=6.6323
        )
        db.session.add(test_cache)
        db.session.commit()

        # Добавляем тестовые вопросы
        tests = [
            Test(
                cache_id=test_cache.id,
                question=f'Test Question {i}',
                option_a='Option A',
                option_b='Option B',
                option_c='Option C',
                answer=chr(ord('a') + i - 1)  # a, b, c для i = 1, 2, 3
            ) for i in range(1, 4)
        ]
        db.session.add_all(tests)
        db.session.commit()
        print('Test cache created with 3 test questions')


@app.route('/execute-claim', methods=['POST'])
def execute_claim():
    print("Claim execution request received")
    
    # 發送請求到 Node.js 伺服器
    response = requests.post('http://localhost:7546/claimDemo', json={})  # 根據需要傳遞 JSON 數據
    
    if response.status_code == 200:
        print("Node.js server response:", response.json())
        return jsonify({"message": "Claim executed successfully", "data": response.json()}), 200
    else:
        print("Error from Node.js server:", response.text)
        return jsonify({"message": "Failed to execute claim", "error": response.text}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_admin()
        create_test_cache()
    app.run(debug=True)