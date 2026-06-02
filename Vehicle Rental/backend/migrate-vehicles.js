const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const db = require("./src/db");
const Vehicle = require("./src/models/Vehicle");

dotenv.config({ path: path.join(__dirname, ".env") });

function getMongoUri() {
  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }
  return uri;
}

function getAllSqliteVehicles() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, type, brand, model, year, pricePerDay, fuelType, transmission, description, imageUrl, ownerEmail, createdAt, updatedAt FROM vehicles`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

function closeSqlite() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function toVehicleDocument(row) {
  const doc = {
    name: row.name,
    type: row.type,
    brand: row.brand,
    model: row.model,
    year: Number(row.year),
    pricePerDay: Number(row.pricePerDay),
    fuelType: row.fuelType,
    transmission: row.transmission,
    description: row.description,
    imageUrl: row.imageUrl || undefined,
    ownerEmail: row.ownerEmail || undefined
  };

  // Preserve original SQLite timestamps when available.
  if (row.createdAt) doc.createdAt = new Date(row.createdAt);
  if (row.updatedAt) doc.updatedAt = new Date(row.updatedAt);

  return doc;
}

async function run() {
  console.log("[migrate] Starting vehicle migration (SQLite -> MongoDB)...");

  const mongoUri = getMongoUri();
  console.log("[migrate] Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("[migrate] Connected to MongoDB.");

  await db.whenReady;
  console.log("[migrate] SQLite is ready.");

  const existingCount = await Vehicle.estimatedDocumentCount();
  if (existingCount > 0) {
    console.warn(
      `[migrate] Aborted: MongoDB vehicles collection already has ${existingCount} document(s). No data was inserted.`
    );
    return;
  }

  console.log("[migrate] Reading vehicles from SQLite...");
  const sqliteRows = await getAllSqliteVehicles();
  console.log(`[migrate] Found ${sqliteRows.length} vehicle row(s) in SQLite.`);

  if (sqliteRows.length === 0) {
    console.log("[migrate] No rows to migrate. Exiting.");
    return;
  }

  const docs = sqliteRows.map(toVehicleDocument);
  console.log("[migrate] Inserting vehicles into MongoDB...");
  const inserted = await Vehicle.insertMany(docs, { ordered: true });
  console.log(`[migrate] Migration complete. Inserted ${inserted.length} vehicle document(s).`);
}

async function shutdown(exitCode) {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("[migrate] Disconnected from MongoDB.");
    }
  } catch (err) {
    console.error("[migrate] Failed to disconnect MongoDB:", err.message);
  }

  try {
    if (db && db.open) {
      await closeSqlite();
      console.log("[migrate] Closed SQLite connection.");
    }
  } catch (err) {
    console.error("[migrate] Failed to close SQLite:", err.message);
    exitCode = 1;
  }

  process.exit(exitCode);
}

run()
  .then(() => shutdown(0))
  .catch((err) => {
    console.error("[migrate] Migration failed:", err.message);
    shutdown(1);
  });
