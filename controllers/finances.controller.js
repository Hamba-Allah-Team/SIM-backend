const db = require("../models");
const Finances = db.finances;

exports.createTransaction = async (req, res) => {
    try {
        const {
            wallet_id,
            amount,
            transaction_type,
            source_or_usage,
            transaction_date,
            balance,
            user_id
        } = req.body;

        const transaction = await Finances.create({
            wallet_id,
            amount,
            transaction_type,
            source_or_usage,
            transaction_date,
            balance,
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
        const transactions = await Finances.findAll();
        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const id = req.params.id;
        const transaction = await Finances.findByPk(id);

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

        const [updated] = await Finances.update(req.body, {
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
        const id = req.params.id;
        const deleted = await Finances.destroy({ where: { transaction_id: id } });

        if (!deleted) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ message: "Failed to delete transaction" });
    }
};
