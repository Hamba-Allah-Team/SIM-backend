const { verifyToken } = require("../middleware/auth.middleware");
const { checkSoftDelete } = require("../middleware/checkSoftDelete.middleware")
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/users.controller");

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
  app.get("/api/auth/profile", verifyToken, authController.profile);
  app.post("/api/auth/logout", verifyToken, authController.logout);

  // Reset password routes
  app.post("/api/auth/send-reset-password", authController.sendResetPassword);
  app.post("/api/auth/reset-password", authController.resetPassword);
  app.put("/api/auth/change-password", verifyToken, authController.changePassword);

  // User management routes
  app.get("/api/users", verifyToken, userController.getUsers);
  app.put("/api/users/:id", verifyToken, checkSoftDelete, userController.updateUser);
  app.delete("/api/users/:id", verifyToken, checkSoftDelete, userController.softDeleteUser);
};
