'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('activations', [
      {
        user_id: 1,
        mosque_id: 1,
        activation_type: 'activation',
        username: 'ahmad_01',
        email: 'ahmad@example.com',
        transaction_number: 'TXN-001-2025',
        proof_image: 'proof1.jpg',
        status: 'approved',
        mosque_name: 'Masjid Al-Falah',
        mosque_address: 'Jl. Raya Utama No.123',
        mosque_phone_whatsapp: '08123456789',
        mosque_email: 'info@alfalah.id',
        mosque_facebook: 'facebook.com/masjidalfalah',
        mosque_instagram: 'instagram.com/masjidalfalah',
        submitted_at: new Date(),
        approved_at: new Date(),
        admin_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: 2,
        mosque_id: 2,
        activation_type: 'extension',
        username: 'john_doe',
        email: 'john@example.com',
        transaction_number: 'TXN-002-2025',
        proof_image: 'proof2.jpg',
        status: 'pending',
        mosque_name: 'Masjid Baitul Hikmah',
        mosque_address: 'Jl. Pendidikan No.45',
        mosque_phone_whatsapp: '082233445566',
        mosque_email: 'baitulhikmah@example.com',
        mosque_facebook: 'facebook.com/baitulhikmah',
        mosque_instagram: 'instagram.com/baitulhikmah',
        submitted_at: new Date(),
        approved_at: null,
        admin_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('activations', null, {});
  }
};
