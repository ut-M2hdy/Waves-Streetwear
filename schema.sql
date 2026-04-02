-- Create database and switch to it (MySQL/HeidiSQL)
CREATE DATABASE IF NOT EXISTS store_waves DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE store_waves;

-- Users (default role = user)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_blacklisted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB;

-- Developer-only: promote account to admin in SQL (example)
-- UPDATE users SET role = 'admin' WHERE phone = '+216XXXXXXXX';

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  price_cents INT NOT NULL,
  wave VARCHAR(40) NOT NULL DEFAULT '1stDrop',
  colors_csv VARCHAR(120) NOT NULL DEFAULT 'W',
  main_color VARCHAR(20) NOT NULL DEFAULT 'W',
  sold_out TINYINT(1) NOT NULL DEFAULT 0,
  image_url LONGTEXT,
  color_images_map LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Keep existing orders on re-import. If you want a full reset, run manually:
-- DROP TABLE IF EXISTS orders;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  product_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(180) NOT NULL,
  color VARCHAR(30) NOT NULL,
  size VARCHAR(10) NOT NULL,
  amount INT NOT NULL,
  unit_price_dt DECIMAL(10,2) NOT NULL,
  delivery_fee_dt DECIMAL(10,2) NOT NULL DEFAULT 9.00,
  total_price_dt DECIMAL(10,2) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  note TEXT,
  status VARCHAR(40) DEFAULT 'pending',
  delivered_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS revenue_adjustments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  amount_dt DECIMAL(10,2) NOT NULL,
  created_by_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_revenue_adjustments_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- If your table already exists, run this once to allow guest orders:
-- ALTER TABLE orders MODIFY user_id INT UNSIGNED NULL;
-- ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL AFTER status;
-- ALTER TABLE users ADD COLUMN address TEXT NOT NULL AFTER phone;
-- ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER role;
-- ALTER TABLE users ADD COLUMN is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_verified;
-- ALTER TABLE products ADD COLUMN wave VARCHAR(40) NOT NULL DEFAULT '1stDrop' AFTER price_cents;
-- ALTER TABLE products ADD COLUMN colors_csv VARCHAR(120) NOT NULL DEFAULT 'W' AFTER wave;
-- ALTER TABLE products ADD COLUMN main_color VARCHAR(20) NOT NULL DEFAULT 'W' AFTER colors_csv;
-- ALTER TABLE products ADD COLUMN sold_out TINYINT(1) NOT NULL DEFAULT 0 AFTER colors_csv;
-- ALTER TABLE products MODIFY image_url LONGTEXT NULL;
-- ALTER TABLE products ADD COLUMN color_images_map LONGTEXT AFTER image_url;
-- ALTER TABLE products MODIFY color_images_map LONGTEXT NULL;

-- Seed products once (safe to re-import: existing ids are ignored)
INSERT IGNORE INTO products (id, name, price_cents, wave, colors_csv, main_color, sold_out, image_url, color_images_map, description) VALUES
(1, 'Lost In Your Gravity Hoodie', 6900, '1stDrop', 'W', 'W', 0, 'img/1/W/1st%20post.png', 'W=img/1/W/1st%20post.png', 'Midweight fleece with gradient print.'),
(2, 'Overthinking Hoodie', 6900, '1stDrop', 'B,W', 'B', 0, 'img/2/B/1st%20post.png, img/2/W/2nd%20post.png', 'B=img/2/B/1st%20post.png\nW=img/2/W/2nd%20post.png', 'Everyday pullover, soft brushed interior.'),
(3, 'Ein El Hassoud Hoodie', 6900, '1stDrop', 'B,W', 'B', 0, 'img/3/B/1st%20post.png, img/3/W/2nd%20post.png', 'B=img/3/B/1st%20post.png\nW=img/3/W/2nd%20post.png', 'Cooling cotton blend with roomy hood.'),
(4, 'Im Just A Girl Hoodie', 6900, '1stDrop', 'P', 'P', 0, 'img/4/P/1st%20post.png', 'P=img/4/P/1st%20post.png', 'Water-repellent shell and soft lining.'),
(5, 'Eyes Don''t Lie Hoodie', 6900, '1stDrop', 'Br', 'Br', 1, 'img/5/Br/1st%20post.png', 'Br=img/5/Br/1st%20post.png', 'Neutral tone, relaxed drop-shoulder fit.'),
(6, '3rd Of December Hoodie', 6900, '1stDrop', 'W', 'W', 0, 'img/6/W/1st%20post.png', 'W=img/6/W/1st%20post.png', 'Full-zip with hidden phone pocket.'),
(7, 'Try & Cry Hoodie', 6900, '1stDrop', 'Br,B,W', 'Br', 0, 'img/7/Br/1st%20post.png, img/7/B/copy2.png, img/7/W/2nd%20post.png', 'Br=img/7/Br/1st%20post.png\nB=img/7/B/copy2.png\nW=img/7/W/2nd%20post.png', 'Triple-color drop with oversized relaxed fit.');

-- If products already exist, run these updates to restore old hoodie names:
-- UPDATE products SET name = 'Lost In Your Gravity Hoodie', price_cents = 6900 WHERE id = 1;
-- UPDATE products SET name = 'Overthinking Hoodie', price_cents = 6900 WHERE id = 2;
-- UPDATE products SET name = 'Ein El Hassoud Hoodie', price_cents = 6900 WHERE id = 3;
-- UPDATE products SET name = 'Im Just A Girl Hoodie', price_cents = 6900 WHERE id = 4;
-- UPDATE products SET name = 'Eyes Don''t Lie Hoodie', price_cents = 6900 WHERE id = 5;
-- UPDATE products SET name = '3rd Of December Hoodie', price_cents = 6900 WHERE id = 6;
-- UPDATE products SET name = 'Try & Cry Hoodie', price_cents = 6900 WHERE id = 7;
