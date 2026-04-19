const jwt = require("jsonwebtoken");

/**
 * Generates a signed JWT token for a given userId.
 *
 * @param {string} userId - The MongoDB ObjectId of the user
 * @returns {string} - Signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * Verifies a JWT token and returns the decoded payload.
 *
 * @param {string} token - JWT token string
 * @returns {object} - Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
