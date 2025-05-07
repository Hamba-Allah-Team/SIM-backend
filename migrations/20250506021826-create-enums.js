'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TYPE role_enum AS ENUM ('superadmin', 'admin');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE status_enum AS ENUM ('active', 'inactive');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE contents_type_enum AS ENUM ('artikel', 'berita');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE wallet_type_enum AS ENUM ('cash', 'bank');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense');
    `);
    await queryInterface.sequelize.query(`
      CREATE TYPE reservation_status_enum AS ENUM ('pending', 'approved', 'rejected', 'completed');
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`DROP TYPE reservation_status_enum`);
    await queryInterface.sequelize.query(`DROP TYPE transaction_type_enum`);
    await queryInterface.sequelize.query(`DROP TYPE wallet_type_enum`);
    await queryInterface.sequelize.query(`DROP TYPE contents_type_enum`);
    await queryInterface.sequelize.query(`DROP TYPE status_enum`);
    await queryInterface.sequelize.query(`DROP TYPE role_enum`);
  }
};