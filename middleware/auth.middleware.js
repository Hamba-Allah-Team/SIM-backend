const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;

verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  if (!token) {
    console.log("No token provided");
    return res.status(403).send({
      message: "No token provided!",
    });
  }

  console.log("Token received:", token);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Invalid token:", err);
      return res.status(401).send({
        message: "Unauthorized!",
      });
    }
    console.log("Decoded token:", decoded);
    req.userId = decoded.id;
    next();
  });
};

const authMiddleware = {
  verifyToken: verifyToken,
};

module.exports = authMiddleware;