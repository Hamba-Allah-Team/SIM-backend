const db = require("../models");
const Wallet = db.wallet;
const { Op } = db.Sequelize;

// 📥 CREATE wallet
exports.createWallet = async (req, res) => {
    try {
        const { mosque_id, wallet_type, wallet_name } = req.body;

        if (!wallet_name) {
            return res.status(400).json({ message: "Wallet name is required." });
        }

        // Cek apakah wallet dengan tipe tersebut sudah ada di masjid yang sama
        const existingWallet = await Wallet.findOne({
            where: {
                mosque_id,
                wallet_type
            }
        });

        if (existingWallet) {
            return res.status(400).json({ message: `A '${wallet_type}' wallet already exists for this mosque.` });
        }

        const newWallet = await Wallet.create({
            mosque_id,
            wallet_type,
            wallet_name
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

        // Cek apakah ingin ubah tipe & masjid, dan pastikan tidak duplikat
        if ((wallet_type && wallet_type !== wallet.wallet_type) || (mosque_id && mosque_id !== wallet.mosque_id)) {
            const duplicate = await Wallet.findOne({
                where: {
                    mosque_id: newMosqueId,
                    wallet_type,
                    wallet_id: { [Op.ne]: walletId }
                }
            });

            if (duplicate) {
                return res.status(400).json({ message: `A '${wallet_type}' wallet already exists for this mosque.` });
            }
        }

        // Update field
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
