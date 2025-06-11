// Migration: Reservations_Room Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reservations_room', {
      room_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mosque_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'mosques', key: 'mosque_id' } },
      place_name: { type: Sequelize.STRING, allowNull: false },
      image: Sequelize.STRING,
      description: { type: Sequelize.TEXT, allowNull: false },
      facilities: { type: Sequelize.TEXT, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reservations_room');
  }
};