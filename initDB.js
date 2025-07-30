// initDb.js
const pool = require("./db");

async function createQrTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS qr_codes (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      cashback INTEGER,
      is_redeemed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      redeemed_at TIMESTAMP,
      upi_id TEXT
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log("✅ QR Code table is ready.");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
}

module.exports = createQrTable;
