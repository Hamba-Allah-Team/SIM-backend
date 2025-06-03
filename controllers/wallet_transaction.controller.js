const db = require("../models");
const moment = require('moment');
const PDFDocument = require('pdfkit');
const PdfPrinter = require("pdfmake");
const path = require("path");
const fonts = {
    Roboto: {
        normal: path.join(__dirname, "..", "assets", "fonts", "Roboto-Regular.ttf"),
        bold: path.join(__dirname, "..", "assets", "fonts", "Roboto-Medium.ttf"),
        italics: path.join(__dirname, "..", "assets", "fonts", "Roboto-Italic.ttf"),
        bolditalics: path.join(__dirname, "..", "assets", "fonts", "Roboto-MediumItalic.ttf"),
    }
};
const printer = new PdfPrinter(fonts);
const { Op } = require("sequelize");
const WalletTransactions = db.wallet_transaction;
const Wallets = db.wallet;
const TransactionCategory = db.transaction_category;
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
                wallet_name: wallet.wallet_name,
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

exports.getFinancialSummaryForDashboard = async (req, res) => {
    try {
        const mosqueId = req.params.mosqueId;

        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId },
            attributes: ['wallet_id', 'wallet_name']
        });

        const walletIds = wallets.map(w => w.wallet_id);

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

        // Ambil saldo terakhir tiap dompet
        const balances = await Promise.all(wallets.map(async (wallet) => {
            const latestTx = await WalletTransactions.findOne({
                where: { wallet_id: wallet.wallet_id, deleted_at: null },
                order: [['transaction_date', 'DESC'], ['created_at', 'DESC']],
                attributes: ['balance']
            });
            return {
                wallet_id: wallet.wallet_id,
                wallet_name: wallet.wallet_name,
                balance: latestTx?.balance || 0
            };
        }));

        const total_balance = balances.reduce((sum, w) => sum + parseFloat(w.balance), 0);

        res.json({
            total_income: parseFloat(result.total_income || 0),
            total_expense: parseFloat(result.total_expense || 0),
            net_balance: parseFloat(total_balance),
            wallet_balances: balances
        });
    } catch (error) {
        console.error("Error generating dashboard summary:", error);
        res.status(500).json({ message: "Gagal mengambil ringkasan keuangan dashboard" });
    }
};

exports.getRecentTransactions = async (req, res) => {
    try {
        const mosqueId = req.params.mosqueId;

        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId },
            attributes: ['wallet_id']
        });
        const walletIds = wallets.map(w => w.wallet_id);

        const recentTxs = await WalletTransactions.findAll({
            where: {
                wallet_id: { [Op.in]: walletIds },
                deleted_at: null
            },
            include: [
                { model: Wallets, as: 'wallet', attributes: ['wallet_name'] },
                { model: TransactionCategory, as: 'category', attributes: ['category_name'] }
            ],
            order: [['transaction_date', 'DESC'], ['created_at', 'DESC']],
            limit: 5
        });

        const formatted = recentTxs.map(tx => ({
            transaction_id: tx.transaction_id,
            date: tx.transaction_date,
            type: tx.transaction_type,
            amount: tx.amount,
            category: tx.category?.category_name || null,
            wallet: tx.wallet?.wallet_name || null,
            description: tx.source_or_usage
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        res.status(500).json({ message: "Gagal mengambil transaksi terbaru" });
    }
};

exports.getTopCategories = async (req, res) => {
    try {
        const { mosqueId } = req.params;
        const { type, limit = 5, startDate, endDate } = req.query;

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ message: "Tipe kategori tidak valid (income / expense)." });
        }

        const wallets = await Wallets.findAll({
            where: { mosque_id: mosqueId },
            attributes: ['wallet_id']
        });
        const walletIds = wallets.map(w => w.wallet_id);

        const result = await WalletTransactions.findAll({
            where: {
                wallet_id: { [Op.in]: walletIds },
                transaction_type: type,
                transaction_date: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                deleted_at: null
            },
            include: [
                { model: TransactionCategory, as: 'category', attributes: ['category_id', 'category_name'] }
            ],
            attributes: [
                'category_id',
                [db.Sequelize.fn('SUM', db.Sequelize.col('amount')), 'total_amount']
            ],
            group: ['category.category_id', 'category.category_name', 'wallet_transaction.category_id'],
            order: [[db.Sequelize.literal('total_amount'), 'DESC']],
            limit: parseInt(limit)
        });

        const formatted = result.map(r => ({
            category_id: r.category_id,
            category_name: r.category?.category_name,
            total_amount: parseFloat(r.get('total_amount'))
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Error fetching top categories:", error);
        res.status(500).json({ message: "Gagal mengambil kategori tertinggi" });
    }
};

exports.getLineStats = async (req, res) => {
    try {
        const { mosque_id } = req.query;
        const { range = '7d' } = req.query; // '7d', '1m', '1y'

        let dateFormat, startDate;

        switch (range) {
            case '1y':
                dateFormat = 'YYYY-MM';
                startDate = moment().subtract(1, 'year').startOf('month');
                break;
            case '1m':
                dateFormat = 'YYYY-MM-DD';
                startDate = moment().subtract(1, 'month').startOf('day');
                break;
            case '7d':
            default:
                dateFormat = 'YYYY-MM-DD';
                startDate = moment().subtract(6, 'days').startOf('day');
                break;
        }

        const transactions = await WalletTransactions.findAll({
            include: [
                {
                    model: db.user,
                    as: 'user',
                    where: { mosque_id },
                    attributes: []
                }
            ],
            where: {
                deleted_at: null,
                created_at: { [Op.gte]: startDate.toDate() }
            },
            attributes: ['amount', 'transaction_type', 'created_at'],
            raw: true
        });


        const grouped = {};

        transactions.forEach((t) => {
            const dateKey = moment(t.created_at).format(dateFormat);

            if (!grouped[dateKey]) {
                grouped[dateKey] = { income: 0, expense: 0 };
            }

            if (t.transaction_type === 'income') {
                grouped[dateKey].income += parseFloat(t.amount);
            } else if (t.transaction_type === 'expense') {
                grouped[dateKey].expense += parseFloat(t.amount);
            }
        });

        const dates = [];
        const incomes = [];
        const expenses = [];

        const days = [];

        const current = startDate.clone();
        const now = moment();

        while (current.isSameOrBefore(now, range === '1y' ? 'month' : 'day')) {
            const key = current.format(dateFormat);
            dates.push(key);
            incomes.push(grouped[key]?.income || 0);
            expenses.push(grouped[key]?.expense || 0);

            range === '1y' ? current.add(1, 'month') : current.add(1, 'day');
        }

        return res.json({
            labels: dates,
            datasets: {
                income: incomes,
                expense: expenses
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to get line chart data' });
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

exports.getWalletBalancesByDate = async (req, res) => {
    try {
        const { mosqueId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: "Tanggal wajib disertakan (query param 'date')." });
        }

        const targetDate = new Date(date);

        const wallets = await db.wallet.findAll({
            where: { mosque_id: mosqueId },
        });

        const result = await Promise.all(wallets.map(async (wallet) => {
            const latestTransaction = await db.wallet_transaction.findOne({
                where: {
                    wallet_id: wallet.wallet_id,
                    transaction_date: { [Op.lte]: targetDate },
                    deleted_at: null,
                },
                order: [['transaction_date', 'DESC'], ['transaction_id', 'DESC']],
                attributes: ['balance']
            });

            return {
                wallet_id: wallet.wallet_id,
                wallet_name: wallet.wallet_name,
                wallet_type: wallet.wallet_type,
                balance_on_date: latestTransaction ? parseFloat(latestTransaction.balance) : 0
            };
        }));

        res.json({
            date: targetDate.toISOString().split('T')[0],
            mosque_id: mosqueId,
            wallet_balances: result
        });

    } catch (error) {
        console.error("Error getting wallet balances by date:", error);
        res.status(500).json({ message: "Gagal mengambil saldo akhir per wallet." });
    }
};

exports.getTransactionsByCategoryForMosque = async (req, res) => {
    try {
        const { mosqueId } = req.params;
        const { categoryId, startDate, endDate } = req.query;

        if (!categoryId || !startDate || !endDate) {
            return res.status(400).json({ message: "Parameter categoryId, startDate, dan endDate wajib diisi." });
        }

        // ✅ Validasi kategori milik masjid tersebut
        const category = await db.transaction_category.findOne({
            where: {
                category_id: categoryId,
                mosque_id: mosqueId
            }
        });

        if (!category) {
            return res.status(404).json({ message: "Kategori tidak ditemukan atau bukan milik masjid ini." });
        }

        // ✅ Ambil semua wallet milik masjid
        const wallets = await db.wallet.findAll({
            where: { mosque_id: mosqueId },
            attributes: ['wallet_id']
        });

        const walletIds = wallets.map(w => w.wallet_id);

        // ✅ Query transaksi dalam rentang waktu & sesuai kategori
        const transactions = await db.wallet_transaction.findAll({
            where: {
                wallet_id: { [Op.in]: walletIds },
                category_id: categoryId,
                transaction_date: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                deleted_at: null
            },
            include: [
                { model: db.wallet, as: 'wallet', attributes: ['wallet_name'] },
                { model: db.transaction_category, as: 'category', attributes: ['category_name'] }
            ],
            order: [['transaction_date', 'ASC']]
        });

        const result = transactions.map(tx => ({
            transaction_id: tx.transaction_id,
            date: tx.transaction_date,
            amount: tx.amount,
            wallet_name: tx.wallet?.wallet_name || null,
            category_name: tx.category?.category_name || null,
            description: tx.source_or_usage,
            type: tx.transaction_type
        }));

        res.json({
            mosque_id: mosqueId,
            category_id: categoryId,
            category_name: category.category_name,
            start_date: startDate,
            end_date: endDate,
            total_transactions: result.length,
            transactions: result
        });

    } catch (error) {
        console.error("Error fetching transactions by category:", error);
        res.status(500).json({ message: "Gagal mengambil transaksi per kategori." });
    }
};

exports.filterTransactions = async (req, res) => {
    try {
        const {
            mosque_id,
            start_date,
            end_date,
            transaction_type,
            category_id,
            wallet_id,
            user_id,
            min_amount,
            max_amount,
            source_or_usage
        } = req.query;

        const whereClause = {
            deleted_at: null // exclude soft-deleted
        };

        // Pastikan hanya ambil transaksi dari masjid terkait
        if (mosque_id) {
            const wallets = await Wallets.findAll({
                where: { mosque_id },
                attributes: ["wallet_id"]
            });
            const walletIds = wallets.map(w => w.wallet_id);
            whereClause.wallet_id = { [Op.in]: walletIds };
        }

        if (start_date && end_date) {
            whereClause.transaction_date = {
                [Op.between]: [start_date, end_date]
            };
        } else if (start_date) {
            whereClause.transaction_date = { [Op.gte]: start_date };
        } else if (end_date) {
            whereClause.transaction_date = { [Op.lte]: end_date };
        }

        if (transaction_type) whereClause.transaction_type = transaction_type;
        if (category_id) whereClause.category_id = category_id;
        if (wallet_id) whereClause.wallet_id = wallet_id;
        if (user_id) whereClause.user_id = user_id;
        if (min_amount && max_amount) {
            whereClause.amount = {
                [Op.between]: [min_amount, max_amount]
            };
        } else if (min_amount) {
            whereClause.amount = { [Op.gte]: min_amount };
        } else if (max_amount) {
            whereClause.amount = { [Op.lte]: max_amount };
        }

        if (source_or_usage) {
            whereClause.source_or_usage = {
                [Op.like]: `%${source_or_usage}%`
            };
        }

        const transactions = await WalletTransactions.findAll({
            where: whereClause,
            include: [
                {
                    model: Wallets,
                    as: "wallet",
                    attributes: ["wallet_name", "wallet_type"]
                },
                {
                    model: TransactionCategory,
                    as: "category",
                    attributes: ["category_name", "category_type"]
                }
            ],
            order: [["transaction_date", "DESC"]]
        });

        res.status(200).json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal memfilter transaksi" });
    }
};

exports.getPeriodicReportExport = async (req, res) => {
    try {
        const { period, year, month, format } = req.query;
        const userId = req.userId;

        if (!period || !year || (period === "monthly" && !month) || !format) {
            return res.status(400).json({ message: "Parameter tidak lengkap." });
        }

        const startDate = new Date(period === "monthly" ? `${year}-${month}-01` : `${year}-01-01`);
        const endDate = new Date(period === "monthly"
            ? new Date(year, month, 0)
            : new Date(`${parseInt(year) + 1}-01-01`)
        );

        // ⬇️ Tambahan: cari mosque_id dari user
        const user = await db.user.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan." });
        }
        const mosqueId = user.mosque_id;

        const wallets = await db.wallet.findAll({
            where: {
                deleted_at: null,
                mosque_id: mosqueId
            }
        });

        const walletIds = wallets.map(w => w.wallet_id);

        const saldoAwal = await db.wallet_transaction.sum('amount', {
            where: {
                transaction_type: 'initial_balance',
                deleted_at: null,
                wallet_id: { [Op.in]: walletIds },
                transaction_date: { [Op.lte]: startDate } // gunakan Op.lte untuk termasuk tanggal awal
            }
        }) || 0;


        // Ambil transaksi untuk periode
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

        // Ambil juga initial_balance yang ada dalam periode ini (opsional: ditampilkan di tabel)
        const initialBalances = await db.wallet_transaction.findAll({
            where: {
                transaction_type: 'initial_balance',
                deleted_at: null,
                wallet_id: { [Op.in]: walletIds },
                transaction_date: { [Op.between]: [startDate, endDate] }
            },
            include: [
                { model: db.wallet, as: 'wallet', attributes: ['wallet_name'] }
            ],
            order: [['transaction_date', 'ASC']]
        });

        let totalIncome = 0;
        let totalExpense = 0;

        const incomeExpenseRows = transactions.map(tx => {
            const amount = Number(tx.amount);
            if (tx.transaction_type === 'income') totalIncome += amount;
            else if (tx.transaction_type === 'expense') totalExpense += amount;

            return {
                date: tx.transaction_date.toISOString().split('T')[0],
                type: tx.transaction_type,
                category: tx.category?.category_name || '',
                wallet: tx.wallet?.wallet_name || '',
                description: tx.source_or_usage || '',
                amount
            };
        });

        const initialBalanceRows = initialBalances.map(tx => ({
            date: tx.transaction_date.toISOString().split('T')[0],
            type: 'initial_balance',
            category: '-',
            wallet: tx.wallet?.wallet_name || '',
            description: tx.source_or_usage || 'Saldo Awal',
            amount: Number(tx.amount)
        }));

        const allRows = incomeExpenseRows.sort((a, b) => new Date(a.date) - new Date(b.date));
        const saldoBersih = saldoAwal + totalIncome - totalExpense;

        if (format === 'pdf') {
            const moment = require("moment");
            moment.locale('id');

            const docDefinition = {
                content: [
                    { text: "LAPORAN KEUANGAN PERIODIK", style: "header" },
                    {
                        text: `Periode: ${period === 'monthly' ? moment(`${year}-${month}-01`).format('MMMM YYYY') : `Tahun ${year}`}`,
                        alignment: "center",
                        margin: [0, 0, 0, 10]
                    },

                    { text: `Saldo Awal : Rp${saldoAwal.toLocaleString('id-ID')}`, bold: true, margin: [0, 0, 0, 2] },
                    { text: `Total Pemasukan : Rp${totalIncome.toLocaleString('id-ID')}`, bold: true, margin: [0, 0, 0, 2] },
                    { text: `Total Pengeluaran : Rp${totalExpense.toLocaleString('id-ID')}`, bold: true, margin: [0, 0, 0, 2] },
                    { text: `Saldo Bersih : Rp${saldoBersih.toLocaleString('id-ID')}`, bold: true, margin: [0, 0, 0, 10] },

                    {
                        table: {
                            headerRows: 1,
                            widths: [25, 70, 50, 70, 70, 80, "*"],
                            body: [
                                [
                                    { text: "No", bold: true },
                                    { text: "Tanggal", bold: true },
                                    { text: "Jenis", bold: true },
                                    { text: "Kategori", bold: true },
                                    { text: "Dompet", bold: true },
                                    { text: "Nominal", bold: true },
                                    { text: "Keterangan", bold: true }
                                ],
                                ...allRows.map((tx, i) => [
                                    i + 1,
                                    moment(tx.date).format("dddd, DD MMMM YYYY"),
                                    tx.type === "income"
                                        ? "Pemasukan"
                                        : tx.type === "expense"
                                            ? "Pengeluaran"
                                            : "Saldo Awal",
                                    tx.category,
                                    tx.wallet,
                                    `Rp${tx.amount.toLocaleString('id-ID')}`,
                                    tx.description
                                ])
                            ]
                        },
                        layout: "lightHorizontalLines"
                    },

                    { text: `\nDicetak pada: ${moment().format("dddd, DD MMMM YYYY HH:mm")}`, alignment: "right", fontSize: 9, italics: true }
                ],
                styles: {
                    header: {
                        fontSize: 16,
                        bold: true,
                        alignment: "center",
                        margin: [0, 0, 0, 10]
                    }
                },
                defaultStyle: {
                    font: "Roboto"
                }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            const filename = `laporan_${period}_${year}${month ? '_' + month : ''}.pdf`;
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
            pdfDoc.pipe(res);
            pdfDoc.end();
        } else {
            return res.status(400).json({ message: "Format belum didukung, hanya 'pdf' untuk saat ini." });
        }

    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ message: "Gagal export laporan." });
    }
};
