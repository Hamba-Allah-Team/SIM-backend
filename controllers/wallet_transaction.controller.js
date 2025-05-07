const db = require("../models");
const WalletTransactions = db.wallet_transaction; // pastikan model ini sudah didefinisikan di models/index.js

exports.createTransaction = async (req, res) => {
    try {
        const wallet_id = parseInt(req.params.walletId); // ✅ ambil dari URL
        const {
            amount,
            transaction_type,
            source_or_usage,
            transaction_date
        } = req.body;

        const user_id = req.userId;

        // Validasi amount
        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: "Invalid amount. Must be a positive number." });
        }

        // Ambil transaksi terakhir dari wallet ini untuk mendapatkan saldo terakhir
        const lastTransaction = await WalletTransactions.findOne({
            where: { wallet_id },
            order: [['transaction_date', 'DESC']] // atau ['createdAt', 'DESC'] jika pakai createdAt
        });

        let currentBalance = lastTransaction ? Number(lastTransaction.balance) : 0;
        let newBalance;

        // Hitung balance baru berdasarkan tipe transaksi
        if (transaction_type === "income") {
            newBalance = currentBalance + amountNumber;
        } else if (transaction_type === "expense") {
            if (amountNumber > currentBalance) {
                return res.status(400).json({ message: "Insufficient balance for expense transaction." });
            }
            newBalance = currentBalance - amountNumber;
        } else {
            return res.status(400).json({ message: "Invalid transaction_type. Use 'income' or 'expense'." });
        }

        // Simpan transaksi baru
        const transaction = await WalletTransactions.create({
            wallet_id,
            amount: amountNumber,
            transaction_type,
            source_or_usage,
            transaction_date,
            balance: newBalance,
            user_id
        });

        res.status(201).json(transaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Failed to create transaction" });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await WalletTransactions.findAll();
        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const id = req.params.id;
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
        const id = req.params.id;

        const [updated] = await WalletTransactions.update(req.body, {
            where: { transaction_id: id }
        });

        if (updated === 0) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Transaction updated successfully" });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ message: "Failed to update transaction" });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const id = req.params.transactionId;
        const deleted = await WalletTransactions.destroy({ where: { transaction_id: id } });

        if (!deleted) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ message: "Failed to delete transaction" });
    }
};