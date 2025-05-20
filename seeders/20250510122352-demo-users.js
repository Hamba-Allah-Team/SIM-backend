'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('superadmin', 10);

    await queryInterface.bulkInsert('users', [
      {
        mosque_id: 1,
        email: 'admin@alhikmah.com',
        username: 'admin_alhikmah',
        password: hashedPassword1,
        name: 'Admin Al-Hikmah',
        role: 'admin',
        status: 'active',
        password_reset_code: null,
        password_reset_expires_at: null,
        expired_at: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 2,
        email: 'admin@annur.com',
        username: 'admin_annur',
        password: hashedPassword1,
        name: 'Admin An-Nur',
        role: 'admin',
        status: 'active',
        password_reset_code: null,
        password_reset_expires_at: null,
        expired_at: null,
        deleted_at: null,
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
        password_reset_code: null,
        password_reset_expires_at: null,
        expired_at: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
