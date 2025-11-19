-- SEPMP: 필요한 모든 테이블 생성(이미 있으면 건너뜀)
SET NAMES utf8mb4;
SET time_zone = '+09:00';

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  contact VARCHAR(120), phone VARCHAR(40), email VARCHAR(120),
  address VARCHAR(255), memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 필요한 경우 추가(예: papers, product_processes, product_files 등)