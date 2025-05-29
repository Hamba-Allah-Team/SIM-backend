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
            category_id,
            source_or_usage,
            transaction_date,
        } = req.body;

        const user_id = req.userId;

        // Validasi input dasar
        if (!wallet_id || !amount || !transaction_type || !transaction_date || !category_id) {
            return res.status(400).json({ message: "Semua field wajib diisi." });
        }

        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: "Nominal tidak valid. Harus lebih dari 0." });
        }

        // 👉 Validasi kesesuaian category_type dengan transaction_type
        const category = await db.transaction_category.findByPk(category_id);
        if (!category) {
            return res.status(400).json({ message: "Kategori tidak ditemukan." });
        }

        if (category.category_type !== transaction_type) {
            return res.status(400).json({
                message: `Tipe kategori (${category.category_type}) tidak sesuai dengan tipe transaksi (${transaction_type}).`
            });
        }

        const transaction = await WalletTransactions.create({
            wallet_id,
            amount: amountNumber,
            transaction_type,
            category_id,
            source_or_usage,
            transaction_date,
            balance: 0, // tetap 0, akan diatur oleh logika saldo
            user_id,
        });

        // Jalankan perhitungan saldo
        await recalculateWalletBalances(wallet_id);

        // Ambil ulang transaksi agar balance-nya diperbarui
        const updatedTransaction = await WalletTransactions.findByPk(transaction.transaction_id);

        res.status(201).json(updatedTransaction);
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ message: "Gagal menambahkan transaksi" });
    }
};

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

exports.transferBetweenWallets = async (req, res) => {
    try {
        const {
            from_wallet_id,
            to_wallet_id,
            amount,
            transaction_date,
            source_or_usage,
        } = req.body;

        const user_id = req.userId;

        // Validasi input
        if (!from_wallet_id || !to_wallet_id || !amount || !transaction_date) {
            return res.status(400).json({ message: "Semua field wajib diisi." });
        }

        if (from_wallet_id === to_wallet_id) {
            return res.status(400).json({ message: "Wallet sumber dan tujuan tidak boleh sama." });
        }

        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: "Nominal tidak valid. Harus lebih dari 0." });
        }

        // Cek wallet sumber dan tujuan ada
        const fromWallet = await Wallets.findByPk(from_wallet_id);
        const toWallet = await Wallets.findByPk(to_wallet_id);

        if (!fromWallet || !toWallet) {
            return res.status(404).json({ message: "Wallet sumber atau tujuan tidak ditemukan." });
        }

        // Buat transaksi transfer_out di wallet sumber
        const debitTransaction = await WalletTransactions.create({
            wallet_id: from_wallet_id,
            amount: amountNumber,
            transaction_type: "transfer_out",  // tipe khusus untuk transfer keluar
            category_id: null,
            source_or_usage,
            transaction_date,
            balance: 0, // nanti akan dihitung ulang
            user_id,
        });

        // Buat transaksi transfer_in di wallet tujuan
        const creditTransaction = await WalletTransactions.create({
            wallet_id: to_wallet_id,
            amount: amountNumber,
            transaction_type: "transfer_in",  // tipe khusus untuk transfer masuk
            category_id: null,
            source_or_usage,
            transaction_date,
            balance: 0, // nanti akan dihitung ulang
            user_id,
        });

        // Hitung ulang saldo kedua wallet
        await recalculateWalletBalances(from_wallet_id);
        await recalculateWalletBalances(to_wallet_id);

        // Ambil ulang transaksi untuk mendapatkan balance terbaru
        const updatedDebitTransaction = await WalletTransactions.findByPk(debitTransaction.transaction_id);
        const updatedCreditTransaction = await WalletTransactions.findByPk(creditTransaction.transaction_id);

        res.status(201).json({
            message: "Transfer berhasil dilakukan",
            debitTransaction: updatedDebitTransaction,
            creditTransaction: updatedCreditTransaction,
        });

    } catch (error) {
        console.error("Error during wallet transfer:", error);
        res.status(500).json({ message: "Gagal melakukan transfer antar wallet" });
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
        const {
            wallet_id,
            amount,
            transaction_type,
            category_id,
            source_or_usage,
            transaction_date,
        } = req.body;

        const transaction = await WalletTransactions.findByPk(id);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        const oldWalletId = transaction.wallet_id;

        // 👉 Validasi category_id (jika diberikan)
        if (category_id || transaction_type) {
            const effectiveCategoryId = category_id || transaction.category_id;
            const effectiveTransactionType = transaction_type || transaction.transaction_type;

            const category = await db.transaction_category.findByPk(effectiveCategoryId);
            if (!category) {
                return res.status(400).json({ message: "Kategori tidak ditemukan." });
            }

            if (category.category_type !== effectiveTransactionType) {
                return res.status(400).json({
                    message: `Tipe kategori (${category.category_type}) tidak sesuai dengan tipe transaksi (${effectiveTransactionType}).`
                });
            }
        }

        // Update transaksi
        await transaction.update({
            amount,
            transaction_type,
            transaction_date,
            source_or_usage,
            category_id,
            ...(wallet_id !== undefined ? { wallet_id } : {})
        });

        // Recalculate balance di wallet lama dan wallet baru (jika berpindah)
        await recalculateWalletBalances(oldWalletId);
        if (wallet_id && wallet_id !== oldWalletId) {
            await recalculateWalletBalances(wallet_id);
        }

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

        // Ambil semua wallet dengan transaksi terakhir sekaligus
        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId },
            include: [
                {
                    model: WalletTransactions,
                    as: 'transactions',
                    attributes: ['balance', 'transaction_date', 'transaction_id'],
                    order: [
                        ['transaction_date', 'DESC'],
                        ['transaction_id', 'DESC']
                    ],
                    limit: 1,
                    separate: true  // lakukan subquery per wallet untuk transaksi terakhir
                }
            ]
        });

        const result = wallets.map(wallet => {
            const latestTransaction = wallet.transactions[0];
            return {
                wallet_id: wallet.wallet_id,
                mosque_id: wallet.mosque_id,
                wallet_type: wallet.wallet_type,
                balance: latestTransaction ? parseFloat(latestTransaction.balance) : 0
            };
        });

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

exports.getPeriodicReport = async (req, res) => {
    try {
        const { period, year, month } = req.query;
        const userId = req.userId;

        if (!period || !year || (period === "monthly" && !month)) {
            return res.status(400).json({ message: "Parameter tidak lengkap." });
        }

        const startDate = new Date(period === "monthly" ? `${year}-${month}-01` : `${year}-01-01`);
        const endDate = new Date(period === "monthly"
            ? new Date(year, month, 0) // akhir bulan
            : new Date(`${parseInt(year) + 1}-01-01`)
        );

        // Ambil transaksi milik user dalam rentang waktu
        const transactions = await db.wallet_transaction.findAll({
            where: {
                user_id: userId,
                transaction_date: { [Op.between]: [startDate, endDate] },
                transaction_type: { [Op.in]: ['income', 'expense'] },
                deleted_at: null
            },
            include: [
                { model: db.wallet, as: 'wallet', attributes: ['wallet_name'] },
                { model: db.transaction_category, as: 'category', attributes: ['category_name'] }
            ],
            order: [['transaction_date', 'ASC']]
        });

        let totalIncome = 0;
        let totalExpense = 0;

        const formattedTransactions = transactions.map(tx => {
            const amount = Number(tx.amount);
            if (tx.transaction_type === "income") totalIncome += amount;
            if (tx.transaction_type === "expense") totalExpense += amount;

            return {
                transaction_id: tx.transaction_id,
                date: tx.transaction_date,
                type: tx.transaction_type,
                amount: amount,
                category: tx.category?.category_name || null,
                wallet: tx.wallet?.wallet_name || null,
                description: tx.source_or_usage
            };
        });

        res.json({
            period: period === "monthly" ? `${year}-${month}` : `${year}`,
            total_income: totalIncome,
            total_expense: totalExpense,
            net_balance: totalIncome - totalExpense,
            transactions: formattedTransactions
        });

    } catch (error) {
        console.error("Error generating periodic report:", error);
        res.status(500).json({ message: "Gagal mengambil laporan keuangan" });
    }
};