-- 현재 Railway DB에 직접 적용(데이터베이스/스키마 생성문 없음)

-- 1) 거래처/용지/제품 공정/첨부
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  contact VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  memo TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- customers 테이블이 이미 있으면 이름만 가져와 초기 동기화(중복은 무시)
INSERT IGNORE INTO suppliers(name)
SELECT name FROM customers WHERE name IS NOT NULL;

CREATE TABLE IF NOT EXISTS papers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  size VARCHAR(60) NULL,
  width_mm INT NULL,
  height_mm INT NULL,
  weight_gsm INT NULL,
  thickness_mm DECIMAL(5,2) NULL,
  type ENUM('원지','합지원단') NULL,
  memo TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_papers_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_processes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  process_name ENUM('인쇄','코팅','금박','형압','합지','톰슨','접착') NOT NULL,
  side ENUM('전면','후면') NULL,
  details_json JSON NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pp_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_pp_product (product_id),
  KEY idx_pp_name_side (process_name, side)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NULL,
  size_bytes BIGINT NULL,
  url VARCHAR(255) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pf_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_pf_product (product_id)
) ENGINE=InnoDB;

-- 2) 확장 스키마(견적/수주 상세/생산/재고/출하/권한)

CREATE TABLE IF NOT EXISTS quotation_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quotation_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  KEY idx_qi_quo (quotation_id),
  CONSTRAINT fk_qi_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NOT NULL,
  quote_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  valid_until DATE NULL,
  total_amount DECIMAL(14,2) NULL,
  memo TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quo_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE quotation_items
  ADD CONSTRAINT fk_qi_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(12,2) NULL,
  subtotal DECIMAL(14,2) NULL,
  KEY idx_oi_order (order_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  status ENUM('planned','in_progress','hold','done','canceled') NOT NULL DEFAULT 'planned',
  planned_date DATE NULL,
  due_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jobs_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_steps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT UNSIGNED NOT NULL,
  process_name ENUM('인쇄','코팅','금박','형압','합지','톰슨','접착') NOT NULL,
  machine VARCHAR(120) NULL,
  plan_start DATETIME NULL,
  plan_end DATETIME NULL,
  actual_start DATETIME NULL,
  actual_end DATETIME NULL,
  result_qty INT NULL,
  scrap_qty INT NULL,
  memo TEXT NULL,
  KEY idx_js_job (job_id),
  KEY idx_js_proc (process_name),
  CONSTRAINT fk_js_job FOREIGN KEY (job_id) REFERENCES jobs(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('원지','합지원단','완제품','소모품') NOT NULL,
  sku VARCHAR(80) NULL,
  name VARCHAR(200) NOT NULL,
  paper_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'EA',
  qty DECIMAL(18,3) NOT NULL DEFAULT 0,
  location VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_inv_type (type),
  KEY idx_inv_name (name),
  CONSTRAINT fk_inv_paper FOREIGN KEY (paper_id) REFERENCES papers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_tx (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id BIGINT UNSIGNED NOT NULL,
  tx_type ENUM('IN','OUT','ADJ') NOT NULL,
  qty DECIMAL(18,3) NOT NULL,
  ref_table VARCHAR(40) NULL,
  ref_id BIGINT NULL,
  memo TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_itx_item (item_id),
  KEY idx_itx_type (tx_type),
  CONSTRAINT fk_itx_item FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dispatches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  shipped_date DATE NULL,
  carrier VARCHAR(120) NULL,
  tracking_no VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  status ENUM('ready','shipped','delivered','canceled') NOT NULL DEFAULT 'ready',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_disp_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dispatch_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dispatch_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  CONSTRAINT fk_di_dispatch FOREIGN KEY (dispatch_id) REFERENCES dispatches(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_di_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_di_product FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_emp FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES employees_users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO roles(name) VALUES ('admin'),('manager'),('worker');