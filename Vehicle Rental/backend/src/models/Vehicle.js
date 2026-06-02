const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    pricePerDay: {
      type: Number,
      required: true
    },
    fuelType: {
      type: String,
      required: true
    },
    transmission: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    imageUrl: String,
    ownerEmail: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);