const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./db");

const app = express();
const PORT = 5000;

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

function validateVehicle(body, isUpdate = false) {
  const required = ["name", "type", "brand", "model", "year", "pricePerDay", "fuelType", "transmission", "description"];
  if (!isUpdate) {
    for (const key of required) {
      if (!String(body[key] ?? "").trim()) return `${key} is required`;
    }
  }

  if (body.year && (!Number.isInteger(Number(body.year)) || Number(body.year) < 1990 || Number(body.year) > 2035)) {
    return "year must be between 1990 and 2035";
  }
  if (body.pricePerDay && (Number(body.pricePerDay) <= 0 || Number(body.pricePerDay) > 100000)) {
    return "pricePerDay must be between 1 and 100000";
  }

  return null;
}

app.get("/api/vehicles", (_req, res) => {
  db.all("SELECT * FROM vehicles ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch vehicles" });
    res.json(rows);
  });
});

app.post("/api/vehicles", upload.single("image"), (req, res) => {
  const error = validateVehicle(req.body);
  if (error) return res.status(400).json({ message: error });

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const data = [
    req.body.name.trim(),
    req.body.type.trim(),
    req.body.brand.trim(),
    req.body.model.trim(),
    Number(req.body.year),
    Number(req.body.pricePerDay),
    req.body.fuelType.trim(),
    req.body.transmission.trim(),
    req.body.description.trim(),
    imageUrl,
    String(req.body.ownerEmail || "").trim() || null
  ];

  db.run(
    `INSERT INTO vehicles (name,type,brand,model,year,pricePerDay,fuelType,transmission,description,imageUrl,ownerEmail)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    data,
    function onInsert(err) {
      if (err) return res.status(500).json({ message: "Failed to add vehicle" });
      db.get("SELECT * FROM vehicles WHERE id = ?", [this.lastID], (readErr, row) => {
        if (readErr) return res.status(500).json({ message: "Vehicle added but failed to load" });
        res.status(201).json({ message: "Vehicle added successfully", vehicle: row });
      });
    }
  );
});

app.put("/api/vehicles/:id", upload.single("image"), (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid vehicle ID" });
  const error = validateVehicle(req.body, true);
  if (error) return res.status(400).json({ message: error });

  db.get("SELECT * FROM vehicles WHERE id = ?", [id], (findErr, existing) => {
    if (findErr) return res.status(500).json({ message: "Failed to find vehicle" });
    if (!existing) return res.status(404).json({ message: "Vehicle not found" });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing.imageUrl;
    const merged = {
      name: (req.body.name || existing.name).trim(),
      type: (req.body.type || existing.type).trim(),
      brand: (req.body.brand || existing.brand).trim(),
      model: (req.body.model || existing.model).trim(),
      year: Number(req.body.year || existing.year),
      pricePerDay: Number(req.body.pricePerDay || existing.pricePerDay),
      fuelType: (req.body.fuelType || existing.fuelType).trim(),
      transmission: (req.body.transmission || existing.transmission).trim(),
      description: (req.body.description || existing.description).trim(),
      imageUrl,
      ownerEmail: String(req.body.ownerEmail || existing.ownerEmail || "").trim() || null
    };

    db.run(
      `UPDATE vehicles
       SET name=?, type=?, brand=?, model=?, year=?, pricePerDay=?, fuelType=?, transmission=?, description=?, imageUrl=?, ownerEmail=?, updatedAt=CURRENT_TIMESTAMP
       WHERE id=?`,
      [merged.name, merged.type, merged.brand, merged.model, merged.year, merged.pricePerDay, merged.fuelType, merged.transmission, merged.description, merged.imageUrl, merged.ownerEmail, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Failed to update vehicle" });
        if (req.file && existing.imageUrl && existing.imageUrl.startsWith("/uploads/")) {
          const oldPath = path.join(__dirname, "..", existing.imageUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        db.get("SELECT * FROM vehicles WHERE id = ?", [id], (readErr, row) => {
          if (readErr) return res.status(500).json({ message: "Vehicle updated but failed to load" });
          res.json({ message: "Vehicle updated successfully", vehicle: row });
        });
      }
    );
  });
});

app.delete("/api/vehicles/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid vehicle ID" });

  db.get("SELECT * FROM vehicles WHERE id = ?", [id], (findErr, vehicle) => {
    if (findErr) return res.status(500).json({ message: "Failed to find vehicle" });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    db.run("DELETE FROM vehicles WHERE id = ?", [id], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ message: "Failed to delete vehicle" });
      if (vehicle.imageUrl && vehicle.imageUrl.startsWith("/uploads/")) {
        const filePath = path.join(__dirname, "..", vehicle.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      res.json({ message: "Vehicle deleted successfully" });
    });
  });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ message: err.message || "Request failed" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`DriveHive backend running on http://localhost:${PORT}`);
});
