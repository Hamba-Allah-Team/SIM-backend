const db = require('./models');

const runSync = async () => {
    try {
        console.log("⏳ Syncing database...");

        // Gunakan 'alter: true' untuk menyesuaikan tabel tanpa menghapus data
        await db.sequelize.sync({ alter: true });

        console.log("✅ Database synchronized successfully.");
        process.exit(); // Keluar setelah selesai
    } catch (error) {
        console.error("❌ Failed to sync database:", error);
        process.exit(1);
    }
};

runSync();
