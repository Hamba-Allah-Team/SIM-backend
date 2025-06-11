"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("activations", {
      activation_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      mosque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mosques",
          key: "mosque_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      activation_type: {
        type: Sequelize.ENUM("activation", "extension"),
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      proof_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      proof_image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      mosque_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mosque_address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("activations");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_activations_activation_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_activations_status";'
    );
  },
};
