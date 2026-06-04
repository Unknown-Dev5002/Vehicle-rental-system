const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendPasswordResetEmail, hasSmtpCredentials } = require("../email");

const SALT_ROUNDS = 10;
const PASSWORD_REGEX = /^(?=.*\d).{8,}$/;
const TOKEN_EXPIRES_IN = "7d";

class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    license: user.license || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function createAuthToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function validateRegisterInput({ name, email, phone, password }) {
  if (!String(name || "").trim()) {
    throw new AuthError("name is required", 400);
  }
  if (!String(email || "").trim()) {
    throw new AuthError("email is required", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    throw new AuthError("email is invalid", 400);
  }
  if (!String(phone || "").trim()) {
    throw new AuthError("phone is required", 400);
  }
  if (!String(password || "")) {
    throw new AuthError("password is required", 400);
  }
  if (!PASSWORD_REGEX.test(String(password))) {
    throw new AuthError("password must be 8+ characters and include a number", 400);
  }
}

async function registerUser({ name, email, phone, password, license }) {
  validateRegisterInput({ name, email, phone, password });

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new AuthError("Email is already registered", 409);
  }

  const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

  let user;
  try {
    user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      passwordHash,
      license: String(license || "").trim() || undefined
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AuthError("Email is already registered", 409);
    }
    throw err;
  }

  return {
    message: "Registration successful",
    user: toPublicUser(user)
  };
}

async function loginUser({ email, password }) {
  if (!String(email || "").trim()) {
    throw new AuthError("email is required", 400);
  }
  if (!String(password || "")) {
    throw new AuthError("password is required", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AuthError("Invalid credentials", 401);
  }

  const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("Invalid credentials", 401);
  }

  return {
    message: "Login successful",
    token: createAuthToken(user),
    user: toPublicUser(user)
  };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  return {
    user: toPublicUser(user)
  };
}

function buildResetUrl(token) {
  const base = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  const path = `reset-password.html?token=${encodeURIComponent(token)}`;
  return base ? `${base}/${path}` : path;
}

async function requestPasswordReset({ email }) {
  if (!String(email || "").trim()) {
    throw new AuthError("email is required", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    throw new AuthError("email is invalid", 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  const genericMessage =
    "If an account exists for that email, password reset instructions have been sent.";

  if (!user) {
    return { message: genericMessage };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = buildResetUrl(resetToken);
  let emailSent = false;

  if (hasSmtpCredentials()) {
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
      emailSent = true;
    } catch (err) {
      console.error("[auth] password reset email failed", err.message || err);
    }
  }

  const response = { message: genericMessage };
  if (!emailSent) {
    response.resetLink = resetUrl;
  }

  return response;
}

async function resetPassword({ token, newPassword }) {
  const resetToken = String(token || "").trim();
  if (!resetToken) {
    throw new AuthError("token is required", 400);
  }
  if (!String(newPassword || "")) {
    throw new AuthError("newPassword is required", 400);
  }
  if (!PASSWORD_REGEX.test(String(newPassword))) {
    throw new AuthError("password must be 8+ characters and include a number", 400);
  }

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new AuthError("Invalid or expired reset token", 400);
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { message: "Password updated successfully" };
}

module.exports = {
  AuthError,
  registerUser,
  loginUser,
  getCurrentUser,
  requestPasswordReset,
  resetPassword
};
