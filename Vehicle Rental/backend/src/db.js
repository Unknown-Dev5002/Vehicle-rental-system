const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "drivehive.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      pricePerDay REAL NOT NULL,
      fuelType TEXT NOT NULL,
      transmission TEXT NOT NULL,
      description TEXT NOT NULL,
      imageUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.all("PRAGMA table_info(vehicles)", [], (err, rows) => {
    if (err) return;
    const hasOwnerEmail = rows.some((row) => row.name === "ownerEmail");
    if (!hasOwnerEmail) {
      db.run("ALTER TABLE vehicles ADD COLUMN ownerEmail TEXT");
    }
  });
});

module.exports = db;
