-- Sample database schema for testing the PostgreSQL MCP server
-- This will be automatically executed when the container starts

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    age INTEGER CHECK (age > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category_id INTEGER REFERENCES categories(id),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL
);

-- Insert sample users
INSERT INTO users (name, email, age) VALUES
    ('Alice Johnson', 'alice@example.com', 28),
    ('Bob Smith', 'bob@example.com', 35),
    ('Carol Davis', 'carol@example.com', 42),
    ('David Wilson', 'david@example.com', 29),
    ('Eva Brown', 'eva@example.com', 31);

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Electronic devices and gadgets'),
    ('Books', 'Physical and digital books'),
    ('Clothing', 'Apparel and accessories'),
    ('Home & Garden', 'Home improvement and garden supplies');

-- Insert sample products
INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES
    ('Laptop Pro', 'High-performance laptop for professionals', 1299.99, 1, 15),
    ('Wireless Headphones', 'Premium noise-canceling headphones', 249.99, 1, 30),
    ('Programming Book', 'Learn advanced programming concepts', 59.99, 2, 50),
    ('T-Shirt', 'Comfortable cotton t-shirt', 19.99, 3, 100),
    ('Garden Tools Set', 'Complete set of gardening tools', 89.99, 4, 25),
    ('Smartphone', 'Latest model smartphone', 799.99, 1, 20),
    ('Cookbook', 'Delicious recipes for home cooking', 29.99, 2, 35);

-- Insert sample orders
INSERT INTO orders (user_id, total_amount, status) VALUES
    (1, 1549.98, 'completed'),
    (2, 59.99, 'completed'),
    (3, 319.98, 'pending'),
    (1, 89.99, 'shipped'),
    (4, 849.98, 'completed');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 1, 1299.99),  -- Alice bought laptop
    (1, 2, 1, 249.99),   -- Alice bought headphones
    (2, 3, 1, 59.99),    -- Bob bought programming book
    (3, 2, 1, 249.99),   -- Carol bought headphones
    (3, 4, 1, 19.99),    -- Carol bought t-shirt
    (3, 7, 1, 29.99),    -- Carol bought cookbook
    (3, 4, 1, 19.99),    -- Carol bought another t-shirt
    (4, 5, 1, 89.99),    -- Alice bought garden tools
    (5, 6, 1, 799.99),   -- David bought smartphone
    (5, 4, 2, 19.99);    -- David bought 2 t-shirts

-- Create some indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Create a view for order summaries
CREATE VIEW order_summary AS
SELECT 
    o.id as order_id,
    u.name as customer_name,
    u.email as customer_email,
    o.total_amount,
    o.status,
    o.order_date,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.name, u.email, o.total_amount, o.status, o.order_date
ORDER BY o.order_date DESC;
