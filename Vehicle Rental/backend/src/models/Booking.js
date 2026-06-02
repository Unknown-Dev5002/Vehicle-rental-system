const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true
    },

    vehicleId: {
      type: String,
      required: true
    },

    userDetails: {
      user: String,
      email: String,
      drivingLicense: String
    },

    pickupLocation: String,
    dropoffLocation: String,

    pickupDate: {
      type: String,
      required: true
    },

    dropoffDate: {
      type: String,
      required: true
    },

    totalPrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      default: "pending"
    },

    paymentStatus: {
      type: String,
      default: "pending"
    },

    paidAt: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Booking", bookingSchema);