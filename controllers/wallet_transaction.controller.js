const db = require("../models");
const { Op } = require("sequelize");
const WalletTransactions = db.wallet_transaction;
const Wallets = db.wallet;
const { recalculateWalletBalances } = require("../utils/finance");

exports.createTransaction = async (req, res) => {
    try {
        const {
            wallet_id,
            amount,
            transaction_type,
            source_or_usage,
            transaction_date,
        } = req.body;

        const user_id = req.userId;

        // Validasi input dasar
        if (!wallet_id || !amount || !transaction_type || !transaction_date) {
            return res.status(400).json({ message: "Semua field wajib diisi." });
        }

        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: "Nominal tidak valid. Harus lebih dari 0." });
        }

        const transaction = await WalletTransactions.create({
            wallet_id,
            amount: amountNumber,
            transaction_type,
            source_or_usage,
            transaction_date,
            balance: 0, // tetap 0, akan diatur oleh logika saldo yang sudah ada
            user_id,
        });

        // Jalankan perhitungan saldo jika memang perlu, tanpa mengubah logikanya
        await recalculateWalletBalances(wallet_id);

        // Ambil ulang transaksi yang baru dibuat, agar dapat balance yang sudah diperbarui
        const updatedTransaction = await WalletTransactions.findByPk(transaction.transaction_id);

        res.status(201).json(updatedTransaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Gagal menambahkan transaksi" });
    }
};

// exports.createTransaction = async (req, res) => {
//     try {
//         const wallet_id = parseInt(req.params.walletId);
//         const {
//             amount,
//             transaction_type,
//             source_or_usage,
//             transaction_date
//         } = req.body;

//         const user_id = req.userId;

//         const amountNumber = Number(amount);
//         if (isNaN(amountNumber) || amountNumber <= 0) {
//             return res.status(400).json({ message: "Invalid amount. Must be a positive number." });
//         }

//         const transaction = await WalletTransactions.create({
//             wallet_id,
//             amount: amountNumber,
//             transaction_type,
//             source_or_usage,
//             transaction_date,
//             balance: 0,
//             user_id
//         });

//         await recalculateWalletBalances(wallet_id);

//         res.status(201).json(transaction);
//     } catch (error) {
//         console.error("Error creating transaction:", error);
//         res.status(500).json({ message: "Failed to create transaction" });
//     }
// };

exports.getAllTransactions = async (req, res) => {
    try {
        // Mendapatkan user_id dari req.userId setelah verifikasi token
        const userId = req.userId;

        // Mendapatkan parameter includeDeleted dari query
        const includeDeleted = req.query.includeDeleted === 'true';

        // Query untuk mencari transaksi berdasarkan user_id
        const transactions = await WalletTransactions.findAll({
            where: {
                user_id: userId,  // Hanya transaksi milik user dengan userId yang terverifikasi
            },
            paranoid: !includeDeleted,  // Memperhitungkan transaksi yang sudah dihapus
            order: [['transaction_date', 'DESC']],  // Mengurutkan transaksi berdasarkan tanggal secara menurun
        });

        res.json(transactions);  // Mengembalikan data transaksi dalam format JSON
    } catch (error) {
        console.error("Error retrieving transactions:", error);
        res.status(500).json({ message: "Failed to retrieve transactions" });
    }
};


exports.getTransactionById = async (req, res) => {
    try {
        const id = req.params.transactionId;
        const transaction = await WalletTransactions.findByPk(id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json(transaction);
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ message: "Failed to fetch transaction" });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const id = req.params.transactionId;
        const { amount, transaction_type, transaction_date, source_or_usage } = req.body;

        const transaction = await WalletTransactions.findByPk(id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        await transaction.update({
            amount,
            transaction_type,
            transaction_date,
            source_or_usage
        });

        await recalculateWalletBalances(transaction.wallet_id);

        res.json({ message: "Transaction and balances updated successfully" });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ message: "Failed to update transaction" });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const id = req.params.transactionId;
        const transaction = await WalletTransactions.findByPk(id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        await transaction.destroy();
        await recalculateWalletBalances(transaction.wallet_id);

        res.json({ message: "Transaction soft-deleted and balances updated successfully" });
    } catch (error) {
        console.error("Error soft deleting transaction:", error);
        res.status(500).json({ message: "Failed to soft delete transaction" });
    }
};

exports.restoreTransaction = async (req, res) => {
    try {
        const id = req.params.transactionId;

        const transaction = await WalletTransactions.findOne({
            where: { transaction_id: id },
            paranoid: false
        });

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        if (transaction.deletedAt === null) {
            return res.status(400).json({ message: "Transaction is not deleted" });
        }

        await transaction.restore();
        await recalculateWalletBalances(transaction.wallet_id);

        res.json({ message: "Transaction restored and balances updated successfully" });
    } catch (error) {
        console.error("Error restoring transaction:", error);
        res.status(500).json({ message: "Failed to restore transaction" });
    }
};

exports.getWalletWithBalance = async (req, res) => {
    try {
        const walletId = req.params.walletId;
        const wallet = await Wallets.findByPk(walletId);

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        const lastTransaction = await WalletTransactions.findOne({
            where: { wallet_id: walletId },
            order: [['transaction_date', 'DESC']]
        });

        const balance = lastTransaction ? lastTransaction.balance : 0;

        res.json({
            wallet_id: wallet.wallet_id,
            wallet_name: wallet.wallet_name,
            description: wallet.description,
            balance: parseFloat(balance)
        });
    } catch (error) {
        console.error("Error fetching wallet with balance:", error);
        res.status(500).json({ message: "Failed to retrieve wallet balance" });
    }
};

exports.getAllWalletsWithBalance = async (req, res) => {
    try {
        const wallets = await Wallets.findAll();

        const result = await Promise.all(wallets.map(async (wallet) => {
            const latestTransaction = await WalletTransactions.findOne({
                where: { wallet_id: wallet.wallet_id },
                order: [['transaction_date', 'DESC']],
                attributes: ['balance']
            });

            return {
                wallet_id: wallet.wallet_id,
                name: wallet.name,
                description: wallet.description,
                balance: latestTransaction ? parseFloat(latestTransaction.balance) : 0
            };
        }));

        res.json(result);
    } catch (error) {
        console.error("Error fetching wallets with balances:", error);
        res.status(500).json({ message: "Failed to fetch wallets with balances" });
    }
};

exports.getWalletsByMosqueWithBalance = async (req, res) => {
    try {
        const mosqueId = req.params.mosqueId;

        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId }
        });

        const result = await Promise.all(wallets.map(async (wallet) => {
            const latestTransaction = await WalletTransactions.findOne({
                where: { wallet_id: wallet.wallet_id },
                order: [['transaction_date', 'DESC']],
                attributes: ['balance']
            });

            return {
                wallet_id: wallet.wallet_id,
                mosque_id: wallet.mosque_id,
                wallet_type: wallet.wallet_type,
                balance: latestTransaction ? parseFloat(latestTransaction.balance) : 0
            };
        }));

        res.json(result);
    } catch (error) {
        console.error("Error fetching wallets by mosque with balances:", error);
        res.status(500).json({ message: "Failed to fetch wallets with balances by mosque" });
    }
};

exports.getPublicSummary = async (req, res) => {
    try {
        const mosqueId = req.params.mosqueId;

        // Ambil semua wallet milik mosque tertentu
        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId },
            attributes: ['wallet_id']
        });

        const walletIds = wallets.map(w => w.wallet_id);

        // Hitung total income dan expense dari semua transaksi aktif (non-soft-deleted)
        const [result] = await db.sequelize.query(`
            SELECT 
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS total_expense
            FROM wallet_transactions
            WHERE wallet_id IN (:walletIds) AND deleted_at IS NULL
        `, {
            replacements: { walletIds },
            type: db.Sequelize.QueryTypes.SELECT
        });

        res.json({
            total_income: parseFloat(result.total_income || 0),
            total_expense: parseFloat(result.total_expense || 0)
        });

    } catch (error) {
        console.error("Error generating public summary:", error);
        res.status(500).json({ message: "Failed to fetch public financial summary" });
    }
};
