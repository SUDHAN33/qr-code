const express = require("express");
const app = express();
const path = require("path");
const PORT = 8001;
const bodyParser = require('body-parser');
const pool = require("./db");
const adminRoutes = require('./routes/admin');
const createQrTable = require("./initDB");

app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.json());
app.use('/admin', adminRoutes);

// Create DB table if not exists
createQrTable();

// Redirect root to redeem
app.get("/", (req, res) => {
  res.redirect("/redeem");
});

// Admin UI
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Redeem UI
app.get("/redeem", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.sendFile(path.join(__dirname, "public", "no-access.html"));
  }

  try {
    const result = await pool.query(`SELECT * FROM qr_codes WHERE code = $1`, [code]);

    if (result.rows.length === 0) {
      return res.sendFile(path.join(__dirname, "public", "invalid-code.html"));
    }

    const qr = result.rows[0];
    if (qr.is_redeemed) {
      return res.sendFile(path.join(__dirname, "public", "link-expired.html"));
    }

    // Valid and unredeemed
    res.sendFile(path.join(__dirname, "public", "redeem.html"));
  } catch (err) {
    console.error("Error checking code:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Redeem Cashback API
app.post("/redeem-cashback", async (req, res) => {
  const { upi, amount, code, name, phone } = req.body;

  try {
    const result = await pool.query(`SELECT * FROM qr_codes WHERE code = $1`, [code]);

    if (result.rows.length === 0) {
      return res.status(400).send("Invalid code");
    }

    const qr = result.rows[0];
    if (qr.is_redeemed) {
      return res.status(400).send("Already redeemed");
    }

    // Save redemption info
    await pool.query(
      `UPDATE qr_codes 
       SET is_redeemed = TRUE, redeemed_at = NOW(), upi_id = $1, cashback = $2, name = $3, phone = $4 
       WHERE code = $5`,
      [upi, amount, name, phone, code]
    );

    // Simulated payout logic
    console.log(`Send ₹${amount} from YOUR_UPI_ID to ${upi}`);

    res.send(`✅ ₹${amount} will be sent to ${upi}`);
  } catch (err) {
    console.error("Redemption error:", err);
    res.status(500).send("Something went wrong");
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🌐 App running at http://localhost:${PORT}`);
});
