'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('activations', [
      {
        user_id: 1,
        mosque_id: 1,
        activation_type: 'activation',
        username_input: null,
        transaction_number: 'TXN-001-2025',
        proof_image: 'proof1.jpg',
        status: 'approved',
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
        username_input: 'john_doe',
        transaction_number: 'TXN-002-2025',
        proof_image: 'proof2.jpg',
        status: 'pending',
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
