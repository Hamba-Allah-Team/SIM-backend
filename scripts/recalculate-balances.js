const db = require('../models');
const { recalculateWalletBalances } = require('../utils/finance');

async function runRecalculation() {
    console.log("Memulai proses perhitungan ulang semua saldo dompet...");
    const t = await db.sequelize.transaction();

    try {
        const wallets = await db.wallet.findAll({ 
            where: { deleted_at: null },
            attributes: ['wallet_id', 'wallet_name'], 
            transaction: t 
        });
        
        if (wallets.length === 0) {
            console.log("Tidak ada dompet untuk dihitung. Selesai.");
            await t.commit();
            return;
        }

        console.log(`Menemukan ${wallets.length} dompet. Memulai perhitungan...`);

        for (let i = 0; i < wallets.length; i++) {
            const walletId = wallets[i].wallet_id;
            console.log(`(${i + 1}/${wallets.length}) Menghitung saldo untuk dompet ID: ${walletId}`);
            await recalculateWalletBalances(walletId, { transaction: t });
        }

        await t.commit();
        console.log("✅ Proses perhitungan ulang semua saldo berhasil diselesaikan.");

    } catch (error) {
        await t.rollback();
        console.error("❌ Gagal total saat menjalankan perhitungan ulang:", error);
        throw error; // Lemparkan error agar proses seeder tahu jika terjadi kegagalan
    }
}

// Hanya jalankan jika file ini dieksekusi langsung, dan tutup koneksi setelahnya
if (require.main === module) {
    runRecalculation().finally(() => {
        db.sequelize.close();
    });
}

module.exports = { runRecalculation };