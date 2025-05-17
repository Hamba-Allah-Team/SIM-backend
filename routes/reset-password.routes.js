const authController = require("../controllers/reset-password.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Reset password routes
  app.post("/api/reset-password/send-reset-password", authController.sendResetPassword);
  app.post("/api/reset-password/verify-reset-password", authController.verifyResetPassword);
  app.put("/api/reset-password/change-password", authController.changePassword);
};
