const { verifyToken } = require("../middleware/auth.middleware");
const { checkSoftDelete } = require("../middleware/checkSoftDelete.middleware")
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/users.controller");
const walletsController = require("../controllers/wallets.controller");
const financesController = require("../controllers/finances.controller");

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

  // Wallet routes
  app.post("/api/wallets", verifyToken, walletsController.createWallet);
  app.get("/api/wallets", verifyToken, walletsController.getAllWallets);
  app.get("/api/wallets/:id", verifyToken, walletsController.getWalletById);
  app.put("/api/wallets/:id", verifyToken, walletsController.updateWallet);
  app.delete("/api/wallets/:id", verifyToken, walletsController.deleteWallet);

  // Wallet Transaction routes
  app.post("/api/wallet-transactions", verifyToken, financesController.createTransaction);
  app.get("/api/wallet-transactions", verifyToken, financesController.getAllTransactions);
  app.get("/api/wallet-transactions/:id", verifyToken, financesController.getTransactionById);
  app.put("/api/wallet-transactions/:id", verifyToken, financesController.updateTransaction);
  app.delete("/api/wallet-transactions/:id", verifyToken, financesController.deleteTransaction);
};
