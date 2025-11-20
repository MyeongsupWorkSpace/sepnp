SET NAMES utf8mb4;
SET time_zone = '+09:00';

-- suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  contact VARCHAR(120), phone VARCHAR(40), email VARCHAR(120),
  address VARCHAR(255), memo TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 여기에 기존 다른 테이블 정의(중복 제거 후) 차례대로 추가
-- 예:
-- CREATE TABLE IF NOT EXISTS customers (...);
-- CREATE TABLE IF NOT EXISTS products (...);
-- CREATE TABLE IF NOT EXISTS orders (...);
-- CREATE TABLE IF NOT EXISTS users (...);
-- FK 있는 테이블은 참조 대상 테이블 뒤에 배치