'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transaction_categories', {
      category_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      mosque_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'mosques',
          key: 'mosque_id'
        },
        onDelete: 'CASCADE'
      },
      category_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      category_type: {
        type: 'transaction_type_enum',
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transaction_categories');
    // Tidak perlu DROP ENUM karena sudah dideklarasikan di migration lain
  }
};
