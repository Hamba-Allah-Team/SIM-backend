const db = require("../models");
const { Op } = require("sequelize");

const WalletTransactions = db.wallet_transaction;

async function recalculateWalletBalances(wallet_id) {
    const transactions = await WalletTransactions.findAll({
        where: { wallet_id },
        order: [
            ["transaction_date", "ASC"],
            ["transaction_id", "ASC"]
        ]
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
        await tx.update({ balance: runningBalance });
    }
}

module.exports = {
    recalculateWalletBalances
};