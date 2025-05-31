const db = require("../models");
const Wallet = db.wallet;
const WalletTransactions = db.wallet_transaction;
const { Op } = db.Sequelize;
const { recalculateWalletBalances } = require("../utils/finance");

exports.createWallet = async (req, res) => {
    try {
        const { mosque_id, wallet_type, wallet_name, initial_balance } = req.body;
        const user_id = req.userId;

        if (!mosque_id || !wallet_type || !wallet_name) {
            return res.status(400).json({ message: "mosque_id, wallet_type, and wallet_name are required." });
        }

        // Cek jika wallet_type cash sudah ada
        if (wallet_type === 'cash') {
            const existingCash = await Wallet.findOne({
                where: { mosque_id, wallet_type: 'cash', deleted_at: null } // Hindari wallet soft-deleted
            });
            if (existingCash) {
                return res.status(400).json({
                    message: "A 'cash' wallet already exists for this mosque."
                });
            }
        }

        // Cek nama dompet unik dalam 1 masjid
        const existingName = await Wallet.findOne({
            where: { mosque_id, wallet_name, deleted_at: null }
        });
        if (existingName) {
            return res.status(400).json({
                message: "A wallet with this name already exists for this mosque."
            });
        }

        // Buat dompet baru
        const newWallet = await Wallet.create({ mosque_id, wallet_type, wallet_name });

        // Tambah transaksi saldo awal jika diperlukan
        if (initial_balance && parseFloat(initial_balance) > 0) {
            await WalletTransactions.create({
                wallet_id: newWallet.wallet_id,
                amount: parseFloat(initial_balance),
                transaction_type: 'initial_balance', // enum sesuai model
                source_or_usage: 'Saldo awal',
                transaction_date: new Date(),
                balance: 0, // akan diperbarui oleh fungsi kalkulasi
                user_id: user_id || null
            });

            // Hitung ulang saldo
            await recalculateWalletBalances(newWallet.wallet_id);
        }

        res.status(201).json(newWallet);

    } catch (error) {
        console.error("Error creating wallet:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 GET wallets by mosque ID
exports.getWalletsByMosqueId = async (req, res) => {
    try {
        const mosqueId = req.params.mosqueId;

        const wallets = await Wallet.findAll({
            where: { mosque_id: mosqueId }
        });

        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📄 GET wallet by ID
exports.getWalletById = async (req, res) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id);

        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✏️ UPDATE wallet
exports.updateWallet = async (req, res) => {
    try {
        const walletId = req.params.id;
        const { mosque_id, wallet_type, wallet_name } = req.body;

        const wallet = await Wallet.findByPk(walletId);
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        const newMosqueId = mosque_id ?? wallet.mosque_id;

        // Cek wallet lain milik masjid ini (kecuali wallet ini sendiri)
        const otherWallets = await Wallet.findAll({
            where: {
                mosque_id: newMosqueId,
                wallet_id: { [db.Sequelize.Op.ne]: walletId }
            }
        });

        // Validasi jika ingin ubah jadi wallet_type 'cash'
        if (wallet_type === 'cash' && wallet.wallet_type !== 'cash') {
            const hasCash = otherWallets.some(w => w.wallet_type === 'cash');
            if (hasCash) {
                return res.status(400).json({ message: "A 'cash' wallet already exists for this mosque." });
            }
        }

        // Validasi nama unik (jika ingin diubah)
        if (wallet_name && wallet_name !== wallet.wallet_name) {
            const duplicateName = await Wallet.findOne({
                where: {
                    mosque_id: newMosqueId,
                    wallet_name,
                    wallet_id: { [db.Sequelize.Op.ne]: walletId }
                }
            });
            if (duplicateName) {
                return res.status(400).json({ message: "A wallet with this name already exists for this mosque." });
            }
        }

        // Update data
        wallet.mosque_id = newMosqueId;
        wallet.wallet_type = wallet_type ?? wallet.wallet_type;
        wallet.wallet_name = wallet_name ?? wallet.wallet_name;

        await wallet.save();
        res.json(wallet);

    } catch (error) {
        console.error("Error updating wallet:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ DELETE wallet
exports.deleteWallet = async (req, res) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        // Pastikan minimal 1 wallet tersisa untuk masjid ini
        const walletCount = await Wallet.count({
            where: { mosque_id: wallet.mosque_id }
        });

        if (walletCount <= 1) {
            return res.status(400).json({
                message: "Cannot delete the last wallet. A mosque must have at least one wallet."
            });
        }

        await wallet.destroy();
        res.json({ message: "Wallet deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
