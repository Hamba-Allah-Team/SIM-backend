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

        if (tx.transaction_type === "income") {
            runningBalance += amount;
        } else if (tx.transaction_type === "expense") {
            runningBalance -= amount;
        }

        // Update balance for this transaction
        await tx.update({ balance: runningBalance });
    }
}

module.exports = {
    recalculateWalletBalances
};