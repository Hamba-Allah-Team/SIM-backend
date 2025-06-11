const db = require("../models");
const { Op } = require("sequelize");

const WalletTransactions = db.wallet_transaction;

async function getCurrentWalletBalance(wallet_id, options = {}) {
    const latestTransaction = await WalletTransactions.findOne({
        where: { wallet_id },
        order: [
            ["transaction_date", "DESC"],
            ["created_at", "DESC"], // Urutan kedua untuk transaksi di hari yang sama
            ["transaction_id", "DESC"]
        ],
        attributes: ['balance'],
        transaction: options.transaction
    });
    // Jika tidak ada transaksi, saldo dianggap 0
    return latestTransaction ? parseFloat(latestTransaction.balance) : 0;
}

async function recalculateWalletBalances(wallet_id, options = {}) {
    const transactions = await WalletTransactions.findAll({
        where: { wallet_id },
        order: [
            ["transaction_date", "ASC"],
            ["transaction_id", "ASC"]
        ],
        transaction: options.transaction
    });

    let runningBalance = 0;

    for (const tx of transactions) {
        const amount = Number(tx.amount);

        if (
            tx.transaction_type === "income" ||
            tx.transaction_type === "transfer_in" ||
            tx.transaction_type === "initial_balance"
        ) {
            runningBalance += amount;
        } else if (
            tx.transaction_type === "expense" ||
            tx.transaction_type === "transfer_out"
        ) {
            runningBalance -= amount;
        }

        // Update balance for this transaction
        await tx.update({ balance: runningBalance }, { transaction: options.transaction });
    }
}

module.exports = {
    recalculateWalletBalances,
    getCurrentWalletBalance
};