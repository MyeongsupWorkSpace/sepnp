const db = require('./db');

module.exports = async function initDb() {
  try {
    console.log('📦 DB 스키마 초기화 시작...');

    // 1) employees
    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(50) PRIMARY KEY,
        emp_no VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(64) NOT NULL,
        name VARCHAR(50) NOT NULL,
        dept VARCHAR(50),
        position VARCHAR(50),
        phone VARCHAR(20),
        email VARCHAR(100),
        join_date DATE,
        status ENUM('active','inactive','pending') DEFAULT 'active',
        role ENUM('viewer','staff','manager','admin') DEFAULT 'viewer',
        perms JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2) products
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50),
        spec TEXT,
        unit VARCHAR(20),
        unit_price DECIMAL(12,2),
        stock INT DEFAULT 0,
        min_stock INT DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3) worker_assignments
    await db.query(`
      CREATE TABLE IF NOT EXISTS worker_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        process VARCHAR(20) NOT NULL,
        process_perm VARCHAR(50),
        machine VARCHAR(50) NOT NULL,
        team ENUM('A','B') NOT NULL,
        shift ENUM('주간','야간') NOT NULL,
        start_time TIME,
        end_time TIME,
        workers JSON NOT NULL,
        created_by VARCHAR(20),
        created_by_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4) customers
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category ENUM('매출처','매입처','양방') DEFAULT '매출처',
        ceo VARCHAR(100),
        business_no VARCHAR(20),
        tel VARCHAR(20),
        fax VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        note TEXT,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5) orders
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        order_date DATE NOT NULL,
        customer_id VARCHAR(50),
        customer_name VARCHAR(200),
        product_id VARCHAR(50),
        product_name VARCHAR(200),
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2),
        total_price DECIMAL(12,2),
        delivery_date DATE,
        status ENUM('대기','진행중','완료','취소') DEFAULT '대기',
        note TEXT,
        created_by VARCHAR(20),
        created_by_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 기본 관리자 계정 (ID: sepnp, PW: 0536)
    await db.query(`
      INSERT INTO employees
      (id, emp_no, username, password_hash, name, dept, position, status, role, perms, join_date)
      VALUES ('emp_admin','ADMIN','sepnp', SHA2('0536',256), '관리자','관리부','관리자','active','admin','["*"]', CURDATE())
      ON DUPLICATE KEY UPDATE username = username;
    `);

    console.log('✅ DB 스키마 초기화 완료!');
    console.log('   - employees, products, worker_assignments, customers, orders');
    console.log('   - 기본 관리자: ID=sepnp, PW=0536');

  } catch (err) {
    console.error('❌ DB 초기화 실패:', err.message);
    throw err;
  }
};