// Migration: Contents Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contents', {
      contents_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mosque_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mosques', key: 'mosque_id' } },
      title: Sequelize.STRING,
      content_description: Sequelize.TEXT,
      image: Sequelize.STRING,
      published_date: Sequelize.DATE,
      contents_type: { type: 'contents_type_enum', allowNull: false },
      user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('contents');
  }
};