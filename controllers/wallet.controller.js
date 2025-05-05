const db = require("../models");
const Wallet = db.wallets;

// 📥 CREATE wallet
exports.createWallet = async (req, res) => {
    try {
        const { mosque_id, wallet_type } = req.body;

        const newWallet = await Wallet.create({
            mosque_id,
            wallet_type,
        });

        res.status(201).json(newWallet);
    } catch (error) {
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
        const { mosque_id, wallet_type } = req.body;

        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        wallet.mosque_id = mosque_id ?? wallet.mosque_id;
        wallet.wallet_type = wallet_type ?? wallet.wallet_type;

        await wallet.save();

        res.json(wallet);
    } catch (error) {
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
