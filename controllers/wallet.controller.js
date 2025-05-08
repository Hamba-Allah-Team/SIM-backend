const db = require("../models");
const Wallet = db.wallet;

// 📥 CREATE wallet
exports.createWallet = async (req, res) => {
    try {
        const { mosque_id, wallet_type } = req.body;

        // Ambil semua wallet yang sudah dimiliki masjid tersebut
        const existingWallets = await Wallet.findAll({
            where: { mosque_id }
        });

        // Cek apakah sudah punya dua wallet
        if (existingWallets.length >= 2) {
            return res.status(400).json({ message: "A mosque cannot have more than two wallets." });
        }

        // Cek apakah tipe wallet yang ingin dibuat sudah ada
        const walletTypeExists = existingWallets.some(w => w.wallet_type === wallet_type);
        if (walletTypeExists) {
            return res.status(400).json({ message: `A '${wallet_type}' wallet already exists for this mosque.` });
        }

        // Buat wallet baru
        const newWallet = await Wallet.create({
            mosque_id,
            wallet_type,
        });

        res.status(201).json(newWallet);
    } catch (error) {
        console.error("Error creating wallet:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 GET all wallets
exports.getAllWallets = async (req, res) => {
    try {
        const wallets = await Wallet.findAll();
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
        const { mosque_id, wallet_type } = req.body;

        const wallet = await Wallet.findByPk(walletId);
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        // Ambil semua wallet masjid yang sama (kecuali wallet ini sendiri)
        const otherWallets = await Wallet.findAll({
            where: {
                mosque_id: mosque_id ?? wallet.mosque_id,
                wallet_id: { [db.Sequelize.Op.ne]: walletId }
            }
        });

        // Jika wallet_type ingin diubah
        if (wallet_type && wallet_type !== wallet.wallet_type) {
            const duplicateType = otherWallets.some(w => w.wallet_type === wallet_type);
            if (duplicateType) {
                return res.status(400).json({ message: `A '${wallet_type}' wallet already exists for this mosque.` });
            }
        }

        // Update data
        wallet.mosque_id = mosque_id ?? wallet.mosque_id;
        wallet.wallet_type = wallet_type ?? wallet.wallet_type;

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

        await wallet.destroy();

        res.json({ message: "Wallet deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
