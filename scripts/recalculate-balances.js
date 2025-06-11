const { wallet, sequelize } = require('../models');
const { recalculateWalletBalances } = require('../utils/finance');

(async () => {
    try {
        const wallets = await wallet.findAll({
            where: { deleted_at: null },
            attributes: ['wallet_id', 'wallet_name'],
        });

        console.log(`🔄 Recalculating balances for ${wallets.length} wallets...\n`);

        for (const wallet of wallets) {
            console.log(`→ Wallet: ${wallet.wallet_name}`);
            await recalculateWalletBalances(wallet.wallet_id);
        }

        console.log('\n✅ Balance recalculation complete.');
        await sequelize.close();
    } catch (error) {
        console.error('❌ Error recalculating balances:', error);
        process.exit(1);
    }
})();
