const mysql = require('mysql2/promise');

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'media_prestige_bot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE,
        status ENUM('new', 'interested', 'confirmed') DEFAULT 'new',
        message_count INT DEFAULT 1,
        last_message TEXT,
        products TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Async lead logging
async function logLead(phoneNumber, status, message = '', notes = '', products = '') {
  try {
    const cleanPhone = '+' + phoneNumber.replace(/[^\d]/g, '');
    const safeMessage = (message || '').replace(/'/g, "''").substring(0, 500);
    const safeNotes = (notes || '').replace(/'/g, "''");
    const safeProducts = (products || '').replace(/'/g, "''");

    await pool.execute(`
      INSERT INTO leads (phone_number, status, message_count, last_message, products, notes)
      VALUES (?, ?, 1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        message_count = message_count + 1,
        last_message = VALUES(last_message),
        products = COALESCE(VALUES(products), products),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP
    `, [cleanPhone, status, safeMessage, safeProducts, safeNotes]);

    console.log(`✅ Lead logged: ${cleanPhone} (${status})`);
  } catch (error) {
    console.error('❌ Lead logging failed:', error);
  }
}

module.exports = { initDatabase, logLead, confirmLead, getLeadsSummary };