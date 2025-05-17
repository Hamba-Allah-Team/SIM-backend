// Migration: Users Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      user_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mosque_id: { type: Sequelize.INTEGER, references: { model: 'mosques', key: 'mosque_id' } },
      email: { type: Sequelize.STRING, unique: true },
      username: { type: Sequelize.STRING, unique: true },
      password: Sequelize.STRING,
      name: Sequelize.STRING,
      role: { type: 'role_enum' },
      status: { type: 'status_enum' },
      password_reset_code: Sequelize.STRING,
      password_reset_expires_at: Sequelize.DATE,
      expired_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};