require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");
const db = require("./db");
const { sendBookingConfirmationEmail } = require("./email");

const app = express();
const PORT = 5000;

const storage = CloudinaryStorage({
  cloudinary: { v2: cloudinary },
  folder: "drivehive-vehicles"
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
app.use((req, res, next) => {
  db.whenReady
    .then(() => next())
    .catch((err) => {
      console.error("[db] initialization failed", err);
      res.status(503).json({ message: "Database is not ready" });
    });
});

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

function getBookingRecipientEmail(booking) {
  const details = booking.userDetails || {};
  const candidate = String(details.email || details.user || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

function toBooking(row) {
  let userDetails = {};
  try {
    userDetails = row.userDetails ? JSON.parse(row.userDetails) : {};
  } catch (_err) {
    userDetails = {};
  }
  return {
    id: row.bookingId,
    bookingId: row.bookingId,
    vehicleId: row.vehicleId,
    pickupLocation: row.pickupLocation,
    dropoffLocation: row.dropoffLocation,
    pickup: row.pickupDate,
    dropoff: row.dropoffDate,
    pickupDate: row.pickupDate,
    dropoffDate: row.dropoffDate,
    user: userDetails.user || userDetails.email || "guest",
    userDetails,
    total: row.totalPrice,
    totalPrice: row.totalPrice,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paidAt: row.paidAt,
    createdAt: row.createdAt
  };
}

app.get("/api/vehicles", (_req, res) => {
  res.set("Cache-Control", "no-store");
  db.all("SELECT * FROM vehicles ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("[vehicles] fetch failed", err);
      return res.status(500).json({ message: "Failed to fetch vehicles" });
    }
    res.json(rows);
  });
});

app.post("/api/vehicles", upload.single("image"), (req, res) => {
  const error = validateVehicle(req.body);
  if (error) return res.status(400).json({ message: error });

  const imageUrl = req.file ? req.file.secure_url : null;
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
      if (err) {
        console.error("[vehicles] insert failed", err);
        return res.status(500).json({ message: "Failed to add vehicle" });
      }
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

    const imageUrl = req.file ? req.file.secure_url : existing.imageUrl;
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
      res.json({ message: "Vehicle deleted successfully" });
    });
  });
});

app.get("/api/bookings/availability", (req, res) => {
  const { vehicleId, start, end } = req.query;
  if (!vehicleId || !start || !end) return res.status(400).json({ message: "vehicleId, start and end are required" });
  db.get(
    `SELECT COUNT(*) AS count FROM bookings
     WHERE vehicleId = ?
       AND status IN ('pending', 'pending_payment', 'confirmed')
       AND pickupDate < ?
       AND dropoffDate > ?`,
    [String(vehicleId), String(end), String(start)],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Failed to check availability" });
      res.json({ available: Number(row.count || 0) === 0 });
    }
  );
});

app.get("/api/bookings", (_req, res) => {
  db.all("SELECT * FROM bookings ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch bookings" });
    res.json(rows.map(toBooking));
  });
});

app.get("/api/bookings/:id", (req, res) => {
  db.get("SELECT * FROM bookings WHERE bookingId = ?", [String(req.params.id)], (err, row) => {
    if (err) return res.status(500).json({ message: "Failed to fetch booking" });
    if (!row) return res.status(404).json({ message: "Booking not found" });
    res.json(toBooking(row));
  });
});

app.post("/api/bookings", (req, res) => {
  const bookingId = String(req.body.id || req.body.bookingId || `BK-${Date.now()}`);
  const vehicleId = String(req.body.vehicleId || "");
  const pickupDate = String(req.body.pickup || req.body.pickupDate || "");
  const dropoffDate = String(req.body.dropoff || req.body.dropoffDate || "");
  const totalPrice = Number(req.body.total ?? req.body.totalPrice ?? 0);
  if (!bookingId || !vehicleId || !pickupDate || !dropoffDate || totalPrice <= 0) {
    return res.status(400).json({ message: "Missing booking details" });
  }

  const userEmail = String(req.body.user || req.body.email || "").trim();
  const userDetails = JSON.stringify({
    user: userEmail || "guest",
    email: userEmail || null,
    drivingLicense: req.body.drivingLicense || ""
  });

  db.run(
    `INSERT INTO bookings (bookingId, vehicleId, userDetails, pickupLocation, dropoffLocation, pickupDate, dropoffDate, totalPrice, status, paymentStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      vehicleId,
      userDetails,
      req.body.pickupLocation || null,
      req.body.dropoffLocation || null,
      pickupDate,
      dropoffDate,
      totalPrice,
      req.body.status || "pending",
      req.body.paymentStatus || "pending"
    ],
    function onInsert(err) {
      if (err) return res.status(500).json({ message: "Failed to create booking" });
      db.get("SELECT * FROM bookings WHERE id = ?", [this.lastID], (readErr, row) => {
        if (readErr) return res.status(500).json({ message: "Booking created but failed to load" });
        res.status(201).json(toBooking(row));
      });
    }
  );
});

app.put("/api/bookings/:id", (req, res) => {
  db.get("SELECT * FROM bookings WHERE bookingId = ?", [String(req.params.id)], (findErr, existing) => {
    if (findErr) return res.status(500).json({ message: "Failed to find booking" });
    if (!existing) return res.status(404).json({ message: "Booking not found" });

    const next = {
      status: req.body.status || existing.status,
      paymentStatus: req.body.paymentStatus || existing.paymentStatus,
      paidAt: req.body.paidAt || existing.paidAt
    };
    db.run(
      "UPDATE bookings SET status = ?, paymentStatus = ?, paidAt = ? WHERE bookingId = ?",
      [next.status, next.paymentStatus, next.paidAt, String(req.params.id)],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Failed to update booking" });
        db.get("SELECT * FROM bookings WHERE bookingId = ?", [String(req.params.id)], (readErr, row) => {
          if (readErr) return res.status(500).json({ message: "Booking updated but failed to load" });

          const booking = toBooking(row);
          const paymentMarkedPaid = req.body.paymentStatus === "paid";
          const paymentJustCompleted =
            paymentMarkedPaid &&
            row.paymentStatus === "paid" &&
            existing.paymentStatus !== "paid";

          if (!paymentJustCompleted) {
            return res.json(booking);
          }

          const recipient = getBookingRecipientEmail(booking);
          const userDetails = booking.userDetails || {};
          const customerName = String(userDetails.name || userDetails.user || "Guest").trim() || "Guest";

          if (!recipient) {
            console.error("[email] skipped: booking has no valid recipient email", row.bookingId);
            return res.json(booking);
          }

          res.json(booking);

          db.get("SELECT name FROM vehicles WHERE id = ?", [String(row.vehicleId)], (vehicleErr, vehicle) => {
            if (vehicleErr) {
              console.error("[email] vehicle lookup failed", vehicleErr);
            }
            sendBookingConfirmationEmail({
              to: recipient,
              customerName,
              booking,
              vehicleName: vehicle?.name
            }).catch((emailErr) => {
              console.error("[email] booking confirmation failed", emailErr.message || emailErr);
            });
          });
          return;
        });
      }
    );
  });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ message: err.message || "Request failed" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`DriveHive backend running on http://localhost:${PORT}`);
  console.log(`SQLite database: ${db.dbPath}`);
});
