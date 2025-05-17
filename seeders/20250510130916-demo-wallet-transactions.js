'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await queryInterface.bulkInsert('wallet_transactions', [
      {
        wallet_id: 1, // pastikan wallet_id:1 ada
        amount: 100000,
        transaction_type: 'income',
        source_or_usage: 'Donasi Jumat',
        transaction_date: new Date(),
        balance: 100000,
        user_id: 1, // pastikan user_id:1 ada
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        wallet_id: 1,
        amount: 25000,
        transaction_type: 'expense',
        source_or_usage: 'Beli air minum',
        transaction_date: new Date(),
        balance: 75000,
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        wallet_id: 2, // bank wallet
        amount: 200000,
        transaction_type: 'income',
        source_or_usage: 'Transfer donatur',
        transaction_date: new Date(),
        balance: 200000,
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('wallet_transactions', null, {});
  }
};
