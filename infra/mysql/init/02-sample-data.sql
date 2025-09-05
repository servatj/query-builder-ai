-- Sample data for testing the AI Query Builder
USE query_builder;

-- Insert sample users
INSERT INTO users (name, email, signup_date, state, age, phone) VALUES
('John Smith', 'john.smith@email.com', '2024-01-15', 'California', 28, '555-0101'),
('Sarah Johnson', 'sarah.j@email.com', '2024-02-20', 'Texas', 32, '555-0102'),
('Mike Davis', 'mike.davis@email.com', '2024-01-22', 'California', 25, '555-0103'),
('Emily Wilson', 'emily.w@email.com', '2024-03-10', 'New York', 29, '555-0104'),
('David Brown', 'david.brown@email.com', '2024-02-05', 'Florida', 35, '555-0105'),
('Lisa Garcia', 'lisa.garcia@email.com', '2024-03-15', 'Texas', 27, '555-0106'),
('James Miller', 'james.miller@email.com', '2024-01-30', 'California', 31, '555-0107'),
('Jessica Taylor', 'jessica.t@email.com', '2024-02-12', 'Illinois', 26, '555-0108'),
('Robert Anderson', 'robert.a@email.com', '2024-03-08', 'Washington', 33, '555-0109'),
('Amanda Martinez', 'amanda.m@email.com', '2024-01-25', 'Oregon', 30, '555-0110'),
('Christopher Lee', 'chris.lee@email.com', '2024-02-28', 'Nevada', 34, '555-0111'),
('Jennifer White', 'jennifer.w@email.com', '2024-03-05', 'Arizona', 28, '555-0112'),
('Matthew Thompson', 'matt.t@email.com', '2024-01-18', 'Colorado', 29, '555-0113'),
('Ashley Clark', 'ashley.c@email.com', '2024-02-22', 'Utah', 26, '555-0114'),
('Daniel Rodriguez', 'daniel.r@email.com', '2024-03-12', 'New Mexico', 32, '555-0115');

-- Insert sample products
INSERT INTO products (name, price, category, stock_quantity, description) VALUES
('iPhone 15 Pro', 999.99, 'electronics', 50, 'Latest Apple smartphone with A17 Pro chip'),
('MacBook Air M3', 1299.99, 'electronics', 25, 'Powerful laptop with M3 chip and 13-inch display'),
('Sony WH-1000XM5', 399.99, 'electronics', 100, 'Premium noise-canceling wireless headphones'),
('The Great Gatsby', 12.99, 'books', 200, 'Classic American novel by F. Scott Fitzgerald'),
('To Kill a Mockingbird', 14.99, 'books', 150, 'Pulitzer Prize-winning novel by Harper Lee'),
('1984', 13.99, 'books', 180, 'Dystopian social science fiction novel by George Orwell'),
('Nike Air Max 270', 129.99, 'clothing', 75, 'Comfortable running shoes with Max Air cushioning'),
('Levi\'s 501 Jeans', 79.99, 'clothing', 120, 'Classic straight-leg denim jeans'),
('Patagonia Fleece Jacket', 199.99, 'clothing', 40, 'Warm and sustainable outdoor fleece jacket'),
('KitchenAid Stand Mixer', 349.99, 'home', 30, 'Professional-grade stand mixer for baking'),
('Dyson V15 Vacuum', 749.99, 'home', 20, 'Powerful cordless vacuum with laser detection'),
('Instant Pot Duo 7-in-1', 99.99, 'home', 60, 'Multi-functional electric pressure cooker'),
('Samsung 55" QLED TV', 899.99, 'electronics', 15, '4K Smart TV with Quantum Dot technology'),
('iPad Air', 599.99, 'electronics', 35, 'Powerful tablet with M1 chip and 10.9-inch display'),
('AirPods Pro', 249.99, 'electronics', 80, 'Active noise cancellation wireless earbuds'),
('Coffee Table Book: Architecture', 45.99, 'books', 50, 'Beautiful photography book showcasing modern architecture'),
('Yoga Mat Premium', 89.99, 'sports', 90, 'Non-slip exercise mat for yoga and fitness'),
('Wireless Charging Pad', 39.99, 'electronics', 150, 'Fast wireless charger compatible with most devices'),
('Organic Cotton T-Shirt', 24.99, 'clothing', 200, 'Sustainable and comfortable basic t-shirt'),
('Smart Home Hub', 129.99, 'electronics', 45, 'Central control for all your smart home devices');

-- Insert sample orders (recent orders for testing)
INSERT INTO orders (user_id, product_id, quantity, total_amount, status, order_date) VALUES
-- Recent orders (last 30 days)
(1, 1, 1, 999.99, 'delivered', '2024-03-01'),
(2, 4, 2, 25.98, 'delivered', '2024-03-02'),
(3, 7, 1, 129.99, 'shipped', '2024-03-03'),
(4, 2, 1, 1299.99, 'processing', '2024-03-04'),
(5, 15, 1, 249.99, 'delivered', '2024-03-05'),
(6, 8, 2, 159.98, 'delivered', '2024-03-06'),
(7, 3, 1, 399.99, 'shipped', '2024-03-07'),
(8, 19, 3, 74.97, 'delivered', '2024-03-08'),
(9, 13, 1, 899.99, 'processing', '2024-03-09'),
(10, 6, 1, 13.99, 'delivered', '2024-03-10'),
(11, 10, 1, 349.99, 'shipped', '2024-03-11'),
(12, 17, 1, 89.99, 'delivered', '2024-03-12'),
(1, 18, 2, 79.98, 'delivered', '2024-03-13'),
(3, 5, 1, 14.99, 'delivered', '2024-03-14'),
(5, 12, 1, 99.99, 'processing', '2024-03-15'),

-- Older orders for historical data
(2, 1, 1, 999.99, 'delivered', '2024-02-15'),
(4, 7, 1, 129.99, 'delivered', '2024-02-18'),
(6, 2, 1, 1299.99, 'delivered', '2024-02-20'),
(8, 13, 1, 899.99, 'delivered', '2024-02-22'),
(10, 15, 2, 499.98, 'delivered', '2024-02-25'),
(1, 3, 1, 399.99, 'delivered', '2024-01-20'),
(3, 10, 1, 349.99, 'delivered', '2024-01-25'),
(5, 11, 1, 749.99, 'delivered', '2024-01-28'),
(7, 4, 3, 38.97, 'delivered', '2024-01-30'),
(9, 8, 1, 79.99, 'delivered', '2024-02-01');

-- Add some orders with different statuses for variety
INSERT INTO orders (user_id, product_id, quantity, total_amount, status, order_date) VALUES
(13, 14, 1, 599.99, 'pending', CURDATE()),
(14, 20, 1, 129.99, 'pending', CURDATE()),
(15, 9, 1, 199.99, 'cancelled', '2024-03-10'),
(12, 16, 1, 45.99, 'cancelled', '2024-03-08');