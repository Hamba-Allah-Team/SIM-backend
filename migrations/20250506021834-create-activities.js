// Migration: Activities Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activities', {
      activities_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mosque_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mosques', key: 'mosque_id' } },
      event_name: Sequelize.STRING,
      image: Sequelize.STRING,
      event_description: Sequelize.TEXT,
      start_date: Sequelize.DATE,
      end_date: Sequelize.DATE,
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: Sequelize.TIME,
      user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activities');
  }
};