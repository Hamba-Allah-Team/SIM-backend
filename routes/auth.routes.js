const { verifyToken } = require("../middleware/auth.middleware");
const authController = require("../controllers/auth.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Auth routes
  app.post("/api/auth/signup", authController.signup);
  app.post("/api/auth/signin", authController.signin);

  app.post("/api/auth/logout", verifyToken, authController.logout);
};
