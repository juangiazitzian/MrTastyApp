SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- Drop existing tables (if re-running setup)
DROP TABLE IF EXISTS stock_adjustments;
DROP TABLE IF EXISTS purchase_recommendation_items;
DROP TABLE IF EXISTS purchase_recommendations;
DROP TABLE IF EXISTS consumption_baselines;
DROP TABLE IF EXISTS stock_snapshot_items;
DROP TABLE IF EXISTS stock_snapshots;
DROP TABLE IF EXISTS eerr_entries;
DROP TABLE IF EXISTS eerr_mappings;
DROP TABLE IF EXISTS delivery_note_items;
DROP TABLE IF EXISTS delivery_notes;
DROP TABLE IF EXISTS supplier_products;
DROP TABLE IF EXISTS product_aliases;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS supplier_aliases;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS app_settings;

SET FOREIGN_KEY_CHECKS=1;

-- Users table
CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email(email),
  INDEX idx_role(role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token(token),
  INDEX idx_user_id(user_id),
  CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stores table
CREATE TABLE stores (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  address VARCHAR(191),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active(active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers table
CREATE TABLE suppliers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  category VARCHAR(50) DEFAULT 'MERCADERIA',
  eerr_label VARCHAR(191),
  is_blancaluna TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active(active),
  INDEX idx_blancaluna(is_blancaluna),
  INDEX idx_category(category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier aliases table
CREATE TABLE supplier_aliases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  alias VARCHAR(191) NOT NULL UNIQUE,
  supplier_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_supplier_id(supplier_id),
  CONSTRAINT fk_supplier_aliases_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  unit VARCHAR(50) DEFAULT 'unidad',
  pack_size INT DEFAULT 1,
  safety_stock FLOAT DEFAULT 0,
  rounding_unit FLOAT DEFAULT 1,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active(active),
  INDEX idx_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product aliases table
CREATE TABLE product_aliases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  alias VARCHAR(191) NOT NULL UNIQUE,
  product_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_product_aliases_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier products table
CREATE TABLE supplier_products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  supplier_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  price FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_product(supplier_id, product_id),
  INDEX idx_supplier_id(supplier_id),
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_supplier_products_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_products_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delivery notes table
CREATE TABLE delivery_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  supplier_id CHAR(36),
  supplier_raw VARCHAR(191),
  note_number VARCHAR(100),
  date DATE NOT NULL,
  total FLOAT,
  currency VARCHAR(10) DEFAULT 'ARS',
  status VARCHAR(50) DEFAULT 'guardado',
  image_url VARCHAR(512),
  ocr_raw_data LONGTEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, date),
  INDEX idx_supplier_date(supplier_id, date),
  INDEX idx_status(status),
  CONSTRAINT fk_delivery_notes_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_notes_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Delivery note items table
CREATE TABLE delivery_note_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  delivery_note_id CHAR(36) NOT NULL,
  product_id CHAR(36),
  product_raw VARCHAR(191),
  quantity FLOAT NOT NULL,
  unit_price FLOAT,
  subtotal FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_delivery_note_id(delivery_note_id),
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_delivery_note_items_delivery_note_id FOREIGN KEY (delivery_note_id) REFERENCES delivery_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_note_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EERR mappings table
CREATE TABLE eerr_mappings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  supplier_id CHAR(36) NOT NULL UNIQUE,
  eerr_category VARCHAR(191) NOT NULL,
  eerr_section VARCHAR(100) DEFAULT 'MERCADERIA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_id(supplier_id),
  CONSTRAINT fk_eerr_mappings_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EERR entries table
CREATE TABLE eerr_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  store_id VARCHAR(50) DEFAULT 'all',
  section VARCHAR(100),
  category VARCHAR(191),
  amount FLOAT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_eerr_entry(year, month, store_id, section, category),
  INDEX idx_year_month(year, month, store_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock snapshots table
CREATE TABLE stock_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  image_url VARCHAR(512),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, date),
  CONSTRAINT fk_stock_snapshots_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock snapshot items table
CREATE TABLE stock_snapshot_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  stock_snapshot_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity FLOAT NOT NULL,
  UNIQUE KEY uq_snapshot_product(stock_snapshot_id, product_id),
  INDEX idx_stock_snapshot_id(stock_snapshot_id),
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_stock_snapshot_items_snapshot_id FOREIGN KEY (stock_snapshot_id) REFERENCES stock_snapshots(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_snapshot_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Consumption baselines table
CREATE TABLE consumption_baselines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  avg_daily_usage FLOAT,
  weekday_avg_usage FLOAT,
  weekend_avg_usage FLOAT,
  source VARCHAR(50) DEFAULT 'manual',
  calculated_from DATE,
  calculated_to DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_baseline(store_id, product_id),
  INDEX idx_store_id(store_id),
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_consumption_baselines_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_consumption_baselines_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase recommendations table
CREATE TABLE purchase_recommendations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE,
  coverage_days INT,
  status VARCHAR(50) DEFAULT 'borrador',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, order_date),
  INDEX idx_status(status),
  CONSTRAINT fk_purchase_recommendations_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase recommendation items table
CREATE TABLE purchase_recommendation_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recommendation_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  stock_actual FLOAT,
  avg_daily_usage FLOAT,
  coverage_days INT,
  safety_stock FLOAT,
  stock_target FLOAT,
  suggested_qty FLOAT,
  final_qty FLOAT,
  rounding_unit FLOAT DEFAULT 1,
  calculation_detail LONGTEXT,
  UNIQUE KEY uq_recommendation_product(recommendation_id, product_id),
  INDEX idx_recommendation_id(recommendation_id),
  INDEX idx_product_id(product_id),
  CONSTRAINT fk_rec_items_recommendation_id FOREIGN KEY (recommendation_id) REFERENCES purchase_recommendations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- App settings table
CREATE TABLE app_settings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value LONGTEXT,
  label VARCHAR(191),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key(`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock adjustments table
CREATE TABLE stock_adjustments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  quantity FLOAT NOT NULL,
  type VARCHAR(50) DEFAULT 'merma',
  reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_store_date(store_id, date),
  INDEX idx_product_date(product_id, date),
  CONSTRAINT fk_stock_adjustments_store_id FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_adjustments_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert stores
INSERT INTO stores (id, name, address, active, created_at, updated_at) VALUES
('e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'San Miguel Balbn', 'Balbn 123, CABA', 1, NOW(), NOW()),
('f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'San Miguel Peron', 'Perón 456, CABA', 1, NOW(), NOW());

-- Insert suppliers
INSERT INTO suppliers (id, name, category, eerr_label, is_blancaluna, active, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Blanca Luna', 'MERCADERIA', 'Blanca Luna', 1, 1, NOW(), NOW()),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Verduleria', 'MERCADERIA', 'Verduleria', 0, 1, NOW(), NOW()),
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Coca Cola', 'MERCADERIA', 'Coca Cola', 0, 1, NOW(), NOW()),
('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'CDP', 'MERCADERIA', 'CDP', 0, 1, NOW(), NOW()),
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'The Bread Box', 'MERCADERIA', 'The Bread Box', 0, 1, NOW(), NOW()),
('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'Huevos Don Jorge', 'MERCADERIA', 'Huevos Don Jorge', 0, 1, NOW(), NOW()),
('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'Aceite Cocinero', 'MERCADERIA', 'Aceite Cocinero', 0, 1, NOW(), NOW());

-- Insert products for BLANCALUNA
INSERT INTO products (id, name, unit, pack_size, safety_stock, rounding_unit, active, created_at, updated_at) VALUES
('p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'Papas', 'kg', 1, 5, 1, 1, NOW(), NOW()),
('p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'Cheddar', 'kg', 1, 3, 1, 1, NOW(), NOW()),
('p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'Nuggets', 'kg', 1, 5, 1, 1, NOW(), NOW()),
('p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 'Medallón de pollo', 'kg', 1, 4, 1, 1, NOW(), NOW()),
('p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 'Sal', 'kg', 1, 2, 1, 1, NOW(), NOW()),
('p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 'Leche', 'litro', 1, 3, 1, 1, NOW(), NOW()),
('p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 'Ketchup', 'botella', 1, 2, 1, 1, NOW(), NOW()),
('p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'Mayonesa', 'botella', 1, 2, 1, 1, NOW(), NOW()),
('p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 'Mostaza', 'botella', 1, 1, 1, 1, NOW(), NOW()),
('p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 'Cheddar líquido', 'litro', 1, 3, 1, 1, NOW(), NOW());

-- Insert product aliases
INSERT INTO product_aliases (id, alias, product_id, created_at) VALUES
('a1a2a3a4-a5a6-7a8a-9a0a-1a2a3a4a5a6a', 'M. Pollo', 'p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', NOW()),
('b2b3b4b5-b6b7-8b9b-0b1b-2b3b4b5b6b7b', 'Cheddarliq', 'p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', NOW()),
('c3c4c5c6-c7c8-9c0c-1c2c-3c4c5c6c7c8c', 'Mayo', 'p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', NOW()),
('d4d5d6d7-d8d9-0d1d-2d3d-4d5d6d7d8d9d', 'Chedd', 'p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', NOW());

-- Insert supplier products (BLANCALUNA prices)
INSERT INTO supplier_products (id, supplier_id, product_id, price, created_at) VALUES
('sp1a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 120.50, NOW()),
('sp2a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 450.00, NOW()),
('sp3a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 380.00, NOW()),
('sp4a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 420.00, NOW()),
('sp5a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 50.00, NOW()),
('sp6a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 180.00, NOW()),
('sp7a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 200.00, NOW()),
('sp8a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 220.00, NOW()),
('sp9a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 150.00, NOW()),
('sp10a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d-p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 350.00, NOW());

-- Insert EERR mappings
INSERT INTO eerr_mappings (id, supplier_id, eerr_category, eerr_section, created_at, updated_at) VALUES
('em1a-a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Blanca Luna', 'MERCADERIA', NOW(), NOW()),
('em2a-b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Verduleria', 'MERCADERIA', NOW(), NOW()),
('em3a-c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Coca Cola', 'MERCADERIA', NOW(), NOW()),
('em4a-d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'CDP', 'MERCADERIA', NOW(), NOW()),
('em5a-e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'The Bread Box', 'MERCADERIA', NOW(), NOW()),
('em6a-f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'Huevos Don Jorge', 'MERCADERIA', NOW(), NOW()),
('em7a-a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'Aceite Cocinero', 'MERCADERIA', NOW(), NOW());

-- Insert consumption baselines for both stores
INSERT INTO consumption_baselines (id, store_id, product_id, avg_daily_usage, weekday_avg_usage, weekend_avg_usage, source, calculated_from, calculated_to, notes, created_at, updated_at) VALUES
-- San Miguel Balbn baselines
('cb1a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 15.0, 18.0, 12.0, 'manual', '2026-01-01', '2026-04-15', 'Papas - San Miguel Balbn', NOW(), NOW()),
('cb2a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 8.0, 9.5, 6.5, 'manual', '2026-01-01', '2026-04-15', 'Cheddar - San Miguel Balbn', NOW(), NOW()),
('cb3a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 12.0, 14.0, 10.0, 'manual', '2026-01-01', '2026-04-15', 'Nuggets - San Miguel Balbn', NOW(), NOW()),
('cb4a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 10.0, 12.0, 8.0, 'manual', '2026-01-01', '2026-04-15', 'Medallón de pollo - San Miguel Balbn', NOW(), NOW()),
('cb5a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 3.0, 3.5, 2.5, 'manual', '2026-01-01', '2026-04-15', 'Sal - San Miguel Balbn', NOW(), NOW()),
('cb6a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 7.0, 8.0, 6.0, 'manual', '2026-01-01', '2026-04-15', 'Leche - San Miguel Balbn', NOW(), NOW()),
('cb7a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 2.5, 3.0, 2.0, 'manual', '2026-01-01', '2026-04-15', 'Ketchup - San Miguel Balbn', NOW(), NOW()),
('cb8a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 3.0, 3.5, 2.5, 'manual', '2026-01-01', '2026-04-15', 'Mayonesa - San Miguel Balbn', NOW(), NOW()),
('cb9a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 1.5, 2.0, 1.0, 'manual', '2026-01-01', '2026-04-15', 'Mostaza - San Miguel Balbn', NOW(), NOW()),
('cb10a-e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f-p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 'e8a7c1b2-d5f2-4a8c-9e3f-7b4a2c6d9e1f', 'p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 5.0, 6.0, 4.0, 'manual', '2026-01-01', '2026-04-15', 'Cheddar líquido - San Miguel Balbn', NOW(), NOW()),
-- San Miguel Peron baselines
('cb1b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', 13.0, 15.0, 11.0, 'manual', '2026-01-01', '2026-04-15', 'Papas - San Miguel Peron', NOW(), NOW()),
('cb2b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 7.0, 8.0, 6.0, 'manual', '2026-01-01', '2026-04-15', 'Cheddar - San Miguel Peron', NOW(), NOW()),
('cb3b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e', 11.0, 13.0, 9.0, 'manual', '2026-01-01', '2026-04-15', 'Nuggets - San Miguel Peron', NOW(), NOW()),
('cb4b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f', 9.0, 11.0, 7.0, 'manual', '2026-01-01', '2026-04-15', 'Medallón de pollo - San Miguel Peron', NOW(), NOW()),
('cb5b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a', 2.8, 3.2, 2.4, 'manual', '2026-01-01', '2026-04-15', 'Sal - San Miguel Peron', NOW(), NOW()),
('cb6b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b', 6.5, 7.5, 5.5, 'manual', '2026-01-01', '2026-04-15', 'Leche - San Miguel Peron', NOW(), NOW()),
('cb7b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c', 2.2, 2.7, 1.7, 'manual', '2026-01-01', '2026-04-15', 'Ketchup - San Miguel Peron', NOW(), NOW()),
('cb8b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 2.8, 3.2, 2.4, 'manual', '2026-01-01', '2026-04-15', 'Mayonesa - San Miguel Peron', NOW(), NOW()),
('cb9b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e', 1.3, 1.8, 0.8, 'manual', '2026-01-01', '2026-04-15', 'Mostaza - San Miguel Peron', NOW(), NOW()),
('cb10b-f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2-p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 'f9b8d2c3-e6g3-5b9d-af4g-8c5b3d7ea0f2', 'p0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f', 4.5, 5.5, 3.5, 'manual', '2026-01-01', '2026-04-15', 'Cheddar líquido - San Miguel Peron', NOW(), NOW());

-- Insert app settings for delivery schedule
INSERT INTO app_settings (id, `key`, value, label, created_at, updated_at) VALUES
('as1a-0000-0000-0000-000000000001', 'delivery_schedule', '{\"1\":{\"coverageDays\":2,\"label\":\"Lunes → entrega Miércoles\",\"coverageDayNumbers\":[3]},\"3\":{\"coverageDays\":2,\"label\":\"Miércoles → entrega Viernes\",\"coverageDayNumbers\":[5]},\"5\":{\"coverageDays\":3,\"label\":\"Viernes → entrega Lunes\",\"coverageDayNumbers\":[1]}}', 'Calendario de entregas', NOW(), NOW());

-- NOTE: Admin user must be created via setup.php for proper password hashing
-- See setup.php for admin user creation
