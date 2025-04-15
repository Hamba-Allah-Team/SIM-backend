// File: app/models/user.model.js
module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      mosque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mosques",
          key: "mosque_id"
        }
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM("superadmin", "admin"),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    }, {
      timestamps: false, // karena kita pakai created_at dan updated_at manual
      underscored: true // biar Sequelize pakai snake_case untuk nama kolom
    });
  
    return User;
  };
  