'use strict';

const { runRecalculation } = require('../scripts/recalculate-balances');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const userId = 1;

    const data = [];

    // === INITIAL BALANCE untuk 3 wallet ===
    for (let i = 1; i <= 3; i++) {
      data.push({
        wallet_id: i,
        amount: 500000,
        transaction_type: 'initial_balance',
        category_id: null,
        source_or_usage: 'Saldo awal seeding',
        transaction_date: new Date(now.getFullYear(), now.getMonth(), 1),
        user_id: userId,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // === INCOME & EXPENSE ===
    const incomeCategories = [1, 4]; // Donasi Jumat, Transfer Donatur
    const expenseCategories = [2, 3]; // Pembelian Air, Kegiatan Anak Yatim

    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 5; j++) {
        // income
        data.push({
          wallet_id: i,
          amount: 10000 * j,
          transaction_type: 'income',
          category_id: incomeCategories[j % incomeCategories.length],
          source_or_usage: 'Pemasukan rutin #' + j,
          transaction_date: new Date(now.getFullYear(), now.getMonth(), j + 1),
          user_id: userId,
          balance: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });

        // expense
        data.push({
          wallet_id: i,
          amount: 7000 * j,
          transaction_type: 'expense',
          category_id: expenseCategories[j % expenseCategories.length],
          source_or_usage: 'Pengeluaran rutin #' + j,
          transaction_date: new Date(now.getFullYear(), now.getMonth(), j + 1),
          user_id: userId,
          balance: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    // === TRANSFER antar dompet ===
    const transfers = [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ];

    for (let i = 0; i < transfers.length; i++) {
      const { from, to } = transfers[i];
      const amount = 25000 + i * 10000;
      const tgl = new Date(now.getFullYear(), now.getMonth(), 20 + i);

      // transfer_out
      data.push({
        wallet_id: from,
        amount: amount,
        transaction_type: 'transfer_out',
        category_id: null,
        source_or_usage: `Transfer ke dompet ${to}`,
        transaction_date: tgl,
        user_id: userId,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // transfer_in
      data.push({
        wallet_id: to,
        amount: amount,
        transaction_type: 'transfer_in',
        category_id: null,
        source_or_usage: `Transfer dari dompet ${from}`,
        transaction_date: tgl,
        user_id: userId,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    try {
      // 2. Masukkan semua data transaksi
      await queryInterface.bulkInsert('wallet_transactions', data, {});

      // 3. Panggil fungsi perhitungan ulang setelah data dimasukkan
      console.log("Seeding data transaksi selesai. Memulai perhitungan ulang saldo...");
      await runRecalculation();
    } catch (error) {
      console.error("Terjadi error saat seeding atau recalculation:", error);
      // Lemparkan error agar proses migrasi/seeding gagal dan bisa di-rollback
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('wallet_transactions', { user_id: 2 }, {});
  },
};
