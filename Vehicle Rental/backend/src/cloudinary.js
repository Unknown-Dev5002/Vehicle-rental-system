const path = require("path");
const cloudinary = require("cloudinary").v2;

// Load variables from backend/.env (same pattern as other backend modules)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Read Cloudinary credentials from the environment (never hard-code secrets)
const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

// Fail early if configuration is incomplete
if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set in backend/.env"
  );
}

// Configure the Cloudinary SDK once at module load
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

// Export the configured client for uploads elsewhere in the app
module.exports = cloudinary;
