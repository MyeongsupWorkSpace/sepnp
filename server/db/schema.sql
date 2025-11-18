-- SEPMP 스키마 전체 생성 스크립트 (MySQL 8+)
SET NAMES utf8mb4;
SET time_zone = '+09:00';

CREATE DATABASE IF NOT EXISTS sepmp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE sepmp;

-- 1) 기본 마스터/카탈로그 ------------------------------

-- 거래처
CREATE TABLE IF NOT EXISTS suppliers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120) NOT NULL UNIQUE,
  contact      VARCHAR(120) NULL,
  phone        VARCHAR(40)  NULL,
  email        VARCHAR(120) NULL,
  address      VARCHAR(255) NULL,
  memo         TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 용지(원지/합지 원단 포함)
CREATE TABLE IF NOT EXISTS papers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  size         VARCHAR(60)  NULL,             -- 예: 787x1092
  width_mm     INT NULL,
  height_mm    INT NULL,
  weight_gsm   INT NULL,                      -- 평량
  thickness_mm DECIMAL(5,2) NULL,
  type         ENUM('원지','합지원단') NULL,
  memo         TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_papers_name (name)
) ENGINE=InnoDB;

-- 제품
CREATE TABLE IF NOT EXISTS products (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(180) NOT NULL,
  size_l_mm       INT NULL,                     -- 장
  size_w_mm       INT NULL,                     -- 폭
  size_h_mm       INT NULL,                     -- 고
  price           DECIMAL(12,2) NULL,           -- 단가
  cut_qty         INT NULL,                      -- 절수
  knife_w_mm      INT NULL,                      -- 칼규격
  knife_h_mm      INT NULL,
  paper_id        BIGINT UNSIGNED NULL,
  paper_w_mm      INT NULL,
  paper_h_mm      INT NULL,
  no_laminate     TINYINT(1) NOT NULL DEFAULT 0,
  laminate_id     BIGINT UNSIGNED NULL,
  lam_w_mm        INT NULL,
  lam_h_mm        INT NULL,
  shipping_addr   VARCHAR(255) NULL,
  manager_name    VARCHAR(120) NULL,
  manager_phone   VARCHAR(40)  NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_products_paper
    FOREIGN KEY (paper_id) REFERENCES papers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_products_laminate
    FOREIGN KEY (laminate_id) REFERENCES papers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_products_supplier (supplier_id),
  KEY idx_products_name (name)
) ENGINE=InnoDB;

-- 제품 공정(다중)
CREATE TABLE IF NOT EXISTS product_processes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    BIGINT UNSIGNED NOT NULL,
  process_name  ENUM('인쇄','코팅','금박','형압','합지','톰슨','접착') NOT NULL,
  side          ENUM('전면','후면') NULL,      -- 인쇄/코팅용
  details_json  JSON NULL,                      -- UI 세부값 저장
  order_index   INT NOT NULL DEFAULT 0,         -- 인쇄(1)~접착(7)
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pp_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_pp_product (product_id),
  KEY idx_pp_name_side (process_name, side)
) ENGINE=InnoDB;

-- 제품 첨부
CREATE TABLE IF NOT EXISTS product_files (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     BIGINT UNSIGNED NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  stored_name    VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NULL,
  size_bytes     BIGINT NULL,
  url            VARCHAR(255) NULL,
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pf_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_pf_product (product_id)
) ENGINE=InnoDB;

-- 2) 견적/수주(확장) -----------------------------------

-- 견적서
CREATE TABLE IF NOT EXISTS quotations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id   BIGINT UNSIGNED NOT NULL,
  quote_date    DATE NOT NULL DEFAULT (CURRENT_DATE),
  status        ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  valid_until   DATE NULL,
  total_amount  DECIMAL(14,2) NULL,
  memo          TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quo_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 견적 품목
CREATE TABLE IF NOT EXISTS quotation_items (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quotation_id   BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NULL, -- 커스텀 항목 가능
  description    VARCHAR(255) NULL,
  qty            INT NOT NULL,
  unit_price     DECIMAL(12,2) NOT NULL,
  subtotal       DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_qi_quotation
    FOREIGN KEY (quotation_id) REFERENCES quotations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_qi_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 수주(주문)
CREATE TABLE IF NOT EXISTS orders (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id   BIGINT UNSIGNED NOT NULL,
  order_date    DATE NOT NULL DEFAULT (CURRENT_DATE),
  status        ENUM('received','in_progress','done','shipped','canceled') NOT NULL DEFAULT 'received',
  due_date      DATE NULL,
  shipping_addr VARCHAR(255) NULL,
  memo          TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 주문 품목
CREATE TABLE IF NOT EXISTS order_items (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT UNSIGNED NOT NULL,
  product_id   BIGINT UNSIGNED NOT NULL,
  qty          INT NOT NULL,
  unit_price   DECIMAL(12,2) NULL,
  subtotal     DECIMAL(14,2) NULL,
  CONSTRAINT fk_oi_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_oi_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_oi_order (order_id)
) ENGINE=InnoDB;

-- 3) 생산/계획(확장) ------------------------------------

-- 작업지시(품목 단위)
CREATE TABLE IF NOT EXISTS jobs (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id  BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  status         ENUM('planned','in_progress','hold','done','canceled') NOT NULL DEFAULT 'planned',
  planned_date   DATE NULL,
  due_date       DATE NULL,
  notes          TEXT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_order_item
    FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jobs_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 공정 계획/실적(공정 단위 기록)
CREATE TABLE IF NOT EXISTS job_steps (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id        BIGINT UNSIGNED NOT NULL,
  process_name  ENUM('인쇄','코팅','금박','형압','합지','톰슨','접착') NOT NULL,
  machine       VARCHAR(120) NULL,
  plan_start    DATETIME NULL,
  plan_end      DATETIME NULL,
  actual_start  DATETIME NULL,
  actual_end    DATETIME NULL,
  result_qty    INT NULL,
  scrap_qty     INT NULL,
  memo          TEXT NULL,
  CONSTRAINT fk_js_job
    FOREIGN KEY (job_id) REFERENCES jobs(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_js_job (job_id),
  KEY idx_js_proc (process_name)
) ENGINE=InnoDB;

-- 4) 재고/출하(확장) ------------------------------------

-- 재고 아이템(원지/완제품/소모품)
CREATE TABLE IF NOT EXISTS inventory_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('원지','합지원단','완제품','소모품') NOT NULL,
  sku         VARCHAR(80) NULL,
  name        VARCHAR(200) NOT NULL,
  paper_id    BIGINT UNSIGNED NULL,
  product_id  BIGINT UNSIGNED NULL,
  unit        VARCHAR(20) NOT NULL DEFAULT 'EA',
  qty         DECIMAL(18,3) NOT NULL DEFAULT 0,
  location    VARCHAR(120) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_paper
    FOREIGN KEY (paper_id) REFERENCES papers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_inv_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_inv_type (type),
  KEY idx_inv_name (name)
) ENGINE=InnoDB;

-- 재고 입출고 트랜잭션
CREATE TABLE IF NOT EXISTS inventory_tx (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id      BIGINT UNSIGNED NOT NULL,
  tx_type      ENUM('IN','OUT','ADJ') NOT NULL,
  qty          DECIMAL(18,3) NOT NULL,
  ref_table    VARCHAR(40) NULL,   -- 예: 'orders','jobs','dispatches'
  ref_id       BIGINT NULL,
  memo         TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_itx_item
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_itx_item (item_id),
  KEY idx_itx_type (tx_type)
) ENGINE=InnoDB;

-- 출하(납품)
CREATE TABLE IF NOT EXISTS dispatches (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NOT NULL,
  shipped_date  DATE NULL,
  carrier       VARCHAR(120) NULL,
  tracking_no   VARCHAR(120) NULL,
  address       VARCHAR(255) NULL,
  status        ENUM('ready','shipped','delivered','canceled') NOT NULL DEFAULT 'ready',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_disp_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 출하 품목
CREATE TABLE IF NOT EXISTS dispatch_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dispatch_id   BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  qty           INT NOT NULL,
  CONSTRAINT fk_di_dispatch
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_di_order_item
    FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_di_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5) 사용자/권한(확장) -----------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60) NOT NULL UNIQUE,   -- 예: admin, manager, worker
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,  -- 예: product.read, order.write
  description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rp_perm
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  phone       VARCHAR(40)  NULL,
  email       VARCHAR(120) NULL UNIQUE,
  dept        VARCHAR(120) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id  BIGINT UNSIGNED NULL,
  username     VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_emp
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ur_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 권장: 기본 롤/권한 시드
INSERT IGNORE INTO roles(name) VALUES ('admin'),('manager'),('worker');