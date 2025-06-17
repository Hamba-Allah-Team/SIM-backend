const db = require("../models");
const moment = require('moment');
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
const { recalculateWalletBalances, getCurrentWalletBalance } = require("../utils/finance");

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

        if (transaction_type === 'expense') {
            const currentBalance = await getCurrentWalletBalance(wallet_id);
            if (currentBalance < amountNumber) {
                return res.status(400).json({ message: `Saldo dompet tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}` });
            }
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
        const userId = req.userId;
        const user = await db.user.findByPk(userId);
        if (!user) return res.status(404).send({ message: "Pengguna tidak ditemukan." });

        const mosqueId = user.mosque_id;

        const { type = 'cashflow', includeDeleted = 'false' } = req.query;

        let transactionTypeFilter = {};
        if (type === 'cashflow') {
            transactionTypeFilter = { [Op.in]: ['income', 'expense'] };
        } else if (type === 'transfer') {
            transactionTypeFilter = { [Op.in]: ['transfer_in', 'transfer_out'] };
        }

        const transactions = await WalletTransactions.findAll({
            paranoid: includeDeleted !== 'true',
            order: [['transaction_date', 'DESC'], ['created_at', 'DESC']],
            // 👈 PERBAIKAN DI SINI: Menggunakan 'include' untuk memfilter berdasarkan mosque_id
            include: [
                {
                    model: db.wallet, // Mengasumsikan model dompet Anda adalah 'wallet'
                    as: 'wallet',
                    attributes: [], // Tidak perlu mengambil data dari tabel wallet, hanya untuk join
                    where: {
                        mosque_id: mosqueId
                    },
                    required: true // Memastikan ini adalah INNER JOIN
                },
                {
                    model: db.transaction_category, // Menyertakan kategori untuk data yang lebih lengkap jika diperlukan
                    as: 'category',
                    attributes: [] // Opsional: bisa juga mengambil category_name
                }
            ],
            where: {
                // Filter tipe transaksi diterapkan di sini jika ada
                ...(type !== 'all' && { transaction_type: transactionTypeFilter })
            }
        });

        res.json(transactions);

    } catch (err) {
        console.error("Error retrieving transactions:", err);
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

        const currentBalance = await getCurrentWalletBalance(from_wallet_id);
        if (currentBalance < amountNumber) {
            return res.status(400).json({ message: `Saldo dompet sumber tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}` });
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
    const t = await db.sequelize.transaction();
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
            await t.rollback();
            return res.status(404).json({ message: "Transaction not found" });
        }

        const oldWalletId = transaction.wallet_id;
        const newWalletId = wallet_id ? Number(wallet_id) : oldWalletId;

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
            amount: Number(amount),
            transaction_type,
            transaction_date,
            source_or_usage,
            category_id,
            wallet_id: newWalletId,
        }, { transaction: t });

        // Recalculate balance di wallet lama dan wallet baru (jika berpindah)
        await recalculateWalletBalances(oldWalletId, { transaction: t });
        if (newWalletId !== oldWalletId) {
            await recalculateWalletBalances(newWalletId, { transaction: t });
        }

        // 4. Periksa saldo akhir dari semua dompet yang terlibat
        const fromWallet = await Wallets.findByPk(oldWalletId, { transaction: t });
        const fromWalletBalance = await getCurrentWalletBalance(fromWallet.wallet_id, { transaction: t });
        if (fromWalletBalance < 0) {
            await t.rollback();
            return res.status(400).json({ message: `Gagal, update menyebabkan saldo ${fromWallet.wallet_name} menjadi negatif.` });
        }

        if (newWalletId !== oldWalletId) {
            const toWallet = await Wallets.findByPk(newWalletId, { transaction: t });
            const toWalletBalance = await getCurrentWalletBalance(toWallet.wallet_id, { transaction: t });
            if (toWalletBalance < 0) {
                await t.rollback();
                return res.status(400).json({ message: `Gagal, update menyebabkan saldo ${toWallet.wallet_name} menjadi negatif.` });
            }
        }

        // 5. Jika semua valid, simpan perubahan
        await t.commit();
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
            attributes: ['wallet_id', 'wallet_name', 'wallet_type'],
        });

        if (wallets.length === 0) {
            return res.json({
                total_income: 0,
                total_expense: 0,
                net_balance: 0,
                wallet_balances: []
            });
        }

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
                wallet_type: wallet.wallet_type,
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

exports.getPublicFinancialSummary = async (req, res) => {
    try {
        // Mengambil masjid berdasarkan slug, bukan ID
        const mosque = await db.mosques.findOne({ where: { slug: req.params.slug } });
        if (!mosque) {
            return res.status(404).json({ message: "Masjid tidak ditemukan." });
        }

        // Mengambil semua ID dompet yang dimiliki masjid ini
        const wallets = await Wallets.findAll({
            where: { mosque_id: mosque.mosque_id },
            attributes: ['wallet_id']
        });

        if (wallets.length === 0) {
            return res.json({ total_income: 0, total_expense: 0 });
        }
        const walletIds = wallets.map(w => w.wallet_id);

        // Menjalankan query yang sama untuk mendapatkan total pemasukan dan pengeluaran
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
            pemasukan: parseFloat(result.total_income || 0),
            pengeluaran: parseFloat(result.total_expense || 0),
        });

    } catch (error) {
        console.error("Error generating public financial summary:", error);
        res.status(500).json({ message: "Gagal mengambil ringkasan keuangan" });
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
                // 👈 PERBAIKAN DI SINI: Filter hanya income dan expense
                transaction_type: { [Op.in]: ['income', 'expense'] },
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

exports.getPeriodicReportExport = async (req, res) => {
    try {
        const { period, year, month, format } = req.query;
        const userId = req.userId;

        if (!period || !year || (period === "monthly" && !month) || !format) {
            return res.status(400).json({ message: "Parameter tidak lengkap." });
        }

        // Tentukan Tanggal Mulai dan Selesai Periode Laporan
        const startDate = new Date(Date.UTC(year, period === 'monthly' ? month - 1 : 0, 1));
        const endDate = new Date(Date.UTC(year, period === 'monthly' ? month : 12, 0, 23, 59, 59, 999));

        const user = await db.user.findByPk(userId, { include: [{ model: db.mosques, as: 'mosque' }] });
        if (!user || !user.mosque_id) {
            return res.status(404).json({ message: "User atau data masjid tidak ditemukan." });
        }
        const mosqueId = user.mosque_id;
        const mosqueName = user.mosque.name;
        const mosqueAddress = user.mosque.address;

        const wallets = await Wallets.findAll({ where: { mosque_id: mosqueId } });
        const walletIds = wallets.map(w => w.wallet_id);

        if (walletIds.length === 0) {
            return res.status(404).json({ message: "Tidak ada dompet yang ditemukan untuk masjid ini." });
        }

        // 1. Hitung Saldo Awal (Akumulasi semua transaksi sebelum periode)
        const transactionsBefore = await WalletTransactions.findAll({
            where: {
                wallet_id: { [Op.in]: walletIds },
                transaction_date: { [Op.lt]: startDate },
            },
            attributes: ['amount', 'transaction_type']
        });

        let saldoAwal = 0;
        transactionsBefore.forEach(tx => {
            const amount = Number(tx.amount);
            if (['income', 'initial_balance', 'transfer_in'].includes(tx.transaction_type)) {
                saldoAwal += amount;
            } else {
                saldoAwal -= amount;
            }
        });

        // 2. Ambil Semua Transaksi di Dalam Periode Laporan
        const transactionsInPeriod = await WalletTransactions.findAll({
            where: {
                wallet_id: { [Op.in]: walletIds },
                transaction_date: { [Op.between]: [startDate, endDate] },
                transaction_type: { [Op.in]: ['income', 'expense'] } // Hanya pemasukan & pengeluaran operasional
            },
            include: [
                { model: Wallets, as: 'wallet', attributes: ['wallet_name'] },
                { model: TransactionCategory, as: 'category', attributes: ['category_name'] }
            ],
            order: [['transaction_date', 'ASC'], ['created_at', 'ASC']]
        });

        // 3. Kelompokkan Pemasukan & Pengeluaran berdasarkan Kategori
        let totalIncome = 0;
        let totalExpense = 0;
        const groupedIncome = {};
        const groupedExpense = {};

        transactionsInPeriod.forEach(tx => {
            const amount = Number(tx.amount);
            const category = tx.category?.category_name || 'Lain-lain';
            const transactionData = {
                date: tx.transaction_date,
                description: tx.source_or_usage || tx.category?.category_name || 'Transaksi',
                wallet: tx.wallet?.wallet_name || '',
                amount: amount
            };

            if (tx.transaction_type === 'income') {
                totalIncome += amount;
                if (!groupedIncome[category]) groupedIncome[category] = { transactions: [], total: 0 };
                groupedIncome[category].transactions.push(transactionData);
                groupedIncome[category].total += amount;
            } else if (tx.transaction_type === 'expense') {
                totalExpense += amount;
                if (!groupedExpense[category]) groupedExpense[category] = { transactions: [], total: 0 };
                groupedExpense[category].transactions.push(transactionData);
                groupedExpense[category].total += amount;
            }
        });

        const saldoAkhir = saldoAwal + totalIncome - totalExpense;

        // 4. Hitung Distribusi Saldo Akhir per Dompet
        const walletBalances = [];
        for (const wallet of wallets) {
            const balance = await getCurrentWalletBalance(wallet.wallet_id); // Gunakan fungsi helper Anda
            walletBalances.push({ name: wallet.wallet_name, balance: balance });
        }

        // 5. Generate PDF dengan Format Baru
        if (format === 'pdf') {
            moment.locale('id');
            const periodString = period === 'monthly' ? moment(startDate).format('MMMM YYYY') : `Tahun ${year}`;

            const createCategoryTable = (title, data) => {
                const body = [[{ text: 'Tanggal', style: 'tableHeader' }, { text: 'Keterangan', style: 'tableHeader' }, { text: 'Jumlah (Rp)', style: 'tableHeader', alignment: 'right' }]];
                if (Object.keys(data).length === 0) {
                    body.push([{ text: 'Tidak ada transaksi pada periode ini.', colSpan: 3, alignment: 'center', italics: true, margin: [0, 10] }, {}, {}]);
                } else {
                    for (const category in data) {
                        body.push([{ text: category, bold: true, colSpan: 3, margin: [0, 5, 0, 2], fillColor: '#eeeeee' }, {}, {}]);
                        data[category].transactions.forEach(tx => {
                            body.push([
                                moment(tx.date).format("DD/MM/YY"),
                                `${tx.description} (${tx.wallet})`,
                                { text: tx.amount.toLocaleString('id-ID'), alignment: 'right' }
                            ]);
                        });
                        body.push([{ text: 'Subtotal Kategori', bold: true, alignment: 'right', colSpan: 2, margin: [0, 2, 0, 5] }, {}, { text: data[category].total.toLocaleString('id-ID'), bold: true, alignment: 'right', margin: [0, 2, 0, 5] }]);
                    }
                }
                return [{ text: title, style: 'subheader' }, { style: 'transactionsTable', table: { headerRows: 1, widths: ['auto', '*', 'auto'], body: body }, layout: 'lightHorizontalLines' }];
            };

            const docDefinition = {
                content: [
                    { text: `LAPORAN ARUS KAS`, style: "header" },
                    { text: `${mosqueName.toUpperCase()}`, style: "subheader" },
                    { text: `${mosqueAddress || ''}`, alignment: "center" },
                    { text: `Periode: ${periodString}`, alignment: "center", margin: [0, 0, 0, 20] },
                    {
                        style: 'summaryTable',
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                ['Saldo Awal Periode', { text: `Rp ${saldoAwal.toLocaleString('id-ID')}`, alignment: 'right' }],
                                ['Total Pemasukan', { text: `Rp ${totalIncome.toLocaleString('id-ID')}`, alignment: 'right', color: 'green' }],
                                ['Total Pengeluaran', { text: `Rp ${totalExpense.toLocaleString('id-ID')}`, alignment: 'right', color: 'red' }],
                                [{ text: 'Saldo Akhir Periode', bold: true, fontSize: 12 }, { text: `Rp ${saldoAkhir.toLocaleString('id-ID')}`, bold: true, alignment: 'right', fontSize: 12 }],
                            ]
                        }, layout: 'noBorders'
                    },
                    ...createCategoryTable('RINCIAN PEMASUKAN', groupedIncome),
                    ...createCategoryTable('RINCIAN PENGELUARAN', groupedExpense),
                    { text: 'POSISI KAS & BANK (SALDO AKHIR)', style: 'subheader' },
                    {
                        style: 'transactionsTable',
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [{ text: 'Nama Dompet', style: 'tableHeader' }, { text: 'Saldo (Rp)', style: 'tableHeader', alignment: 'right' }],
                                ...walletBalances.map(w => [w.name, { text: w.balance.toLocaleString('id-ID'), alignment: 'right' }]),
                                [{ text: 'Total Saldo Akhir', bold: true }, { text: saldoAkhir.toLocaleString('id-ID'), bold: true, alignment: 'right' }]
                            ]
                        }, layout: 'lightHorizontalLines'
                    },
                    {
                        columns: [
                            {
                                width: '*',
                                text: `\n\nMengetahui,\n\n\n\n\n(.........................)\nKetua DKM`,
                                alignment: 'center'
                            },
                            {
                                width: '*',
                                text: `Malang, ${moment().format("DD MMMM YYYY")}\nDisiapkan oleh,\n\n\n\n\n( ${user.name} )\nBendahara`,
                                alignment: 'center'
                            }
                        ],
                        margin: [0, 50, 0, 0]
                    },
                    { text: `\n\nLaporan ini dicetak secara otomatis oleh sistem SIMA pada: ${moment().format("dddd, DD MMMM YYYY, HH:mm")}`, alignment: "right", fontSize: 9, italics: true }
                ],
                styles: {
                    header: { fontSize: 16, bold: true, alignment: "center" },
                    subheader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5], alignment: 'center' },
                    summaryTable: { margin: [0, 0, 0, 15] },
                    transactionsTable: { margin: [0, 5, 0, 15] },
                    tableHeader: { bold: true, fontSize: 10, color: 'black' }
                },
                defaultStyle: { font: "Roboto", fontSize: 10 }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="laporan-keuangan.pdf"`);
            pdfDoc.pipe(res);
            pdfDoc.end();
        } else {
            return res.status(400).json({ message: "Format belum didukung." });
        }

    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ message: "Gagal export laporan." });
    }
};
