const express = require("express");
const router = express.Router();
const pool = require("../db");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { v4: uuidv4 } = require("uuid");
const { createCanvas, loadImage } = require("canvas");

async function createThankYouCard(code, redeemUrl, outputPath) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#fffaf0"; // warm light
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);

  // Left Side Text
  ctx.fillStyle = "#222";
  ctx.font = "bold 36px Sans-serif";
  ctx.fillText("🎉 Thank You for Your Purchase!", 40, 80);

  ctx.font = "20px Sans-serif";
  ctx.fillStyle = "#444";
  ctx.fillText("Scan the QR to scratch and win cashback!", 40, 130);
  ctx.fillText("Visit the link below to redeem your reward.", 40, 170);

  ctx.font = "italic 18px Sans-serif";
  ctx.fillStyle = "#666";
  ctx.fillText("This card was printed with care 💛", 40, 230);

  // QR Code
  const qrX = width * 0.65;
  const qrY = 90;
  const qrSize = 200;

  const qrDataUrl = await QRCode.toDataURL(redeemUrl);
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);


  // Save to PNG
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
}

router.post("/generate", async (req, res) => {
  const { count } = req.body;
  const baseUrl = "http://localhost:8001/redeem?code=";

  const folderPath = path.join(__dirname, "..", "temp_qr");
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = uuidv4();
    const redeemUrl = baseUrl + code;

    // Save code to DB
    await pool.query(`INSERT INTO qr_codes (code) VALUES ($1)`, [code]);

    // Create thank-you card with QR
    const filePath = path.join(folderPath, `${code}.png`);
    await createThankYouCard(code, redeemUrl, filePath);
    codes.push({ code, filePath });
  }

  // Create zip
  const zipPath = path.join(__dirname, "..", "qr_cards.zip");
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  codes.forEach(({ filePath }) => {
    archive.file(filePath, { name: path.basename(filePath) });
  });

  await archive.finalize();

  output.on("close", () => {
    // Cleanup PNGs
    codes.forEach(({ filePath }) => fs.unlinkSync(filePath));
    res.download(zipPath, "qr_cards.zip", () => {
      fs.unlinkSync(zipPath); // remove zip after download
    });
  });
});

module.exports = router;
