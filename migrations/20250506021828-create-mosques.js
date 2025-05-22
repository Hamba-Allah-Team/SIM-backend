// Migration: Mosques Table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mosques', {
      mosque_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: Sequelize.STRING,
      address: Sequelize.TEXT,
      description: Sequelize.TEXT,
      image: Sequelize.STRING,
      phone_whatsapp: Sequelize.STRING,
      email: Sequelize.STRING,
      facebook: Sequelize.STRING,
      instagram: Sequelize.STRING,
      longitude: Sequelize.FLOAT,
      latitude: Sequelize.FLOAT,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mosques');
  }
};