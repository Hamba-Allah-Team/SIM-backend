'use strict';

const bcrypt = require('bcryptjs');

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
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('admin456', 10);

    return queryInterface.bulkInsert('users', [
      {
        mosque_id: 1,
        email: 'admin@alhikmah.com',
        username: 'admin_alhikmah',
        password: hashedPassword1,
        name: 'Admin Al-Hikmah',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 2,
        email: 'admin@annur.com',
        username: 'admin_annur',
        password: hashedPassword2,
        name: 'Admin An-Nur',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: null,
        email: 'superadmin@mail.com',
        username: 'superadmin1',
        password: hashedPassword2,
        name: 'Superadmin1',
        role: 'superadmin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete('users', null, {});
  }
};
