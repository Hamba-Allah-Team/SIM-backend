const { verifyToken } = require("../middleware/auth.middleware");
const walletController = require("../controllers/wallet.controller");
const walletTransactionController = require("../controllers/wallet_transaction.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Routes untuk Wallet
    app.post("/api/wallets", verifyToken, walletController.createWallet);
    app.get("/api/wallets", verifyToken, walletController.getAllWallets);
    app.get("/api/wallets/:mosqueId", verifyToken, walletController.getWalletsByMosqueId);
    app.get("/api/wallets/:id", verifyToken, walletController.getWalletById);
    app.put("/api/wallets/:id", verifyToken, walletController.updateWallet);
    app.delete("/api/wallets/:id", verifyToken, walletController.deleteWallet);

    // Routes untuk Wallet Transactions
    app.post("/api/finance/:walletId/transactions", verifyToken, walletTransactionController.createTransaction);
    app.get("/api/finance/transactions", verifyToken, walletTransactionController.getAllTransactions);
    app.get("/api/finance/:walletId/transactions/:transactionId", verifyToken, walletTransactionController.getTransactionById);
    app.put("/api/finance/:walletId/transactions/:transactionId", verifyToken, walletTransactionController.updateTransaction);
    app.delete("/api/finance/:walletId/transactions/:transactionId", verifyToken, walletTransactionController.deleteTransaction);
    app.patch("/api/finance/:walletId/transactions/:transactionId/restore", verifyToken, walletTransactionController.restoreTransaction);

    app.get('/api/wallets/:walletId/balance', verifyToken, walletTransactionController.getWalletWithBalance);
    app.get("/api/wallets-balances", verifyToken, walletTransactionController.getAllWalletsWithBalance);
    app.get("/api/wallets/mosque/:mosqueId", verifyToken, walletTransactionController.getWalletsByMosqueWithBalance);

    app.get("/api/finance/public-summary/:mosqueId", walletTransactionController.getPublicSummary);
};
