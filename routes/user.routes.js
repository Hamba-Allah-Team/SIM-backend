const { verifyToken } = require("../middleware/auth.middleware");
const { checkSoftDelete } = require("../middleware/checkSoftDelete.middleware");
const userController = require("../controllers/users.controller");

module.exports = function (app) {
  // User management routes
  app.get("/api/users", verifyToken, userController.getUsers);
  app.put("/api/users/:id", verifyToken, checkSoftDelete, userController.updateUser);
  app.delete("/api/users/:id", verifyToken, checkSoftDelete, userController.softDeleteUser);
  app.get("/api/users/profile", verifyToken, userController.profile);
  app.put("/api/users/change-password", verifyToken, userController.changePassword);
};
