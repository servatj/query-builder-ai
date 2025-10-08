-- Sandbox Database Setup
-- Populate query_builder_sbox with same schema and data as production

USE query_builder_sbox;

-- Create the same tables as in the main application
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  signup_date DATE NOT NULL,
  state VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  order_date DATE NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_state ON users(state);
CREATE INDEX idx_users_signup_date ON users(signup_date);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(status);

-- Insert sample users (same as production but marked as sandbox)
INSERT INTO users (name, email, signup_date, state) VALUES
('John Doe (Sandbox)', 'john.sandbox@example.com', '2024-01-15', 'California'),
('Jane Smith (Sandbox)', 'jane.sandbox@example.com', '2024-01-20', 'Texas'),
('Mike Johnson (Sandbox)', 'mike.sandbox@example.com', '2024-02-01', 'New York'),
('Sarah Wilson (Sandbox)', 'sarah.sandbox@example.com', '2024-02-10', 'Florida'),
('David Brown (Sandbox)', 'david.sandbox@example.com', '2024-02-15', 'California'),
('Lisa Davis (Sandbox)', 'lisa.sandbox@example.com', '2024-03-01', 'Illinois'),
('Tom Miller (Sandbox)', 'tom.sandbox@example.com', '2024-03-05', 'Texas'),
('Amy Garcia (Sandbox)', 'amy.sandbox@example.com', '2024-03-10', 'Arizona'),
('Chris Martinez (Sandbox)', 'chris.sandbox@example.com', '2024-03-15', 'Washington'),
('Emma Taylor (Sandbox)', 'emma.sandbox@example.com', '2024-03-20', 'Oregon');

-- Insert sample products (sandbox versions)
INSERT INTO products (name, description, price, category, stock_quantity) VALUES
('Sandbox Laptop Pro', 'High-performance laptop for testing', 1299.99, 'electronics', 15),
('Test Smartphone X', 'Latest smartphone model for demos', 899.99, 'electronics', 25),
('Demo Wireless Headphones', 'Premium noise-canceling headphones', 299.99, 'electronics', 30),
('Sample Fiction Book', 'Bestselling novel for testing queries', 19.99, 'books', 50),
('Test Programming Guide', 'Complete programming reference', 49.99, 'books', 20),
('Demo T-Shirt', 'Comfortable cotton t-shirt', 24.99, 'clothing', 100),
('Sample Jeans', 'Classic denim jeans for testing', 79.99, 'clothing', 40),
('Test Coffee Maker', 'Automatic drip coffee maker', 89.99, 'home', 12),
('Demo Blender', 'High-speed blender for smoothies', 149.99, 'home', 8),
('Sample Running Shoes', 'Lightweight running shoes', 119.99, 'sports', 35);

-- Insert sample orders (sandbox test data)
INSERT INTO orders (user_id, product_id, quantity, total_amount, order_date, status) VALUES
(1, 1, 1, 1299.99, '2024-03-21', 'delivered'),
(2, 3, 2, 599.98, '2024-03-22', 'delivered'),
(3, 5, 1, 49.99, '2024-03-23', 'shipped'),
(1, 7, 1, 79.99, '2024-03-24', 'processing'),
(4, 2, 1, 899.99, '2024-03-25', 'pending'),
(5, 9, 1, 149.99, '2024-03-26', 'delivered'),
(2, 4, 3, 59.97, '2024-03-27', 'delivered'),
(6, 6, 2, 49.98, '2024-03-28', 'shipped'),
(7, 8, 1, 89.99, '2024-03-29', 'processing'),
(3, 10, 1, 119.99, '2024-03-30', 'delivered');

-- Add some additional test data for more complex queries
INSERT INTO orders (user_id, product_id, quantity, total_amount, order_date, status) VALUES
(8, 1, 1, 1299.99, '2024-04-01', 'cancelled'),
(9, 3, 1, 299.99, '2024-04-02', 'pending'),
(10, 5, 2, 99.98, '2024-04-03', 'processing'),
(4, 7, 1, 79.99, '2024-04-04', 'shipped'),
(6, 2, 1, 899.99, '2024-04-05', 'delivered');
