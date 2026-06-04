const {
  AuthError,
  registerUser,
  loginUser,
  getCurrentUser,
  requestPasswordReset,
  resetPassword
} = require("../services/authService");

async function register(req, res) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("[auth] register failed", err);
    res.status(500).json({ message: "Failed to register user" });
  }
}

async function login(req, res) {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("[auth] login failed", err);
    res.status(500).json({ message: "Failed to login" });
  }
}

async function me(req, res) {
  try {
    const result = await getCurrentUser(req.user.userId);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("[auth] me failed", err);
    res.status(500).json({ message: "Failed to load current user" });
  }
}

async function forgotPassword(req, res) {
  try {
    const result = await requestPasswordReset(req.body);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("[auth] forgot-password failed", err);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
}

async function resetPasswordHandler(req, res) {
  try {
    const result = await resetPassword(req.body);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("[auth] reset-password failed", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
}

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword: resetPasswordHandler
};
