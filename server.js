const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد قاعدة البيانات SQLite محلياً
const db = new sqlite3.Database('./store.db', (err) => {
    if (err) console.error('Error opening database', err.message);
    else console.log('Connected to SQLite database.');
});

// إنشاء جداول المنتجات والطلبات
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        description TEXT,
        image TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        customer_name TEXT,
        address TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // إضافة المنتجات الأربعة الافتراضية إذا كانت الجدول فارغاً
    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const defaultProducts = [
                ['فرشاة تنظيف الفراء الذكية', 29.99, 'تزيل فراء الحيوانات الأليفة بسهولة بضغطة زر واحدة.', 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=500&q=80'],
                ['أداة تقليم الأظافر الهادئة', 24.99, 'مصممة خصيصاً بدون إزعاج أو خوف لحيوانك الأليف.', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=500&q=80'],
                ['لعبة تفاعلية متحركة للقطط', 19.99, 'تحرك تلقائياً لتحفيز طاقة ونشاط قطتك طوال اليوم.', 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=500&q=80'],
                ['سرير مريح ومقاوم للماء', 45.99, 'يوفر الراحة القصوى ووسادة قابلة للغسل بسهولة.', 'https://images.unsplash.com/photo-1592194996308-7b43878e84a1?auto=format&fit=crop&w=500&q=80']
            ];
            const stmt = db.prepare("INSERT INTO products (name, price, description, image) VALUES (?, ?, ?, ?)");
            defaultProducts.forEach(p => stmt.run(p));
            stmt.finalize();
        }
    });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API لجلب المنتجات
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API لإضافة طلب جديد (من العملاء)
app.post('/api/orders', (req, res) => {
    const { product_id, customer_name, address, phone } = req.body;
    db.run(`INSERT INTO orders (product_id, customer_name, address, phone) VALUES (?, ?, ?, ?)`,
        [product_id, customer_name, address, phone], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, orderId: this.lastID });
        });
});

// API لجلب الطلبات (خاص بلوحة التحكم)
app.get('/api/orders', (req, res) => {
    db.all(`SELECT orders.*, products.name as product_name FROM orders JOIN products ON orders.product_id = products.id`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});