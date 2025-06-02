'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('transaction_categories', [
      {
        mosque_id: 1,
        category_name: 'Donasi Jumat',
        category_type: 'income',
        description: 'Donasi rutin hari Jumat',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        category_name: 'Pembelian Air',
        category_type: 'expense',
        description: 'Pengeluaran pembelian air minum',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        category_name: 'Kegiatan Anak Yatim',
        category_type: 'expense',
        description: 'Kegiatan sosial untuk anak yatim',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        category_name: 'Transfer Donatur',
        category_type: 'income',
        description: 'Transfer masuk dari donatur',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('transaction_categories', null, {});
  }
};
