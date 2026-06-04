const Vehicle = require("./models/Vehicle");
const Booking = require("./models/Booking");
const connectMongo = require("./mongo");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");
const { sendBookingConfirmationEmail } = require("./email");
const authRoutes = require("./routes/authRoutes");

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
app.use("/api/auth", authRoutes);

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

app.get("/api/vehicles", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const vehicles = await Vehicle.find({})
      .sort({ createdAt: -1 })
      .lean();

    const rows = vehicles.map((vehicle) => ({
      id: vehicle.id ?? vehicle._id?.toString(),
      name: vehicle.name,
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      pricePerDay: vehicle.pricePerDay,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      description: vehicle.description,
      imageUrl: vehicle.imageUrl ?? null,
      ownerEmail: vehicle.ownerEmail ?? null,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    }));

    res.json(rows);
  } catch (err) {
    console.error("[vehicles] fetch failed", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

app.post("/api/vehicles", upload.single("image"), async (req, res) => {
  const error = validateVehicle(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const imageUrl = req.file ? req.file.secure_url : null;
    const payload = {
      name: req.body.name.trim(),
      type: req.body.type.trim(),
      brand: req.body.brand.trim(),
      model: req.body.model.trim(),
      year: Number(req.body.year),
      pricePerDay: Number(req.body.pricePerDay),
      fuelType: req.body.fuelType.trim(),
      transmission: req.body.transmission.trim(),
      description: req.body.description.trim(),
      imageUrl,
      ownerEmail: String(req.body.ownerEmail || "").trim() || null
    };

    const created = await Vehicle.create(payload);
    const vehicle = {
      id: created.id ?? created._id?.toString(),
      name: created.name,
      type: created.type,
      brand: created.brand,
      model: created.model,
      year: created.year,
      pricePerDay: created.pricePerDay,
      fuelType: created.fuelType,
      transmission: created.transmission,
      description: created.description,
      imageUrl: created.imageUrl ?? null,
      ownerEmail: created.ownerEmail ?? null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };

    res.status(201).json({ message: "Vehicle added successfully", vehicle });
  } catch (err) {
    console.error("[vehicles] insert failed", err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

app.put("/api/vehicles/:id", upload.single("image"), async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "Invalid vehicle ID" });
  const error = validateVehicle(req.body, true);
  if (error) return res.status(400).json({ message: error });

  try {
    const existing = await Vehicle.findById(id).lean();
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

    const updated = await Vehicle.findByIdAndUpdate(id, merged, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) return res.status(404).json({ message: "Vehicle not found" });

    const vehicle = {
      id: updated.id ?? updated._id?.toString(),
      name: updated.name,
      type: updated.type,
      brand: updated.brand,
      model: updated.model,
      year: updated.year,
      pricePerDay: updated.pricePerDay,
      fuelType: updated.fuelType,
      transmission: updated.transmission,
      description: updated.description,
      imageUrl: updated.imageUrl ?? null,
      ownerEmail: updated.ownerEmail ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };

    res.json({ message: "Vehicle updated successfully", vehicle });
  } catch (err) {
    res.status(500).json({ message: "Failed to update vehicle" });
  }
});

app.delete("/api/vehicles/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "Invalid vehicle ID" });

  try {
    const vehicle = await Vehicle.findById(id).lean();
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    await Vehicle.findByIdAndDelete(id);
    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }
    console.error("[vehicles] delete failed", err);
    res.status(500).json({ message: "Failed to delete vehicle" });
  }
});

app.get("/api/bookings/availability", async (req, res) => {
  const { vehicleId, start, end } = req.query;
  if (!vehicleId || !start || !end) {
    return res.status(400).json({ message: "vehicleId, start and end are required" });
  }

  try {
    const conflicts = await Booking.find({
      vehicleId: String(vehicleId),
      status: { $in: ["pending", "pending_payment", "confirmed"] },
      pickupDate: { $lt: String(end) },
      dropoffDate: { $gt: String(start) }
    });

    res.json({ available: conflicts.length === 0 });
  } catch (err) {
    console.error("[bookings] availability check failed", err);
    res.status(500).json({ message: "Failed to check availability" });
  }
});

app.get("/api/bookings", async (_req, res) => {
  try {
    const rows = await Booking.find({})
      .sort({ createdAt: -1 })
      .lean();

    const bookings = rows.map((row) =>
      toBooking({
        ...row,
        userDetails:
          typeof row.userDetails === "string"
            ? row.userDetails
            : JSON.stringify(row.userDetails || {})
      })
    );

    res.json(bookings);
  } catch (err) {
    console.error("[bookings] fetch failed", err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

app.get("/api/bookings/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();

  try {
    const row = await Booking.findOne({ bookingId: id }).lean();
    if (!row) return res.status(404).json({ message: "Booking not found" });

    res.json(toBooking({
      ...row,
      userDetails:
        typeof row.userDetails === "string"
          ? row.userDetails
          : JSON.stringify(row.userDetails || {})
    }));
  } catch (err) {
    console.error("[bookings] fetch one failed", err);
    res.status(500).json({ message: "Failed to fetch booking" });
  }
});

app.post("/api/bookings", async (req, res) => {
  const bookingId = String(req.body.id || req.body.bookingId || `BK-${Date.now()}`);
  const vehicleId = String(req.body.vehicleId || "");
  const pickupDate = String(req.body.pickup || req.body.pickupDate || "");
  const dropoffDate = String(req.body.dropoff || req.body.dropoffDate || "");
  const totalPrice = Number(req.body.total ?? req.body.totalPrice ?? 0);
  if (!bookingId || !vehicleId || !pickupDate || !dropoffDate || totalPrice <= 0) {
    return res.status(400).json({ message: "Missing booking details" });
  }

  const userEmail = String(req.body.user || req.body.email || "").trim();
  const userDetails = {
    user: userEmail || "guest",
    email: userEmail || null,
    drivingLicense: req.body.drivingLicense || ""
  };

  try {
    const created = await Booking.create({
      bookingId,
      vehicleId,
      userDetails,
      pickupLocation: req.body.pickupLocation || null,
      dropoffLocation: req.body.dropoffLocation || null,
      pickupDate,
      dropoffDate,
      totalPrice,
      status: req.body.status || "pending",
      paymentStatus: req.body.paymentStatus || "pending"
    });

    res.status(201).json(
      toBooking({
        ...created.toObject(),
        userDetails: JSON.stringify(created.userDetails || {})
      })
    );
  } catch (err) {
    console.error("[bookings] create failed", err);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

app.put("/api/bookings/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();

  if (!id) return res.status(400).json({ message: "Invalid booking ID" });

  try {
    const existing = await Booking.findOne({ bookingId: id }).lean();
    if (!existing) return res.status(404).json({ message: "Booking not found" });

    const next = {
      status: req.body.status || existing.status,
      paymentStatus: req.body.paymentStatus || existing.paymentStatus,
      paidAt: req.body.paidAt || existing.paidAt
    };

    const row = await Booking.findOneAndUpdate({ bookingId: id }, next, { new: true }).lean();
    if (!row) return res.status(404).json({ message: "Booking not found" });

    const booking = toBooking({
      ...row,
      userDetails:
        typeof row.userDetails === "string"
          ? row.userDetails
          : JSON.stringify(row.userDetails || {})
    });

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

    try {
      const vehicle = await Vehicle.findById(String(row.vehicleId)).lean();
      await sendBookingConfirmationEmail({
        to: recipient,
        customerName,
        booking,
        vehicleName: vehicle?.name
      });
    } catch (emailErr) {
      console.error("[email] booking confirmation failed", emailErr.message || emailErr);
    }
  } catch (err) {
    console.error("[bookings] update failed", err);
    res.status(500).json({ message: "Failed to update booking" });
  }
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ message: err.message || "Request failed" });
});




async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`DriveHive backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] startup failed", err);
  process.exit(1);
});
