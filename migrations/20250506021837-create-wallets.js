// Migration: Wallets Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wallets', {
      wallet_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mosque_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mosques', key: 'mosque_id' } },
      wallet_type: { type: 'wallet_type_enum', allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('wallets');
  }
};